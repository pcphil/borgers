## 1. Baseline

- [ ] 1.1 Record baseline: `pnpm simulate 30 <seed> competent` for seeds 1-5 (star days, day-1 served/lost/reputation/top complaint, min cash) in the Findings section of this file; verify the star-day table matches the look-and-polish archive table.
- [ ] 1.2 Add a failing sim test (`src/sim/starter.test.ts`) asserting starter seats >= 12 and that no default-menu ingredient reaches zero during a competent day 1 on seeds 1-5; verify it fails on the current data for those reasons.

## 2. Tune the starter

- [ ] 2.1 Raise starting stock in `src/data/starterLayout.ts` per D2 (stay under the 150 base capacity); verify the stock assertion from 1.2 passes and day-1 costs in `simulate` stay sane.
- [ ] 2.2 Rework starter tables to seat >= 12 with walkable paths and the bin in range (grep for hard-coded starter tiles first); verify the seat assertion passes and `pnpm vitest run src/sim` passes (placement and invariants tests).
- [ ] 2.3 Re-run `pnpm simulate 3 <seed> competent` for seeds 1-5; if the grill queue still backs up on day 1 ("Cooks can't keep up"), decide per D1 between one extra starter grill and accepting it, and record the decision with numbers in Findings.
- [ ] 2.4 Update tests and e2e specs broken by moved starter objects (e.g. `e2e/walls.spec.ts`, `e2e/playthrough.spec.ts` bin tiles); verify `pnpm test` and `pnpm test:e2e` pass.

## 3. Verify and ship

- [ ] 3.1 Run `pnpm simulate 30 <seed> competent` for seeds 1-5; verify day 1 is not `noSeats`, day-1 reputation >= 50, no bankruptcies, and star days stay within the Goals band; record the table in Findings. If outside the band, trim per Risks and rerun.
- [ ] 3.2 Play day 1 in the browser (prep, then lunch rush at 3x) with three hires; verify no stock-out hint and diners find seats, and note the screenshots in Findings.
- [ ] 3.3 Run `pnpm lint`, `pnpm check:sim`, `pnpm exec tsc -b`, `pnpm test` (also with `SOAK=1`), `pnpm test:e2e` and `pnpm build`; verify all pass.
- [ ] 3.4 Update README if it describes the starter layout; open PR, CI green, merge, then archive the change.

## Findings

<!-- filled in during apply -->
