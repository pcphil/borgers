## 1. Baseline and failing tests

- [ ] 1.1 Record the baseline in the Findings section: `pnpm simulate 30 <seed> competent` for seeds 1-5 (star days, min cash, day-1 served/lost/rep/top complaint) on current `main`; verify it matches the `early-game-balance` archive Findings table.
- [ ] 1.2 Add failing seating tests (new `src/sim/seating.test.ts` using `testkit`): a solo shares a 4-seat table with another solo; a pair and a solo never share; a pair at a table4 blocks both remaining chairs; a freed chair is reusable by a solo while the other diner eats; table goes dirty once, with one clean task, after the last diner leaves; add a failing test that a dine-in group with no free seat after its seat patience becomes takeout, is counted as served, is not angry and records no complaint; verify each fails on current code for the stated reason.

## 2. Sim: chair-level seating

- [ ] 2.1 Types and construction: add `seatOccupants` and `used` to `PlacedObject`, `seatIdx` to `Group`, remove `occupiedBy` (`src/sim/types.ts`, `newPlacedObject` in `src/sim/layout.ts`, group creation in `src/sim/customers.ts`); verify `pnpm exec tsc -b` lists only the expected call sites to fix.
- [ ] 2.2 Seating rule: replace `canSeat`/`findTable`/the `seeking` and `toSeat` claim with the D2 eligibility and chair assignment; verify the 1.2 sharing tests pass.
- [ ] 2.3 Release and cleaning: one `releaseSeat(group)` helper used by `vacateTable`, `releaseGroupsAt`, `toSeat` failure and angry leaves; D3 `used`/dirty/one clean task/trash roll; verify the dirty-once test passes and sell/move of a table with diners leaves no stale chair.
- [ ] 2.4 Seat patience fallback (D9): in `seeking`, turn an expired seat timer into takeout and a normal exit instead of `leaveAngry('noSeats')`; update `src/sim/people.test.ts` (`no seat before patience -> leaves with noSeats`) to the new behavior; verify the 1.2 fallback test and `people.test.ts` pass and `today.served` rises while `today.lost` and `complaints.noSeats` do not.
- [ ] 2.5 Invariants: update `testkit.checkInvariants` (chair ids exist, `seatIdx` matches occupants, groups of 2+ alone, no occupied chair on a dirty table); verify `pnpm vitest run src/sim` passes including the fuzz test.
- [ ] 2.6 Save v4: bump `SAVE_VERSION`, add `MIGRATIONS[3]` (D7); add a migration test (v3 group eating, dirty table, empty tables) and a mid-meal round-trip test in `src/save/save.test.ts`; verify they pass.

## 3. Rendering and UI

- [ ] 3.1 `Agents.tsx`: draw each seated guest at `SEATS[def][g.seatIdx[m]]`; verify in the browser that two solos at one table sit on different chairs facing the table from all four rotations (screenshots).
- [ ] 3.2 Takeout marker: add the `bag` label kind in `Labels.tsx` for takeout groups (D6) with a unit-level check of which groups get it; verify in the browser that takeout groups show the bag, dine-in groups do not, and a group that falls back to takeout gets the bag at that moment.
- [ ] 3.3 Inspect panel and hints: show chairs in use out of seats for tables (`src/ui/Inspect.tsx`), keep "Dirty"; verify in the browser.

## 4. Balance and ship

- [ ] 4.1 Re-measure `pnpm simulate 30 <seed> competent` for seeds 1-5; decide per D4/D8 on any solo-fills-shared-tables bias and on trimming starter tables; verify day-1 rep stays at 50 or better, no bankruptcies, star days within about 2 days of the baseline, and record the before/after table in Findings.
- [ ] 4.2 Update tests and e2e broken by the model change or a trimmed starter (`e2e/walls.spec.ts` bin spots, `e2e/playthrough.spec.ts`); verify `pnpm test:e2e` passes.
- [ ] 4.3 Run `pnpm lint`, `pnpm check:sim`, `pnpm exec tsc -b`, `pnpm exec vitest run`, `SOAK=1 pnpm exec vitest run`, `pnpm test:e2e` and `pnpm build`; verify all pass.
- [ ] 4.4 Update README and CLAUDE.md if they describe seating or table occupancy; open PR, CI green, merge, then archive the change.

## Findings

<!-- filled in during apply -->
