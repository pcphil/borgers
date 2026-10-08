## MODIFIED Requirements

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

### Requirement: Takeout and dine-in
After collecting their order, takeout groups SHALL leave via the entrance. Dine-in groups SHALL walk to a table seat as defined in "Customer groups", eat for a period, leave the table to be cleaned when its last diner has left, possibly drop trash, and leave. Takeout versus dine-in SHALL be chosen once per group.

#### Scenario: No seat available
- **WHEN** a dine-in group collects food and no suitable table or chair frees up before their seat patience expires
- **THEN** they leave with a "no seats" complaint

#### Scenario: Chair freed while others stay
- **WHEN** one of two solo diners at a table finishes and leaves
- **THEN** their chair is free for a new solo diner while the other diner keeps eating
