## MODIFIED Requirements

### Requirement: Autosave and manual save
The game SHALL autosave to the autosave slot during each night settlement and when the player opens the restaurant, when autosave is enabled. The player SHALL be able to save manually to any slot at any time, and SHALL be asked to confirm before overwriting a non-empty slot.

#### Scenario: Nightly autosave
- **WHEN** night settlement runs with autosave enabled
- **THEN** the autosave slot is updated

#### Scenario: Autosave on opening
- **WHEN** the player opens the restaurant with autosave enabled
- **THEN** the autosave slot is updated with the state at the moment of opening, including any building, hiring and menu changes made during preparation

#### Scenario: Autosave disabled
- **WHEN** autosave is disabled in settings and the player opens the restaurant
- **THEN** the autosave slot is not updated
