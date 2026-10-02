export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type MealSlot = "breakfast" | "lunch" | "dinner";
export type MealMode = "dinners" | "all";
export type Aisle = "produce" | "protein" | "pantry" | "dairy" | "bakery" | "other";
export type PlanScope = "week" | "day" | "meal";
export type PlanOrigin = "ollama" | "offline-fixtures";

export interface RoommateProfile {
  name: string;
  allergies: string[];
  customAllergies: string[];
  dislikes: string[];
  cuisines: string[];
  vegetarianFriendly: boolean;
  meals: MealMode;
  timeBudgetMinutes: number;
  notes: string;
}

export interface Ingredient {
  item: string;
  amount: string;
  aisle: Aisle;
  fromPantry?: boolean;
}

export interface Meal {
  id: string;
  slot: MealSlot;
  title: string;
  blurb: string;
  minutes: number;
  cuisine: string;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  allergenCallout: string;
  tags: string[];
  origin: PlanOrigin;
}

export interface DayPlan {
  day: Weekday;
  meals: Meal[];
}

export interface WeekPlan {
  generatedAt: string;
  scope: PlanScope;
  source: PlanOrigin;
  model: string | null;
  roommateName: string;
  avoidedAllergens: string[];
  days: DayPlan[];
  repairs: number;
  repairNotes: string[];
}

export interface PlanRequest {
  profile: RoommateProfile;
  pantry: string[];
  scope: PlanScope;
  day?: Weekday;
  slot?: MealSlot;
  avoidTitles: string[];
  nonce: number;
}

export interface Recipe {
  id: string;
  title: string;
  blurb: string;
  slot: MealSlot;
  minutes: number;
  cuisine: string;
  vegetarian: boolean;
  contains: string[];
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
}

export const AISLE_LABELS: Record<Aisle, string> = {
  produce: "Produce",
  protein: "Proteins and legumes",
  pantry: "Pantry",
  dairy: "Dairy and eggs",
  bakery: "Bakery",
  other: "Other",
};

export const CUISINES = [
  "Mediterranean",
  "Mexican",
  "Indian",
  "Japanese",
  "Italian",
  "American",
  "Thai",
] as const;

export const DISCLAIMER =
  "Not medical advice. RoomiePlate only excludes allergens it was told about. Verify every package label and watch for cross-contact in a shared kitchen.";
