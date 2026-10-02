# Design: RoomiePlate

## Context
Alex needs weeknight dinners under 30 minutes with peanut and shellfish excluded, vegetarian when that still fits. The Hacktoberfest weekend build has to demo without a GPU and still treat local Gemma as the real path.

## Goals
- Allergen exclusion is enforced in code, after any model output.
- Ollama is reached through its OpenAI-compatible API, with `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.
- Fixtures are deterministic, labeled, and safe for the same profile.
- The UI can generate a week, swap a meal, regenerate a day, and export groceries.

## Non-Goals
- Accounts, sync, payments, clinical diet advice, or a hosted LLM provider.

## Decisions
- Next.js App Router route handlers own the model call so the browser does not depend on Ollama CORS.
- The safety callout is formatted in the app from the profile. Model text is never trusted for that sentence.
- Word-boundary keyword lists handle the catalog. Custom allergies are extra whole words of length at least 3.
- Fixture selection is a seeded score: under the time budget, vegetarian preference, cuisine match, pantry overlap, then a small hash jitter so swaps change.
- If the model returns a partial week, unsafe meals are replaced one at a time. If none of the model meals survive, the response is fixtures only.
- Profiles live in `localStorage` on this browser.

## Risks
- A small model can hide an allergen behind a brand name the keyword list does not know. The UI says to verify labels for that reason.
- Keyword scans can over-block (the word "cheese" in a sentence about a dish that does not use it). Fixture copy avoids naming allergens the dish does not contain.
- A public deployment processes the profile on the app server even in fixture mode. Privacy of the local-model path assumes `npm run dev` beside Ollama.

## Migration Plan
Greenfield. No migrated data.
