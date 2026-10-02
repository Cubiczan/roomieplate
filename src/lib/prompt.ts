import { resolveAllergens } from "@/lib/allergens";
import { slotsFor } from "@/lib/planner";
import { WEEKDAYS, type PlanRequest } from "@/lib/types";

export function buildSystemPrompt(request: PlanRequest): string {
  const allergens = resolveAllergens(request.profile);
  const avoided = allergens.map((allergen) => allergen.label.toLowerCase());
  const slots = request.scope === "meal" && request.slot ? [request.slot] : slotsFor(request.profile);
  const days = request.scope === "week" ? WEEKDAYS.join(", ") : (request.day ?? "Monday");

  return [
    "You are RoomiePlate, a local on-device meal planner. You write home-cooking plans for one roommate.",
    "Dietary constraints are health-sensitive. Follow them exactly. Never mention that you are a cloud service.",
    "",
    "HARD RULES:",
    `- NEVER include these allergens, or their sauces, pastes, flours, oils, butters, or garnishes: ${avoided.join(", ") || "none listed"}.`,
    "- If a cuisine usually relies on a forbidden ingredient (peanut sauce, satay, shrimp paste, lobster stock), choose a different dish.",
    "- Do not list a forbidden ingredient and then say to omit it. Omit the dish.",
    `- Avoid disliked foods when you can: ${request.profile.dislikes.join(", ") || "none"}.`,
    `- Keep every meal at or under ${request.profile.timeBudgetMinutes} minutes of active cooking.`,
    request.profile.vegetarianFriendly
      ? "- Prefer vegetarian meals. Use meat or fish only if the request leaves you no vegetarian option that still meets the allergen rules."
      : "- Meat and fish are allowed only when they are not listed allergens.",
    `- Lean toward these cuisines: ${request.profile.cuisines.join(", ") || "simple home cooking"}.`,
    request.profile.notes ? `- Roommate note: ${request.profile.notes}` : "",
    "- This is not medical advice, and you still must exclude every listed allergen.",
    "- Output one JSON object and nothing else. No markdown fences.",
    "",
    "JSON shape:",
    '{"days":[{"day":"Monday","meals":[{"slot":"dinner","title":"string","blurb":"string","minutes":25,"cuisine":"string","ingredients":[{"item":"chickpeas","amount":"1 can","aisle":"pantry"}],"steps":["string"],"tags":["vegetarian"]}]}]}',
    "",
    `Days required: ${days}.`,
    `Each included day needs exactly these slots, in order: ${slots.join(", ")}.`,
    "aisle must be one of: produce, protein, pantry, dairy, bakery, other.",
    "Write ingredients as plain food names. Quantities serve 2.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildUserPrompt(request: PlanRequest): string {
  const pantry = request.pantry.length ? request.pantry.join(", ") : "nothing special";
  const avoid = request.avoidTitles.length
    ? `Do not repeat these dishes: ${request.avoidTitles.join("; ")}.`
    : "Vary the meals so the week does not repeat a title.";

  if (request.scope === "meal") {
    return `Plan one ${request.slot} for ${request.day} for ${request.profile.name}. Pantry on hand: ${pantry}. ${avoid}`;
  }
  if (request.scope === "day") {
    return `Plan only ${request.day} for ${request.profile.name}. Pantry on hand: ${pantry}. ${avoid}`;
  }
  return `Plan Monday through Sunday for ${request.profile.name}. Pantry on hand: ${pantry}. ${avoid}`;
}
