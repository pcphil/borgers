## 1. Baseline and failing tests

- [x] 1.1 Record the baseline in the Findings section: `pnpm simulate 30 <seed> competent` for seeds 1-5 (star days, min cash, day-1 served/lost/rep/top complaint) on current `main`; verify it matches the `early-game-balance` archive Findings table.
- [x] 1.2 Add failing seating tests (new `src/sim/seating.test.ts` using `testkit`): a solo shares a 4-seat table with another solo; a pair and a solo never share; a pair at a table4 blocks both remaining chairs; a freed chair is reusable by a solo while the other diner eats; table goes dirty once, with one clean task, after the last diner leaves; add a failing test that a dine-in group with no free seat after its seat patience becomes takeout, is counted as served, is not angry and records no complaint; verify each fails on current code for the stated reason.

## 2. Sim: chair-level seating

- [x] 2.1 Types and construction: add `seatOccupants` and `used` to `PlacedObject`, `seatIdx` to `Group`, remove `occupiedBy` (`src/sim/types.ts`, `newPlacedObject` in `src/sim/layout.ts`, group creation in `src/sim/customers.ts`); verify `pnpm exec tsc -b` lists only the expected call sites to fix.
- [x] 2.2 Seating rule: replace `canSeat`/`findTable`/the `seeking` and `toSeat` claim with the D2 eligibility and chair assignment; verify the 1.2 sharing tests pass.
- [x] 2.3 Release and cleaning: one `releaseSeat(group)` helper used by `vacateTable`, `releaseGroupsAt`, `toSeat` failure and angry leaves; D3 `used`/dirty/one clean task/trash roll; verify the dirty-once test passes and sell/move of a table with diners leaves no stale chair.
- [x] 2.4 Seat patience fallback (D9): in `seeking`, turn an expired seat timer into takeout and a normal exit instead of `leaveAngry('noSeats')`; update `src/sim/people.test.ts` (`no seat before patience -> leaves with noSeats`) to the new behavior; verify the 1.2 fallback test and `people.test.ts` pass and `today.served` rises while `today.lost` and `complaints.noSeats` do not.
- [x] 2.5 Invariants: update `testkit.checkInvariants` (chair ids exist, `seatIdx` matches occupants, groups of 2+ alone, no occupied chair on a dirty table); verify `pnpm vitest run src/sim` passes including the fuzz test.
- [x] 2.6 Save v4: bump `SAVE_VERSION`, add `MIGRATIONS[3]` (D7); add a migration test (v3 group eating, dirty table, empty tables) and a mid-meal round-trip test in `src/save/save.test.ts`; verify they pass.

## 3. Rendering and UI

- [x] 3.1 `Agents.tsx`: draw each seated guest at `SEATS[def][g.seatIdx[m]]`; verify in the browser that two solos at one table sit on different chairs facing the table from all four rotations (screenshots).
- [x] 3.2 Takeout marker: add the `bag` label kind in `Labels.tsx` for takeout groups (D6) with a unit-level check of which groups get it; verify in the browser that takeout groups show the bag, dine-in groups do not, and a group that falls back to takeout gets the bag at that moment.
- [x] 3.3 Inspect panel and hints: show chairs in use out of seats for tables (`src/ui/Inspect.tsx`), keep "Dirty"; verify in the browser.

## 4. Balance and ship

- [x] 4.1 Re-measure `pnpm simulate 30 <seed> competent` for seeds 1-5; decide per D4/D8 on any solo-fills-shared-tables bias and on trimming starter tables; verify day-1 rep stays at 50 or better, no bankruptcies, star days within about 2 days of the baseline, and record the before/after table in Findings.
- [x] 4.2 Update tests and e2e broken by the model change or a trimmed starter (`e2e/walls.spec.ts` bin spots, `e2e/playthrough.spec.ts`); verify `pnpm test:e2e` passes.
- [x] 4.3 Run `pnpm lint`, `pnpm check:sim`, `pnpm exec tsc -b`, `pnpm exec vitest run`, `SOAK=1 pnpm exec vitest run`, `pnpm test:e2e` and `pnpm build`; verify all pass.
- [ ] 4.4 Update README and CLAUDE.md if they describe seating or table occupancy; open PR, CI green, merge, then archive the change.

## Findings

### Baseline (1.1)
`pnpm simulate 30 <seed> competent` on current `main` (identical to the `early-game-balance` archive table):

| Seed | 2★ | 3★ | 4★ | 5★ | Min cash | Day 1 served/lost | Day 1 rep | Day 1 top complaint |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | d4 | d9 | d17 | d30 | $2,124 | 44/6 | 71.6 | lineTooLong:5 |
| 2 | d5 | d9 | d16 | d27 | $2,193 | 40/3 | 74.1 | lineTooLong:3 |
| 3 | d4 | d10 | d19 | none | $3,361 | 36/11 | 61.2 | lineTooLong:11 |
| 4 | d3 | d9 | d16 | d27 | $2,540 | 41/11 | 62.8 | lineTooLong:7 |
| 5 | d3 | d9 | d17 | d30 | $2,007 | 39/7 | 70.0 | lineTooLong:6 |

### Failing tests (1.2)
`src/sim/seating.test.ts`: four tests fail on current code (two solos sharing a table; a freed chair reused while the other diner eats; shared table dirty once after the last leaves; no-seat fallback to takeout). Two pass already and guard the rule (a pair never sits with a solo, a pair keeps its whole table).

### Pacing after chair seating and the takeout fallback (4.1)
`pnpm simulate 30 <seed> competent`, star day 2★/3★/4★/5★ (baseline in brackets), min cash, day 1:

| Seed | 2★ | 3★ | 4★ | 5★ | Min cash | Day 1 served/lost | Day 1 rep |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | d3 (d4) | d9 (d9) | d17 (d17) | d30 (d30) | $2,154 | 46/6 | 71.3 |
| 2 | d3 (d5) | d9 (d9) | d16 (d16) | d27 (d27) | $2,403 | 44/6 | 71.1 |
| 3 | d4 (d4) | d11 (d10) | d19 (d19) | none (none) | $3,415 | 36/11 | 60.7 |
| 4 | d3 (d3) | d9 (d9) | d15 (d16) | d25 (d27) | $2,679 | 48/9 | 66.3 |
| 5 | d3 (d3) | d9 (d9) | d16 (d17) | d29 (d30) | $2,278 | 42/5 | 73.8 |

Within about 2 days of baseline everywhere, no bankruptcies, day-1 reputation at or above 60. Per D8 the starter stays at 14 seats and per D4 no solo-prefers-shared-table bias was needed: the fallback removed `noSeats` losses, but on this bot seats were not the dominant loss any more, so pacing barely moved.

Side effect: more groups are served on day 1, so peak day-1 use rose to 85 each of bun/patty/lettuce/tomato and 54 syrup (seed 4); the `starter.test.ts` stock check failed on bun. Starter stock is now bun 95, patty 95, lettuce 95, tomato 95, syrup 65 (445 of the 450 cap with two fridges).

### Browser check (3.1-3.3)
Preview build, five hires, 3x: two solo diners shared one `table4` on opposite chairs facing the table, also from rotated views; takeout groups show the bag icon and dine-in groups do not; the table Inspect panel reads "2 of 4 in use". No page errors.

### Final verification (4.2, 4.3)
`pnpm lint` (8 pre-existing warnings), `check:sim`, `pnpm exec tsc -b`, `pnpm build`, `SOAK=1 pnpm exec vitest run` (189 passed) and `pnpm test:e2e` (5 passed, no e2e changes needed) all pass. README seating line updated; CLAUDE.md does not describe table occupancy.
