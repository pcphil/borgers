## Why

After `world-dressing`, the remaining rough edges are small: seated customers look hunched over the table, hired staff still pop in on the entrance tile while customers now walk in from the street, the autosave misses everything done in the preparation phase until the first night, and a few things from the stability sweep and the last change were never checked or tested (street ends fully zoomed out, clicking objects against the new walls, the upstream `THREE.Clock` console warning). The user gave no bug list for this round, so the change also includes a scripted playthrough audit to find anything else worth fixing.

## What Changes

- **Seated posture**: seated customers sit upright facing the table. Today the baked Kenney `sit` clip is used as-is (first frame) and looks bent over; fix the bake/placement so torsos are upright and no longer clip into the table.
- **Staff street entrance**: a newly hired staff member appears at a street end (seeded), walks the same scripted street route as customers to the door and becomes available on arrival. A fired staff member walks out through the door and along the street to the end they came from (a fired member who is still outside turns around and walks back). Staff already in the restaurant are unaffected.
- **Autosave on open**: pressing Open triggers an autosave (when autosave is enabled), in addition to the nightly one, so preparation work is not lost if the tab closes before the first night.
- **Housekeeping**: the `THREE.Clock` deprecation warning comes from `@react-three/fiber` 9.8.1 (`new THREE.Clock()` in its store); that is the latest stable release, so there is no safe upgrade and the warning is documented and left. Re-check the street ends fully zoomed out and fix any visible pop-in. Add a Playwright check that objects placed against each wall can still be selected by clicking.
- **Playthrough audit**: a scripted playthrough with screenshots at several moments (preparation, a rush, night, expansion, view rotation). Findings are recorded; clear small defects are fixed, anything bigger is listed as a follow-up.
- **BREAKING (saves)**: save version 2 -> 3 with a migration (new `Staff.side` field). Old saves load with all existing staff inside the restaurant.
- No new mechanics and no balance changes; `pnpm simulate` seeds 1-3 must stay close to the archived Balance Results (staff now take a few real seconds to walk in after being hired).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staff-management`: hired staff arrive from the street and become available when they reach the door; fired staff walk out along the street.
- `save-system`: autosave also happens when the player opens the restaurant.
- `world-rendering`: seated customers sit upright facing the table.

## Impact

- Code: `src/sim/{types,staff,sim,layout,customers,movement}.ts` (staff street states, shared street-end helper, open autosave), `src/save/format.ts` and `src/sim/world.ts` (migration, version), `src/render/{kenney,Agents}.tsx` (sit pose), `src/ui/{panels,text}.tsx`, `src/sim/hints.ts` (leaving/departing filters), `src/sim/testkit.ts` (`addStaff` stays instant), e2e specs.
- Tests: staff arrival/fire route tests, invariants for staff street positions, v2 -> v3 migration, autosave-on-open, new Playwright click-through spec.
- Balance: staff hired in preparation take about 7 s of real time to reach the door at 1x; re-verified with `pnpm simulate`.
- No new dependencies.
