## 1. Project setup

- [x] 1.1 Scaffold Vite + React + TypeScript (strict) app with pnpm; verify `pnpm dev` serves a page and `pnpm build` succeeds
- [x] 1.2 Add Biome (lint + format) config and `lint`/`format` scripts; verify `pnpm biome ci .` passes
- [x] 1.3 Add Vitest with a trivial test; verify `pnpm vitest run` passes
- [x] 1.4 Add Playwright with a placeholder "page loads" test; verify `pnpm playwright test` passes locally
- [x] 1.5 Add Tailwind; verify a utility class renders styled in the dev page
- [x] 1.6 Create `src/{sim,data,save,render,ui,audio,app}` structure and a lint/grep check that bans `react`, `three`, `Math.random`, `Date.now`, `performance.now` imports/usages inside `src/sim`; verify the check fails on a deliberate violation
- [ ] 1.7 Add GitHub Actions workflow (biome ci, tsc --noEmit, vitest, playwright, build, deploy to Pages on main with Vite `base`); verify workflow runs green and the Pages URL serves the app

## 2. Sim core

- [x] 2.1 Implement seeded PRNG (sfc32/mulberry32) with serializable state; verify unit tests for reproducible sequences and state round-trip
- [x] 2.2 Implement plain-TS world (per-kind entity maps, monotonic ids, stable id ordering) and the command queue; verify unit tests for command validation and application order
- [x] 2.3 Implement fixed-step `step()` with ordered system pipeline and integer tick counter; verify a test that N steps produce identical state hash across two runs with the same seed
- [x] 2.4 Implement clock: ticks→game time, opening 10:00–22:00 (~4 real min at 1x via `balance.ts`), closing behavior, night phase, day counter; verify tests for day length in ticks and closing stops arrivals
- [x] 2.5 Implement night settlement pipeline (wages, rent, interest, deliveries, candidate refresh, star evaluation, autosave hook, day summary record) with stubs for not-yet-built parts; verify a test asserting settlement order via an event log
- [x] 2.6 Implement `GameHost` RAF loop with accumulator, speed (pause/1x/2x/3x), max-ticks-per-frame cap, and interpolation alpha; verify unit test with fake timer that ticks scale with speed and backlog is capped
- [x] 2.7 Implement headless runner `runDays(world, n)` and `scripts/simulate.ts` CLI printing per-day CSV; verify it runs 30 days on an empty game

## 3. Data definitions

- [x] 3.1 Write `data/catalogue.ts` (objects, footprints, access tiles, costs, categories, tiers, unlock star) for the v1 catalogue; verify a test that every entry has a valid footprint and at least one access tile
- [x] 3.2 Write `data/recipes.ts` (Classic, Cheese, Double, Fries, Soda as step lists) and ingredient list; verify a test that every step references an existing station type and ingredient
- [x] 3.3 Write `data/unlocks.ts` (star ladder per progression spec) and `data/balance.ts` (all tunables, money in cents); verify a test that every catalogue/recipe/role item is covered by exactly one unlock tier
- [x] 3.4 Write starter layout definition; verify a test that it passes placement validation and contains the spec'd objects

## 4. Restaurant layout

- [x] 4.1 Implement grid, lot bounds, entrance tile, zones (Kitchen/Dining) and occupancy map; verify unit tests for bounds and occupancy
- [x] 4.2 Implement placement validation (bounds, overlap, zone rules incl. register/pickup straddle, access-tile walkability, reachability flood fill from entrance, unlock, funds/debt) returning a reason; verify a table-driven test per rejection reason
- [x] 4.3 Implement place/rotate/move/sell commands with partial refund and `layoutVersion` bump; verify tests for cost deduction, refund and free move
- [x] 4.4 Implement zone painting command (reject under incompatible objects); verify tests
- [x] 4.5 Implement lot expansion purchase (4★, once); verify test that bounds grow and second purchase is rejected

## 5. Agent navigation

