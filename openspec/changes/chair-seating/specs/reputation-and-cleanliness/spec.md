## MODIFIED Requirements

### Requirement: Visit satisfaction
Every group that leaves SHALL produce a satisfaction score from 0 to 100, combining: total wait relative to patience, food quality, price fairness of what they ordered, cleanliness around them during the visit, and whether dine-in groups got a seat. A dine-in group that fell back to takeout because no seat was available SHALL be scored as a takeout group, with no seat penalty. Groups that left angry SHALL score near the bottom of the range.

#### Scenario: Fast, clean, fair visit
- **WHEN** a group is served quickly, at fair prices, with good food, at a clean table
- **THEN** their satisfaction is high

#### Scenario: No seat, no penalty
- **WHEN** a dine-in group falls back to takeout because no seat was free
- **THEN** their satisfaction has no seat penalty and they do not count as lost

### Requirement: Complaints and thought bubbles
Each group SHALL track its most significant current complaint (e.g. line too long, waited too long, too expensive, dirty, couldn't reach seat). The player SHALL be able to see it as a thought bubble over the group, and the game SHALL show the most common complaints of the day. A shortage of seats SHALL NOT produce a complaint, because such groups fall back to takeout.

#### Scenario: Dirty table complaint
- **WHEN** a group sits at a dirty table
- **THEN** a "dirty" thought bubble appears above them

### Requirement: Dirt and trash
A table SHALL become dirty when the last diner who ate at it leaves, and SHALL NOT be usable by a new group until cleaned; while other diners are still eating at a shared table it is not dirty and stays usable by solo diners. Departing groups SHALL sometimes drop trash on a nearby floor tile unless a trash bin is within a short distance. Dirty tables and trash SHALL reduce the cleanliness score for nearby customers.

#### Scenario: Trash bin nearby
- **WHEN** a trash bin is within range of a table
- **THEN** groups leaving that table do not drop trash on the floor

#### Scenario: Shared table becomes dirty once
- **WHEN** two solo diners ate at one table and both have left
- **THEN** the table is dirty with a single cleaning task, and it was not dirty while the second diner was still eating
