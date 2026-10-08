## Context

See proposal.md for motivation. Observed current state:

- `hire()` creates the `Staff` with `newAgent(entranceTile())` and `state: 'idle'`, so staff appear on the door tile. `fire()` releases bindings, sets `state: 'leaving'`, paths to the entrance tile on the grid, and `staffSystem` deletes the member when that move finishes.
- Customers already use scripted street routes: `walkRoute`/`setRoute` in `movement.ts`, `streetEnd(side)` (private to `customers.ts`), `STREET.laneY` and `STREET.spawnDistance` in `balance.ts`.
- `StaffState` is `idle | walking | working | leaving`. `state !== 'leaving'` is used as "still employed" in `staff.ts` (`activeStaff`, `fire`, `setRole`), `sim.ts` (wage stamping at open), `hints.ts` and `ui/panels.tsx`.
- `Sim.openRestaurant` stamps `employedAtOpen` and draws the rush; it emits no events. `handleAutosave` fires on any `autosave` event.
- Characters are baked in `bakeCharacter(scene, animations, clipName, height)`: the clip is sampled with `mixer.update(0)` (first frame), flattened to static geometry, centred on x/z, put on the ground (`translate(-c.x, -bb.min.y, -c.z)`), scaled to `CHAR_HEIGHT`, then drawn at the seat position with yaw toward the table. Seat offsets in table-local space are in `SEATS` (`Agents.tsx`). In screenshots the seated figures look bent forward and level with the table top.
- `@react-three/fiber` is 9.8.1 which is the latest stable (`npm view`: latest 9.8.1, alpha 10.0.0-alpha.5); its store does `new THREE.Clock()`, which is the source of the console deprecation warning.

## Goals / Non-Goals

**Goals:** staff enter and leave through the street like customers; the seated pose looks right; autosave covers preparation work; remaining unchecked items from the previous changes get checked or tested; an audit pass finds anything else cheap to fix.

**Non-Goals:** new animations (sitting down/standing up motion), staff behavior changes, any balance or economy change, upgrading to an r3f alpha, a visual redesign of the street.

## Decisions

### D1. Staff reuse the customer street route
`StaffState` gains `'arriving' | 'departing'`; `Staff` gains `side: -1 | 1`. `streetEnd(side)` moves from `customers.ts` to `layout.ts` (beside `entranceTile`) so both use it.
- `hire()` draws `side` from the world RNG (`chance(rng, 0.5)`), places the staff member at `streetEnd(side)`, sets the route `[(entranceX, laneY), entranceTile()]` and `state: 'arriving'`.
- `staffSystem` handles `arriving` first: `walkRoute(s, walkSpeed(s))`; on arrival it sets `state: 'idle'` and clears the route, after which all existing idle logic applies. While `arriving` the member is never assigned tasks, a station, or a register.
- `fire()` on an in-restaurant member is unchanged up to the entrance: `leaving` (grid path to the door tile). When that move finishes at the door, `staffSystem` switches to `departing` with route `[(entranceX, laneY), streetEnd(side)]`; the member is deleted at the end of the route. If the grid path fails (as today) the member is deleted on the spot.
- `fire()` on an `arriving` member: they are off-grid, so they switch straight to `departing` with the route back to their end (`[end]` if still on the lane, `[(entranceX, laneY), end]` if already on the door column).
*Alternatives:* a separate `Newcomer` entity or hiding staff until they arrive. Rejected: staff need to exist immediately so wage, hint, panel and fire logic keep working.

### D2. One predicate for "still employed"
Add `isLeaving(state)` (`leaving` or `departing`) and use it wherever `!== 'leaving'` currently means "employed": `activeStaff`, `fire`, `setRole`, hint staffing checks, wage stamping in `openRestaurant`, and the staff panel filter. `arriving` counts as employed (so `employedAtOpen` stays true for someone hired in preparation who has not reached the door yet, matching the spec scenario). `setRole` on an `arriving` member just records the role; they start in it when they arrive.