- [x] 5.1 Implement A* (4-connected, binary heap) with customer mask excluding Kitchen; verify tests for routing around obstacles and kitchen avoidance
- [x] 5.2 Implement path cache keyed by layoutVersion and lazy re-path; agent displaced off newly-blocked tile to nearest walkable; verify tests for re-path and unreachable target callback
- [x] 5.3 Implement movement system (tiles/sec × speed stat, prevPos/pos for interpolation); verify test of travel time over a known path
- [x] 5.4 Implement register queue slots (derived from register access tile into Dining), join/advance/full behavior; verify tests for advancing and full-line rejection

## 6. Kitchen operations and inventory

- [x] 6.1 Implement inventory: global stock, capacity (base + per fridge), consume-on-step-start, out-of-stock availability; verify unit tests incl. greyed item when ingredient hits zero
- [x] 6.2 Implement reorder targets, auto-reorder at night, manual next-morning order, capacity truncation with notice; verify the 12→50 patty scenario test
- [x] 6.3 Implement menu state (enable/disable, price) and availability (unlocked + enabled + stations exist + in stock); verify tests
- [x] 6.4 Implement orders and recipe-step task generation with per-item step ordering; verify test that a Classic+Soda order generates the correct task sequence
- [x] 6.5 Implement station slots, tier stats, step duration from staff speed, quality from cook skill × tier; verify tests for capacity wait and quality ordering
- [x] 6.6 Implement pickup flow (assembler delivers completed order to pickup counter, ready event, group collects); verify an integration test from order taken to collected
- [x] 6.7 Implement station upgrade in place and sell-while-in-use cancellation (refund ingredients, requeue step); verify tests per kitchen-operations and restaurant-layout scenarios

## 7. Staff

- [x] 7.1 Implement candidate generation (3 per night, stats, wage ask from stats, seeded names); verify tests for determinism and refresh
- [x] 7.2 Implement hire/fire commands (spawn at entrance, fire drops task and walks out) and nightly wages; verify tests
- [x] 7.3 Implement role assignment (Cleaner gated by unlock) and per-role task queues with oldest-task / nearest-free-station selection; verify tests incl. tie-breaking determinism
- [x] 7.4 Implement cleaning fallback for Cashier/Assembler when no Cleaner assigned; verify the 1★ cleaning scenario test

## 8. Customers, reputation and cleanliness

- [x] 8.1 Implement arrival generator (demand curve × reputation × price factor, groups 1–4, takeout/dine-in choice); verify statistical tests: lunch > afternoon, higher rep → more arrivals (fixed seeds)
- [x] 8.2 Implement customer state machine (queue → order → wait → collect → seat/eat or leave) with patience timers and angry exits; verify integration tests for each exit path
- [x] 8.3 Implement ordering choice weighted by appeal and price vs fair value, payment at order time; verify overpriced-item test
- [x] 8.4 Implement seating (table size ≥ group, free, clean, reachable) and eating duration; verify group-of-3 needs 4-seat test
- [x] 8.5 Implement dirt (table dirty on leave) and trash drops (suppressed near bin), cleaning tasks; verify tests
- [x] 8.6 Implement satisfaction scoring, complaint tracking, rolling reputation (last N); verify tests for good vs angry visits and reputation drop
- [x] 8.7 Implement hint generator from sim conditions (no cashier/cook/assembler, missing station, out of stock, line too long, in debt) with auto-clear; verify tests per hint

## 9. Economy and progression

- [x] 9.1 Implement cash ledger in cents with categorized transactions and per-day history (≥30 days); verify tests
- [x] 9.2 Implement rent, debt rules (negative cash allowed for recurring costs, purchases blocked while negative), loan take/repay/interest; verify tests for the loan scenarios
- [x] 9.3 Implement star evaluation at night (rep + cumulative revenue thresholds, never decreases), unlock application, win flag at 5★; verify tests
- [x] 9.4 Add simulation invariant suite: 30-day headless runs over several seeds and scripted strategies asserting no negative stock, no orphan tasks/orders, no agents off-grid, determinism hash match; verify `vitest run` passes

## 10. Save system

