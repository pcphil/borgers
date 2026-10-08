# staff-management Specification

## Purpose

Defines the restaurant's workforce: hiring from a candidate pool, staff stats and wages, firing, role assignment, and how staff choose what to work on.

## Requirements

### Requirement: Candidate pool
The game SHALL offer a pool of 3 randomly generated candidates, refreshed every night, except that a new game SHALL start with a first pool of 5 candidates so a full day-1 team can be hired. Each candidate SHALL have a name, a cooking stat, a speed stat, a service stat, and a daily wage ask that rises with their stats.

#### Scenario: Nightly refresh
- **WHEN** night settlement runs
- **THEN** the unhired candidates are replaced with 3 new candidates

#### Scenario: First pool of a new game
- **WHEN** a new game starts
- **THEN** the candidate pool holds 5 candidates, and after the first night it holds 3

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

### Requirement: Wages
Each staff member's daily wage SHALL be charged during night settlement, for every day they were employed at opening time.

#### Scenario: Wage charged
- **WHEN** a staff member with a $60 daily wage works a day
- **THEN** $60 is deducted at night settlement

### Requirement: Role assignment
Each staff member SHALL be assigned exactly one role: Cashier, Cook, Assembler or Cleaner. The player SHALL be able to change a role at any time; the staff member SHALL finish or drop their current task and switch. Cleaner SHALL be assignable only once unlocked.

#### Scenario: Reassigning
- **WHEN** the player changes a Cook to Cashier
- **THEN** after their current step finishes, they walk to a register and start taking orders

### Requirement: Task selection
Each role SHALL have a task queue (Cashier: serve the register line; Cook: grill/fry steps; Assembler: assembly, drinks and bringing orders to pickup; Cleaner: dirty tables and trash). An idle staff member SHALL take the oldest available task in their role's queue at the nearest free station that can perform it. When no staff member is assigned the Cleaner role, idle Cashiers and Assemblers SHALL take cleaning tasks, but only when their own role's queue is empty. With no task, staff SHALL wait near a station of their role.

#### Scenario: Nearest free station
- **WHEN** a cook becomes idle, a grill step is queued, and there are two free grills
- **THEN** the cook takes the step at the grill with the shorter path

#### Scenario: Cleaning before Cleaners exist
- **WHEN** the rating is 1 star, a table is dirty, and an Assembler has no assembly or delivery tasks
- **THEN** the Assembler cleans the table, then returns to their role

#### Scenario: Missing role
- **WHEN** there is no Cashier assigned while customers are queued
- **THEN** no orders are taken and a "no cashier" hint is shown
