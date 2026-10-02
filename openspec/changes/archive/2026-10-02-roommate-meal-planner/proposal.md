# Proposal: Roommate allergy-aware meal planner

## Why
Shared kitchens need a plan that treats a roommate's allergies as a hard constraint. Hosted chat models are a poor place to send that constraint. RoomiePlate keeps the planning step on a local open-weight model and still runs when that model is switched off.

## What Changes
- A Next.js planner for one roommate profile, a pantry, a week of meals, swaps, and a grocery export.
- `POST /api/plan` calls Ollama (`gemma2:2b` by default) with a strict allergen prompt and scans the JSON before showing it.
- Deterministic offline fixtures, clearly labeled, when Ollama cannot produce a safe plan.
- A persistent not-medical-advice notice.

## Capabilities
### New Capabilities
- `meal-planning`: profile, local model, allergen scan, fixtures, swap, and regenerate.
- `grocery-export`: aggregated list, pantry matches, allergy note, copy and download.

## Impact
New app. No auth, payments, or database. Dietary text stays on the machine running the app when Ollama is local; public fixture deploys do not call a hosted LLM but are not a private health vault.
