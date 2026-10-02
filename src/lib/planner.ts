import {
  findAllergenHits,
  formatCallout,
  mentionsAny,
  recipeText,
  resolveAllergens,
} from "@/lib/allergens";
import { RECIPES } from "@/lib/recipes";
import {
  DISCLAIMER,
  WEEKDAYS,
  type DayPlan,
  type Meal,
  type MealSlot,
  type PlanOrigin,
  type PlanRequest,
  type Recipe,
  type RoommateProfile,
  type Weekday,
  type WeekPlan,
} from "@/lib/types";

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function slotsFor(profile: RoommateProfile): MealSlot[] {
  return profile.meals === "all" ? ["breakfast", "lunch", "dinner"] : ["dinner"];
}

export function displayName(profile: RoommateProfile): string {
  return profile.name.trim() || "your roommate";
}

export function planSeed(request: PlanRequest): string {
  const { profile, pantry, nonce, scope, day, slot } = request;
  return [
    profile.name,
    profile.allergies.join(","),
    profile.customAllergies.join(","),
    profile.dislikes.join(","),
    profile.cuisines.join(","),
    profile.meals,
    profile.timeBudgetMinutes,
    profile.vegetarianFriendly ? "veg" : "any",
    pantry.join(","),
    nonce,
    scope,
    day ?? "",
    slot ?? "",
  ].join("|");
}

export function recipeBlocked(
  recipe: Recipe,
  profile: RoommateProfile,
): { blocked: boolean; reason?: string } {
  const allergens = resolveAllergens(profile);
  const blockedIds = new Set(allergens.map((allergen) => allergen.id));
  for (const contains of recipe.contains) {
    if (blockedIds.has(contains)) {
      return { blocked: true, reason: contains };
    }
  }
  const hits = findAllergenHits(recipeText(recipe), allergens);
  if (hits.length > 0) {
    return { blocked: true, reason: hits[0]?.term };
  }
  return { blocked: false };
}

function pantryHits(recipe: Recipe, pantry: string[]): number {
  return recipe.ingredients.filter((ingredient) =>
    pantry.some((item) => {
      const needle = item.trim().toLowerCase();
      if (needle.length < 3) return false;
      return ingredient.item.toLowerCase().includes(needle);
    }),
  ).length;
}

export function scoreRecipe(recipe: Recipe, request: PlanRequest, seed: string): number {
  const { profile, pantry } = request;
  let score = recipe.minutes <= profile.timeBudgetMinutes ? 20 : -100;
  if (profile.vegetarianFriendly) {
    score += recipe.vegetarian ? 15 : -5;
  }
  if (profile.cuisines.includes(recipe.cuisine)) score += 6;
  score += pantryHits(recipe, pantry) * 2;
  if (mentionsAny(recipeText(recipe), profile.dislikes)) score -= 30;
  score += hashString(`${seed}:${recipe.id}`) % 5;
  return score;
}

export function eligibleRecipes(request: PlanRequest, slot: MealSlot, seed: string): Recipe[] {
  const { profile } = request;
  const base = RECIPES.filter((recipe) => recipe.slot === slot && !recipeBlocked(recipe, profile).blocked);
  const withoutDislikes = base.filter((recipe) => !mentionsAny(recipeText(recipe), profile.dislikes));
  const dislikePool = withoutDislikes.length > 0 ? withoutDislikes : base;
  const withinTime = dislikePool.filter((recipe) => recipe.minutes <= profile.timeBudgetMinutes);
  const pool = withinTime.length > 0 ? withinTime : dislikePool;
  return [...pool].sort((left, right) => {
    const scoreDelta = scoreRecipe(right, request, seed) - scoreRecipe(left, request, seed);
    if (scoreDelta !== 0) return scoreDelta;
    return left.id.localeCompare(right.id);
  });
}

function markPantry(recipe: Recipe, pantry: string[]): Meal["ingredients"] {
  return recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    fromPantry: pantry.some((item) => {
      const needle = item.trim().toLowerCase();
      return needle.length >= 3 && ingredient.item.toLowerCase().includes(needle);
    }),
  }));
}

export function mealFromRecipe(recipe: Recipe, request: PlanRequest, origin: PlanOrigin): Meal {
  const allergens = resolveAllergens(request.profile);
  return {
    id: recipe.id,
    slot: recipe.slot,
    title: recipe.title,
    blurb: recipe.blurb,
    minutes: recipe.minutes,
    cuisine: recipe.cuisine,
    servings: 2,
    ingredients: markPantry(recipe, request.pantry),
    steps: recipe.steps,
    allergenCallout: formatCallout(displayName(request.profile), allergens),
    tags: recipe.tags.filter((tag) => tag !== "unsafe-fixture"),
    origin,
  };
}

function targetDays(request: PlanRequest): Weekday[] {
  if (request.scope === "week") return [...WEEKDAYS];
  return [request.day ?? "Monday"];
}

function targetSlots(request: PlanRequest): MealSlot[] {
  if (request.scope === "meal" && request.slot) return [request.slot];
  return slotsFor(request.profile);
}

export function buildFixturePlan(request: PlanRequest, generatedAt = new Date().toISOString()): WeekPlan {
  const seed = planSeed(request);
  const allergens = resolveAllergens(request.profile);
  const used = new Set(request.avoidTitles.map((title) => title.toLowerCase()));
  const days: DayPlan[] = [];

  for (const day of targetDays(request)) {
    const meals: Meal[] = [];
    for (const slot of targetSlots(request)) {
      const ranked = eligibleRecipes(request, slot, `${seed}:${day}:${slot}`);
      if (ranked.length === 0) {
        throw new Error(`No allergen-safe ${slot} fits this profile and time budget.`);
      }
      const fresh = ranked.filter((recipe) => !used.has(recipe.title.toLowerCase()));
      const chosen = fresh[0] ?? ranked[0];
      used.add(chosen.title.toLowerCase());
      meals.push(mealFromRecipe(chosen, request, "offline-fixtures"));
    }
    days.push({ day, meals });
  }

  return {
    generatedAt,
    scope: request.scope,
    source: "offline-fixtures",
    model: null,
    roommateName: displayName(request.profile),
    avoidedAllergens: allergens.map((allergen) => allergen.label),
    days,
    repairs: 0,
    repairNotes: [],
  };
}

export function assertPlanIsSafe(plan: WeekPlan, profile: RoommateProfile): void {
  const allergens = resolveAllergens(profile);
  for (const day of plan.days) {
    for (const meal of day.meals) {
      const hits = findAllergenHits(
        [
          meal.title,
          meal.blurb,
          meal.cuisine,
          ...meal.tags,
          ...meal.steps,
          ...meal.ingredients.map((ingredient) => `${ingredient.amount} ${ingredient.item}`),
        ].join(" "),
        allergens,
      );
      if (hits.length > 0) {
        throw new Error(`Meal "${meal.title}" includes ${hits[0]?.term}.`);
      }
      if (meal.allergenCallout !== formatCallout(displayName(profile), allergens)) {
        throw new Error(`Meal "${meal.title}" has an untrusted safety line.`);
      }
    }
  }
}

export { DISCLAIMER };
