## Why

Day 1 is as busy as day 12. `arrivalRate` (`src/sim/customers.ts`) multiplies the base demand curve by `reputationFactor = 0.4 + 1.2 × rep/100`, and a new game starts at the neutral reputation of 50, a factor of ×1.0, so the first day brings the full curve: about 52 groups on seed 1 and 57 on seed 4 (`pnpm simulate`). Across days 1-12 the count stays between 43 and 69 whatever the reputation does (45 to 78), so the player never feels demand follow how well they run the place, and the first day is a pile-up for a casual game. The response is also read live every tick, so one bad lunch rush changes the afternoon.

## What Changes

- **Demand follows reputation over the whole game.** The reputation factor becomes a stepped table (interpolated linearly): a new restaurant at reputation 50 gets a small first day of about 20-25 groups, a well-run one at 90 gets a packed room, and the top end stays at today's ×1.6. A casual floor means a bad reputation slows demand but never empties the place.
- **Held for the day.** Reputation is snapshotted when the restaurant opens; yesterday's reputation sets today's crowd, with no mid-day feedback loop.
- **Visible.** The HUD reputation smiley gets a tooltip such as "Reputation 62: customers ×0.7 today" ("if you open now" while preparing).
- **Day 1 is playable with the core three** (cashier, cook, assembler) instead of the five from `early-game-balance`. The first candidate pool stays at 5, so the player still picks the best three. The scripted competent player's day-1 plan drops to three staff.
- **Pacing re-tuned:** the early game is slower (2★ around day 6-8) while 4★ and 5★ stay within a few days of today; the curve is tuned first, the `STARS` revenue thresholds only if needed. No change to the reputation window, starter layout or starter stock.
- **BREAKING (save format):** save version 5 adds the day's reputation snapshot; older saves use their current reputation.
- Out of scope: the nightly candidate refresh, the reputation window size, the price factor, the rush pattern.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `customer-behavior`: the arrival rate's reputation factor, read once when the restaurant opens, with a casual floor and a small first day.
- `game-ui`: the HUD reputation tooltip, and the day-1 playability bar assuming the core three hired.
- `save-system`: schema version 5 migration.

## Impact

- `src/data/balance.ts` (demand table, replacing the linear factor), `src/sim/customers.ts` (`reputationFactor`, `arrivalRate`), `src/sim/sim.ts` (`openRestaurant`), `src/sim/types.ts` and `src/sim/world.ts` (new `demandRep`, `SAVE_VERSION = 5`), `src/save/format.ts` (migration).
- `src/app/snapshot.ts` and `src/ui/Hud.tsx` (tooltip), `src/dev/autopilot.ts` (day-1 staff plan).
- Tests: new `src/sim/demand.test.ts`; `src/sim/people.test.ts` arrival tests set the snapshot; `src/sim/starter.test.ts` (three hired); `src/save/save.test.ts` (v5 migration); `pnpm simulate` pacing re-measured and recorded.
- README only if it describes reputation or arrivals.