- [x] 10.1 Implement serialize/deserialize of full world (incl. RNG state, in-progress orders, tasks); verify round-trip test `step^N(load(save(w))) == step^N(w)`
- [x] 10.2 Implement schema version, validation and migration chain (with a dummy v0→v1 test migration); verify tests for migrate and refuse-future-version
- [x] 10.3 Implement IndexedDB slots via idb-keyval (named slots, autosave slot, slot index metadata) with in-memory fallback; verify tests using fake-indexeddb
- [x] 10.4 Implement export (JSON download) and import (validate, reject without overwriting); verify tests for invalid file rejection
- [x] 10.5 Wire nightly autosave to settlement honoring the autosave setting; verify test

## 11. Rendering

- [x] 11.1 Set up R3F Canvas with orthographic iso camera, pan (drag/WASD), clamped zoom, 90° rotate (Q/E), bounds; verify manually and with a unit test of screen→tile conversion under each rotation
- [x] 11.2 Render ground grid, zones, lot bounds and entrance from sim state; verify visually against starter layout
- [x] 11.3 Render placed objects (primitives first) mounted by layoutVersion; verify placing/selling updates the scene
- [x] 11.4 Render agents with InstancedMesh, positions interpolated in useFrame from prevPos/pos; verify smooth motion at 1x and 3x
- [x] 11.5 Render object states (food on grill, dirty table, trash, order on pickup); verify visually during a run
- [x] 11.6 Implement day/night lighting driven by clock, shadows toggle; verify night is visibly darker
- [x] 11.7 Import, compress and wire Kenney/Quaternius CC0 models replacing primitives; add `ASSETS.md` with licenses; verify all models load and build size is reasonable
- [ ] 11.8 Add r3f-perf in dev and a stress scene (100 agents, 150 objects); verify ≥60 fps on reference iGPU with shadows off

## 12. UI

- [x] 12.1 Implement zustand snapshot publisher (~10 Hz) and HUD (cash, day/clock, open/closed, reputation, stars, speed controls); verify HUD updates during play
- [x] 12.2 Implement build mode UI: catalogue (locked states), ghost preview with rotation and validity reason, confirm/cancel, select-to-move/upgrade/sell, zone paint tool; verify each placement rejection reason displays
- [x] 12.3 Implement Staff panel (pool, hire, fire, roles, stats, wages); verify via play
- [x] 12.4 Implement Menu panel (enable, price, fair value, availability) and Inventory panel (stock, targets, auto-reorder, manual order, capacity); verify via play
- [x] 12.5 Implement Finances panel (daily history, loan take/repay) and day summary modal; verify after a full day
- [x] 12.6 Implement inspect panel for customers, staff and objects via picking; verify clicking shows correct details
- [x] 12.7 Implement world labels (complaint bubbles, order-ready marker, dirty marker) with drei Html/sprites; verify they track agents and stay sparse
- [x] 12.8 Implement hints list UI (auto-clear, dismiss) and the new-game starter flow; verify the "hire cashier/cook/assembler" hints on a fresh game
- [x] 12.9 Implement main menu (New, Continue, Load, Import, Settings), save/load slot UI with overwrite confirmation, settings (volume, shadows, UI scale, autosave) persisted in localStorage; verify settings persist across reload
- [x] 12.10 Implement win banner at 5★ (shown once, sandbox continues); verify via a debug command that sets stars

## 13. Audio

- [x] 13.1 Implement SFX player (single AudioContext, unlocked on first interaction, master volume, per-sound rate limit, silent while paused) subscribed to sim events; verify unit test of rate limiting and manual check of each event sound
- [x] 13.2 Add Kenney CC0 SFX for enter, order taken, cooking, order ready, purchase, star gained; record in `ASSETS.md`; verify sounds play in game

## 14. Integration and release

- [x] 14.1 Replace placeholder Playwright test with smoke test: load app, start new game, canvas renders, clock advances; verify passes in CI
- [x] 14.2 Balance pass using `scripts/simulate.ts`: tune `balance.ts` so a reasonable strategy reaches 2★ within ~5 days and 5★ within ~30 days without loans; record results in this change
- [ ] 14.3 Full manual playthrough from new game to 3★ including save/load, export/import and building during service; fix blocking bugs found
- [ ] 14.4 Deploy to GitHub Pages and verify the public URL runs a full day
