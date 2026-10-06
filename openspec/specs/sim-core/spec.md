# sim-core Specification

## Purpose

Defines the authoritative game simulation: how game time advances, how speed and pause work, how the day/night cycle runs, and the determinism guarantees every other capability relies on.

## Requirements

### Requirement: Fixed-step simulation independent of frame rate
The simulation SHALL advance in fixed ticks of game time, at 20 ticks per game-second at 1x speed. Simulation outcomes SHALL NOT depend on the rendering frame rate.

#### Scenario: Different frame rates yield identical state
- **WHEN** the same saved state and seed are advanced by the same number of ticks once at 30 fps and once at 144 fps
- **THEN** the resulting simulation states are identical

#### Scenario: Frame hitch does not spiral
- **WHEN** a single rendered frame takes much longer than normal (e.g. the tab was backgrounded)
- **THEN** the simulation processes at most a bounded number of ticks for that frame and discards the excess backlog instead of freezing

### Requirement: Deterministic randomness
All randomness in the simulation SHALL come from a seeded random number generator stored in the game state, so that the same seed, state and player inputs always produce the same outcome.

#### Scenario: Replaying a seed
- **WHEN** two new games are started with the same seed and receive no player input for three in-game days
- **THEN** both produce identical customer arrivals, candidates and financial results

#### Scenario: RNG survives save/load
- **WHEN** a game is saved, loaded, and advanced N ticks
- **THEN** the result equals advancing the original unsaved game N ticks

### Requirement: Speed control and pause
The player SHALL be able to set the simulation to Pause, 1x, 2x or 3x. While paused, no game time SHALL pass, but the player SHALL still be able to use build mode and all management panels.

#### Scenario: Changing speed
- **WHEN** the player selects 3x
- **THEN** game time advances three times as fast as at 1x and agents move proportionally faster

#### Scenario: Building while paused
- **WHEN** the game is paused and the player places a table
- **THEN** the table is placed, the cost is deducted, and no game time passes

### Requirement: In-game clock and opening hours
The game SHALL have a clock and day counter. The restaurant SHALL be open from 10:00 to 22:00 in game time, which SHALL last approximately 4 real minutes at 1x speed. The restaurant SHALL stop admitting new customers at closing time, and customers already inside SHALL finish their visit.

#### Scenario: Day length at 1x
- **WHEN** the restaurant opens at 10:00 at 1x speed with no pauses
- **THEN** closing time 22:00 is reached after approximately 4 real minutes

#### Scenario: Closing time
- **WHEN** the clock reaches 22:00
- **THEN** no new customers arrive, and customers already queued or eating complete their visit or leave

### Requirement: Night transition
After closing and once the last customer has left, the game SHALL enter night. Night SHALL fast-forward to the next day's opening in about 5 real seconds, during which the end-of-day settlement runs. The player SHALL then see a day summary.

#### Scenario: End-of-day settlement
- **WHEN** night begins
- **THEN** wages and rent are charged, loan interest is applied, ingredient deliveries arrive, the candidate pool refreshes, the star rating is re-evaluated, and an autosave is triggered (if enabled), in that order

#### Scenario: Day summary
- **WHEN** settlement completes
- **THEN** the player sees a summary of the day's revenue, costs, customers served, customers lost and reputation change, and the next day starts when it is dismissed or after the night fast-forward ends

### Requirement: Headless operation
The simulation SHALL be runnable with no rendering or DOM, so that it can be advanced programmatically by tests and balancing scripts.

#### Scenario: Simulate days headlessly
- **WHEN** a test creates a new game and advances it 30 in-game days without rendering
- **THEN** it completes and exposes the full game state for assertions
