import type { Recipe, RoommateProfile } from "@/lib/types";

export interface AllergenDefinition {
  id: string;
  label: string;
  keywords: string[];
}

export const ALLERGEN_CATALOG: AllergenDefinition[] = [
  {
    id: "peanut",
    label: "Peanut",
    keywords: ["peanut", "peanuts", "peanut butter", "groundnut", "groundnuts", "satay", "arachis"],
  },
  {
    id: "tree-nuts",
    label: "Tree nuts",
    keywords: [
      "almond",
      "almonds",
      "cashew",
      "cashews",
      "walnut",
      "walnuts",
      "pecan",
      "pecans",
      "pistachio",
      "pistachios",
      "hazelnut",
      "hazelnuts",
      "macadamia",
      "brazil nut",
      "brazil nuts",
      "pine nut",
      "pine nuts",
      "pesto",
    ],
  },
  {
    id: "shellfish",
    label: "Shellfish",
    keywords: [
      "shellfish",
      "shrimp",
      "prawn",
      "prawns",
      "crab",
      "lobster",
      "crayfish",
      "crawfish",
      "scallop",
      "scallops",
      "mussel",
      "mussels",
      "clam",
      "clams",
      "oyster",
      "oysters",
      "langoustine",
    ],
  },
  {
    id: "fish",
    label: "Fish",
    keywords: [
      "fish",
      "salmon",
      "tuna",
      "cod",
      "anchovy",
      "anchovies",
      "sardine",
      "sardines",
      "tilapia",
      "halibut",
      "fish sauce",
    ],
  },
  {
    id: "dairy",
    label: "Dairy",
    keywords: [
      "milk",
      "cheese",
      "yogurt",
      "yoghurt",
      "cream",
      "butter",
      "ghee",
      "whey",
      "casein",
      "parmesan",
      "feta",
      "mozzarella",
      "cheddar",
      "ricotta",
    ],
  },
  {
    id: "egg",
    label: "Egg",
    keywords: ["egg", "eggs", "mayonnaise", "mayo"],
  },
  {
    id: "gluten",
    label: "Gluten",
    keywords: [
      "gluten",
      "wheat",
      "bread",
      "pasta",
      "flour",
      "couscous",
      "naan",
      "pita",
      "barley",
      "rye",
      "seitan",
      "breadcrumb",
      "breadcrumbs",
      "soy sauce",
      "udon",
      "ramen",
      "panko",
      "farro",
      "orzo",
      "soba",
    ],
  },
  {
    id: "soy",
    label: "Soy",
    keywords: ["soy", "soya", "tofu", "edamame", "miso", "tempeh", "tamari", "soy sauce"],
  },
  {
    id: "sesame",
    label: "Sesame",
    keywords: ["sesame", "tahini"],
  },
];

export interface ResolvedAllergen {
  id: string;
  label: string;
  keywords: string[];
}

const CATALOG_BY_ID = new Map(ALLERGEN_CATALOG.map((item) => [item.id, item]));

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(normalizedTerm)}(?:\\s|$)`);
  return pattern.test(text);
}

function textForAllergen(text: string, allergenId: string): string {
  if (allergenId === "dairy") {
    return text
      .replace(/\b(coconut|oat|almond|soy|rice|cashew) milk\b/g, " ")
      .replace(/\bcoconut cream\b/g, " ")
      .replace(/\b(cocoa|peanut|almond|cashew|sunflower seed|sunflower) butter\b/g, " ")
      .replace(/\bbutter lettuce\b/g, " ");
  }
  if (allergenId === "egg") {
    return text.replace(/\beggplants?\b/g, " ");
  }
  if (allergenId === "gluten") {
    return text
      .replace(/\b(rice|chickpea|lentil|corn) pasta\b/g, " ")
      .replace(/\brice noodles?\b/g, " ")
      .replace(/\bcauliflower\b/g, " ")
      .replace(/\bcorn tortillas?\b/g, " ");
  }
  return text;
}

export function resolveAllergens(
  profile: Pick<RoommateProfile, "allergies" | "customAllergies">,
): ResolvedAllergen[] {
  const resolved: ResolvedAllergen[] = [];
  const seen = new Set<string>();

  for (const id of profile.allergies) {
    const definition = CATALOG_BY_ID.get(id);
    if (!definition || seen.has(definition.id)) continue;
    seen.add(definition.id);
    resolved.push(definition);
  }

  for (const custom of profile.customAllergies) {
    const label = custom.trim().replace(/\s+/g, " ");
    const keyword = normalizeText(label);
    if (keyword.length < 3 || seen.has(keyword)) continue;
    seen.add(keyword);
    resolved.push({
      id: `custom:${keyword}`,
      label,
      keywords: [keyword],
    });
  }

  return resolved;
}

export interface AllergenHit {
  allergenId: string;
  label: string;
  term: string;
}

export function findAllergenHits(text: string, allergens: ResolvedAllergen[]): AllergenHit[] {
  const normalized = normalizeText(text);
  const hits: AllergenHit[] = [];

  for (const allergen of allergens) {
    const haystack = textForAllergen(normalized, allergen.id);
    for (const keyword of allergen.keywords) {
      if (containsTerm(haystack, keyword)) {
        hits.push({ allergenId: allergen.id, label: allergen.label, term: keyword });
        break;
      }
    }
  }

  return hits;
}

export function formatCallout(name: string, allergens: ResolvedAllergen[]): string {
  const who = name.trim() || "your roommate";
  if (allergens.length === 0) {
    return `No allergy exclusions on file for ${who}. Verify every label.`;
  }
  const list = allergens.map((allergen) => allergen.label.toLowerCase()).join("/");
  return `SAFE for ${who}: no ${list}`;
}

export function recipeText(recipe: Pick<Recipe, "title" | "blurb" | "cuisine" | "ingredients" | "steps" | "tags">): string {
  return [
    recipe.title,
    recipe.blurb,
    recipe.cuisine,
    ...recipe.tags,
    ...recipe.steps,
    ...recipe.ingredients.map((ingredient) => `${ingredient.amount} ${ingredient.item}`),
  ].join(" ");
}

export function mealText(meal: {
  title: string;
  blurb?: string;
  cuisine?: string;
  tags?: string[];
  steps?: string[];
  ingredients?: { amount: string; item: string }[];
}): string {
  return [
    meal.title,
    meal.blurb ?? "",
    meal.cuisine ?? "",
    ...(meal.tags ?? []),
    ...(meal.steps ?? []),
    ...(meal.ingredients ?? []).map((ingredient) => `${ingredient.amount} ${ingredient.item}`),
  ].join(" ");
}

export function mentionsAny(text: string, phrases: string[]): boolean {
  const normalized = normalizeText(text);
  return phrases.some((phrase) => {
    const keyword = normalizeText(phrase);
    return keyword.length >= 3 && containsTerm(normalized, keyword);
  });
}
