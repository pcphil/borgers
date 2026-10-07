## ADDED Requirements

### Requirement: Agent facing
Customers and staff SHALL face their direction of travel while walking and SHALL keep that facing when they stop, except while seated (facing the table) or working at a station. Facing SHALL NOT depend on the display frame rate or the game speed.

#### Scenario: Walking agent faces forward
- **WHEN** an agent walks along a path at any game speed on a display running at 30, 60 or 360 fps
- **THEN** the character's front points along its movement direction, never backwards or sideways

#### Scenario: Facing persists after stopping
- **WHEN** an agent finishes walking and stands still
- **THEN** it keeps facing the last direction it walked
