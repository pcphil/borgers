# inventory Specification

## Purpose

Defines ingredient stock: how much the restaurant holds, how it is replenished overnight, how storage capacity limits it, and what happens when an ingredient runs out.

## Requirements

### Requirement: Global ingredient stock
The restaurant SHALL hold a single global stock count per ingredient (bun, patty, cheese, lettuce, tomato, potato, soda syrup). Recipe steps SHALL consume ingredients when the step starts. Ingredients SHALL NOT spoil.

#### Scenario: Consumption on step start
- **WHEN** a grill step for a Classic burger starts
- **THEN** patty stock decreases by one at that moment

### Requirement: Storage capacity
Total stored ingredients SHALL be capped by a base capacity plus a fixed amount per placed Fridge. Deliveries that would exceed capacity SHALL be truncated to the cap and the player SHALL be told.

#### Scenario: Adding a fridge
- **WHEN** the player places a second fridge
- **THEN** the storage cap increases by one fridge's capacity

### Requirement: Reorder targets and auto-reorder
For each ingredient the player SHALL be able to set a target stock level and toggle auto-reorder. During night settlement, each auto-reorder ingredient SHALL be ordered up to its target, paid for, and delivered before the next opening. The player SHALL also be able to place a manual order that arrives the next morning.

#### Scenario: Nightly restock
- **WHEN** patty stock is 12, its target is 50, and auto-reorder is on at night
- **THEN** 38 patties are bought at unit cost and stock is 50 when the restaurant opens

### Requirement: Out-of-stock behavior
A menu item SHALL become unavailable for new orders while any ingredient it needs is out of stock. It SHALL become available again when stock arrives. Orders already taken whose ingredients were consumed SHALL still be completed.

#### Scenario: Running out of patties
- **WHEN** patty stock reaches zero during service
- **THEN** all burger items are shown greyed out on the menu, customers do not order them, and a "out of patties" hint is shown
