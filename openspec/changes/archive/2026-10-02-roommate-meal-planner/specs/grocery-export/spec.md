## ADDED Requirements

### Requirement: Aggregated grocery list
The app SHALL combine ingredients across the week and sum amounts that share an item and unit.

#### Scenario: Rice appears in more than one dinner
- **WHEN** several meals call for 1 cup of rice
- **THEN** the grocery list shows a single rice line with the cups added together

### Requirement: Pantry and allergy notes
Pantry matches SHALL be listed as already on hand. The export SHALL name the roommate's allergens.

#### Scenario: Rice is already on hand
- **WHEN** the pantry includes rice
- **THEN** rice is not in the buy sections

#### Scenario: Export
- **WHEN** the shopper copies or downloads the list
- **THEN** the text includes the allergy watch and the combined quantities
