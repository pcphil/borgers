# game-ui Specification

## Purpose

Defines the player-facing interface layered over the 3D view: the HUD, management panels, build mode, world-anchored labels, onboarding via a starter layout and contextual hints, the main menu and settings.

## Requirements

### Requirement: HUD
A persistent HUD SHALL show cash, day and clock, open/closed state, reputation, star rating, current speed with Pause/1x/2x/3x controls, and buttons to open each management panel. HUD values SHALL stay current while the game runs.

#### Scenario: Cash updates
- **WHEN** a customer pays
- **THEN** the HUD cash value updates within a fraction of a second

### Requirement: Management panels
The game SHALL provide panels for: Staff (pool, hire, fire, roles, stats), Menu (enable, price, fair value, availability), Inventory (stock, targets, auto-reorder, manual order, capacity), Finances (daily history, loan), and Build (catalogue). Panels SHALL be usable while paused.

#### Scenario: Changing a price while paused
- **WHEN** the game is paused and the player changes a burger's price in the Menu panel
- **THEN** the new price is applied and used once time resumes

### Requirement: Build mode
In build mode the player SHALL be able to select an object from the catalogue, see a ghost preview on the grid that follows the cursor, rotate it, see whether placement is valid and why not, and confirm or cancel. The player SHALL be able to select placed objects to move, upgrade or sell them, and paint zones.

#### Scenario: Invalid preview
- **WHEN** the ghost preview overlaps another object
- **THEN** the preview is shown in an invalid style with the reason

### Requirement: Inspecting agents and objects
Clicking a customer group, staff member or object SHALL show its details (e.g. a group's order, patience and complaint; a staff member's role, stats and task; a station's tier and current work).

#### Scenario: Inspect a customer
- **WHEN** the player clicks a waiting customer
- **THEN** a panel shows their order, remaining patience and current complaint

### Requirement: World labels
The game SHALL show sparse world-anchored indicators: complaint thought bubbles over customers, a ready-order indicator at pickup counters, and dirty markers on tables.

#### Scenario: Order ready marker
- **WHEN** an order is placed on the pickup counter
- **THEN** a ready indicator appears over the counter until it is collected

### Requirement: Starter layout and contextual hints
A new game SHALL start with a prebuilt, working starter layout (zones, a grill, an assembly counter, a soda fountain, a register, a pickup counter, a fridge, tables) and no staff hired. The game SHALL show contextual hints derived from simulation problems (e.g. no cashier, missing station for an item, ingredient out of stock, line too long, in debt). Each hint SHALL disappear when its cause is resolved and SHALL be dismissible.

#### Scenario: First minute
- **WHEN** a new game starts and the restaurant opens with no staff
- **THEN** hints tell the player to hire a cashier, a cook and an assembler

### Requirement: Main menu and settings
The game SHALL have a main menu (New game, Continue, Load, Import, Settings). Settings SHALL include master volume, shadows on/off, UI scale and autosave on/off, and SHALL persist across sessions.

#### Scenario: Settings persist
- **WHEN** the player turns shadows off and reloads the page
- **THEN** shadows remain off
