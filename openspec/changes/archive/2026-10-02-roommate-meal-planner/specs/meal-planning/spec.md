## ADDED Requirements

### Requirement: Roommate profile
The planner SHALL accept a roommate name, catalog allergies, custom allergies, dislikes, cuisine preferences, a meals mode of dinners or a full day, a time budget, and free-text kitchen notes.

#### Scenario: Alex is the default roommate
- **WHEN** the app opens for the first time
- **THEN** the profile is Alex, with peanut and shellfish selected, vegetarian-friendly dinners, and a 30-minute budget

### Requirement: Hard allergen exclusion
The planner SHALL exclude every listed allergen from meal titles, blurbs, ingredients, steps, and tags.

#### Scenario: Peanut and shellfish never reach Alex
- **WHEN** a week is built for Alex
- **THEN** no meal mentions peanut, satay, or shellfish, and each meal is labeled `SAFE for Alex: no peanut/shellfish`

### Requirement: Local open-weight planning
The plan API SHALL call local Ollama, default model `gemma2:2b`, using `OLLAMA_BASE_URL` and `OLLAMA_MODEL` when set.

#### Scenario: Model output names a forbidden food
- **WHEN** the model returns peanut butter for a peanut-allergic roommate
- **THEN** that meal is discarded or the plan falls back to offline fixtures

### Requirement: Offline fixtures
When Ollama cannot produce a safe plan, the API SHALL return labeled offline fixtures that still pass the allergen scan.

#### Scenario: Ollama is not running
- **WHEN** a week is requested and the local model cannot be reached
- **THEN** the response source is `offline-fixtures`

### Requirement: Swap and regenerate
The planner SHALL replace one meal or one day without relaxing allergen rules.

#### Scenario: Swap Monday dinner
- **WHEN** a new Monday dinner is requested with current titles avoided
- **THEN** the replacement title differs and still carries the safety line

### Requirement: Not medical advice
The interface SHALL show a persistent notice that the plan is not medical advice.
