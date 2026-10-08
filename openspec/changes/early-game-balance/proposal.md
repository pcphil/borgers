## Why

The `look-and-polish` audit found the first day goes badly even for the scripted competent player: seed 1 serves 24 groups and loses 19, finishes day 1 at reputation 42.2 (below the neutral 50), and its top complaint is `lineTooLong`; by day 3 the top complaint is `noSeats` (17). The audit saw lettuce and tomato run out on day 1 and the grill queue back up ("Cooks can't keep up", 13 items). A new player's first impression is a failing restaurant, and the three 2-seat tables in the starter layout cap dine-in at six seats.

## What Changes

- Starter stock is sized for a full first day at the default menu, so lettuce and tomato (and any other ingredient that ran short) do not run out before the first nightly restock.
- Starter layout seats enough diners for day-1 demand: more or larger tables, keeping the prebuilt layout valid (zones, walkable paths, bin in range).
- If stock and seating alone do not clear the day-1 grill backlog, the starter kitchen gets enough extra capacity for it (decided by measurement, see design).
- Tuning only: values in `src/data/starterLayout.ts` and, if needed, `src/data/balance.ts`. No new mechanics, no sim logic changes, no save format change.
- Star-day pacing across seeds 1-5 stays in the same range as the `look-and-polish` results (no bankruptcies, no large speed-up that trivialises the mid game).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-ui`: the "Starter layout and contextual hints" requirement gains a playability bar for the starter layout (seating and stock sufficient for a first day), instead of only listing which objects exist.

## Impact

- `src/data/starterLayout.ts` (objects, stock), possibly `src/data/balance.ts`.
- Tests that assume the starter layout or stock (`src/sim/*.test.ts`, `testkit`, e2e that place objects at fixed tiles such as (11,0)) may need new coordinates or counts.
- `pnpm simulate` star-day table is re-measured and recorded; `openspec/specs/game-ui/spec.md` updated at archive.
- Existing saves are unaffected (the starter layout only applies to new games).
