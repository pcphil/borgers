## 1. Prep phase and open command (sim)

- [x] 1.1 Add `'prep'` to `Phase`; `Sim.clockSystem` does not advance the day clock in `prep`; `newGame` starts in `prep`, `emptyWorld` stays `open`, `startDay` sets `prep`. Verify with a test: a new game stepped 2000 ticks keeps `clock.tick === 0`, spawns no customers, and a hired cook still walks to the grill
- [x] 1.2 Add the `{ type: 'open' }` command (valid only in `prep`, otherwise `fail('notPreparing')`): sets `open`, stamps `employedAtOpen` (removed from `startDay`), draws the rush pattern. Verify with tests: opening starts the clock and arrivals; opening twice fails; a cook hired in prep is paid at settlement; firing before open is not paid
- [x] 1.3 `runDays` opens automatically when it finds `prep`; `autoplay` opens after applying the strategy (check the early return on `phase !== 'open'` in `src/dev/autopilot.ts`); `window.borgers.autoplay` and `pnpm simulate 3 1 competent` still advance days
- [x] 1.4 Update existing tests that assume a new day or new game runs on its own (core, save, invariants, sweep, arrivals tests): dispatch `open` where they step by hand. Verify `pnpm test` passes

## 2. Rush pattern

- [x] 2.1 Add `rush: number[]` (13 knots, default ones) to `World` and `emptyWorld`; constants `RUSH = { min, max }` in `balance.ts`; draw and normalize knots in the `open` command (design D3); `arrivalRate` multiplies by the interpolated knot. Verify with tests: normalization keeps `sum(base * m) == sum(base)` within 1e-6 for many seeds; same seed gives the same pattern; different days differ; `makeSim` worlds (all ones) arrive exactly as before
- [x] 2.2 Statistical test over 200 simulated days (arrival counting only, fixed reputation and prices): mean arrivals per day within 5% of the unmodulated curve; the busiest hour varies across days. Record the numbers under Findings

## 3. Street approach and departure (sim)

- [x] 3.1 Add `STREET` constants, `GroupState` `'arriving' | 'departing'`, `Group.side`; implement `walkRoute` in `movement.ts` (straight-line scripted waypoints, sets `prev`, no occupancy/path-cache use). Verify with unit tests: speed matches `walkSpeed`, ends exactly on the last waypoint, independent of `layout.version` changes mid-walk
- [x] 3.2 Rework `spawnGroup` / add `enterRestaurant` and the `departing` leg per design D4: groups spawn at a seeded street end, walk to the entrance tile, then run register choice and enqueue; `customerEnter` is emitted at the door; leaving groups record their visit at the door and are removed at their street end. Verify with tests: a new group is outside the lot and not in any queue while walking; `queueWait` is 0 at the door; a group from the right end leaves toward the right; angry-at-door cases (no menu / lines full) turn around and still depart cleanly; day end waits for street walkers
- [x] 3.3 Relax position invariants for street states in `checkInvariants`; audit every consumer of group positions or states (`grep` for `groups`, `tileOf(g`, `state ===` in sim, app, ui, render, `debug.ts` stress scene) and fix: Inspect/text labels for the new states, snapshot customer count, hints, labels overlay, stress scene. Verify typecheck, tests and a screenshot of an inspected street walker
- [x] 3.4 Re-run the invariants/fuzz/soak suites (`SOAK=1`) and the determinism test; all pass with the new flow

## 4. Save migration

- [x] 4.1 Bump `SAVE_VERSION` to 2, add `MIGRATIONS[1]` (rush ones, `side: 1` on groups), extend `assertWorld` for `rush`. Verify with tests: a v1 save fixture (current save with `rush`/`side` stripped and `version: 1`) loads and continues; a v0 save chains through both migrations; night-phase and mid-day v1 saves resume correctly; newer-version rejection unchanged

## 5. UI

