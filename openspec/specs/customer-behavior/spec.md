# customer-behavior Specification

## Purpose

Defines simulated customers: when and how often they arrive, how they queue, order, wait, collect food, sit and eat or take out, and when they give up and leave.

## Requirements

### Requirement: Arrival rate
During opening hours, customer groups SHALL arrive at a rate equal to a base time-of-day demand curve (with lunch and dinner peaks) multiplied by a reputation factor, a price-attractiveness factor and a per-day rush pattern. The rush pattern SHALL be drawn from the simulation's seeded RNG when the day opens, SHALL vary the strength and timing of busy and quiet periods from day to day, and SHALL be normalized so the expected number of customers over the day is unchanged by it. Arrivals SHALL be randomized using the simulation's seeded RNG.

#### Scenario: Lunch rush
- **WHEN** reputation and prices are held constant
- **THEN** the average arrival rate between 12:00 and 13:30 is clearly higher than between 15:00 and 16:30

#### Scenario: Better reputation, more customers
- **WHEN** two otherwise identical games differ only in reputation
- **THEN** the game with higher reputation receives more customers per day on average

#### Scenario: Rush varies by day but not in total
- **WHEN** many days are simulated with the same reputation and prices
- **THEN** the busiest half hour differs between days, while the average number of arrivals per day matches the unmodulated curve within statistical tolerance

### Requirement: Customer groups
Customers SHALL arrive in groups of 1–4. A group SHALL queue together as one queue slot, order together, and choose takeout or dine-in as a group. A dine-in group SHALL sit at a single table, each member on one chair of that table, so the table needs at least as many chairs as members. A group of 2 or more SHALL need a table with no other diner at it and SHALL keep the table to itself while it eats. A solo diner (group of 1) SHALL be able to take a free chair at a table where only other solo diners are seated.

#### Scenario: Group of three dines in
- **WHEN** a group of three chooses dine-in
- **THEN** they need an empty 4-seat table; a 2-seat table is not enough, and no one else sits at that table while they eat

#### Scenario: Solo diners share a table
- **WHEN** a solo diner is seated at a 4-seat table and another solo diner needs a seat
- **THEN** the second diner may sit on a free chair at the same table

#### Scenario: A group does not join strangers
- **WHEN** a solo diner is eating at an otherwise empty 4-seat table and a group of two needs a seat
- **THEN** the group does not sit at that table and looks for another empty table

#### Scenario: A pair keeps its table
- **WHEN** a group of two is seated at a 4-seat table
- **THEN** a solo diner may not take either of the two remaining chairs

### Requirement: Ordering
At the register, the group SHALL order items chosen from the enabled, available menu, weighted by each item's appeal and its price relative to fair value. Ordering SHALL take time that decreases with the cashier's service stat.

#### Scenario: Overpriced item ordered less
- **WHEN** a burger is priced well above its fair value
- **THEN** it is ordered less often than when priced at fair value

### Requirement: Patience
Each group SHALL have patience timers for waiting in line, waiting for food after ordering, and finding a seat. When the line or food timer expires, the group SHALL leave angry with the matching complaint. When the seat timer expires, a dine-in group SHALL NOT leave angry: it SHALL fall back to takeout and leave with its food. Groups that leave before ordering SHALL pay nothing; groups that leave after paying SHALL NOT be refunded but SHALL give a very low satisfaction.

#### Scenario: Long wait for food
- **WHEN** a group's food is not ready before their food-wait patience runs out
- **THEN** the group leaves with a "waited too long" complaint and their order is cancelled

#### Scenario: Seat patience runs out
- **WHEN** a dine-in group holding its food waits for a seat until their seat patience runs out
- **THEN** the group becomes a takeout group and leaves with its food, not angry

### Requirement: Takeout and dine-in
After collecting their order, takeout groups SHALL leave via the entrance. Dine-in groups SHALL walk to a table seat as defined in "Customer groups", eat for a period, leave the table to be cleaned when its last diner has left, possibly drop trash, and leave. Takeout versus dine-in SHALL be chosen once per group.

#### Scenario: No seat available
- **WHEN** a dine-in group collects food and no suitable table or chair frees up before their seat patience expires
- **THEN** they fall back to takeout: they leave with their food through the entrance, are counted as served, and no complaint is recorded

#### Scenario: Chair freed while others stay
- **WHEN** one of two solo diners at a table finishes and leaves
- **THEN** their chair is free for a new solo diner while the other diner keeps eating

### Requirement: Payment
A group SHALL pay the sum of its ordered items' prices when the order is taken at the register.

#### Scenario: Payment at order time
- **WHEN** a cashier takes an order for two Classic burgers priced at $6
- **THEN** cash increases by $12 immediately

### Requirement: Irregular arrivals and group sizes
Arrival gaps SHALL vary from one group to the next (independent random draws from the seeded RNG, not a fixed period), and group sizes SHALL follow the configured size weights, so that all sizes 1–4 appear over a day and single-person groups are the most common.

#### Scenario: Gaps vary
- **WHEN** a full open day is simulated at mid reputation
- **THEN** the inter-arrival gaps are not all equal and their spread is consistent with independent random draws

#### Scenario: Group sizes follow weights
- **WHEN** many groups (at least 500) are generated with a fixed seed
- **THEN** the share of each size 1–4 is within a stated tolerance of its configured weight, and the same seed reproduces the same sequence

### Requirement: Street arrival and departure
Customer groups SHALL arrive from outside the lot: each group SHALL appear at one end of the street in front of the restaurant (the end chosen with the simulation's seeded RNG), walk along the street to the door, and enter. A group SHALL join a queue, and its patience timers SHALL start, only once it has entered through the door. On leaving, a group SHALL walk out through the door and back along the street to the end it came from, and only then disappear. Satisfaction and reputation SHALL be recorded as today, when the group leaves the restaurant.

#### Scenario: Arrival from the street
- **WHEN** a new group is generated
- **THEN** it first appears at an end of the street, outside the lot, and walks to the door before it enters or joins a queue

#### Scenario: Queue timers start at the door
- **WHEN** a group is walking along the street
- **THEN** its line patience has not started and it does not occupy a queue slot

#### Scenario: Leaving the same way
- **WHEN** a group that came from the left end finishes its visit
- **THEN** it exits through the door and walks along the street to the left end before disappearing
