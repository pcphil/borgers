## Purpose

Defines simulated customers: when and how often they arrive, how they queue, order, wait, collect food, sit and eat or take out, and when they give up and leave.

## ADDED Requirements

### Requirement: Arrival rate
During opening hours, customer groups SHALL arrive at a rate equal to a base time-of-day demand curve (with lunch and dinner peaks) multiplied by a reputation factor and a price-attractiveness factor. Arrivals SHALL be randomized using the simulation's seeded RNG.

#### Scenario: Lunch rush
- **WHEN** reputation and prices are held constant
- **THEN** the average arrival rate between 12:00 and 13:30 is clearly higher than between 15:00 and 16:30

#### Scenario: Better reputation, more customers
- **WHEN** two otherwise identical games differ only in reputation
- **THEN** the game with higher reputation receives more customers per day on average

### Requirement: Customer groups
Customers SHALL arrive in groups of 1–4. A group SHALL queue together as one queue slot, order together, and choose takeout or dine-in as a group. A dine-in group SHALL need a single table with at least as many seats as members.

#### Scenario: Group of three dines in
- **WHEN** a group of three chooses dine-in
- **THEN** they need a free 4-seat table; a 2-seat table is not enough

### Requirement: Ordering
At the register, the group SHALL order items chosen from the enabled, available menu, weighted by each item's appeal and its price relative to fair value. Ordering SHALL take time that decreases with the cashier's service stat.

#### Scenario: Overpriced item ordered less
- **WHEN** a burger is priced well above its fair value
- **THEN** it is ordered less often than when priced at fair value

### Requirement: Patience
Each group SHALL have patience timers for waiting in line, waiting for food after ordering, and finding a seat. When a timer expires, the group SHALL leave angry with the matching complaint. Groups that leave before ordering SHALL pay nothing; groups that leave after paying SHALL NOT be refunded but SHALL give a very low satisfaction.

#### Scenario: Long wait for food
- **WHEN** a group's food is not ready before their food-wait patience runs out
- **THEN** the group leaves with a "waited too long" complaint and their order is cancelled

### Requirement: Takeout and dine-in
After collecting their order, takeout groups SHALL leave via the entrance. Dine-in groups SHALL walk to a free suitable table, eat for a period, leave the table dirty, possibly drop trash, and leave.

#### Scenario: No seat available
- **WHEN** a dine-in group collects food and no suitable table frees up before their seat patience expires
- **THEN** they leave with a "no seats" complaint

### Requirement: Payment
A group SHALL pay the sum of its ordered items' prices when the order is taken at the register.

#### Scenario: Payment at order time
- **WHEN** a cashier takes an order for two Classic burgers priced at $6
- **THEN** cash increases by $12 immediately
