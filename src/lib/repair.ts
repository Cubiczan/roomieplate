import { findAllergenHits, formatCallout, mealText, mentionsAny, resolveAllergens } from "@/lib/allergens";
import { buildFixturePlan, displayName } from "@/lib/planner";
import {
  type Aisle,
  type Meal,
  type MealSlot,
  type PlanRequest,
  type Weekday,
  type WeekPlan,
} from "@/lib/types";

const AISLES = new Set<Aisle>(["produce", "protein", "pantry", "dairy", "bakery", "other"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function expectDays(request: PlanRequest): Weekday[] {
  if (request.scope === "week") {
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  }
  return [request.day ?? "Monday"];
}

function expectSlots(request: PlanRequest): MealSlot[] {
  if (request.scope === "meal" && request.slot) return [request.slot];
  if (request.profile.meals === "all") return ["breakfast", "lunch", "dinner"];
  return ["dinner"];
}

function parseIngredients(value: unknown): Meal["ingredients"] {
  if (!Array.isArray(value)) return [];
  const ingredients: Meal["ingredients"] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (!record) continue;
    const item = clean(record.item, 60);
    const amount = clean(record.amount, 40);
    if (!item || !amount) continue;
    const aisle = AISLES.has(record.aisle as Aisle) ? (record.aisle as Aisle) : "other";
    ingredients.push({ item, amount, aisle });
    if (ingredients.length >= 12) break;
  }
  return ingredients;
}

function parseSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((step) => clean(step, 240))
    .filter(Boolean)
    .slice(0, 6);
}

function acceptModelMeal(value: unknown, slot: MealSlot, request: PlanRequest, day: Weekday): Meal | null {
  const record = asRecord(value);
  if (!record) return null;
  const title = clean(record.title, 80);
  const ingredients = parseIngredients(record.ingredients);
  const steps = parseSteps(record.steps);
  if (!title || ingredients.length < 2 || steps.length < 2) return null;

  const minutesValue = typeof record.minutes === "number" ? Math.round(record.minutes) : request.profile.timeBudgetMinutes;
  if (minutesValue > request.profile.timeBudgetMinutes + 5) return null;

  const draft = {
    title,
    blurb: clean(record.blurb, 180) || "Checked locally against the allergy list before it landed on the plan.",
    cuisine: clean(record.cuisine, 40) || "Home cooking",
    tags: Array.isArray(record.tags) ? record.tags.map((tag) => clean(tag, 32)).filter(Boolean).slice(0, 4) : [],
    steps,
    ingredients,
  };
  const allergens = resolveAllergens(request.profile);
  if (findAllergenHits(mealText(draft), allergens).length > 0) return null;
  if (mentionsAny(mealText(draft), request.profile.dislikes)) return null;

  return {
    id: `${day}-${slot}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    slot,
    title: draft.title,
    blurb: draft.blurb,
    minutes: Math.max(5, minutesValue),
    cuisine: draft.cuisine,
    servings: 2,
    ingredients: draft.ingredients.map((ingredient) => ({
      ...ingredient,
      fromPantry: request.pantry.some((item) => {
        const needle = item.trim().toLowerCase();
        return needle.length >= 3 && ingredient.item.toLowerCase().includes(needle);
      }),
    })),
    steps: draft.steps,
    allergenCallout: formatCallout(displayName(request.profile), allergens),
    tags: draft.tags,
    origin: "ollama",
  };
}

export function repairOllamaPlan(raw: unknown, request: PlanRequest, model: string): WeekPlan | null {
  const record = asRecord(raw);
  if (!record || !Array.isArray(record.days)) return null;

  const byDay = new Map<string, Record<string, unknown>>();
  for (const entry of record.days) {
    const dayRecord = asRecord(entry);
    const day = clean(dayRecord?.day, 20);
    if (day && dayRecord) byDay.set(day.toLowerCase(), dayRecord);
  }

  const allergens = resolveAllergens(request.profile);
  const used = new Set(request.avoidTitles.map((title) => title.toLowerCase()));
  const repairNotes: string[] = [];
  let repairs = 0;
  let kept = 0;
  const days = [];

  for (const day of expectDays(request)) {
    const dayRecord = byDay.get(day.toLowerCase());
    const rawMeals = Array.isArray(dayRecord?.meals) ? dayRecord.meals : [];
    const meals: Meal[] = [];

    const expectedSlots = expectSlots(request);
    for (const [slotIndex, slot] of expectedSlots.entries()) {
      const rawMeal =
        rawMeals.find((candidate) => {
          const mealRecord = asRecord(candidate);
          return clean(mealRecord?.slot, 20).toLowerCase() === slot;
        }) ?? rawMeals[slotIndex];
      const accepted = acceptModelMeal(rawMeal, slot, request, day);
      if (accepted && !used.has(accepted.title.toLowerCase())) {
        used.add(accepted.title.toLowerCase());
        meals.push(accepted);
        kept += 1;
        continue;
      }

      try {
        const replacement = buildFixturePlan({
          ...request,
          scope: "meal",
          day,
          slot,
          avoidTitles: [...used],
          nonce: request.nonce + repairs + 1,
        });
        const meal = replacement.days[0]?.meals[0];
        if (!meal) return null;
        used.add(meal.title.toLowerCase());
        meals.push(meal);
        repairs += 1;
        repairNotes.push(
          accepted
            ? `${day} ${slot} repeated another dish, so an offline fixture replaced it.`
            : `${day} ${slot} failed the allergen check, so an offline fixture replaced it.`,
        );
      } catch {
        return null;
      }
    }

    days.push({ day, meals });
  }

  if (kept === 0) return null;

  return {
    generatedAt: new Date().toISOString(),
    scope: request.scope,
    source: "ollama",
    model,
    roommateName: displayName(request.profile),
    avoidedAllergens: allergens.map((allergen) => allergen.label),
    days,
    repairs,
    repairNotes,
  };
}
