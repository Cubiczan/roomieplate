import { describe, expect, it } from "vitest";
import { findAllergenHits, formatCallout, recipeText, resolveAllergens } from "@/lib/allergens";
import { ALEX_PROFILE } from "@/lib/defaults";
import { buildGroceryList } from "@/lib/grocery";
import { extractJson } from "@/lib/ollama";
import { parsePlanRequest, PlanInputError } from "@/lib/parse";
import { buildFixturePlan, eligibleRecipes, recipeBlocked } from "@/lib/planner";
import { buildSystemPrompt } from "@/lib/prompt";
import { RECIPES } from "@/lib/recipes";
import { repairOllamaPlan } from "@/lib/repair";
import type { PlanRequest } from "@/lib/types";

const alexRequest: PlanRequest = {
  profile: ALEX_PROFILE,
  pantry: ["rice", "lemon", "garlic"],
  scope: "week",
  avoidTitles: [],
  nonce: 4,
};

describe("allergen scanner", () => {
  it("does not treat eggplant, cauliflower, coconut milk, or peanut butter as the wrong allergen", () => {
    expect(findAllergenHits("roasted eggplant", resolveAllergens({ allergies: ["egg"], customAllergies: [] }))).toEqual([]);
    expect(
      findAllergenHits("cauliflower, corn tortillas, and rice noodles", resolveAllergens({ allergies: ["gluten"], customAllergies: [] })),
    ).toEqual([]);
    expect(
      findAllergenHits("a can of coconut milk", resolveAllergens({ allergies: ["dairy"], customAllergies: [] })),
    ).toEqual([]);
    expect(
      findAllergenHits("peanut butter on toast", resolveAllergens({ allergies: ["dairy"], customAllergies: [] })),
    ).toEqual([]);
    expect(
      findAllergenHits("peanut butter on toast", resolveAllergens({ allergies: ["peanut"], customAllergies: [] })).length,
    ).toBeGreaterThan(0);
  });

  it("tags every catalog hit that appears in a fixture", () => {
    const all = resolveAllergens({
      allergies: ["peanut", "tree-nuts", "shellfish", "fish", "dairy", "egg", "gluten", "soy", "sesame"],
      customAllergies: [],
    });
    for (const recipe of RECIPES) {
      const hits = findAllergenHits(recipeText(recipe), all);
      for (const hit of hits) {
        expect(recipe.contains, `${recipe.id} mentions ${hit.term}`).toContain(hit.allergenId);
      }
    }
  });
});

describe("fixture planner", () => {
  it("hard-avoids peanut and shellfish for Alex and labels every meal", () => {
    const plan = buildFixturePlan(alexRequest, "2026-10-02T00:00:00.000Z");
    expect(plan.days).toHaveLength(7);
    expect(plan.source).toBe("offline-fixtures");
    const titles = plan.days.flatMap((day) => day.meals.map((meal) => meal.title));
    expect(titles.join(" | ")).not.toMatch(/peanut|shrimp|satay|shellfish/i);
    for (const meal of plan.days.flatMap((day) => day.meals)) {
      expect(meal.allergenCallout).toBe("SAFE for Alex: no peanut/shellfish");
      expect(meal.origin).toBe("offline-fixtures");
      expect(meal.minutes).toBeLessThanOrEqual(30);
    }
    expect(titles.some((title) => /chicken|turkey|cod|kiwi/i.test(title))).toBe(false);
  });

  it("is deterministic and can swap a dinner", () => {
    const first = buildFixturePlan(alexRequest, "2026-10-02T00:00:00.000Z");
    const second = buildFixturePlan(alexRequest, "2026-10-03T00:00:00.000Z");
    expect(first.days.map((day) => day.meals.map((meal) => meal.title))).toEqual(
      second.days.map((day) => day.meals.map((meal) => meal.title)),
    );
    const swapped = buildFixturePlan({
      ...alexRequest,
      scope: "meal",
      day: "Monday",
      slot: "dinner",
      avoidTitles: first.days.flatMap((day) => day.meals.map((meal) => meal.title)),
      nonce: 9,
    });
    expect(swapped.days[0]?.meals[0]?.title).not.toBe(first.days[0]?.meals[0]?.title);
    expect(swapped.days[0]?.meals[0]?.allergenCallout).toBe("SAFE for Alex: no peanut/shellfish");
  });

  it("drops the slow ragù and olive couscous when they do not fit", () => {
    const dinners = eligibleRecipes(alexRequest, "dinner", "seed");
    expect(dinners.some((recipe) => recipe.id === "slow-mushroom-ragu")).toBe(false);
    const week = buildFixturePlan({
      ...alexRequest,
      profile: { ...ALEX_PROFILE, meals: "all" },
    });
    const titles = week.days.flatMap((day) => day.meals.map((meal) => meal.title));
    expect(titles).not.toContain("Mediterranean couscous");
  });

  it("blocks a custom kiwi allergy", () => {
    const recipe = RECIPES.find((item) => item.id === "kiwi-lime-chicken");
    expect(recipe).toBeTruthy();
    expect(
      recipeBlocked(recipe!, { ...ALEX_PROFILE, customAllergies: ["kiwi"], vegetarianFriendly: false }).blocked,
    ).toBe(true);
    expect(recipeBlocked(recipe!, ALEX_PROFILE).blocked).toBe(false);
  });
});

