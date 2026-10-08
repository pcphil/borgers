# world-rendering Specification

## Purpose

Defines how the simulation is presented in 3D: the isometric camera and its controls, the visual representation of objects and agents, the day/night lighting, and the performance budget.

## Requirements

### Requirement: Isometric camera
The game SHALL use an orthographic isometric camera. The player SHALL be able to pan (drag or WASD/arrow keys), zoom (mouse wheel, clamped between limits) and rotate the view in 90° steps (Q/E). The camera SHALL NOT leave the area around the lot.

#### Scenario: Rotating the view
- **WHEN** the player presses E
- **THEN** the view rotates 90° around the current focus point and picking/placement still targets the correct tiles

### Requirement: Visual representation
Every placed object, staff member and customer SHALL be visible in the scene at its simulated position. Agent movement SHALL appear smooth between simulation ticks. Objects SHALL visually indicate state where relevant (e.g. food on a grill while cooking, dirty tables).

#### Scenario: Smooth movement at 1x
- **WHEN** a customer walks across the dining room
- **THEN** its motion is continuous, not jumping tile to tile per tick

### Requirement: Day/night lighting
Scene lighting SHALL change with the in-game time, transitioning from day to evening to night.

#### Scenario: Night
- **WHEN** the game enters night
- **THEN** the scene is visibly darker with interior lights on

### Requirement: Performance budget
The game SHALL maintain 60 frames per second on a mid-range laptop with integrated graphics with 100 agents and 150 placed objects, with shadows disabled. Shadows SHALL be toggleable from settings.

#### Scenario: Stress scene
- **WHEN** a test scene with 100 agents and 150 objects runs on the reference hardware with shadows off
- **THEN** the average frame rate is at least 60 fps

### Requirement: Agent facing
Customers and staff SHALL face their direction of travel while walking and SHALL keep that facing when they stop, except while seated (facing the table) or working at a station. Facing SHALL NOT depend on the display frame rate or the game speed.

#### Scenario: Walking agent faces forward
- **WHEN** an agent walks along a path at any game speed on a display running at 30, 60 or 360 fps
- **THEN** the character's front points along its movement direction, never backwards or sideways

#### Scenario: Facing persists after stopping
- **WHEN** an agent finishes walking and stands still
- **THEN** it keeps facing the last direction it walked

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

### Requirement: Seated posture
Customers who are eating SHALL be drawn sitting upright on their chair, facing the table, with their bodies not passing through the table or the chair. The seated figure SHALL look the same size as a standing one.

#### Scenario: Diners at a table
- **WHEN** a group is seated at a table
- **THEN** each member sits upright on a chair facing the table, with torso above the seat and no part of the body inside the table top

#### Scenario: Rotating the view
- **WHEN** the player rotates the view by 90 degrees
- **THEN** seated customers still sit on their chairs facing the table from every rotation

### Requirement: Takeout marker and chairs at shared tables
A takeout group SHALL show a small bag icon above it while it is on the map, so takeout and dine-in groups can be told apart; the icon SHALL NOT appear on dine-in groups. Every seated guest SHALL be drawn on the chair they hold in the simulation, so two diners at one table sit on two different chairs.

#### Scenario: Takeout group is marked
- **WHEN** a group has chosen takeout and is queuing, waiting for food or leaving
- **THEN** a bag icon is shown above the group, and dine-in groups have none

#### Scenario: Fallback to takeout
- **WHEN** a dine-in group falls back to takeout because no seat was available
- **THEN** a bag icon appears above the group from that moment

#### Scenario: Two solo diners at one table
- **WHEN** two solo diners are seated at the same 4-seat table
- **THEN** each sits upright on a different chair facing the table, and neither is drawn inside the other or inside the table
