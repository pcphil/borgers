# save-system Specification

## Purpose

Defines how games persist in the browser: save slots, autosave and manual save, loading, file export/import, and forward compatibility via versioned saves.

## Requirements

### Requirement: Save slots
The game SHALL support multiple named save slots stored locally in the browser, plus one dedicated autosave slot. Each slot SHALL show its restaurant day, cash, star rating and last-saved time.

#### Scenario: Listing slots
- **WHEN** the player opens the load menu
- **THEN** all slots are listed with day, cash, stars and timestamp

### Requirement: Complete and exact save
A save SHALL capture the complete game state — including layout, agents, orders in progress, inventory, finances, RNG state, clock and settings that belong to the game — so that loading it continues exactly where it left off.

#### Scenario: Save mid-service
- **WHEN** the player saves during service with orders in progress, then loads that save
- **THEN** customers, staff and orders resume exactly where they were

### Requirement: Autosave and manual save
The game SHALL autosave to the autosave slot during each night settlement when autosave is enabled. The player SHALL be able to save manually to any slot at any time, and SHALL be asked to confirm before overwriting a non-empty slot.

#### Scenario: Nightly autosave
- **WHEN** night settlement runs with autosave enabled
- **THEN** the autosave slot is updated

### Requirement: Export and import
The player SHALL be able to export any save as a JSON file and import a JSON save file into a slot. Invalid or corrupt files SHALL be rejected with an error message and SHALL NOT overwrite existing data.

#### Scenario: Import invalid file
- **WHEN** the player imports a file that is not a valid save
- **THEN** an error is shown and no slot is changed

### Requirement: Versioned saves and migration
Every save SHALL include a schema version. Loading a save with an older version SHALL migrate it to the current version. Loading a save with a newer, unknown version SHALL be refused with a message.

#### Scenario: Old save after update
- **WHEN** a save from schema version 1 is loaded by a game at version 2
- **THEN** it is migrated and loads successfully

#### Scenario: Save from the future
- **WHEN** a save with a version higher than the game supports is loaded
- **THEN** loading is refused with an explanatory message
