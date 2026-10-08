## Context

See proposal.md for motivation. Current state relevant to the fixes:

- `useFacing()` in `src/render/Agents.tsx` computes yaw from the difference between the figure's
  interpolated position now and on the previous *render frame*, gated by `dx²+dz² > 1e-5`, and stores
  the current position as "previous" every frame. At ~360 fps and walking speeds of a few tiles/s the
  per-frame step is ~0.005 tiles, so `dx²` is below the gate and yaw stays at the default `Math.PI`.
- Sim agents already carry `pos` and `prev` (position one fixed tick earlier), which is a
  frame-rate-independent movement vector.
- Customer groups are drawn as several figures around the group position (`FORMATION`), seated
  figures face the table (`faceYaw`), staff figures reuse the same facing hook.
- `spawnGroup` / `arrivalSystem` use one seeded Bernoulli roll per tick against `arrivalRate`, and
  `weightedIndex` for size with weights `[45,35,12,8]`. Code review found no defect.

## Goals / Non-Goals

**Goals:** correct, frame-rate-independent facing; evidence for or against an arrival defect;
a bounded stability sweep with regression tests for anything fixed.

**Non-Goals:** new mechanics, balance changes, walls/doors/road/open button (change `world-dressing`),
animation of walking cycles, any save format change.

## Decisions

### D1. Derive facing from sim movement (`pos − prev`), not from render-frame deltas
Extract a pure helper `facingYaw(prev, pos, lastYaw)` returning `atan2(dx, dy)` of the
tile-space vector (tile `(x,y)` → world `(x,0,z=y)`) when its length exceeds a tiny epsilon, else
`lastYaw`. Interpolation (`host.alpha`) is not involved, so the result is identical at any fps and
game speed. `useFacing` keeps only a `Map<key, yaw>` of last yaw for standing agents.
*Alternative:* lower the render-frame threshold or accumulate distance across frames. Rejected: still
frame-rate dependent and needs hysteresis tuning; the sim vector is exact.

### D2. Fix model forward-axis at bake time, not per instance
If screenshots show the character model's front is not +z, add a constant yaw offset when baking in
`bakeCharacter` (rotate the baked geometry once). Instance yaw stays `atan2(dx, dz)` for all
agents, and the capsule fallback needs no change. Decided by a screenshot of a walker moving along
+x and +z; offset constant gets a comment recording the finding.
*Alternative:* add the offset in `place()`. Rejected: spreads a model quirk across call sites.

### D3. Reproduce arrivals before changing the sim
Add a headless test/script that, for fixed seeds, records inter-arrival gaps and group sizes over
several days and asserts (a) gap variance is above a floor, (b) size shares match the weights within
tolerance. Then watch the live game (`?` playthrough with screenshots). Outcomes:
- *Defect found in sim*: fix in `customers.ts`/`rng.ts`; this changes sim output, so re-run
  `pnpm simulate` for seeds 1–3 and update Balance Results if numbers move; determinism tests remain.
- *Perception only* (likely candidates: group members rendered as a tight formation; first minutes
  of the day at 10:00 have very low demand `1.5/h` so a steady trickle looks regular): record the
  finding in this design, leave sim unchanged, and capture the visual part for the follow-up
  `world-dressing` change (rush pattern, spawn at the street edge).
The statistical test ships either way as a regression guard.

### D4. Stability sweep is scripted and time-boxed
One session, tracked in tasks: (1) Playwright run of a full day collecting `console`/`pageerror`;
(2) a vitest that advances a sim to mid-day, `JSON` round-trips the world through the save format,
continues both copies N ticks and asserts equal state; (3) 100-day autopilot soak on 3 seeds running
the invariants checks from `invariants.test.ts` each day; (4) scripted odd-input scenarios using
`makeSim` (build/sell on occupied tiles during rush, fire staff mid-task and mid-delivery, sell a
station with a claimed task, many speed/pause toggles through `GameHost`). Findings are fixed with a
failing test first; anything not fixed is listed with a reason in `tasks.md`.

## Risks / Trade-offs

- [Facing offset guessed wrong] → verify with screenshots of movement along both axes before and
  after; keep the offset a single named constant.
- [Arrival fix changes balance] → only fix proven defects; re-run `pnpm simulate` (competent, seeds
  1–3, 30 days) and compare revenue/stars with the Balance Results in the archived design.
- [Sweep expands unbounded] → one session budget; defer anything needing new mechanics or feature
  work to a later change and list it.

## Migration Plan

No data migration. Ship as a normal PR; rollback is a revert.
