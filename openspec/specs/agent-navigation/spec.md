# agent-navigation Specification

## Purpose

Defines how customers and staff move around the restaurant: pathfinding over the grid, zone restrictions, reacting to layout changes, and the physical queue at the register.

## Requirements

### Requirement: Grid pathfinding
Customers and staff SHALL move between tiles along shortest walkable paths. Tiles covered by object footprints SHALL NOT be walkable. Agents SHALL be allowed to pass through each other.

#### Scenario: Route around objects
- **WHEN** a staff member must reach a fryer and a counter lies between them
- **THEN** the staff member walks around the counter on walkable tiles

### Requirement: Zone restrictions
Customers SHALL only path over Dining tiles and the entrance. Staff SHALL be allowed to path over any walkable tile.

#### Scenario: Customer cannot shortcut through the kitchen
- **WHEN** the shortest route to a seat would cross Kitchen tiles
- **THEN** the customer takes the longer route through Dining tiles

### Requirement: Re-pathing on layout change
When the layout changes, any agent whose current path is affected SHALL compute a new path. If its target becomes unreachable, the agent SHALL abandon that target and choose a new action (a customer gets angry and leaves; a staff member drops the task back to its queue).

#### Scenario: Path blocked mid-walk
- **WHEN** the player places an object onto a customer's planned path
- **THEN** the customer re-paths around it without teleporting

#### Scenario: Target unreachable
- **WHEN** the only path to a customer's seat is blocked
- **THEN** the customer gives up on that seat and seeks another or leaves with a "couldn't reach seat" complaint

### Requirement: Register queue
Each register SHALL have an ordered line of queue slots extending from its customer-side access tile into the dining area. Arriving customers SHALL take the last free slot and advance as the line moves. When all slots are full, newly arriving customers SHALL leave with a "line too long" complaint.

#### Scenario: Line advances
- **WHEN** the customer at the front of the line finishes ordering
- **THEN** every customer behind moves up one slot

#### Scenario: Full line
- **WHEN** a customer arrives and every queue slot of every register is taken
- **THEN** the customer leaves immediately and counts as a lost customer
