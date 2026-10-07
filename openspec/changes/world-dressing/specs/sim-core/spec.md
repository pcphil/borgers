## ADDED Requirements

### Requirement: Preparation phase and opening
A new game and every new day SHALL begin in a preparation phase in which the day clock does not advance (it stays at the opening time of 10:00) and no customers arrive; staff already hired MAY still move about and work. During preparation the player SHALL be able to use build mode and all management panels. The restaurant SHALL open only when the player issues an open command; opening SHALL start the day clock. The player SHALL NOT be able to close the restaurant before closing time. Staff counted as employed for the day's wage SHALL be those employed at the moment of opening.

#### Scenario: New game does not run until opened
- **WHEN** a new game starts
- **THEN** the clock shows 10:00 and stays there, no customer arrives, and building and hiring work, until the player opens the restaurant

#### Scenario: Opening starts the day
- **WHEN** the player opens the restaurant
- **THEN** the day clock starts advancing from 10:00 and customers begin to arrive according to the demand curve

#### Scenario: Hired before opening are paid
- **WHEN** the player hires a cook during preparation and then opens
- **THEN** that cook is paid wages at the day's settlement

## MODIFIED Requirements

### Requirement: In-game clock and opening hours
The game SHALL have a clock and day counter. Once the player opens the restaurant, it SHALL be open from 10:00 to 22:00 in game time, which SHALL last approximately 4 real minutes at 1x speed. The restaurant SHALL stop admitting new customers at closing time, and customers already inside SHALL finish their visit.

#### Scenario: Day length at 1x
- **WHEN** the player opens the restaurant at 10:00 at 1x speed with no pauses
- **THEN** closing time 22:00 is reached after approximately 4 real minutes

#### Scenario: Closing time
- **WHEN** the clock reaches 22:00
- **THEN** no new customers arrive, and customers already queued, eating or still walking in complete their visit or leave

### Requirement: Night transition
After closing and once the last customer has left, the game SHALL enter night. Night SHALL fast-forward in about 5 real seconds, during which the end-of-day settlement runs, and then the next day SHALL begin in the preparation phase. The player SHALL see a day summary.

#### Scenario: End-of-day settlement
- **WHEN** night begins
- **THEN** wages and rent are charged, loan interest is applied, ingredient deliveries arrive, the candidate pool refreshes, the star rating is re-evaluated, and an autosave is triggered (if enabled), in that order

#### Scenario: Day summary
- **WHEN** settlement completes
- **THEN** the player sees a summary of the day's revenue, costs, customers served, customers lost and reputation change

#### Scenario: Next day waits for the player
- **WHEN** night ends
- **THEN** the next day is in preparation, with the clock at 10:00, until the player opens
