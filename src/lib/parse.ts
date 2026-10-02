import { ALLERGEN_CATALOG } from "@/lib/allergens";
import {
  CUISINES,
  WEEKDAYS,
  type MealMode,
  type MealSlot,
  type PlanRequest,
  type PlanScope,
  type RoommateProfile,
  type Weekday,
} from "@/lib/types";

export class PlanInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanInputError";
  }
}

const ALLERGEN_IDS = new Set(ALLERGEN_CATALOG.map((item) => item.id));
const CUISINE_SET = new Set<string>(CUISINES);
const WEEKDAY_SET = new Set<string>(WEEKDAYS);
const SLOTS = new Set<MealSlot>(["breakfast", "lunch", "dinner"]);

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PlanInputError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const entry of value) {
    const cleaned = cleanString(entry, maxLength);
    if (!cleaned || items.includes(cleaned)) continue;
    items.push(cleaned);
    if (items.length >= maxItems) break;
  }
  return items;
}

export function parsePlanRequest(body: unknown): PlanRequest {
  const record = asRecord(body, "Request");
  const profileRecord = asRecord(record.profile, "Profile");
  const name = cleanString(profileRecord.name, 40);
  if (!name) throw new PlanInputError("Add the roommate's name before generating a plan.");

  const allergies = stringList(profileRecord.allergies, 12, 40).filter((id) => ALLERGEN_IDS.has(id));
  const customAllergies = stringList(profileRecord.customAllergies, 8, 40).filter((item) => item.length >= 3);
  const dislikes = stringList(profileRecord.dislikes, 12, 40).filter((item) => item.length >= 3);
  const cuisines = stringList(profileRecord.cuisines, 8, 40).filter((item) => CUISINE_SET.has(item));
  const notes = cleanString(profileRecord.notes, 400) ?? "";

  const meals: MealMode = profileRecord.meals === "all" ? "all" : "dinners";
  const timeValue = profileRecord.timeBudgetMinutes;
  const timeBudgetMinutes =
    typeof timeValue === "number" && Number.isFinite(timeValue) ? Math.round(timeValue) : 30;
  if (timeBudgetMinutes < 10 || timeBudgetMinutes > 90) {
    throw new PlanInputError("Time budget needs to be between 10 and 90 minutes.");
  }

  const profile: RoommateProfile = {
    name,
    allergies,
    customAllergies,
    dislikes,
    cuisines,
    vegetarianFriendly: profileRecord.vegetarianFriendly !== false,
    meals,
    timeBudgetMinutes,
    notes,
  };

  const scope = parseScope(record.scope);
  const day = parseDay(record.day);
  const slot = parseSlot(record.slot);
  if ((scope === "day" || scope === "meal") && !day) {
    throw new PlanInputError("Choose a day to regenerate.");
  }
  if (scope === "meal" && !slot) {
    throw new PlanInputError("Choose a meal to swap.");
  }

  const nonceValue = record.nonce;
  const nonce =
    typeof nonceValue === "number" && Number.isFinite(nonceValue) ? Math.max(0, Math.round(nonceValue)) : 0;

  return {
    profile,
    pantry: stringList(record.pantry, 30, 40),
    scope,
    day,
    slot,
    avoidTitles: stringList(record.avoidTitles, 40, 80),
    nonce,
  };
}

function parseScope(value: unknown): PlanScope {
  if (value === "day" || value === "meal" || value === "week") return value;
  return "week";
}

function parseDay(value: unknown): Weekday | undefined {
  return typeof value === "string" && WEEKDAY_SET.has(value) ? (value as Weekday) : undefined;
}

function parseSlot(value: unknown): MealSlot | undefined {
  return typeof value === "string" && SLOTS.has(value as MealSlot) ? (value as MealSlot) : undefined;
}
