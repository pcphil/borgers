## Why

The `look-and-polish` audit found the first day goes badly even for the scripted competent player: seed 1 serves 24 groups and loses 19, finishes day 1 at reputation 42.2 (below the neutral 50), and its top complaint is `lineTooLong`; by day 3 the top complaint is `noSeats` (17). The audit saw lettuce and tomato run out on day 1 and the grill queue back up ("Cooks can't keep up", 13 items). A new player's first impression is a failing restaurant: the three 2-seat tables cap dine-in at six seats, syrup and lettuce also run short, and with only three candidates (one cook, one assembler) the kitchen cannot keep up even with ample stock.

## What Changes

- Starter stock is sized for a full first day at the default menu, so lettuce and tomato (and any other ingredient that ran short) do not run out before the first nightly restock.
- Starter layout seats enough diners for day-1 demand: more or larger tables, keeping the prebuilt layout valid (zones, walkable paths, bin in range).
- A new game starts with a first candidate pool of 5 (instead of 3) so a day-1 team can run the kitchen: cashier, two cooks, two assemblers. The nightly pool stays at 3.
- Starter storage gets a second fridge so the larger starting stock fits the storage cap.
- Day 1 ends at reputation 50 or better on seeds 1-5 for the competent player who hires the full team.
- Starter data plus one small `newGame` rule (the first pool size). No change to recipes, prices, wages, rent, demand or the nightly refresh. No save format change.
- Star-day pacing across seeds 1-5 stays within about two days of the `look-and-polish` results (no bankruptcies, no trivial mid game).
- Out of scope, recorded for later: chair-level seating (`chair-seating`) and carrying unhired candidates over past the first night.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `staff-management`: the "Candidate pool" requirement gains a larger first pool at the start of a new game.
- `game-ui`: the "Starter layout and contextual hints" requirement gains a playability bar for the starter layout (seating and stock sufficient for a first day), instead of only listing which objects exist.

## Impact

- `src/data/starterLayout.ts` (objects, stock), `src/data/balance.ts` (`STAFF.firstCandidates`), `src/sim/staff.ts` and `src/sim/world.ts` (first pool size).
- Tests that assume the starter layout or stock (`src/sim/*.test.ts`, `testkit`, e2e that place objects at fixed tiles such as (11,0)) may need new coordinates or counts.
- `pnpm simulate` star-day table is re-measured and recorded; `openspec/specs/game-ui/spec.md` updated at archive.
- Existing saves are unaffected (starter layout and first pool apply to new games only).
