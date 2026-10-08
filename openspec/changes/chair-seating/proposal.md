## Why

Seating is per table today: a dine-in group claims a whole free table with at least as many seats as members (`canSeat` in `src/sim/customers.ts`, `occupiedBy === null`), so a solo diner, 45% of arrivals, burns a 4-seat table and the other chairs sit empty while others wait. The `early-game-balance` change needed 14 seats to stop `noSeats` from being the top day-1 complaint, which hides a rule problem behind a count. Chairs are drawn but not modelled: guest *i* is positioned at chair *i* only in rendering (`SEATS` in `src/render/Agents.tsx`), and the sim has no notion of which chair a guest occupies. Takeout and dine-in groups also look identical on the map. And when no seat frees up, a dine-in group that already has its food leaves angry with a "no seats" complaint, which costs reputation for something the player can only fix by building more tables.

## What Changes

- **Chair-level seating (sim):** each table has one slot per chair, and each seated guest holds exactly one chair. Solo diners (groups of 1) may sit at a table that already holds other solo diners. Groups of 2 or more need a table with no one at it and keep that table to themselves.
- A table becomes dirty, and gets one cleaning task, when its last diner leaves after the table was used; it cannot take new diners until cleaned (unchanged rule, now applied to the table as a whole).
- Takeout vs dine-in stays decided per group. Takeout groups get a small bag icon over them while they are on the map, so they read differently from dine-in groups.
- **No seat, no penalty:** a dine-in group that finds no seat before its seat patience runs out falls back to takeout instead of leaving angry: it takes its food and leaves normally, counts as served, and gets no "no seats" complaint or satisfaction penalty.
- The Inspect panel for a table shows chairs in use out of seats, instead of "In use" / "Free".
- **BREAKING (save format):** save version 4. `PlacedObject.occupiedBy` is replaced by a per-chair array, and groups record which chairs they hold. A migration from v3 seats existing groups on the first chairs of the table they were bound to.
- Starter seat count and pacing are re-tuned after the rule change (chairs now go further), and recorded against the `early-game-balance` table.
- Out of scope: removing the `noSeats` complaint type (kept so old saves and day records still load), the nightly candidate refresh, per-guest takeout/dine-in choice, letting groups of 2+ share tables, assigning specific chairs by the player.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `customer-behavior`: group seating rule (chair-level, solo diners share), the dine-in walk to a free seat, and seat patience ending in a takeout fallback instead of an angry exit.
- `reputation-and-cleanliness`: when a table becomes dirty with several diners; a group that falls back to takeout gets no seat penalty and no "no seats" complaint.
- `world-rendering`: takeout marker over takeout groups, each guest on their own chair at shared tables.
- `save-system`: schema version 4 migration of table occupancy.

## Impact

- `src/sim/types.ts` (`PlacedObject`, `Group`), `src/sim/layout.ts` (`newPlacedObject`), `src/sim/customers.ts` (`canSeat`, `findTable`, `vacateTable`, `seeking`/`toSeat`/`eating`, `releaseGroupsAt`), `src/sim/sim.ts` (`releaseObject`, sell/move), `src/sim/staff.ts` (clean tasks), `src/sim/hints.ts`, `src/sim/world.ts` (`SAVE_VERSION`), `src/save/format.ts` (migration).
- `src/render/Agents.tsx` (chair index per guest), `src/render/Labels.tsx` (takeout bag), `src/ui/Inspect.tsx`, `src/ui/text.ts`.
- Tests: `src/sim/testkit.ts` invariants, seating, cleaning, save and migration tests, the fuzz and soak suites; `pnpm simulate` pacing is re-measured; `src/data/starterLayout.ts` and possibly `src/dev/autopilot.ts` table spots.
- Specs updated at archive; README seating wording if it describes tables.
