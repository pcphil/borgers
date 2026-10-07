## ADDED Requirements

### Requirement: Open restaurant control
While the game is in the preparation phase, the HUD SHALL show the state as "Preparing" and a prominent Open restaurant button, and SHALL show the clock at 10:00. Activating the button SHALL open the restaurant. While preparing, a contextual hint SHALL tell the player the restaurant is closed and how to open it, and warnings that a role is unstaffed SHALL still be shown. The button SHALL NOT be shown once the restaurant is open.

#### Scenario: New game
- **WHEN** a new game starts
- **THEN** the HUD shows "Preparing", the clock at 10:00, and an Open restaurant button; no customers are present

#### Scenario: Opening from the HUD
- **WHEN** the player clicks Open restaurant
- **THEN** the HUD state changes to "Open", the button disappears and the clock starts advancing

#### Scenario: Next morning
- **WHEN** a day ends and night passes
- **THEN** the HUD returns to "Preparing" with the Open restaurant button, and the player can change layout, staff, menu and stock before opening
