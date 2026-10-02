# grocery-export

How a week of meals becomes one shopping list.

## Requirements

### Requirement: Aggregated grocery list
The app SHALL combine ingredients across the generated week, sum amounts that share an item and unit, and group lines by aisle.

#### Scenario: Rice appears in more than one dinner
- **WHEN** several meals call for 1 cup of rice
- **THEN** the grocery list shows a single rice line with the cups added together

### Requirement: Pantry and allergy notes
Items that match the pantry SHALL be listed as already on hand instead of in the shop. The exported list SHALL name the roommate's allergens and state that the list is not medical advice.

#### Scenario: Rice is already on hand
- **WHEN** the pantry includes rice
- **THEN** rice appears under already on hand and not in the buy sections

#### Scenario: Export
- **WHEN** the shopper copies or downloads the list
- **THEN** the text includes the allergy watch and the combined quantities
