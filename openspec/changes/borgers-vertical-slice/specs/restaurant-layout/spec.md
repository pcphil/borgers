## Purpose

Defines the restaurant's physical space: the tile grid and lot, the catalogue of placeable objects, placement and removal rules, kitchen/dining zones, and the lot expansion.

## ADDED Requirements

### Requirement: Tile grid lot
The restaurant SHALL occupy a square-tile grid lot with a fixed initial size, a single entrance/exit tile on its edge, and no interior walls.

#### Scenario: New game lot
- **WHEN** a new game starts
- **THEN** the lot has its initial bounds, an entrance tile, and the starter layout placed inside it

### Requirement: Placeable object catalogue
The game SHALL provide a catalogue of placeable objects, each with a cost, a footprint (1x1, 2x1 or 2x2 tiles), a category, an unlock requirement, and — for usable objects (stations, counters, tables, fridge) — one or more access tiles where an agent stands to use it. Bins and decor have no access tiles. The v1 catalogue SHALL include: Grill, Fryer, Assembly counter, Soda fountain, Fridge, Register, Pickup counter, 2-seat table, 4-seat table, Trash bin, and decor items.

#### Scenario: Locked items are not placeable
- **WHEN** the player opens the build catalogue at 1 star
- **THEN** objects not yet unlocked are shown as locked with the star rating required, and cannot be placed

### Requirement: Placement rules
The player SHALL be able to place an object if all of the following hold: every footprint tile is inside the lot and unoccupied, every access tile is inside the lot and walkable, the placement does not cut off any existing object's access tile or the entrance from the rest of the walkable floor, and the player can afford it. Objects SHALL be rotatable in 90° steps. An invalid placement SHALL be shown as invalid with the reason before confirming.

#### Scenario: Valid placement
- **WHEN** the player places an unlocked, affordable grill on free kitchen tiles with a reachable access tile
- **THEN** the grill appears, its cost is deducted, and it is usable by staff

#### Scenario: Blocked access
- **WHEN** the player tries to place a table so that it covers the only access tile of the register
- **THEN** the placement is rejected and the preview shows that it would block access

#### Scenario: Insufficient funds
- **WHEN** the player cannot afford an object and is not allowed further debt for purchases
- **THEN** the placement is rejected with an "insufficient funds" reason

### Requirement: Move and sell
The player SHALL be able to move an existing object (subject to the placement rules, free of charge) or sell it for a partial refund of its purchase price. If the object is in use, its current task SHALL be cancelled, any ingredients consumed by that in-progress step SHALL be returned to stock, and affected agents SHALL re-plan.

#### Scenario: Selling a grill mid-cook
- **WHEN** the player sells a grill while a cook is grilling a patty on it
- **THEN** the grill is removed, the partial refund is credited, the patty is returned to stock, and the order step goes back into the queue for another grill

### Requirement: Zones
The player SHALL be able to paint tiles as Kitchen or Dining. Customers SHALL NOT enter Kitchen tiles. Kitchen stations SHALL only be placeable on Kitchen tiles, and tables only on Dining tiles. Register and Pickup counter SHALL straddle the boundary: their customer-side access tile SHALL be on Dining and their staff-side access tile SHALL be on Kitchen.

#### Scenario: Repainting under objects
- **WHEN** the player tries to repaint a tile under an existing grill to Dining
- **THEN** the repaint is rejected for that tile

### Requirement: Building while open
Building, moving, selling and zone painting SHALL be allowed at any time, including while the restaurant is open and agents are moving.

#### Scenario: Placing a table during service
- **WHEN** the player places a table on a tile a customer is walking across
- **THEN** the table is placed if otherwise valid, and the customer moves to the nearest free walkable tile and re-paths

### Requirement: Lot expansion
Once unlocked, the player SHALL be able to purchase a single lot expansion that permanently enlarges the buildable area.

#### Scenario: Buying the expansion
- **WHEN** the player has 4 stars and buys the expansion
- **THEN** the lot bounds grow, the new tiles are buildable, the cost is deducted, and the expansion cannot be bought again
