## MODIFIED Requirements

### Requirement: Dirt and trash
A table SHALL become dirty when the last diner who ate at it leaves, and SHALL NOT be usable by a new group until cleaned; while other diners are still eating at a shared table it is not dirty and stays usable by solo diners. Departing groups SHALL sometimes drop trash on a nearby floor tile unless a trash bin is within a short distance. Dirty tables and trash SHALL reduce the cleanliness score for nearby customers.

#### Scenario: Trash bin nearby
- **WHEN** a trash bin is within range of a table
- **THEN** groups leaving that table do not drop trash on the floor

#### Scenario: Shared table becomes dirty once
- **WHEN** two solo diners ate at one table and both have left
- **THEN** the table is dirty with a single cleaning task, and it was not dirty while the second diner was still eating
