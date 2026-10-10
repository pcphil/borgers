## MODIFIED Requirements

### Requirement: Arrival rate
During opening hours, customer groups SHALL arrive at a rate equal to a base time-of-day demand curve (with lunch and dinner peaks) multiplied by a reputation factor, a price-attractiveness factor and a per-day rush pattern. The reputation factor SHALL rise with reputation, starting from a casual floor at the lowest reputation (a poor reputation slows demand but never empties the restaurant) through a small value at the neutral starting reputation to a full-house value at the top. It SHALL be based on a demand reputation that is set when the restaurant opens and held for the whole day, so changes in reputation during the day do not change that day's arrivals. At each opening the demand reputation SHALL move part of the way toward the current reputation, faster upward than downward, so a good reputation builds the crowd over several days and a bad day dents it only gently. The rush pattern SHALL be drawn from the simulation's seeded RNG when the day opens, SHALL vary the strength and timing of busy and quiet periods from day to day, and SHALL be normalized so the expected number of customers over the day is unchanged by it. Arrivals SHALL be randomized using the simulation's seeded RNG.

#### Scenario: Lunch rush
- **WHEN** reputation and prices are held constant
- **THEN** the average arrival rate between 12:00 and 13:30 is clearly higher than between 15:00 and 16:30

#### Scenario: Better reputation, more customers
- **WHEN** two otherwise identical games differ only in reputation
- **THEN** the game with higher reputation receives more customers per day on average

#### Scenario: A small first day
- **WHEN** many new games each play their first day at default prices
- **THEN** the average number of customer groups on that day is between 18 and 26, and no single first day brings 40 or more

#### Scenario: Reputation is held for the day
- **WHEN** reputation changes during an open day
- **THEN** that day's arrival rate does not change, and the next day's demand reputation has moved part of the way toward it

#### Scenario: The crowd builds up
- **WHEN** reputation stays well above the demand reputation over several openings
- **THEN** the demand reputation rises each day without reaching the reputation at once

#### Scenario: A bad day dents gently
- **WHEN** reputation falls as far below the demand reputation as it was above it before
- **THEN** the demand reputation falls by less than it rose

#### Scenario: A bad reputation does not empty the restaurant
- **WHEN** reputation is at its lowest
- **THEN** customers still arrive, at no less than half the rate of a neutral-reputation restaurant

#### Scenario: Rush varies by day but not in total
- **WHEN** many days are simulated with the same reputation and prices
- **THEN** the busiest half hour differs between days, while the average number of arrivals per day matches the unmodulated curve within statistical tolerance
