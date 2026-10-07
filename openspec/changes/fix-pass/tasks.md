## 1. Facing

- [x] 1.1 Take a "before" screenshot pair (agent walking along +x and along +z) with `scripts/shot.mjs` and note which way the model faces; verify the screenshots are saved in the scratchpad
- [x] 1.2 Extract pure `facingYaw(prev, pos, lastYaw)` (tile-space `atan2(dx, dy)` with epsilon, falls back to `lastYaw`) with a vitest covering +x, +z, diagonal, zero movement, and independence from step size; `pnpm test` passes
- [x] 1.3 Replace the per-frame delta logic in `useFacing` with `facingYaw` fed by sim `pos`/`prev`; seated and station-facing overrides unchanged; verify with typecheck and the "after" screenshots
- [x] 1.4 Model front: `bakeCharacter` rotated the baked model by π (local −z forward) while yaw assumes +z forward, so everything faced backwards. Removed that rotation (no offset constant needed). Verified by screenshots at uncapped GPU fps (~1500 fps): +z walker shows its back heading away, +x walker faces down-left, queued customer faces the register. Low-fps/`--software` not screenshotted; the yaw now comes from the sim tick vector so it is fps-independent by construction (unit-tested)
- [x] 1.5 Capsule fallback and staff hats are rotationally symmetric (no yaw is applied to them), so nothing to change; not visually inspected during model load

## 2. Arrivals

- [x] 2.1 Add a test that simulates several days for seeds 1–3 and records inter-arrival gaps and group sizes; assert gap variance above a floor, size shares within tolerance of `[45,35,12,8]`, and same-seed reproducibility; run it and record the numbers in this file
- [x] 2.2 Observe the live game for one open day (screenshots or autopilot trace) and record whether the "always 2 / fixed interval" impression is reproducible; write the finding under Findings below
- [x] 2.3 If a sim defect is found: fix with a failing test first, re-run `pnpm simulate 30 <seed> competent` for seeds 1–3 and compare against the archived Balance Results; if only perception, leave the sim unchanged and note follow-ups for `world-dressing`

## 3. Stability sweep

- [x] 3.1 Playwright-driven real-time day (dev server, GPU Chromium, 3x speed, not the built preview) collecting `console.error` and `pageerror`; zero errors or each one fixed/recorded
- [x] 3.2 Add a mid-day save/load round-trip test (serialize via the save format, load, advance both copies the same ticks, assert equal worlds); `pnpm test` passes
- [x] 3.3 Run a 100-day soak on seeds 1–3 with invariants checked per day (extend `invariants.test.ts` or a script); no invariant violations, NaNs or runaway queues
- [x] 3.4 Odd-input scenarios with `makeSim`: build/sell on occupied or path-critical tiles during rush, fire staff mid-task and mid-delivery, sell a station with a claimed task, rapid pause/speed changes via `GameHost`; each has a test or is recorded as fine
- [x] 3.5 Fix every finding with a failing test first (or record why not fixed under Findings)

## 4. Verify and ship

- [x] 4.1 `pnpm lint`, `pnpm check:sim`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` all pass
- [x] 4.2 `pnpm simulate 30 1 competent` (and seeds 2, 3) compared with the Balance Results: unchanged unless 2.3 changed the sim, in which case update the results in design.md (seeds 1-3 identical to the archived Balance Results: 1 and 2 reach 5★, 3 is 4★ at d30, seed 2 day-30 cash $2,125; the only sim change is ignoring non-finite command inputs)
- [ ] 4.3 Open PR, CI green, merged; archive the change

## Findings

### Facing (group 1)
- Root cause was two compounding bugs: (a) `useFacing` compared per-render-frame positions with a `1e-5` squared-distance gate, which never passes at 300+ fps, so yaw stayed at its default `π`; (b) `bakeCharacter` rotated the baked model by `π` (local −z forward) while the yaw formula `atan2(dx, dz)` assumes +z forward, so even correct yaws pointed backwards. Fixed both; yaw now comes from the sim tick vector (`src/render/facing.ts`).
- Seated diners use the same formula toward the table; they now face the table. The hunched look of the seated pose is the Kenney `sit` clip baked as-is and is unchanged (not in scope here).

### Arrivals (group 2)
- Not reproducible in the sim. Seeds 1–3, day 1, new game, no player actions: 22–26 groups/day, mean gap 7.0–8.9 s game time, gap CV 1.2–1.6 (fixed period would be 0), min gap 0.05 s, max ~48 s; group sizes mixed (e.g. counts for sizes 1–4: `[6,4,1,1]`, `[7,3,4,2]`, `[6,7,0,2]`); first sizes `1,2,1,2,2` / `1,3,1,3,1` / `1,2,4,1,1,1`. Added `src/sim/arrivals.test.ts` as a regression guard (gap variance, same-seed reproducibility, 2000-draw size weights).
- Likely perception causes, handled in `world-dressing`: the game starts already `open` at 10:00 so customers arrive before the player has set anything up, with no cashier every group leaves angry within seconds; all groups spawn on the same entrance tile (no approach from a street), so arrivals read as a repeated "pop-in" at one spot.
- No sim change, so balance is unchanged (task 4.2 still re-checks).

### Stability sweep (group 3)
- 3.1 Browser: full day at 3x on GPU Chromium (dev build, so React warnings show) with 30 rapid pause/speed flips and panel open/close keys mid-service, hired 3 staff: day completed (26 served), **no `console.error`, `pageerror` or React warnings**. Only console noise is the upstream `THREE.Clock` deprecation warning from three/r3f (not ours, left alone).
- 3.2 Save/load: mid-day world (customers in flight, 2600 ticks in) → serialize → JSON → deserialize → `Sim`; original and reloaded hash equal immediately and after 3000 more ticks; saves don't alias live state. No defect.
- 3.3 Soak: `SOAK=1 pnpm vitest run src/sim/sweep.test.ts -t soak` — 100 competent-autopilot days for seeds 1, 2, 3 with invariants (stock/reservations, task/staff/queue cross-links, positions in bounds and finite, integer money, group cap) checked every day: all pass (~68 s per seed). Opt-in via `SOAK=1`, skipped in normal runs.
- 3.4 Odd inputs: seeded command fuzz (3 seeds × 6 days, a random command every 15 ticks, ~25% with bogus ids/out-of-range or negative values) including place/move/sell/upgrade/paint/expand/hire/fire/setRole/menu/stock/loan; the test asserts that sell, fire, place and move were each *accepted* at least once so the risky paths are really exercised. Plus rapid menu/price flips mid-order. No throw, no invariant violation.
- 3.5 One defect found, fixed test-first: `setMenu` price, `setStockTarget` and `manualOrder` accepted `NaN`/`±Infinity` (`NaN` became `null` in saves). Not reachable from the current UI (price uses ±25 buttons; the stock input is a number field whose junk value is `''` → 0) so it was latent API robustness; the sim now ignores non-finite values. Covered by `ignores non-finite numbers in commands`.
- Observed, not fixed (out of scope): the baked Kenney `sit` pose looks hunched forward over the table.
