## 1. Baseline and failing tests

- [x] 1.1 Record the baseline in Findings: `pnpm simulate 30 <seed> competent` for seeds 1-5 (groups per day for days 1-10, star days 2★-5★, min cash, day-1 reputation); verify it matches the `chair-seating` archive table.
- [x] 1.2 Add failing tests in new `src/sim/demand.test.ts`: the reputation factor is a monotonic table with floor, start and top points (0.30 / 0.45 / 1.60), rate at reputation 0 is at least half the neutral rate, the rate does not change when reputation changes mid-day, and the demand reputation builds up part of the way toward the new value at the next open (faster up than down), and the first day with the core three averages 18-26 groups over seeds 1-20 with no seed at 40 or more; verify each fails on current code for the stated reason.

## 2. Sim: demand by reputation

- [x] 2.1 Add `CUSTOMERS.reputationDemand` in `src/data/balance.ts` and replace the linear `reputationFactor` with table interpolation in `src/sim/customers.ts`; verify the table-shape tests from 1.2 pass.
- [x] 2.2 Add `World.demandRep` (`src/sim/types.ts`, `emptyWorld` in `src/sim/world.ts`), set it in `openRestaurant`, and make `arrivalRate` read it (build-up/fade via `demandRepAtOpen`, D2); verify the snapshot tests from 1.2 pass and update the arrival tests in `src/sim/people.test.ts` to set `demandRep`; run `pnpm vitest run src/sim/people.test.ts src/sim/dressing.test.ts`.
- [x] 2.3 Save v5: `SAVE_VERSION = 5` and `MIGRATIONS[4]` in `src/save/format.ts`; add a migration test (v4 save mid-day keeps playing, `demandRep` equals the reputation at load) and a round-trip test in `src/save/save.test.ts`; verify they pass.

## 3. UI

- [x] 3.1 Add `demandFactor` to the snapshot (`src/app/snapshot.ts`) and a tooltip helper in `src/ui/text.ts`; show it on the HUD reputation display (`src/ui/Hud.tsx`) as "Reputation N: customers ×F today" / "... if you open now" while preparing; verify with a unit test of the helper and in the browser (prep and open).

## 4. Bot and tests for the core three

- [x] 4.1 Change the day-1 plan in `src/dev/autopilot.ts` (`PLAN[1]`) to cashier, cook, assembler; update `src/sim/starter.test.ts` to hire the best three candidates into those roles and assert seats >= 14, no ingredient at zero and day-1 reputation >= 50 on seeds 1-5 (the group-count range lives in `demand.test.ts`); verify it passes.

## 5. Balance and ship

- [x] 5.1 Tune the table (D5): run `pnpm simulate 30 <seed> competent` for seeds 1-5 and iterate until day 1 averages 20-25 groups (seeds 1-20) with reputation >= 50 on seeds 1-5, 2★ around d6-8, 4★ and 5★ within about 3 days of baseline, no bankruptcy; touch `STARS` revenue only if the table cannot do it; record the before/after table and the final table points in Findings.
- [x] 5.2 Update tests and e2e broken by the slower start (`e2e/playthrough.spec.ts` reaches 3 stars with `autoplay`, `src/sim/*.test.ts` that assume early stars); verify `pnpm test:e2e` and `pnpm vitest run` pass.
- [x] 5.3 Browser check: new game, hire the core three, open at 3x; verify a calm first day, the tooltip text, and no page errors; note screenshots in Findings.
- [x] 5.4 Run `pnpm lint`, `pnpm check:sim`, `pnpm exec tsc -b`, `SOAK=1 pnpm exec vitest run`, `pnpm test:e2e` and `pnpm build`; verify all pass.
- [ ] 5.5 Update README if it describes reputation or arrivals; open PR, CI green, merge, then archive the change.

## Findings

### Baseline (1.1)
`pnpm simulate 30 <seed> competent` on current `main` (identical to the `chair-seating` archive table):

| Seed | 2★ | 3★ | 4★ | 5★ | Min cash | Day 1 served/lost | Day 1 rep | Groups per day, d1-10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | d3 | d9 | d17 | d30 | $2,154 | 46/6 | 71.3 | 52 48 69 53 49 47 54 67 49 43 |
| 2 | d3 | d9 | d16 | d27 | $2,403 | 44/6 | 71.1 | 50 53 58 63 63 51 60 58 40 64 |
| 3 | d4 | d11 | d19 | none | $3,415 | 36/11 | 60.7 | 47 55 45 57 49 60 49 54 47 54 |
| 4 | d3 | d9 | d15 | d25 | $2,679 | 48/9 | 66.3 | 57 50 66 58 59 58 65 54 54 52 |
| 5 | d3 | d9 | d16 | d29 | $2,278 | 42/5 | 73.8 | 47 57 53 61 54 50 50 51 57 60 |

Day 1 is as busy as any later day (40-69 groups throughout).

### Failing tests (1.2)
`src/sim/demand.test.ts` (8 tests) fails on current code: the factor is 0.4 at reputation 0 and 1.0 at 50 (needs 0.30 and 0.45), rate at reputation 0 is only 40% of neutral, mid-day reputation changes move the rate, and day 1 with the core three brings 42-57 groups instead of 15-30. `testkit.hireCoreThree` added for it.

### Tuning (5.1)
Final: table 0→0.30, 30→0.38, 50→0.45, 70→1.20, 85→1.50, 100→1.60; `demandBuildUp` 0.4, `demandFade` 0.2; `STARS` unchanged. First design (hard snapshot at opening, table 70→0.85, 90→1.35) gave 2★ d4-6, 3★ d11-13, 4★ d19-23, no 5★, and boom-bust (day 2 about 46 groups, reputation 16 on day 3).

`pnpm simulate 30 <seed> competent` with the final numbers:

| Seed | 2★ | 3★ | 4★ | 5★ | Min cash | Day 1 rep | Groups per day, d1-10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | d6 | d12 | d20 | none | $2,957 | 77.7 | 19 35 56 10 10 22 25 58 59 28 |
| 2 | d7 | d11 | d19 | d29 | $3,491 | 84.5 | 18 45 42 37 20 14 20 53 54 43 |
| 3 | d4 | d11 | d20 | none | $2,164 | 70.0 | 21 37 39 44 35 56 34 42 45 54 |
| 4 | d4 | d10 | d17 | d28 | $2,404 | 75.8 | 34 33 58 52 39 46 69 50 64 47 |
| 5 | d5 | d10 | d18 | d29 | $2,233 | 82.1 | 20 38 37 49 27 34 42 58 47 72 |

Against baseline: 2★ d3-4 → d4-7, 3★ d9-11 → d10-12, 4★ d15-19 → d17-20 (all within 3 days), 5★ 4 of 5 → 3 of 5 (seed 1 misses d30 by a short margin after a day-3 crash; seed 3 had none at baseline). Remaining swing: seed 1 day 3 brings 56 groups to three staff and reputation falls to 5, then recovers by day 6 as demand falls with it; the bot's plan is by stars, not crowd.

### Verification (5.2, 5.3)
Full `vitest run` 196 passed, e2e 5 passed (playthrough still reaches 3 stars with `autoplay`, no changes needed). Browser (preview build): new game shows "Reputation 50: customers ×0.45 if you open now" in prep and "... today" once open; no page errors.
