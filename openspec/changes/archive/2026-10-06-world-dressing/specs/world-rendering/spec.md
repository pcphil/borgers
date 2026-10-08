## ADDED Requirements

### Requirement: Street and approach lane
The scene SHALL show a street along the front of the lot that extends to the edge of the visible ground on both sides, with a lane on which arriving and departing customers walk between the street ends and the door. Customers on the street SHALL be visible and animated like other agents.

#### Scenario: Customers come from the street
- **WHEN** a customer group arrives
- **THEN** it is seen entering from an end of the street and walking along it to the door

### Requirement: Perimeter walls and door
The lot SHALL be enclosed by perimeter walls on its boundary, with a door opening at the entrance. The walls facing the camera SHALL be low or translucent so the interior stays visible, and the walls facing away SHALL be full height; which walls are which SHALL follow the current view rotation. The door SHALL animate open when a customer or staff member is at or approaching it and close again after they have passed. When the lot is expanded, the walls SHALL move out to the new boundary. There SHALL be no wall between the kitchen and dining zones.

#### Scenario: Interior stays visible
- **WHEN** the game is viewed at the default rotation
- **THEN** the walls nearest the camera do not hide tiles, objects or agents inside the lot

#### Scenario: Rotating the view
- **WHEN** the player rotates the view by 90 degrees
- **THEN** the walls that now face the camera become low and the walls that now face away become full height

#### Scenario: Door opens for a customer
- **WHEN** a customer walks to the door to enter or leave
- **THEN** the door opens as they arrive and closes after they have passed through

#### Scenario: Expansion
- **WHEN** the player buys the lot expansion
- **THEN** the walls and door are drawn on the new, larger boundary with the door still at the entrance
