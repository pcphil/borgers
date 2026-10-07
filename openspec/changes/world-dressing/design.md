## Context

See proposal.md for motivation. Current state relevant here (observed in code):

- `World.clock.phase` is `'open' | 'closing' | 'night'`; `newGame`/`emptyWorld` start `open`, `startDay()` (end of night) sets `open` again, and `Sim.clockSystem` ticks `clock.tick` only while `open`/`closing`. `employedAtOpen` is stamped in `startDay`.
- `spawnGroup` creates the group *on the entrance tile* `(LOT.entranceX, 0)`, emits `customerEnter`, picks a register and enqueues the group in one step. `startLeaving` paths back to the entrance tile and `despawn` runs when that move finishes.
- Grid agents move with `move()` along `Agent.path` computed by A*; positions are asserted in-bounds (`invariants`, `checkInvariants`).
- `arrivalRate` = `demandAt(hour)/TICKS_PER_HOUR * reputationFactor * priceFactor`; one seeded Bernoulli roll per tick.
- Ground already renders a 2-tile-wide street strip at `z = -1.5` (tile rows `-2.5..-0.5`) on a `MAXW+30` grass plane and a lot outline `Line`. The camera sits at front-right (`+x, -z`) and rotates in quarter turns (Q/E).
- Save version is 1, with a `MIGRATIONS` table keyed by "from" version (0 -> 1 exists).

## Goals / Non-Goals

**Goals:** the player controls when the day starts; customers visibly come from and go to the street; busy and quiet periods vary by day without changing expected daily totals; the lot reads as a building with walls and a door; old saves keep loading; the sim stays pure and deterministic.

**Non-Goals:** closing early, staff using the street (hired staff still appear at the entrance tile), kitchen/dining divider walls, new customer behaviors, a real walkable street in the grid, door interaction by clicking, extra audio.

## Decisions

### D1. `prep` is a clock phase; opening is a command
`Phase = 'prep' | 'open' | 'closing' | 'night'`. In `prep`, `clockSystem` does not advance `clock.tick` and `arrivalSystem` is already gated on `open`, so no customers arrive; `staffSystem` and `customerSystem` still run so hired staff walk to stations and cleaners work. `newGame` starts in `prep`; `startDay()` (end of night) sets `prep` instead of `open`. `{ type: 'open' }` is valid only in `prep` (otherwise it returns `fail('notPreparing')`): it sets `open`, stamps `employedAtOpen` (moved out of `startDay`), and draws the day's rush pattern (D3). It emits no event (the HUD change is the feedback). `emptyWorld` (used by `makeSim`) stays `open` so existing scenario tests are unaffected.
*Alternative:* a separate `open: boolean` flag. Rejected: the phase already encodes day state and every consumer (HUD, snapshot clock text, autopilot) switches on it.

### D2. Headless runners open the restaurant themselves
`runDays` dispatches `open` whenever it finds `prep` at the start of a loop iteration, and `autoplay` opens after applying the strategy. `pnpm simulate`, soak/fuzz/arrival tests and the `window.borgers.autoplay` hook keep advancing days with no per-test changes beyond those that step `newGame` by hand (they dispatch `open` once). No auto-open in the interactive `GameHost`.

### D3. Rush pattern: 13 hourly knots, normalized
`world.rush: number[]` (13 knots, one per hour boundary 10:00..22:00, default all `1`). At open, each knot is `randRange(rng, RUSH.min, RUSH.max)` (starting at 0.55..1.45) then the vector is rescaled so `sum(base(h) * m(h)) == sum(base(h))` over the day's ticks (numeric, per-tick sum is cheap and done once per day), keeping the expected total unchanged. `arrivalRate` multiplies by the piecewise-linear interpolation of the knots at the current hour. The existing lunch/dinner shape is kept (rush is multiplicative on top of it) so peaks still exist but their strength and neighbours vary.
*Alternative:* random Gaussian bumps at lunch/dinner. Rejected for now: more parameters to tune for the same visible effect; can be revisited if days still feel samey.
Makes `makeSim` worlds (no open) behave as today because `rush` stays all ones.

