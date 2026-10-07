## Why

First hands-on playtest of the shipped vertical slice found visible defects: characters face the
wrong way while walking, and customers appear to arrive at a fixed interval and always as pairs.
A stability sweep has not been done beyond unit/e2e tests. These are small, low-risk fixes that
should land before any new features (`world-dressing` follows as a separate change).

## What Changes

- **Facing**: standing and walking characters face their direction of travel. Observed code
  (`src/render/Agents.tsx` `useFacing`) derives yaw from per-frame position deltas with a fixed
  threshold (`dx²+dz² > 1e-5`) and overwrites the previous position every frame, so at high
  frame rates (~360 fps measured) slow movement never crosses the threshold and the yaw is stuck at
  its default (`Math.PI`). The baked Kenney model's forward axis may also need an offset; to be
  confirmed by screenshot. Fix the facing computation and add an automated check.
- **Arrival feel**: reproduce "consistent intervals, always 2 people" with a seeded headless run
  and a live-game observation. The sim rolls an independent Bernoulli per tick and group size from
  weights `[45,35,12,8]`, so the logic looks correct; the cause is either a render/perception issue
  (e.g. group members drawn together, queue pacing) or an RNG/demand-curve defect. Fix the root
  cause if it is a defect; otherwise document the finding and add a distribution test.
- **Stability sweep** (time-boxed): console errors during a full day, mid-day save → load
  round-trip equivalence, 100-day autopilot soak with the invariants checks, odd inputs (building
  during rush, firing staff mid-task, selling a station with a claimed task, rapid speed/pause
  toggles). Every finding is fixed or recorded with a reason.
- No new mechanics; no balance changes. `pnpm simulate` output before/after must match for
  untouched sim behavior (any intentional sim change is called out and re-verified).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `world-rendering`: agents SHALL face their direction of travel (and keep it when stopping),
  independent of frame rate.
- `customer-behavior`: arrivals and group sizes SHALL be observably irregular — inter-arrival gaps
  vary and group sizes 1–4 follow the configured weights — verified by a statistical test.

## Impact

- Code: `src/render/Agents.tsx`, `src/render/kenney.tsx` (bake orientation), possibly
  `src/sim/customers.ts` / `src/sim/rng.ts` if a defect is found, plus whatever the sweep finds.
- Tests: new unit test for yaw computation (pure helper extracted from `useFacing`), arrival/group
  size distribution test, save/load mid-day round-trip test, soak run; Playwright screenshot check
  for facing is manual evidence, not a CI gate.
- No save-format change expected (no `SAVE_VERSION` bump) unless the sweep finds a sim-state bug.
