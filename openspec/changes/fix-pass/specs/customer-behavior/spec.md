## ADDED Requirements

### Requirement: Irregular arrivals and group sizes
Arrival gaps SHALL vary from one group to the next (independent random draws from the seeded RNG, not a fixed period), and group sizes SHALL follow the configured size weights, so that all sizes 1–4 appear over a day and single-person groups are the most common.

#### Scenario: Gaps vary
- **WHEN** a full open day is simulated at mid reputation
- **THEN** the inter-arrival gaps are not all equal and their spread is consistent with independent random draws

#### Scenario: Group sizes follow weights
- **WHEN** many groups (at least 500) are generated with a fixed seed
- **THEN** the share of each size 1–4 is within a stated tolerance of its configured weight, and the same seed reproduces the same sequence
