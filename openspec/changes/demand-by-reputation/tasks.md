## 1. Baseline and failing tests

- [ ] 1.1 Record the baseline in Findings: `pnpm simulate 30 <seed> competent` for seeds 1-5 (groups per day for days 1-10, star days 2★-5★, min cash, day-1 reputation); verify it matches the `chair-seating` archive table.
- [ ] 1.2 Add failing tests in new `src/sim/demand.test.ts`: the reputation factor is a monotonic table with floor, start and top points (0.30 / 0.45 / 1.60), rate at reputation 0 is at least half the neutral rate, the rate does not change when reputation changes mid-day but follows the new value after the next open, and a first day with the core three on seeds 1-5 brings 15-30 groups; verify each fails on current code for the stated reason.

## 2. Sim: demand by reputation

- [ ] 2.1 Add `CUSTOMERS.reputationDemand` in `src/data/balance.ts` and replace the linear `reputationFactor` with table interpolation in `src/sim/customers.ts`; verify the table-shape tests from 1.2 pass.
- [ ] 2.2 Add `World.demandRep` (`src/sim/types.ts`, `emptyWorld` in `src/sim/world.ts`), set it in `openRestaurant`, and make `arrivalRate` read it; verify the snapshot tests from 1.2 pass and update the arrival tests in `src/sim/people.test.ts` to set `demandRep`; run `pnpm vitest run src/sim/people.test.ts src/sim/dressing.test.ts`.
- [ ] 2.3 Save v5: `SAVE_VERSION = 5` and `MIGRATIONS[4]` in `src/save/format.ts`; add a migration test (v4 save mid-day keeps playing, `demandRep` equals the reputation at load) and a round-trip test in `src/save/save.test.ts`; verify they pass.

## 3. UI

- [ ] 3.1 Add `demandFactor` to the snapshot (`src/app/snapshot.ts`) and a tooltip helper in `src/ui/text.ts`; show it on the HUD reputation display (`src/ui/Hud.tsx`) as "Reputation N: customers ×F today" / "... if you open now" while preparing; verify with a unit test of the helper and in the browser (prep and open).

## 4. Bot and tests for the core three

- [ ] 4.1 Change the day-1 plan in `src/dev/autopilot.ts` (`PLAN[1]`) to cashier, cook, assembler; update `src/sim/starter.test.ts` to hire the best three candidates into those roles and assert seats >= 14, no ingredient at zero, day-1 reputation >= 50 and 15-30 groups on seeds 1-5; verify it passes.

## 5. Balance and ship

- [ ] 5.1 Tune the table (D5): run `pnpm simulate 30 <seed> competent` for seeds 1-5 and iterate until day 1 is 20-25 groups with reputation >= 50, 2★ around d6-8, 4★ and 5★ within about 3 days of baseline, no bankruptcy; touch `STARS` revenue only if the table cannot do it; record the before/after table and the final table points in Findings.
- [ ] 5.2 Update tests and e2e broken by the slower start (`e2e/playthrough.spec.ts` reaches 3 stars with `autoplay`, `src/sim/*.test.ts` that assume early stars); verify `pnpm test:e2e` and `pnpm vitest run` pass.
- [ ] 5.3 Browser check: new game, hire the core three, open at 3x; verify a calm first day, the tooltip text, and no page errors; note screenshots in Findings.
- [ ] 5.4 Run `pnpm lint`, `pnpm check:sim`, `pnpm exec tsc -b`, `SOAK=1 pnpm exec vitest run`, `pnpm test:e2e` and `pnpm build`; verify all pass.
- [ ] 5.5 Update README if it describes reputation or arrivals; open PR, CI green, merge, then archive the change.

## Findings

<!-- filled in during apply -->
