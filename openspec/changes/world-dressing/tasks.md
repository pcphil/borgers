## 1. Prep phase and open command (sim)

- [ ] 1.1 Add `'prep'` to `Phase`; `Sim.clockSystem` does not advance the day clock in `prep`; `newGame` starts in `prep`, `emptyWorld` stays `open`, `startDay` sets `prep`. Verify with a test: a new game stepped 2000 ticks keeps `clock.tick === 0`, spawns no customers, and a hired cook still walks to the grill
- [ ] 1.2 Add the `{ type: 'open' }` command (valid only in `prep`, otherwise `fail('notPreparing')`): sets `open`, stamps `employedAtOpen` (removed from `startDay`), emits a notice event. Verify with tests: opening starts the clock and arrivals; opening twice fails; a cook hired in prep is paid at settlement; firing before open is not paid
- [ ] 1.3 `runDays` opens automatically when it finds `prep`; `autoplay` opens after applying the strategy (check the early return on `phase !== 'open'` in `src/dev/autopilot.ts`); `window.borgers.autoplay` and `pnpm simulate 3 1 competent` still advance days
- [ ] 1.4 Update existing tests that assume a new day or new game runs on its own (core, save, invariants, sweep, arrivals tests): dispatch `open` where they step by hand. Verify `pnpm test` passes

## 2. Rush pattern

- [ ] 2.1 Add `rush: number[]` (13 knots, default ones) to `World` and `emptyWorld`; constants `RUSH = { min, max }` in `balance.ts`; draw and normalize knots in the `open` command (design D3); `arrivalRate` multiplies by the interpolated knot. Verify with tests: normalization keeps `sum(base * m) == sum(base)` within 1e-6 for many seeds; same seed gives the same pattern; different days differ; `makeSim` worlds (all ones) arrive exactly as before
- [ ] 2.2 Statistical test over 200 simulated days (arrival counting only, fixed reputation and prices): mean arrivals per day within 5% of the unmodulated curve; the busiest hour varies across days. Record the numbers under Findings

## 3. Street approach and departure (sim)

- [ ] 3.1 Add `STREET` constants, `GroupState` `'arriving' | 'departing'`, `Group.side`; implement `walkRoute` in `movement.ts` (straight-line scripted waypoints, sets `prev`, no occupancy/path-cache use). Verify with unit tests: speed matches `walkSpeed`, ends exactly on the last waypoint, independent of `layout.version` changes mid-walk
- [ ] 3.2 Rework `spawnGroup` / add `enterRestaurant` and the `departing` leg per design D4: groups spawn at a seeded street end, walk to the entrance tile, then run register choice and enqueue; `customerEnter` is emitted at the door; leaving groups record their visit at the door and are removed at their street end. Verify with tests: a new group is outside the lot and not in any queue while walking; `queueWait` is 0 at the door; a group from the right end leaves toward the right; angry-at-door cases (no menu / lines full) turn around and still depart cleanly; day end waits for street walkers
- [ ] 3.3 Relax position invariants for street states in `checkInvariants`; audit every consumer of group positions or states (`grep` for `groups`, `tileOf(g`, `state ===` in sim, app, ui, render, `debug.ts` stress scene) and fix: Inspect/text labels for the new states, snapshot customer count, hints, labels overlay, stress scene. Verify typecheck, tests and a screenshot of an inspected street walker
- [ ] 3.4 Re-run the invariants/fuzz/soak suites (`SOAK=1`) and the determinism test; all pass with the new flow

## 4. Save migration

- [ ] 4.1 Bump `SAVE_VERSION` to 2, add `MIGRATIONS[1]` (rush ones, `side: 1` on groups), extend `assertWorld` for `rush`. Verify with tests: a v1 save fixture (current save with `rush`/`side` stripped and `version: 1`) loads and continues; a v0 save chains through both migrations; night-phase and mid-day v1 saves resume correctly; newer-version rejection unchanged

## 5. UI

- [ ] 5.1 HUD: "Preparing" label and Open restaurant button (`data-testid="open-button"`) when phase is `prep`; button dispatches `open`; hidden otherwise; add the `closed` hint in `hints.ts`. Verify with a Playwright check that a new game shows Preparing at 10:00, the clock does not move, and clicking Open starts it
- [ ] 5.2 Update e2e specs (smoke clock advances after Open; flows and playthrough click Open before expecting customers/clock changes). Verify `pnpm test:e2e` passes

## 6. World rendering

- [ ] 6.1 Street: recolor the strip as road with lane marking, widen the street and ground planes to cover `spawnDistance` plus the zoomed-out view; verify by screenshot that walkers appear from off-screen at default zoom and look right zoomed out
- [ ] 6.2 `Walls.tsx`: four wall boxes from `snapshot.lot` with the door gap, camera-facing walls animate low and the others full height, no raycast, no shadow cast; remove the lot outline `Line`; mount in `Scene`. Verify by screenshots at all four rotations (Q/E) and after buying the expansion
- [ ] 6.3 `Door.tsx`: leaf opens when a customer or staff is within range and closes after, height follows the front wall. Verify with screenshots of a closed door and an open door (customer at the threshold)
- [ ] 6.4 Check build/inspect/paint still work through the walls (place an object, select an agent and an object near each wall), and re-run `node scripts/perf.mjs` against a built preview: no meaningful fps regression versus the earlier ~360 fps stress result

## 7. Verify and ship

- [ ] 7.1 `pnpm lint`, `pnpm check:sim`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` pass
- [ ] 7.2 `pnpm simulate 30 <seed> competent` for seeds 1-3 compared with the archived Balance Results (star day thresholds within a few days; no seed goes bankrupt); adjust `RUSH`/`STREET` or record the new results in design.md
- [ ] 7.3 Update README (playing section: Open button) and CLAUDE.md if present; open PR, CI green, merged; archive the change

## Findings

_(filled in during apply)_
