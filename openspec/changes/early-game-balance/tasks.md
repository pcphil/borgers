## 1. Baseline

- [x] 1.1 Record baseline: `pnpm simulate 30 <seed> competent` for seeds 1-5 (star days, day-1 served/lost/reputation/top complaint, min cash) in the Findings section of this file; verify the star-day table matches the look-and-polish archive table.
- [x] 1.2 Add a failing sim test (`src/sim/starter.test.ts`) asserting starter seats >= 12 and that no default-menu ingredient reaches zero during a competent day 1 on seeds 1-5; verify it fails on the current data for those reasons.

## 2. Tune the starter

- [x] 2.1 Raise starting stock in `src/data/starterLayout.ts` per D2 (stay under the 150 base capacity); verify the stock assertion from 1.2 passes and day-1 costs in `simulate` stay sane.
- [x] 2.2 Rework starter tables to seat >= 12 with walkable paths and the bin in range (grep for hard-coded starter tiles first); verify the seat assertion passes and `pnpm vitest run src/sim` passes (placement and invariants tests).
- [ ] 2.3 Re-run `pnpm simulate 3 <seed> competent` for seeds 1-5; if the grill queue still backs up on day 1 ("Cooks can't keep up"), decide per D1 between one extra starter grill and accepting it, and record the decision with numbers in Findings.
- [ ] 2.4 Update tests and e2e specs broken by moved starter objects (e.g. `e2e/walls.spec.ts`, `e2e/playthrough.spec.ts` bin tiles); verify `pnpm test` and `pnpm test:e2e` pass.

## 3. Verify and ship

- [ ] 3.1 Run `pnpm simulate 30 <seed> competent` for seeds 1-5; verify day 1 is not `noSeats`, day-1 reputation >= 50, no bankruptcies, and star days stay within the Goals band; record the table in Findings. If outside the band, trim per Risks and rerun.
- [ ] 3.2 Play day 1 in the browser (prep, then lunch rush at 3x) with three hires; verify no stock-out hint and diners find seats, and note the screenshots in Findings.
- [ ] 3.3 Run `pnpm lint`, `pnpm check:sim`, `pnpm exec tsc -b`, `pnpm test` (also with `SOAK=1`), `pnpm test:e2e` and `pnpm build`; verify all pass.
- [ ] 3.4 Update README if it describes the starter layout; open PR, CI green, merge, then archive the change.

## Findings

### Baseline (1.1)
`pnpm simulate 30 <seed> competent` before any change. Star-day table equals the look-and-polish archive table.

| Seed | 2★ | 3★ | 4★ | 5★ | Min cash | Day 1 served/lost | Day 1 rep | Day 1 top complaint |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | d4 | d10 | d16 | d26 | $2,219 | 24/19 | 42.2 | lineTooLong:7 |
| 2 | d3 | d9 | d15 | d26 | $2,101 | 26/25 | 37.4 | waitedTooLong:12 |
| 3 | d6 | d10 | d20 | none | $2,120 | 26/18 | 44.5 | noSeats:9 |
| 4 | d4 | d8 | d15 | d27 | $2,142 | 31/21 | 43.5 | noSeats:9 |
| 5 | d3 | d8 | d15 | d26 | $2,244 | 34/16 | 54.1 | nothingToOrder:6 |

Day 1 is bad on every seed (rep below 50 on 4 of 5), but the cause varies: seats, stock and queue/wait time all show up.

### Failing test (1.2)
`src/sim/starter.test.ts` fails on current data: starter seats are 6 (need 12); syrup runs out on seeds 2 and 5, lettuce on seed 4; seed 3 top complaint is noSeats. Seed 1 passes the stock/seat assertions (its problem is the line, not stock or seats). Syrup, not just lettuce/tomato, is short.

### Starter data (2.1, 2.2)
Measured peak day-1 use with ample stock (seeds 1-5): bun 71, patty 80, lettuce 71, tomato 71, syrup 53. Starter stock is now bun 80, patty 90, lettuce 80, tomato 80, syrup 60 (390 total). One fridge holds only 300 (base 150 + 150 per fridge), so a second starter fridge at (11,8) raises the cap to 450; design D2 wrongly said "stay under the 150 base capacity". Tables: `table4` at (2,2) and (8,1), `table2` at (10,2) and (0,3), 12 seats, layout valid. `src/sim` suite passes (137 passed, 3 skipped).

Pacing after 2.1/2.2, `pnpm simulate 30 <seed> competent`: s1 d4/d10/d16/d25, s2 d5/d8/d15/d24, s3 d3/d9/d17/d28, s4 d3/d9/d15/d24, s5 d3/d8/d15/d26 (2★/3★/4★/5★); min cash $2,437 to $2,895. Within the Goals band. Day 1 reputation is still 36-46 with top complaint waitedTooLong/lineTooLong: with 3 staff the kitchen is the limit. Extra grill or assembly without more staff changed nothing. Candidate count probe (same seats and stock): 4 candidates gives day-1 rep 54/48/44/31/63, 5 gives 69/66/57/35/72 but noSeats returns as top complaint.
