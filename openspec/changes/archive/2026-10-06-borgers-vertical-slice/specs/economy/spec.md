## Purpose

Defines money: starting cash, income from sales, prices and demand elasticity, recurring costs, daily settlement, debt, and the loan that keeps the soft-fail state recoverable.

## ADDED Requirements

### Requirement: Starting cash
A new game SHALL start with $5,000 in cash.

#### Scenario: New game
- **WHEN** a new game starts
- **THEN** cash is $5,000 and no loan is outstanding

### Requirement: Prices and fair value
Each menu item SHALL have a fair value. The player SHALL be able to set each item's price. Price relative to fair value SHALL affect how often the item is ordered, the arrival rate, and price-fairness satisfaction.

#### Scenario: Cheap prices attract customers
- **WHEN** all prices are set below fair value
- **THEN** arrivals increase and price-fairness satisfaction is high, while margin per item decreases

### Requirement: Costs
The game SHALL charge: object purchases and upgrades at the time they are made, ingredient purchases at order time, staff wages and daily rent at night settlement, and loan interest at night settlement.

#### Scenario: Night costs
- **WHEN** night settlement runs
- **THEN** wages, rent and loan interest are deducted and itemized in the day summary

### Requirement: Debt and loan
Cash SHALL be allowed to go negative because of recurring costs (wages, rent, interest, auto-reorders), with no game over. While cash is negative, the player SHALL NOT be able to buy objects, upgrades or the expansion. The player SHALL be able to take a $5,000 loan in one click, which adds $5,000 to cash and accrues daily interest until repaid; only one loan SHALL be outstanding at a time. The player SHALL be able to repay the loan in full when cash allows.

#### Scenario: Going into debt
- **WHEN** night costs exceed cash
- **THEN** cash becomes negative, the game continues, and a warning hint suggests taking the loan

#### Scenario: Taking and repaying a loan
- **WHEN** the player takes the loan and later repays it
- **THEN** cash increases by $5,000 on taking it, daily interest is charged while it is outstanding, and repaying deducts $5,000 and stops interest

### Requirement: Financial history
The game SHALL record per-day revenue and itemized costs for at least the last 30 days and make them viewable.

#### Scenario: Viewing finances
- **WHEN** the player opens the finance panel on day 10
- **THEN** they see revenue and costs for days 1–10
