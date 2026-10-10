## Context

See proposal.md. Today (`src/sim/customers.ts`): `arrivalRate(w) = demandAt(hour)/TICKS_PER_HOUR × rushAt(w.rush, hour) × reputationFactor(w.reputation.value) × priceFactor(w)`, with `reputationFactor = 0.4 + 1.2 × rep/100` (×0.4 at 0, ×1.0 at the neutral 50, ×1.6 at 100). `w.reputation.value` is the rolling average of the last 50 departures with a neutral prior of weight 10 and changes every time a group leaves, so the rate changes mid-day. `drawRush` normalizes the day's rush knots against the base curve only, so it is independent of the reputation factor. `openRestaurant` (`src/sim/sim.ts`) already does per-day setup (staff `employedAtOpen`, `w.rush = drawRush(w)`, autosave event).

Baseline (`pnpm simulate 30 <seed> competent`, from the `chair-seating` archive): day 1 brings 36-57 groups (52 on seed 1), days 1-12 stay between 43 and 69; star days 2★/3★/4★/5★ are d3-4 / d9-11 / d15-19 / d25-none. `STARS` thresholds: 2★ rep 55 + $1,500, 3★ rep 60 + $5,000, 4★ rep 65 + $11,000, 5★ rep 70 + $20,000.

## Goals / Non-Goals

**Goals:**
- A new game's first day brings about 20-25 groups on average (spec: mean 18-26, never 40 or more; measured spread over 40 seeds is 9-34 because of the rush pattern and random arrivals); demand then grows with reputation across the whole game.
- A casual shape: gentle below the start, a real climb between 50 and 90, no way to be starved by a bad run.
- Early game slower (2★ around day 6-8); 4★ and 5★ within about 3 days of today.
- The rule is readable in the HUD.

**Non-Goals:**
- No change to the reputation window or prior, the price factor, the rush pattern, group sizes or takeout chance, starter layout or stock, or the nightly candidate refresh.
- No new difficulty settings.

## Decisions

**D1. A table, not a formula.** `CUSTOMERS.reputationDemand: [rep, factor][]` in `balance.ts`, linearly interpolated by `reputationFactor(rep)` (replacing the linear formula). Final points: 0 → ×0.30, 30 → ×0.38, 50 → ×0.45, 70 → ×1.20, 85 → ×1.50, 100 → ×1.60. The floor of ×0.30 is about 15 groups a day at worst, and the top end equals today's maximum so the late game keeps its pressure. Alternatives: a power-curve formula (harder to tune and explain), a bigger rewrite of the base curve (touches the rush normalization and its tests). The numbers are starting points, tuned against `pnpm simulate` per D5.

**D2. Demand reputation builds up at opening.** `World.demandRep: number`, initialised to `REPUTATION.neutral` in `emptyWorld` and updated in `openRestaurant` (next to `drawRush`) by `demandRepAtOpen(w)`: it moves toward `w.reputation.value` by `CUSTOMERS.demandBuildUp` (0.4) of the gap when reputation is higher and `CUSTOMERS.demandFade` (0.2) when lower. `arrivalRate` reads `w.demandRep` instead of `w.reputation.value`, so the rate is stable within a day (no mid-day swing loop). During `prep` the HUD shows the factor from `demandRepAtOpen(w)` labelled "if you open now" (D3). Why not a plain snapshot of the reputation (the first design): measured over 30 days a good player is at reputation 70-80 after day 1, so day 2 jumped from about 19 to about 46 groups, three staff collapsed (reputation 5 on seed 1 day 3), and the late game was starved (no 5★ on any seed, 4★ d19-23). Building up keeps day 1 small and grows the crowd with the restaurant. Fading at half the build-up rate is the casual floor on bad days. Alternatives: store the factor instead of the reputation (loses re-tuning against old state), tie the ramp to stars or days (breaks "demand follows rating").

**D3. Tooltip data.** The snapshot (`src/app/snapshot.ts`) gains `demandFactor` (the factor from `demandRep` while open, or from `demandRepAtOpen` while preparing) and the HUD smiley's `title` becomes e.g. "Reputation 62: customers ×0.7 today" or "... if you open now" in prep. The text is formatted from the factor in one helper (`src/ui/text.ts`) so it is testable. Alternative: a Finances line with expected groups for the day (rejected: the rush pattern makes it inexact).

**D4. Day 1 with the core three.** `src/dev/autopilot.ts` `PLAN[1]` drops to `['cashier', 'cook', 'assembler']`; later stars keep their plans unless measurement shows they need to change. `starter.test.ts` hires the best three candidates into those roles instead of the competent bot's five. The first pool stays 5 (`STAFF.firstCandidates`), so spec and tests keep "the player picks the best three". Wage load on day 1 falls from about $200 to about $120, matching revenue at ~22 groups.

**D5. Tuning targets, in order.** (1) Day 1 averages 20-25 groups over seeds 1-20 (single days vary) and ends at reputation 50 or better with the core three on seeds 1-5; (2) 2★ lands around d6-8; (3) 4★ and 5★ within about 3 days of today (d15-19 and d25-30); (4) no bankruptcy and a positive minimum cash. Tune the D1 table and the D2 build-up rates first; touch `STARS` revenue thresholds only if (3) cannot be met by them. Record before/after per seed.

**D6. Save v5.** `SAVE_VERSION = 5`, `MIGRATIONS[4]`: `demandRep = world.reputation.value`. A save mid-day then keeps playing at today's reputation, as before; the build-up starts from there at the next opening. Rollback is a revert; older builds refuse v5 saves.

## Risks / Trade-offs

- [The slower start stretches the first week and the player feels nothing is happening] → Casual floor and the table's climb between 50 and 90 aim for growth within days; day-1 target is 20-25 groups, not 5; if 2★ drifts past day 8, raise the 50-70 points rather than the thresholds.
- [Reputation window of 50 groups spans two days at this traffic, so feedback is slow] → Accepted for now (design decision with the user); measure growth and revisit the window in a separate change only if growth stalls.
- [A good first day builds a crowd the three-person team cannot serve (seed 1: 56 groups on day 3, reputation 5)] → The crowd is a signal to hire; reputation recovers within three days because demand falls with it and the fade is gentle. The bot's plan is by stars, not by crowd, so the bot shows this harder than a player would.
- [Day-1 team of three leaves seeds 3 and 5 at the edge of reputation 50] → Measured in task 6; tune the table or the day-1 plan, not the starter layout.
- [Late game starved if the table peaks too low] → Top end kept at ×1.6, 4★/5★ pacing is a gating target (D5).
- [Tests that call `arrivalRate` after setting `reputation.value`] → They now set `demandRep`; the arrival tests in `people.test.ts` are updated in the same task.

## Migration Plan

Bump `SAVE_VERSION` to 5 and add `MIGRATIONS[4]` as D6; no other data changes.
