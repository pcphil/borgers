## Purpose

Defines how the simulation is presented in 3D: the isometric camera and its controls, the visual representation of objects and agents, the day/night lighting, and the performance budget.

## ADDED Requirements

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
