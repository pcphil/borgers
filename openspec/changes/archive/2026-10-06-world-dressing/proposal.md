## Why

Playtesting the slice showed the restaurant world is not yet readable as a place: the day starts running the moment a new game loads (customers arrive before the player has set anything up and, with no staff, leave angry), customers pop into existence on the entrance tile, there are no walls or door, and arrivals feel metronomic. `fix-pass` found no sim defect behind the arrival complaint, so this change fixes the cause (no player control over opening, no approach, flat demand) rather than the symptom. It follows `fix-pass` (facing), which is done.

## What Changes

- **Open control (prep phase)**: a new game and every new day start in a `prep` phase: the clock is frozen at 10:00, no customers arrive, and build/hire/menu/stock all work. An **Open restaurant** button (HUD) starts the day. The day then runs 10:00-22:00 and settles as today. No closing early. Wages are counted for whoever is employed at the moment of opening.
- **Arrival rushes**: each day gets a seeded rush pattern (half-hour demand multipliers, normalized so expected customers per day are unchanged) so lunch and dinner peaks and lulls vary day to day. No new arrival mechanics, just modulation of the existing rate.
- **Street approach**: customers spawn off-lot at the left or right end of the street in front of the lot (seeded choice), walk a scripted lane along the street to the door, enter, and on leaving walk back out the way they came before disappearing. The occupancy grid, pathfinding and path cache are unchanged: the outside leg is scripted waypoints, not grid movement. The existing render-only street is extended to cover the walking lane to the map edge.
- **Walls and door** (render only): perimeter walls on the lot boundary around kitchen and dining. The two walls facing the camera are low/translucent so the interior stays visible; the others are full height (which two changes with the Q/E view rotation). A door gap at the entrance with a door that opens when someone is near. Walls follow the lot when the expansion is bought. No kitchen/dining divider.
- **BREAKING (saves)**: save version 1 -> 2 with a migration. New world fields: per-day rush multipliers; new group fields for the street leg; `prep` clock phase. Old saves load: mid-day saves resume open with neutral rush multipliers, night saves resume the night then enter `prep`.
- Dev tooling follows the new flow: the autopilot and `runDays` open the restaurant automatically so headless runs, `pnpm simulate` and tests still advance days; e2e specs click Open.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sim-core`: clock gains a `prep` phase and an explicit open command; the day starts frozen until opened; night leads into `prep`, not straight into the next day.
- `customer-behavior`: arrival rate is modulated by a seeded per-day rush pattern with unchanged daily expectation; customers arrive from and depart to the street, entering the restaurant (and joining a queue, starting patience) only at the door.
- `game-ui`: HUD shows prep state and an Open restaurant button; hints point at it.
- `world-rendering`: street lane to the map edge, perimeter walls with camera-facing cutaway, animated door, walls follow expansion.

## Impact

- Code: `src/sim/{types,world,sim,customers,movement}.ts` (phase, command, arrival, approach states), `src/data/balance.ts` (street/rush constants), `src/save/format.ts` (migration), `src/app/snapshot.ts`, `src/ui/{Hud,text,Inspect}.tsx` and hints, `src/render/{Ground,Walls(new),Door(new),Agents}.tsx`, `src/dev/autopilot.ts`, `src/sim/runner.ts`, `src/app/debug.ts`.
- Tests: sim tests that assume a new day opens by itself or that groups spawn on the entrance tile; invariants bounds (street band); e2e smoke/flows/playthrough click Open; new tests for prep/open, migration v1->v2, rush normalization, street legs.
- Balance: rush pattern and street walk time touch demand timing; `pnpm simulate` seeds 1-3 must stay close to the archived star timings.
- No new dependencies. Staff walking in/out through the door is unchanged (non-goal).
