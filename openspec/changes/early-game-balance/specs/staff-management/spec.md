## MODIFIED Requirements

### Requirement: Candidate pool
The game SHALL offer a pool of 3 randomly generated candidates, refreshed every night, except that a new game SHALL start with a first pool of 5 candidates so a full day-1 team can be hired. Each candidate SHALL have a name, a cooking stat, a speed stat, a service stat, and a daily wage ask that rises with their stats.

#### Scenario: Nightly refresh
- **WHEN** night settlement runs
- **THEN** the unhired candidates are replaced with 3 new candidates

#### Scenario: First pool of a new game
- **WHEN** a new game starts
- **THEN** the candidate pool holds 5 candidates, and after the first night it holds 3