### D4. Street legs are scripted waypoints; the grid stays untouched
New `GroupState`s `'arriving'` and `'departing'`, plus `Group.side: -1 | 1` (left/right end). Constants in `balance.ts`: `STREET = { laneY: -1.5, spawnDistance: 18 }`. 
- `spawnGroup` now: roll size/takeout/patience as today, set `side = chance(rng, 0.5) ? 1 : -1`, place the group at `x = side < 0 ? -spawnDistance : MAXW + spawnDistance`, `y = laneY`, `path = [(entranceX, laneY), entranceTile]`, `state = 'arriving'`. It no longer emits `customerEnter`, picks a register or checks the menu.
- A new `walkRoute(g, speed)` in `movement.ts` moves along `g.path` in straight lines at the customer walk speed (sets `prev`, advances `pathIdx`, returns `'arrived'` at the end) without consulting occupancy or the path cache. Arrival walking ignores `layout.version`.
- On arriving at the entrance tile, `enterRestaurant(sim, g)` runs the logic that used to follow creation: emit `customerEnter`, leave angry if nothing is orderable, otherwise `chooseRegister`, enqueue, state `toQueue`. Line patience (`queueWait`) therefore starts at the door.
- `startLeaving` is unchanged (grid path to the entrance tile). When the `leaving` move reaches the entrance (or fails, as before), the visit is recorded (`recordVisit`, today's served/lost, order deleted) and the group switches to `departing` with `path = [(entranceX, laneY), (endX(side), laneY)]`; reaching the end deletes the group. A group whose leave-path failed is removed immediately as today.
- `maxActiveGroups` continues to count every group including walkers; at ~18 tiles / 2 tiles per game second the street adds about 9 game seconds each way (~3.7% of a day) so the effect on the cap is negligible.
*Alternatives:* (a) real street tiles in the occupancy grid: rejected, changes grid size, A* bounds, saves and stress scene for no behavioral gain; (b) interpolate only in the renderer: rejected, the sim would still stack groups on one tile and `customerEnter` timing would not match what is seen.

### D5. Positions outside the lot are legal only in street states
`checkInvariants` and any bounds assumptions allow `y` in `[-2.5, -0.5]` and `x` anywhere only while `state` is `arriving`/`departing`. Code that maps agent positions to tiles (`tileOf` for dirt, hit testing, labels, Inspect) is audited: street groups are not clickable-through-grid issues because `agentAt` works on raw positions; `Inspect` and `text.ts` get readable labels ("Walking to the door", "Heading home"); snapshot `customers` count includes them.

### D6. Walls are render-only and camera-aware
New `Walls.tsx` draws four wall boxes on the lot rectangle (`-0.5..w-0.5` by `-0.5..h-0.5`) from `snapshot.lot` so expansion redraws them. The front wall (`y = -0.5`) is split around the door gap at `entranceX` (one tile wide). In `useFrame`, for each wall compute `dot(outwardNormal, cameraPosition - lotCentre)`; walls with a positive dot (facing the camera) animate toward low height (`0.25`), the others toward full height (`1.8`), with a short ease so rotating the view (Q/E) animates the change. Walls and door set `raycast` to a no-op so build/inspect clicks pass through to the ground plane; they do not cast shadows (avoids shading the interior). The existing lot outline `Line` is removed in favour of the walls.

### D7. Door is a sliding/hinged leaf driven by agent proximity
`Door.tsx` finds any customer or staff within ~1.4 tiles of the door position (including `arriving`/`departing` street walkers on the door column) in `useFrame` and eases an open amount toward 1 (else 0); the leaf rotates about its hinge. It scales height with the front-wall height so it stays consistent when the front wall is low. No sim state involved.

### D8. Save version 2
`SAVE_VERSION = 2`; `MIGRATIONS[1]` adds `rush: Array(13).fill(1)` and `side: 1` on every existing group (old groups are inside the lot, so no street state). `clock.phase` values are unchanged and valid; a night save resumes night then enters `prep`; a mid-day save stays `open`. `assertWorld` additionally checks `rush` is an array. Behavior of a mid-day save across the upgrade is not bit-identical to the old version (not required).

### D9. HUD and hint
`snapshot.phase` already carries the phase. `Hud` shows "Preparing" for `prep` and an Open restaurant button (`data-testid="open-button"`) in the clock area; a `closed` hint (priority below staffing warnings) reads "The restaurant is closed. Press Open when you're ready." Opening with unstaffed roles is allowed (the existing warnings stay visible). Speed controls remain usable; in `prep` they only affect staff movement.

## Risks / Trade-offs

- [Balance drift from rush variance and street delay] -> normalization keeps expected demand; re-run `pnpm simulate 30 <seed> competent` for seeds 1-3 and compare star timings with the archived Balance Results; adjust `RUSH.min/max` or revert rush to a smaller spread if outcomes move materially.
- [Many tests assume `newGame` runs immediately or customers appear on the entrance tile] -> D2 handles headless day loops; hand-stepping tests dispatch `open`; entrance-position assertions are updated to the door arrival. Done as an explicit task with a grep audit.
- [Street walkers break assumptions about in-lot positions] -> D5 audit task and relaxed invariants limited to street states.
- [Agents popping in visibly at the street ends] -> `spawnDistance = 18` is beyond the default-zoom view; ground planes widened; verify by screenshot at default zoom and fully zoomed out.
- [Walls hide the interior after rotation or at odd zooms] -> camera-facing cutaway computed per frame from the camera position; verify all four rotations by screenshot.
- [Players forget to open] -> HUD button plus the `closed` hint; no auto-open.
- [Autosave only fires at night] -> changes made in prep before the first night are not autosaved; same as today, unchanged.

## Migration Plan

Ship in one PR after `fix-pass`. Rollback is a revert; saves written as v2 cannot be loaded by the older build (the loader already rejects newer versions with a clear message).

## Open Questions

- Rush spread (`0.55..1.45`) and `spawnDistance` are starting guesses; both live in `balance.ts` and are tuned during apply with `pnpm simulate` and screenshots (answers do not change specs or tasks).
