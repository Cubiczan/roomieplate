import type { RoommateProfile } from "@/lib/types";

export const ALEX_PROFILE: RoommateProfile = {
  name: "Alex",
  allergies: ["peanut", "shellfish"],
  customAllergies: [],
  dislikes: ["olives"],
  cuisines: ["Mediterranean", "Mexican", "Indian", "Japanese"],
  vegetarianFriendly: true,
  meals: "dinners",
  timeBudgetMinutes: 30,
  notes: "Quick weeknight dinners. Vegetarian is welcome when it still tastes like dinner.",
};

export const ALEX_PANTRY = ["rice", "lemon", "garlic", "chickpeas", "spinach", "black beans"];

export const PANTRY_SUGGESTIONS = [
  "rice",
  "lemon",
  "garlic",
  "chickpeas",
  "spinach",
  "black beans",
  "oats",
  "tortillas",
  "lentils",
  "olive oil",
  "tofu",
  "quinoa",
];

export const STORAGE_KEY = "roomieplate.v1";
