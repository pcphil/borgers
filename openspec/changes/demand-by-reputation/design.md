## Context

See proposal.md. Today (`src/sim/customers.ts`): `arrivalRate(w) = demandAt(hour)/TICKS_PER_HOUR × rushAt(w.rush, hour) × reputationFactor(w.reputation.value) × priceFactor(w)`, with `reputationFactor = 0.4 + 1.2 × rep/100` (×0.4 at 0, ×1.0 at the neutral 50, ×1.6 at 100). `w.reputation.value` is the rolling average of the last 50 departures with a neutral prior of weight 10 and changes every time a group leaves, so the rate changes mid-day. `drawRush` normalizes the day's rush knots against the base curve only, so it is independent of the reputation factor. `openRestaurant` (`src/sim/sim.ts`) already does per-day setup (staff `employedAtOpen`, `w.rush = drawRush(w)`, autosave event).

Baseline (`pnpm simulate 30 <seed> competent`, from the `chair-seating` archive): day 1 brings 36-57 groups (52 on seed 1), days 1-12 stay between 43 and 69; star days 2★/3★/4★/5★ are d3-4 / d9-11 / d15-19 / d25-none. `STARS` thresholds: 2★ rep 55 + $1,500, 3★ rep 60 + $5,000, 4★ rep 65 + $11,000, 5★ rep 70 + $20,000.

## Goals / Non-Goals

**Goals:**
- A new game's first day brings about 20-25 groups (spec: 15-30); demand then grows with reputation across the whole game.
- A casual shape: gentle below the start, a real climb between 50 and 90, no way to be starved by a bad run.
- Early game slower (2★ around day 6-8); 4★ and 5★ within about 3 days of today.
- The rule is readable in the HUD.

**Non-Goals:**
- No change to the reputation window or prior, the price factor, the rush pattern, group sizes or takeout chance, starter layout or stock, or the nightly candidate refresh.
- No new difficulty settings.

## Decisions

**D1. A table, not a formula.** `CUSTOMERS.reputationDemand: [rep, factor][]` in `balance.ts`, linearly interpolated by `reputationFactor(rep)` (replacing the linear formula). Starting points: 0 → ×0.30, 30 → ×0.38, 50 → ×0.45, 70 → ×0.85, 90 → ×1.35, 100 → ×1.60. The floor of ×0.30 is about 15 groups a day at worst, and the top end equals today's maximum so the late game keeps its pressure. Alternatives: a power-curve formula (harder to tune and explain), a bigger rewrite of the base curve (touches the rush normalization and its tests). The numbers are starting points, tuned against `pnpm simulate` per D5.

**D2. Snapshot at open.** `World.demandRep: number`, set to `w.reputation.value` in `openRestaurant` (next to `drawRush`), initialised to `REPUTATION.neutral` in `emptyWorld`. `arrivalRate` reads `w.demandRep` instead of `w.reputation.value`. This removes the mid-day swing loop and gives the HUD a stable number. During `prep` the snapshot still holds yesterday's value; the HUD shows the live-reputation factor labelled "if you open now" (D3). Alternatives: store the factor instead of the reputation (loses the ability to re-tune the table against an old snapshot); smooth live and day-open values (rejected earlier: harder to explain).

**D3. Tooltip data.** The snapshot (`src/app/snapshot.ts`) gains `demandFactor` (the factor from `demandRep` while open, or from the live reputation while preparing) and the HUD smiley's `title` becomes e.g. "Reputation 62: customers ×0.7 today" or "... if you open now" in prep. The text is formatted from the factor in one helper (`src/ui/text.ts`) so it is testable. Alternative: a Finances line with expected groups for the day (rejected: the rush pattern makes it inexact).

**D4. Day 1 with the core three.** `src/dev/autopilot.ts` `PLAN[1]` drops to `['cashier', 'cook', 'assembler']`; later stars keep their plans unless measurement shows they need to change. `starter.test.ts` hires the best three candidates into those roles instead of the competent bot's five. The first pool stays 5 (`STAFF.firstCandidates`), so spec and tests keep "the player picks the best three". Wage load on day 1 falls from about $200 to about $120, matching revenue at ~22 groups.

**D5. Tuning targets, in order.** (1) Day 1 is 20-25 groups on seeds 1-5 and ends at reputation 50 or better with the core three; (2) 2★ lands around d6-8; (3) 4★ and 5★ within about 3 days of today (d15-19 and d25-30); (4) no bankruptcy and a positive minimum cash. Tune the D1 table first; touch `STARS` revenue thresholds only if (3) cannot be met by the table. Record before/after per seed.

**D6. Save v5.** `SAVE_VERSION = 5`, `MIGRATIONS[4]`: `demandRep = world.reputation.value`. A save mid-day then keeps playing at today's reputation, as before. Rollback is a revert; older builds refuse v5 saves.

## Risks / Trade-offs

- [The slower start stretches the first week and the player feels nothing is happening] → Casual floor and the table's climb between 50 and 90 aim for growth within days; day-1 target is 20-25 groups, not 5; if 2★ drifts past day 8, raise the 50-70 points rather than the thresholds.
- [Reputation window of 50 groups spans two days at this traffic, so feedback is slow] → Accepted for now (design decision with the user); measure growth and revisit the window in a separate change only if growth stalls.
- [Snapshot makes a terrible day's reputation hit the next day rather than the same afternoon] → Intended: readable and calmer; the tooltip names the rule.
- [Day-1 team of three leaves seeds 3 and 5 at the edge of reputation 50] → Measured in task 6; tune the table or the day-1 plan, not the starter layout.
- [Late game starved if the table peaks too low] → Top end kept at ×1.6, 4★/5★ pacing is a gating target (D5).
- [Tests that call `arrivalRate` after setting `reputation.value`] → They now set `demandRep`; the arrival tests in `people.test.ts` are updated in the same task.

## Migration Plan

Bump `SAVE_VERSION` to 5 and add `MIGRATIONS[4]` as D6; no other data changes.
