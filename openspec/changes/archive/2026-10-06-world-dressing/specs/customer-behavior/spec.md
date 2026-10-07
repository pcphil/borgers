## ADDED Requirements

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

## MODIFIED Requirements

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
