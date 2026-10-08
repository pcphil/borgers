## MODIFIED Requirements

### Requirement: Versioned saves and migration
Every save SHALL include a schema version. Loading a save with an older version SHALL migrate it to the current version, including converting a table's single occupant into per-chair occupancy. Loading a save with a newer, unknown version SHALL be refused with a message.

#### Scenario: Old save after update
- **WHEN** a save from schema version 1 is loaded by a game at version 2
- **THEN** it is migrated and loads successfully

#### Scenario: Save from the future
- **WHEN** a save with a version higher than the game supports is loaded
- **THEN** loading is refused with an explanatory message

#### Scenario: Seated group in a version 3 save
- **WHEN** a version 3 save with a group eating at a table is loaded
- **THEN** the group still sits at that table on its first chairs, the table is not shown as free, and the day continues without errors
