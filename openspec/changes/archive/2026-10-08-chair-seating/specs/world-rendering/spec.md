## ADDED Requirements

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
