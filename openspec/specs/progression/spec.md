# progression Specification

## Purpose

Defines long-term goals: the 1–5 star rating, how it is earned, what each star unlocks, and what happens after reaching the top.

## Requirements

### Requirement: Star rating
The restaurant SHALL have a star rating from 1 to 5, starting at 1. During night settlement, the rating SHALL increase by one when the reputation and cumulative revenue thresholds for the next star are both met. Stars SHALL NOT be lost once earned.

#### Scenario: Earning a star
- **WHEN** night settlement runs and reputation and total revenue meet the 2-star thresholds
- **THEN** the rating becomes 2 stars and the day summary announces it with its unlocks

#### Scenario: Reputation falls afterwards
- **WHEN** reputation drops below the 2-star threshold after earning 2 stars
- **THEN** the rating stays at 2 stars

### Requirement: Unlock ladder
Each star SHALL unlock content as follows:
- 1★ (start): Grill, Assembly counter, Register, Pickup counter, Soda fountain, Fridge, Trash bin, 2-seat table, Classic burger, Soda; Cashier, Cook and Assembler roles
- 2★: Fryer, Fries, Cleaner role, 4-seat table
- 3★: Cheeseburger, tier-2 Grill, decor items
- 4★: Double burger, lot expansion
- 5★: tier-2 for all kitchen stations

#### Scenario: Locked content
- **WHEN** the rating is 1 star
- **THEN** Fries, the Fryer and the Cleaner role cannot be used and show "requires 2★"

### Requirement: Win and sandbox continuation
On reaching 5 stars the game SHALL show a win banner, after which play SHALL continue without limits.

#### Scenario: Reaching 5 stars
- **WHEN** the rating reaches 5 stars
- **THEN** a win banner is shown once, and the game keeps running when dismissed