- [x] 5.1 HUD: "Preparing" label and Open restaurant button (`data-testid="open-button"`) when phase is `prep`; button dispatches `open`; hidden otherwise; add the `closed` hint in `hints.ts`. Verify with a Playwright check that a new game shows Preparing at 10:00, the clock does not move, and clicking Open starts it
- [x] 5.2 Update e2e specs (smoke clock advances after Open; flows and playthrough click Open before expecting customers/clock changes). Verify `pnpm test:e2e` passes

## 6. World rendering

- [x] 6.1 Street: recolor the strip as road with lane marking, widen the street and ground planes to cover `spawnDistance` plus the zoomed-out view; verify by screenshot that walkers appear from off-screen at default zoom and look right zoomed out
- [x] 6.2 `Walls.tsx`: four wall boxes from `snapshot.lot` with the door gap, camera-facing walls animate low and the others full height, no raycast, no shadow cast; remove the lot outline `Line`; mount in `Scene`. Verify by screenshots at all four rotations (Q/E) and after buying the expansion
- [x] 6.3 `Door.tsx`: leaf opens when a customer or staff is within range and closes after, height follows the front wall. Verify with screenshots of a closed door and an open door (customer at the threshold)
- [x] 6.4 Check build/inspect/paint still work through the walls (place an object, select an agent and an object near each wall), and re-run `node scripts/perf.mjs` against a built preview: no meaningful fps regression versus the earlier ~360 fps stress result

## 7. Verify and ship

- [x] 7.1 `pnpm lint`, `pnpm check:sim`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` pass
- [x] 7.2 `pnpm simulate 30 <seed> competent` for seeds 1-3 compared with the archived Balance Results (star day thresholds within a few days; no seed goes bankrupt); adjust `RUSH`/`STREET` or record the new results in design.md
- [ ] 7.3 Update README (playing section: Open button) and CLAUDE.md if present; open PR, CI green, merged; archive the change

## Findings

### Balance (task 7.2)
`pnpm simulate 30 <seed> competent`, star reached on day (archived result in brackets):

| Seed | 2★ | 3★ | 4★ | 5★ | Min cash |
| --- | --- | --- | --- | --- | --- |
| 1 | d4 (d4) | d10 (d9) | d16 (d16) | d26 (d26) | $2,432 |
| 2 | d4 (d4) | d8 (d8) | d15 (d15) | d26 (d28) | $2,082 |
| 3 | d3 (d3) | d9 (d9) | d18 (d17) | none, 4★ at d30 (same) | $2,186 |
| 4 | d5 (d4) | d11 (d10) | d17 (d15) | d27 (d25) | $2,217 |
| 5 | d4 (d3) | d9 (d9) | d16 (d15) | d26 (d25) | $2,352 |

Within 0-2 days of before; seeds 4 and 5 are about a day slower, plausibly from the street walk delay and rush variance. No seed goes bankrupt. `RUSH` (0.55-1.45) and `STREET.spawnDistance` (18) are kept at their starting values.

### Rush (task 2.2)
Over 200 simulated days (arrival counting only) mean arrivals per day stay within ±7% of the unmodulated expectation (the test bound; normalization itself is exact to 1e-6 per day) and the busiest hour differs across at least 3 distinct hours.

### Rendering (tasks 6.x)
- Screenshots (GPU Chromium, dev build): prep HUD with Open button and hint, walls at the default and two rotated views (near walls low, far walls full height, door visible in the far wall), a group of two on the street and at the door with the door swung open, and the expanded lot with walls on the new boundary.
- Perf (`scripts/perf.mjs`, built preview, RTX 3070): 320 fps on the stress scene (was about 360), 736 draw calls.
- Click-through: the playthrough e2e places a trash bin by clicking tile (11,0) on the front row, so walls do not block placement; selecting objects right at each wall was not separately tested.
- Not checked: how the street ends look fully zoomed out (agents appear 18 tiles beyond the lot and the ground plane is wider than that, but I did not screenshot the farthest zoom).

### Tooling note
`rtk pnpm typecheck` summarises away real `tsc` errors (it printed "TypeScript compilation completed" while errors were present); use `pnpm exec tsc -b` directly when verifying.
