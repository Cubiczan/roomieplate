"use client";

import { Button } from "@/components/ui/button";
import type { Meal, MealSlot, Weekday, WeekPlan } from "@/lib/types";

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export function WeekBoard({
  plan,
  selectedDay,
  generating,
  error,
  swappingKey,
  onSelectDay,
  onSwap,
  onRegenerateDay,
}: {
  plan: WeekPlan | null;
  selectedDay: Weekday;
  generating: boolean;
  error: string | null;
  swappingKey: string | null;
  onSelectDay: (day: Weekday) => void;
  onSwap: (day: Weekday, slot: MealSlot, title: string) => void;
  onRegenerateDay: (day: Weekday) => void;
}) {
  const day = plan?.days.find((entry) => entry.day === selectedDay) ?? plan?.days[0];

  return (
    <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 sm:p-5" data-testid="week-board">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">This week</h2>
          <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
            {plan
              ? `Seven days for ${plan.roommateName}. The safety line is written by RoomiePlate after the allergen check.`
              : "Generate a week and every card will say exactly what it kept out."}
          </p>
        </div>
        {plan && day ? (
          <Button
            type="button"
            variant="outline"
            disabled={generating}
            onClick={() => onRegenerateDay(day.day)}
          >
            Regenerate {day.day}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {plan && plan.repairNotes.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-2xl bg-honey/20 px-3 py-2 text-sm text-foreground">
          {plan.repairNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {!plan && !generating ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-background/70 px-4 py-10 text-center">
          <p className="font-heading text-2xl">The plate is empty.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Alex is set up for peanut and shellfish, with dinners under 30 minutes. Generate the week when you want the menu.
          </p>
        </div>
      ) : null}

      {generating && !plan ? (
        <div className="mt-5 grid gap-3" aria-hidden="true">
          <div className="h-16 animate-pulse rounded-2xl bg-muted" />
          <div className="h-48 animate-pulse rounded-3xl bg-muted" />
        </div>
      ) : null}

      {plan ? (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {plan.days.map((entry) => {
              const selected = entry.day === (day?.day ?? selectedDay);
              const lead = entry.meals[entry.meals.length - 1];
              return (
                <button
                  key={entry.day}
                  type="button"
                  onClick={() => onSelectDay(entry.day)}
                  aria-pressed={selected}
                  className={
                    selected
                      ? "min-w-32 shrink-0 rounded-2xl bg-primary px-3 py-2 text-left text-primary-foreground"
                      : "min-w-32 shrink-0 rounded-2xl bg-muted px-3 py-2 text-left"
                  }
                >
                  <span className="block text-[0.7rem] font-medium tracking-wide uppercase">{entry.day.slice(0, 3)}</span>
                  <span className="mt-1 block text-sm leading-4">{lead?.title ?? "Open"}</span>
                </button>
              );
            })}
          </div>

          <div className={`mt-4 grid gap-3 ${generating ? "opacity-60" : ""}`}>
            {day?.meals.map((meal) => (
              <MealCard
                key={`${day.day}-${meal.slot}-${meal.id}`}
                day={day.day}
                meal={meal}
                busy={swappingKey === `${day.day}:${meal.slot}` || generating}
                onSwap={() => onSwap(day.day, meal.slot, meal.title)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function MealCard({
  day,
  meal,
  busy,
  onSwap,
}: {
  day: Weekday;
  meal: Meal;
  busy: boolean;
  onSwap: () => void;
}) {
  return (
    <article className="rounded-3xl bg-background p-4 ring-1 ring-foreground/10" data-testid="meal-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {day} · {SLOT_LABEL[meal.slot]} · {meal.minutes} min · {meal.cuisine}
          </p>
          <h3 className="mt-1 font-heading text-2xl leading-tight">{meal.title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{meal.blurb}</p>
        </div>
        <Button type="button" variant="outline" disabled={busy} onClick={onSwap}>
          {busy ? "Swapping…" : "Swap meal"}
        </Button>
      </div>

      <p
        data-testid="allergen-callout"
        className="mt-3 inline-flex rounded-full bg-[color-mix(in_oklch,var(--sage)_14%,white)] px-3 py-1 text-sm font-medium text-[var(--sage)]"
      >
        {meal.allergenCallout}
      </p>
      {meal.origin === "offline-fixtures" ? (
        <p className="mt-2 text-xs font-medium tracking-wide text-[var(--honey)] uppercase">Offline fixture</p>
      ) : (
        <p className="mt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Local model</p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium">Ingredients</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {meal.ingredients.map((ingredient) => (
              <li key={`${ingredient.item}-${ingredient.amount}`} className="flex items-baseline justify-between gap-3">
                <span>
                  {ingredient.item}
                  {ingredient.fromPantry ? (
                    <span className="ml-2 text-xs text-muted-foreground">on hand</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground">{ingredient.amount}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium">Steps</h4>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-6">
            {meal.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Serves {meal.servings}</p>
    </article>
  );
}