describe("grocery list", () => {
  it("adds matching rice amounts and parks pantry items", () => {
    const plan = buildFixturePlan({ ...alexRequest, pantry: [] }, "2026-10-02T00:00:00.000Z");
    const list = buildGroceryList(plan, []);
    const rice = list.sections.flatMap((section) => section.lines).find((line) => line.item === "rice");
    const cups = plan.days
      .flatMap((day) => day.meals)
      .flatMap((meal) => meal.ingredients)
      .filter((ingredient) => ingredient.item === "rice" && ingredient.amount === "1 cup").length;
    expect(rice?.amount).toBe(cups === 1 ? "1 cup" : `${cups} cups`);
    const withPantry = buildGroceryList(plan, ["rice"]);
    expect(withPantry.onHand.some((line) => line.item === "rice")).toBe(true);
    expect(withPantry.sections.flatMap((section) => section.lines).some((line) => line.item === "rice")).toBe(false);
  });
});

describe("prompt and api parsing", () => {
  it("puts a hard allergen ban in the system prompt", () => {
    const prompt = buildSystemPrompt(alexRequest);
    expect(prompt).toMatch(/NEVER/);
    expect(prompt.toLowerCase()).toContain("peanut");
    expect(prompt.toLowerCase()).toContain("shellfish");
    expect(formatCallout("Alex", resolveAllergens(ALEX_PROFILE))).toBe("SAFE for Alex: no peanut/shellfish");
  });

  it("rejects a nameless profile and reads fenced model json", () => {
    expect(() => parsePlanRequest({ profile: { name: " " } })).toThrow(PlanInputError);
    const parsed = extractJson('Sure\n```json\n{"days":[]}\n```');
    expect(parsed).toEqual({ days: [] });
  });

  it("discards a model meal that names peanut", () => {
    const repaired = repairOllamaPlan(
      {
        days: [
          {
            day: "Monday",
            meals: [
              {
                slot: "dinner",
                title: "Peanut noodles",
                minutes: 20,
                cuisine: "Thai",
                ingredients: [
                  { item: "peanut butter", amount: "2 tbsp", aisle: "pantry" },
                  { item: "rice noodles", amount: "6 oz", aisle: "pantry" },
                ],
                steps: ["Boil the noodles.", "Stir in peanut butter."],
              },
            ],
          },
        ],
      },
      { ...alexRequest, scope: "meal", day: "Monday", slot: "dinner" },
      "gemma2:2b",
    );
    expect(repaired).toBeNull();
  });
});