### D3. Save version 3
`MIGRATIONS[2]` adds `side: 1` to every staff entry (existing staff are inside the restaurant, so no street state is needed). `SAVE_VERSION = 3`; `assertWorld` needs no new top-level field. Mid-walk staff in a v3 save round-trip as ordinary JSON.

### D4. Autosave on open
`openRestaurant` emits `{ type: 'autosave' }` after stamping wages and drawing the rush, so the saved world is the day-0 open state. No change to `handleAutosave` (it already honours the setting). The nightly emit is unchanged, so a long first day is still covered.

### D5. Sit pose: measure before choosing the fix
Investigation first (a throwaway script, not committed): list the `sit` clip's duration and tracks, bake it at t = 0, mid, and end, and render each next to the standing pose. Likely fixes, in order of preference:
1. Sample a later frame (`bakeCharacter(..., time)`), if the clip reaches an upright seated pose after the first frame.
2. Correct the baked mesh once at bake time (small pitch rotation about the hips and/or translate), if every frame is bent.
3. Adjust `SEATS` offsets and a seated Y offset so the figure's hips are over the chair seat and the torso is clear of the table edge.
The result is verified by screenshots at default zoom and zoomed in, from all four rotations, for 2- and 4-seat tables. Standing figures must be unchanged.

### D6. `THREE.Clock` warning is documented, not suppressed
No stable r3f release removes it, and an alpha upgrade is out of scope (risk to the whole render loop). Filtering `console.warn` would hide real warnings. The apply step re-runs `npm view @react-three/fiber dist-tags` once; if a stable release has landed that fixes it, upgrade within semver and re-run the whole suite, otherwise record the finding.

### D7. Click-through and zoomed-out checks
A new Playwright spec places a bin next to each wall (front row, back row, left and right columns of the starter lot) with `host.dispatch`, clicks each tile using the exposed camera (`tileToScreen` as in `playthrough.spec.ts`) and asserts the Inspect panel opens for that object. Street ends are checked by screenshot at `MIN_ZOOM` with a customer spawned and watched at both ends.

### D8. The audit is a script, not a feature
A scratchpad Playwright script drives: new game and prep, open and speed to 3x through a lunch rush, forced night, expansion, and each rotation, taking screenshots. Findings are written into `tasks.md` under Findings. Only fixes that are one-file and obviously correct are made in this change; the rest become follow-ups listed there. The script is not added to the repo.

## Risks / Trade-offs

- [Hired staff are late to their first task] -> about 7 s real time at 1x (18 tiles + the lane at 2.6 tiles/s); re-run `pnpm simulate` seeds 1-5 and compare star timings; autopilot hires in the morning so the delay is paid once per hire.
- [Tests that expect staff available on hire] -> `addStaff` in `testkit.ts` already overwrites position/state; keep it instant (state `idle`, no route, `side` 1). Hand-stepped scenario tests that use `hire` directly are updated.
- [A staff member is fired exactly at the door tile or at the moment the route ends] -> covered by explicit tests for fire while arriving (on lane, on door column) and fire while leaving.
- [Invariants assume in-bounds positions] -> `checkInvariants` extended to the street band for staff states `arriving`/`departing`.
- [Sit fix changes how standing figures look] -> the baked standing meshes are produced by a separate `bakeCharacter` call; only the sit bake changes, verified by comparing standing screenshots before/after.
- [Autosave on open writes while the player is mid-change] -> the save is taken between ticks from the already-committed world; no UI state is involved.

## Migration Plan

Ship as one PR. Rollback is a revert; v3 saves cannot be loaded by the older build (the loader rejects newer versions with a clear message).

## Open Questions

- Exact sit-pose correction (D5) depends on what the clip actually contains; it is decided in apply by screenshots and does not change the specs or tasks.
