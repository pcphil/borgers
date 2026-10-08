## Context

See proposal.md for the problem. Observed baseline, `pnpm simulate 3 1 competent` (seed 1), day by day: served 24 / lost 19, reputation 42.2, top complaint `lineTooLong:7`; day 2 served 35 / lost 6, rep 62.2; day 3 served 39 / lost 23, rep 44.0, top complaint `noSeats:17`.

Current starter (`src/data/starterLayout.ts`): lot 12x10, Dining rows 0-5, Kitchen rows 6+. Objects: register (5,5), pickup (8,5), grill (2,8), assembly (5,8), soda (8,8), fridge (10,8), three `table2` at (8,2), (10,2), (0,3), bin (11,4). Stock: bun 60, patty 60, lettuce 50, tomato 50, syrup 60. Storage cap is 150 base plus 150 per fridge. A Classic burger consumes 1 patty, 1 bun, 1 lettuce and 1 tomato, so lettuce and tomato (50 each) run out first at roughly 43 groups of about 2 diners on day 1. `table2` is 2 seats (15,000 cents), `table4` is 4 seats (30,000 cents). The demand curve peaks at 6.5 groups/hour at 12:00 and 6/hour at 18:00-19:00, with at most 36 active groups.

## Goals / Non-Goals

**Goals:**
- Day 1 for a new player is playable: no stock-out, no `noSeats` as the top complaint, day-1 reputation at or above neutral (50) for the competent strategy on seeds 1-5 when the full starting team is hired.
- The early game stays demanding: star-day results stay within about two days of the `look-and-polish` table (2★ d3-d6, 3★ d8-d10, 4★ d15-d20, 5★ d26-d27), min cash stays positive, no bankruptcies.

**Non-Goals:**
- No mechanic, AI, pathing or save-format change beyond the first-pool size. No change to recipes, prices, wages, rent, the demand curve or the nightly candidate refresh.
- No tutorial or hint rework. No new hint for a 4th and 5th hire; the existing "line too long" hint stays the nudge.
- Chair-level seating (follow-up change `chair-seating`): chairs claimed per guest, only solo diners sharing a table, takeout vs dine-in staying per group with a bag icon for takeout groups. It changes how many seats are enough, so seat counts here are re-tuned there.
- Carrying unhired candidates past the first night (or topping the pool up instead of replacing it). Today the whole pool is replaced every night (`generateCandidates` resets `w.candidates`), so the unhired part of the first pool of 5 vanishes at the first settlement. Left as is for now; the user plans to change it later.

## Decisions

**D1. Fix stock and seating in the starter data first, kitchen capacity last.**
Both audit complaints are data (stock numbers, table count). The grill backlog may be a downstream effect of stock-outs and angry leavers, so remeasure after those two fixes before touching kitchen objects. Alternative: add a second grill up front. Rejected until measured, because it spends the starter's balance headroom and changes the first purchase decision (grill upgrade).

**D2. Size by arithmetic, then verify by simulation.**
Day-1 demand is about 43 groups; expected diners per group from `groupSizeWeights` [45,35,12,8] is about 1.9; takeout is 40%. Starting stock target is demand times ingredients per burger with about 25% margin (lettuce and tomato about 100 each; bun, patty and syrup re-derived the same way). Storage is 150 base plus 150 per fridge, so a second starter fridge (cap 450) holds the 390 total; with one fridge (cap 300) it would not. Seating target was first 12 seats, then 14 once the first pool of 5 raised throughput (see D5), as 2 `table4` plus 3 `table2`, keeping Dining rows 0-5 walkable, the bin within `binRange` of every table, and the register and pickup counters unobstructed. Exact tiles are chosen at implementation and checked by a test, not by eye.

**D5. A first pool of 5, not a global candidate bump.**
Measured with ample stock and 12 seats: 3 staff leave day-1 reputation at 36-45 (kitchen is the limit; an extra grill or assembly counter without staff changed nothing), 4 candidates 31-63, 5 candidates 35-72. Seed 4 is the worst case and only clears 50 with 14 seats. So `STAFF.firstCandidates = 5` is used once in `newGame`, while `STAFF.candidates` stays 3 for nightly pools. Alternatives: raise `STAFF.candidates` to 5 for every night (lets the player staff up faster on every later day and undoes the hiring pacing the star-day table rests on); start with staff already hired (a bigger design change). Pacing is re-measured; if it overshoots, shrink the first pool to 4 first, then widen the band, and leave the `STARS` thresholds alone.

**D3. Encode the bar as tests, not only as a one-time simulate run.**
A seeded sim test plays a competent day 1 with the full team hired and asserts starter seats >= 14, that no default-menu ingredient hits zero, and that day-1 reputation is >= 50. This keeps later tuning from silently regressing the first day. Alternative: rely on `pnpm simulate` output only. Rejected: it is not run in CI.

**D4. Re-measure star pacing and record it.**
After tuning, run `pnpm simulate 30 <seed> competent` for seeds 1-5 and record the star-day table beside the `look-and-polish` one. A faster early game is accepted only if it stays within the Goals band.

## Risks / Trade-offs

- [More seats and stock make the early game too easy and pull star days earlier] → Measure seeds 1-5; if 2★ or 3★ arrive more than about 2 days earlier, trim stock margin or table count rather than touching economy numbers.
- [Moved starter tables collide with fixed-tile tests and e2e bin placements at (11,0) and (11,4)] → Grep for hard-coded starter coordinates before moving objects; update those tests in the same task.
- [Higher starting stock changes what nightly auto-reorder buys] → Check day-1 and day-2 costs in `simulate` output do not jump.
- [A bigger day-1 team pulls star days earlier] → D5: shrink the first pool to 4, then widen the band; `STARS` untouched.
- [Players who hire only three on day 1 still get a rough first day] → Accepted: the promise assumes the full team, and hiring fewer is a legitimate cheap start.
- [The table at (5,1) sits between the entrance and the register queue] → Layout validates and the queue moved in every seed; confirm with a screenshot in task 3.2 and move it if it blocks the queue.
