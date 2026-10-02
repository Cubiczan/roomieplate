import { AISLE_LABELS, type Aisle, type Ingredient, type WeekPlan } from "@/lib/types";

export interface GroceryLine {
  item: string;
  amount: string;
  aisle: Aisle;
  recipes: string[];
  onHand: boolean;
}

export interface GrocerySection {
  aisle: Aisle;
  label: string;
  lines: GroceryLine[];
}

export interface GroceryList {
  heading: string;
  notes: string[];
  sections: GrocerySection[];
  onHand: GroceryLine[];
}

const PLURALS: Record<string, string> = {
  cup: "cups",
  clove: "cloves",
  can: "cans",
  handful: "handfuls",
  stalk: "stalks",
};

const SINGULARS: Record<string, string> = {
  cups: "cup",
  cloves: "clove",
  cans: "can",
  handfuls: "handful",
  stalks: "stalk",
  tablespoons: "tbsp",
  tablespoon: "tbsp",
  teaspoons: "tsp",
  teaspoon: "tsp",
};

function canonicalUnit(unit: string): string {
  const cleaned = unit.trim().toLowerCase().replace(/\.$/, "");
  return SINGULARS[cleaned] ?? cleaned;
}

function parseAmount(amount: string): { qty: number; unit: string } | null {
  const trimmed = amount.trim();
  const fraction = trimmed.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (!denominator) return null;
    return { qty: Number(fraction[1]) / denominator, unit: canonicalUnit(fraction[3] ?? "") };
  }
  const numeric = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!numeric) return null;
  return { qty: Number(numeric[1]), unit: canonicalUnit(numeric[2] ?? "") };
}

function formatQty(qty: number, unit: string): string {
  const rounded = Math.round(qty * 100) / 100;
  const shown = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  if (!unit) return shown;
  const label = rounded === 1 ? unit : (PLURALS[unit] ?? unit);
  return `${shown} ${label}`;
}

interface Bucket {
  item: string;
  aisle: Aisle;
  qty: number | null;
  unit: string;
  loose: string[];
  recipes: string[];
  onHand: boolean;
}

export function buildGroceryList(plan: WeekPlan, pantry: string[] = []): GroceryList {
  const buckets = new Map<string, Bucket>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        addIngredient(buckets, ingredient, meal.title, pantry);
      }
    }
  }

  const lines = [...buckets.values()].map(toLine);
  const buy = lines.filter((line) => !line.onHand);
  const onHand = lines.filter((line) => line.onHand);
  const order: Aisle[] = ["produce", "protein", "pantry", "dairy", "bakery", "other"];
  const sections = order
    .map((aisle) => ({
      aisle,
      label: AISLE_LABELS[aisle],
      lines: buy.filter((line) => line.aisle === aisle).sort((a, b) => a.item.localeCompare(b.item)),
    }))
    .filter((section) => section.lines.length > 0);

  const avoided = plan.avoidedAllergens.length
    ? plan.avoidedAllergens.map((item) => item.toLowerCase()).join(", ")
    : "none listed";

  return {
    heading: `Grocery list for ${plan.roommateName}`,
    notes: [
      "Quantities serve 2.",
      `Allergy watch: ${avoided}. Leave those foods off the list and check labels on spices, sauces, and breads.`,
      "Not medical advice. A shared kitchen can still cross-contact a safe recipe.",
    ],
    sections,
    onHand: onHand.sort((a, b) => a.item.localeCompare(b.item)),
  };
}

function addIngredient(buckets: Map<string, Bucket>, ingredient: Ingredient, recipe: string, pantry: string[]) {
  const key = ingredient.item.trim().toLowerCase();
  const onHand = Boolean(ingredient.fromPantry) || matchesPantry(ingredient.item, pantry);
  const parsed = parseAmount(ingredient.amount);
  const existing = buckets.get(key);

  if (!existing) {
    buckets.set(key, {
      item: ingredient.item,
      aisle: ingredient.aisle,
      qty: parsed?.qty ?? null,
      unit: parsed?.unit ?? "",
      loose: parsed ? [] : [ingredient.amount],
      recipes: [recipe],
      onHand,
    });
    return;
  }

  if (!existing.recipes.includes(recipe)) existing.recipes.push(recipe);
  existing.onHand = existing.onHand || onHand;
  if (parsed && existing.qty !== null && existing.unit === parsed.unit && existing.loose.length === 0) {
    existing.qty += parsed.qty;
    return;
  }
  existing.loose.push(ingredient.amount);
  if (existing.qty !== null) {
    existing.loose.unshift(formatQty(existing.qty, existing.unit));
    existing.qty = null;
    existing.unit = "";
  }
}

function toLine(bucket: Bucket): GroceryLine {
  const summed = bucket.qty === null ? "" : formatQty(bucket.qty, bucket.unit);
  const parts = [summed, ...bucket.loose].filter(Boolean);
  return {
    item: bucket.item,
    amount: parts.join(" + "),
    aisle: bucket.aisle,
    recipes: bucket.recipes,
    onHand: bucket.onHand,
  };
}

export function matchesPantry(item: string, pantry: string[]): boolean {
  const haystack = item.toLowerCase();
  return pantry.some((entry) => {
    const needle = entry.trim().toLowerCase();
    return needle.length >= 3 && haystack.includes(needle);
  });
}

export function formatGroceryText(list: GroceryList): string {
  const lines = [list.heading, ...list.notes, ""];
  for (const section of list.sections) {
    lines.push(section.label.toUpperCase());
    for (const line of section.lines) {
      lines.push(`- ${line.item} · ${line.amount}`);
    }
    lines.push("");
  }
  if (list.onHand.length > 0) {
    lines.push("ALREADY ON HAND");
    for (const line of list.onHand) {
      lines.push(`- ${line.item} · ${line.amount}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}
