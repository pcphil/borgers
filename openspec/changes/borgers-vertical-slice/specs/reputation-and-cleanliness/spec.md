## Purpose

Defines how customer experience is measured and fed back: per-visit satisfaction, the restaurant's rolling reputation, visible complaints, and the dirt and trash that the Cleaner role deals with.

## ADDED Requirements

### Requirement: Visit satisfaction
Every group that leaves SHALL produce a satisfaction score from 0 to 100, combining: total wait relative to patience, food quality, price fairness of what they ordered, cleanliness around them during the visit, and whether dine-in groups got a seat. Groups that left angry SHALL score near the bottom of the range.

#### Scenario: Fast, clean, fair visit
- **WHEN** a group is served quickly, at fair prices, with good food, at a clean table
- **THEN** their satisfaction is high

### Requirement: Rolling reputation
The restaurant's reputation SHALL be the average satisfaction of the most recent N departed groups. A new game SHALL start with a neutral reputation.

#### Scenario: Reputation drops after bad service
- **WHEN** many consecutive groups leave angry
- **THEN** reputation decreases

### Requirement: Complaints and thought bubbles
Each group SHALL track its most significant current complaint (e.g. line too long, waited too long, too expensive, dirty, no seats, couldn't reach seat). The player SHALL be able to see it as a thought bubble over the group, and the game SHALL show the most common complaints of the day.

#### Scenario: Dirty table complaint
- **WHEN** a group sits at a dirty table
- **THEN** a "dirty" thought bubble appears above them

### Requirement: Dirt and trash
A table SHALL become dirty when a dine-in group leaves it, and SHALL NOT be usable by a new group until cleaned. Departing groups SHALL sometimes drop trash on a nearby floor tile unless a trash bin is within a short distance. Dirty tables and trash SHALL reduce the cleanliness score for nearby customers.

#### Scenario: Trash bin nearby
- **WHEN** a trash bin is within range of a table
- **THEN** groups leaving that table do not drop trash on the floor

### Requirement: Cleaning
Cleaners (or fallback staff, as defined in staff-management) SHALL take cleaning tasks for dirty tables and trash tiles. Cleaning SHALL take time and restore the table or tile to clean.

#### Scenario: Cleaning a table
- **WHEN** a cleaner finishes cleaning a dirty table
- **THEN** the table is clean and available for new groups
