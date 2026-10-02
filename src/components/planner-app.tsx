"use client";

import { GroceryPanel } from "@/components/grocery-panel";
import { ProfilePanel } from "@/components/profile-panel";
import { WeekBoard } from "@/components/week-board";
import { ALEX_PANTRY, ALEX_PROFILE, STORAGE_KEY } from "@/lib/defaults";
import { DISCLAIMER, type MealSlot, type PlanOrigin, type RoommateProfile, type Weekday, type WeekPlan } from "@/lib/types";
import { useEffect, useState } from "react";

interface EngineStatus {
  ok: boolean;
  model: string;
  baseUrl: string;
  error: string | null;
}

interface PlanResponse {
  ok: boolean;
  error?: string;
  plan?: WeekPlan;
  source?: PlanOrigin;
  model?: string;
  ollamaError?: string | null;
  disclaimer?: string;
}

export function PlannerApp() {
  const [profile, setProfile] = useState<RoommateProfile>(ALEX_PROFILE);
  const [pantry, setPantry] = useState<string[]>(ALEX_PANTRY);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<Weekday>("Monday");
  const [hydrated, setHydrated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [swappingKey, setSwappingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<EngineStatus | null>(null);
  const [lastSource, setLastSource] = useState<PlanOrigin | null>(null);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  useEffect(() => {
    // localStorage is read after mount so the server render and the first client paint stay the same.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          profile?: RoommateProfile;
          pantry?: string[];
          plan?: WeekPlan | null;
        };
        if (saved.profile?.name) setProfile({ ...ALEX_PROFILE, ...saved.profile });
        if (Array.isArray(saved.pantry)) setPantry(saved.pantry);
        if (saved.plan?.days?.length) setPlan(saved.plan);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    void fetch("/api/status")
      .then((response) => response.json())
      .then((status: EngineStatus) => setEngine(status))
      .catch(() =>
        setEngine({
          ok: false,
          model: "gemma2:2b",
          baseUrl: "http://127.0.0.1:11434",
          error: "Status check failed.",
        }),
      );
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, pantry, plan }));
  }, [hydrated, profile, pantry, plan]);

  async function requestPlan(body: Record<string, unknown>) {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as PlanResponse;
    if (!response.ok || !payload.ok || !payload.plan) {
      throw new Error(payload.error || "Could not build a meal plan.");
    }
    setLastSource(payload.source ?? payload.plan.source);
    setOllamaError(payload.ollamaError ?? null);
    if (payload.model) {
      setEngine((current) => ({
        ok: payload.source === "ollama",
        model: payload.model || current?.model || "gemma2:2b",
        baseUrl: current?.baseUrl || "http://127.0.0.1:11434",
        error: payload.ollamaError ?? null,
      }));
    }
    return payload.plan;
  }

  async function generateWeek() {
    setGenerating(true);
    setError(null);
    try {
      const next = await requestPlan({
        profile,
        pantry,
        scope: "week",
        nonce: Date.now(),
      });
      setPlan(next);
      setSelectedDay("Monday");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build a meal plan.");
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateDay(day: Weekday) {
    if (!plan) return;
    setGenerating(true);
    setError(null);
    try {
      const avoidTitles = plan.days
        .filter((entry) => entry.day !== day)
        .flatMap((entry) => entry.meals.map((meal) => meal.title));
      const incoming = await requestPlan({
        profile,
        pantry,
        scope: "day",
        day,
        avoidTitles,
        nonce: Date.now(),
      });
      const replacement = incoming.days[0];
      if (!replacement) throw new Error("The day came back empty.");
      setPlan({
        ...plan,
        generatedAt: incoming.generatedAt,
        repairNotes: incoming.repairNotes,
        repairs: incoming.repairs,
        days: plan.days.map((entry) => (entry.day === day ? replacement : entry)),
      });
      setSelectedDay(day);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not regenerate that day.");
    } finally {
      setGenerating(false);
    }
  }

  async function swapMeal(day: Weekday, slot: MealSlot, title: string) {
    if (!plan) return;
    setSwappingKey(`${day}:${slot}`);
    setError(null);
    try {
      const avoidTitles = plan.days.flatMap((entry) => entry.meals.map((meal) => meal.title));
      const incoming = await requestPlan({
        profile,
        pantry,
        scope: "meal",
        day,
        slot,
        avoidTitles,
        nonce: Date.now(),
      });
      const replacement = incoming.days[0]?.meals[0];
      if (!replacement) throw new Error("The swap came back empty.");
      setPlan({
        ...plan,
        generatedAt: incoming.generatedAt,
        days: plan.days.map((entry) =>
          entry.day === day
            ? { ...entry, meals: entry.meals.map((meal) => (meal.slot === slot ? replacement : meal)) }
            : entry,
        ),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not swap ${title}.`);
    } finally {
      setSwappingKey(null);
    }
  }

  function loadAlex() {
    setProfile(ALEX_PROFILE);
    setPantry(ALEX_PANTRY);
    setPlan(null);
    setError(null);
    setSelectedDay("Monday");
  }

  const modelName = engine?.model || "gemma2:2b";
  const usingFixtures = lastSource === "offline-fixtures" || (plan ? plan.source === "offline-fixtures" && lastSource !== "ollama" : !engine?.ok);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm" aria-hidden="true">
            <PlateMark />
          </span>
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Hacktoberfest weekend · Oct 2–5 2026
            </p>
            <h1 className="font-heading text-4xl leading-none text-foreground">RoomiePlate</h1>
            <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
              Weeknight plates for Alex, the roommate who cannot be in the same room as peanut or shellfish.
            </p>
          </div>
        </div>
        <EnginePill
          checking={!engine}
          online={Boolean(engine?.ok) && lastSource !== "offline-fixtures"}
          model={modelName}
          usingFixtures={usingFixtures && Boolean(plan || engine)}
          detail={ollamaError || engine?.error}
        />
      </header>

      <p
        data-testid="safety-banner"
        className="mt-5 rounded-2xl border border-honey/40 bg-[color-mix(in_oklch,var(--honey)_30%,white)] px-3 py-2 text-sm leading-6"
      >
        {DISCLAIMER}
      </p>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4">
          <ProfilePanel
            profile={profile}
            pantry={pantry}
            generating={generating}
            onProfile={setProfile}
            onPantry={setPantry}
            onLoadAlex={loadAlex}
            onGenerate={() => void generateWeek()}
          />
        </div>
        <div className="flex flex-col gap-5">
          {plan && usingFixtures ? (
            <p className="rounded-2xl bg-[color-mix(in_oklch,var(--honey)_24%,white)] px-3 py-2 text-sm leading-6">
              Offline fixtures. {modelName} did not return a safe plan from this machine, so RoomiePlate used allergen-checked templates instead. Run Ollama locally to make Gemma the cook.
            </p>
          ) : null}
          {plan && !usingFixtures ? (
            <p className="rounded-2xl bg-secondary px-3 py-2 text-sm leading-6 text-secondary-foreground">
              Planned with {modelName} on this machine. RoomiePlate rewrote the safety line and rejected any meal that named a listed allergen.
            </p>
          ) : null}
          <WeekBoard
            plan={plan}
            selectedDay={selectedDay}
            generating={generating}
            error={error}
            swappingKey={swappingKey}
            onSelectDay={setSelectedDay}
            onSwap={(day, slot, title) => void swapMeal(day, slot, title)}
            onRegenerateDay={(day) => void regenerateDay(day)}
          />
          <GroceryPanel plan={plan} pantry={pantry} />
        </div>
      </div>

      <footer className="mt-8 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        Open-weight planning via Ollama. Dietary constraints stay on the computer running this app — RoomiePlate does not call a hosted LLM. Swap the model with <code>OLLAMA_MODEL</code>.
      </footer>
    </div>
  );
}

function EnginePill({
  checking,
  online,
  model,
  usingFixtures,
  detail,
}: {
  checking: boolean;
  online: boolean;
  model: string;
  usingFixtures: boolean;
  detail?: string | null;
}) {
  const label = checking ? "Checking local model" : usingFixtures || !online ? "Offline fixtures" : `Local ${model}`;
  return (
    <p
      data-testid="engine-status"
      title={detail || "Local Ollama status"}
      className="rounded-full bg-card px-3 py-1.5 text-xs font-medium ring-1 ring-foreground/10"
    >
      <span
        className={
          checking
            ? "mr-1.5 inline-block size-1.5 rounded-full bg-muted-foreground"
            : usingFixtures || !online
              ? "mr-1.5 inline-block size-1.5 rounded-full bg-[var(--honey)]"
              : "mr-1.5 inline-block size-1.5 rounded-full bg-sage"
        }
        aria-hidden="true"
      />
      {label}
    </p>
  );
}

function PlateMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-7" fill="none">
      <ellipse cx="16" cy="21" rx="10" ry="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 19.5c1.2-6.2 15.8-6.2 17 0" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}
