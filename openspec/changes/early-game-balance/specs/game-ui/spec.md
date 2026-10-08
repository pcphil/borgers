## MODIFIED Requirements

### Requirement: Starter layout and contextual hints
A new game SHALL start with a prebuilt, working starter layout (zones, a grill, an assembly counter, a soda fountain, a register, a pickup counter, a fridge, tables) and no staff hired. The starter layout and starting stock SHALL be sized so a first day with the three starting candidates hired and default prices is playable: the layout SHALL seat at least twelve diners, and starting stock SHALL cover a full first day's demand for every ingredient the default menu uses, so no menu item becomes unavailable before the first nightly restock. The game SHALL show contextual hints derived from simulation problems (e.g. no cashier, missing station for an item, ingredient out of stock, line too long, in debt). Each hint SHALL disappear when its cause is resolved and SHALL be dismissible.

#### Scenario: First minute
- **WHEN** a new game starts and the restaurant opens with no staff
- **THEN** hints tell the player to hire a cashier, a cook and an assembler

#### Scenario: Seating on day one
- **WHEN** a new game starts
- **THEN** the starter layout contains tables with a combined capacity of at least twelve seats, all reachable from the entrance

#### Scenario: Stock lasts the first day
- **WHEN** the three starting candidates are hired and day 1 is played at default prices with no player purchases
- **THEN** no ingredient used by the default menu reaches zero stock before the first night

#### Scenario: First day is not a failure
- **WHEN** seeds 1 to 5 are simulated for day 1 with the competent strategy
- **THEN** the top complaint of day 1 is not `noSeats` and no stock-out hint fires
