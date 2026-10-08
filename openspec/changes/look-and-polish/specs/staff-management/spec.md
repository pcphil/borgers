## MODIFIED Requirements

### Requirement: Hire and fire
The player SHALL be able to hire a candidate, who then arrives from the street, walks to the door and becomes available when they reach it, and fire any staff member at any time. A fired staff member SHALL drop their current task back into its queue and walk out through the door and along the street, disappearing at the street end they came from. A staff member who is fired while still walking in SHALL turn around and walk back out the way they came.

#### Scenario: Hiring
- **WHEN** the player hires a candidate
- **THEN** the candidate is removed from the pool, joins the staff list, appears at a street end, walks to the door, and only then starts taking tasks

#### Scenario: Firing mid-task
- **WHEN** the player fires a cook who is grilling
- **THEN** the grill step returns to the queue (ingredients already consumed are kept with the step) and the cook leaves through the door and along the street

#### Scenario: Firing while walking in
- **WHEN** the player fires a staff member who has not yet reached the door
- **THEN** they walk back along the street to the end they came from and disappear there, without entering the restaurant

#### Scenario: Wages for staff still walking in
- **WHEN** the player hires someone in preparation and opens the restaurant before they reach the door
- **THEN** they are still counted as employed at opening and are paid at settlement
