## Purpose

Defines how food is produced: menu items as data-driven recipes, kitchen stations and their upgrade tiers, the counter-service order pipeline, and food quality.

## ADDED Requirements

### Requirement: Recipes as data
Each menu item SHALL be defined as data: a name, base value, appeal, unlock requirement, and an ordered list of steps, where each step names a station type, a base duration, and the ingredients it consumes. The v1 menu SHALL contain Classic burger, Cheeseburger, Double burger, Fries and Soda. Adding a new menu item SHALL require only new data, not new simulation logic.

#### Scenario: Classic burger recipe
- **WHEN** a Classic burger is ordered
- **THEN** it is produced by a grill step consuming a patty, followed by an assembly step consuming a bun, lettuce and tomato

### Requirement: Menu management
The player SHALL be able to enable or disable each unlocked menu item and set its price. Customers SHALL only order enabled, in-stock items.

#### Scenario: Disabling an item
- **WHEN** the player disables Fries
- **THEN** new orders no longer include Fries, and existing orders containing Fries are still fulfilled

### Requirement: Order pipeline
An order SHALL be created when a cashier finishes taking it at a register. Each item's recipe steps SHALL be queued as tasks for the matching station type and role. Steps SHALL execute in order per item. When all items are complete, an Assembler SHALL bring the order to a pickup counter and call it, and the customer group SHALL collect it.

#### Scenario: Full order flow
- **WHEN** a customer orders a Classic burger and a Soda
- **THEN** a cook grills the patty, an assembler assembles the burger, the soda is poured at the soda fountain, the order is placed on the pickup counter, and the customer collects it

#### Scenario: Missing station
- **WHEN** an order needs a fryer and none exists
- **THEN** the item cannot be produced, the menu item is unavailable for new orders, and a hint tells the player a fryer is missing

### Requirement: Station capacity and tiers
Each station SHALL process a limited number of steps at once (its slots). Kitchen stations SHALL have tier 1 and, where unlocked, tier 2. Tier 2 SHALL have more slots and/or a shorter step duration and higher quality contribution. Upgrading SHALL replace the station in place for the upgrade cost.

#### Scenario: Grill capacity
- **WHEN** a tier-1 grill has all slots busy
- **THEN** further grill steps wait for a free slot on any grill

#### Scenario: Upgrade in place
- **WHEN** the player upgrades an unlocked grill to tier 2
- **THEN** the grill keeps its position and rotation, the cost is deducted, and later steps on it use tier-2 stats

### Requirement: Step duration and food quality
A step's actual duration SHALL decrease with the working staff member's speed stat. Each completed item SHALL have a quality score derived from the cooking skill of the staff who made it and the tiers of the stations used.

#### Scenario: Skilled cook on upgraded grill
- **WHEN** a high-skill cook makes a burger on a tier-2 grill
- **THEN** the burger's quality is higher than one made by a low-skill cook on a tier-1 grill
