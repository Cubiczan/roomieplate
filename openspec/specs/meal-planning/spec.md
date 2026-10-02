# meal-planning

How RoomiePlate turns a roommate profile into an allergen-safe week.

## Requirements

### Requirement: Roommate profile
The planner SHALL accept a roommate name, catalog allergies, custom allergies, dislikes, cuisine preferences, a meals mode of dinners or a full day, a time budget, and free-text kitchen notes.

#### Scenario: Alex is the default roommate
- **WHEN** the app opens for the first time
- **THEN** the profile is Alex, with peanut and shellfish selected, vegetarian-friendly dinners, and a 30-minute budget

### Requirement: Hard allergen exclusion
The planner SHALL exclude every listed allergen from meal titles, blurbs, ingredients, steps, and tags. Catalog matching SHALL be word-based so that eggplant is not treated as egg, cauliflower is not treated as flour, and coconut milk is not treated as dairy.

#### Scenario: Peanut and shellfish never reach Alex
- **WHEN** a week is built for Alex
- **THEN** no meal mentions peanut, satay, or shellfish, and each meal is labeled `SAFE for Alex: no peanut/shellfish`

#### Scenario: A custom allergy is a whole word
- **WHEN** the profile lists kiwi as a custom allergy
- **THEN** a recipe whose ingredients include kiwi is rejected

### Requirement: Local open-weight planning
The plan API SHALL call a local Ollama OpenAI-compatible endpoint, defaulting to `http://127.0.0.1:11434` and model `gemma2:2b`, overridable with `OLLAMA_BASE_URL` and `OLLAMA_MODEL`. The system prompt SHALL forbid listed allergens. The safety line on each meal SHALL be written by the app after a scan, not copied from the model.

#### Scenario: Model output names a forbidden food
- **WHEN** the model returns a meal whose ingredients include peanut butter for a peanut-allergic roommate
- **THEN** that meal is discarded and an offline fixture is used, or the whole response falls back to fixtures

### Requirement: Offline fixtures
When Ollama is unreachable, too slow, or returns an unusable plan, the API SHALL return deterministic allergen-checked recipes and the interface SHALL label them as offline fixtures.

#### Scenario: Ollama is not running
- **WHEN** a week is requested and the local model cannot be reached
- **THEN** the response source is `offline-fixtures` and every meal still passes the allergen scan

### Requirement: Swap and regenerate
The planner SHALL replace one meal or one day without relaxing allergen rules, avoiding titles already on the rest of the week when another safe recipe exists.

#### Scenario: Swap Monday dinner
- **WHEN** the caller asks for a new Monday dinner and passes the current titles to avoid
- **THEN** the replacement title differs and still carries the roommate safety line

### Requirement: Not medical advice
The interface SHALL show a persistent notice that the plan is not medical advice and that labels and cross-contact still have to be checked.
