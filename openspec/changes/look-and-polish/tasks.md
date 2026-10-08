## 1. Staff street entrance and exit (sim)

- [x] 1.1 Move `streetEnd` to `layout.ts`; add `StaffState` `'arriving' | 'departing'`, `Staff.side`, and `isLeaving(state)`; use `isLeaving` for every "still employed" check (`activeStaff`, `fire`, `setRole`, `openRestaurant` wage stamp, `hints.ts`, `ui/panels.tsx`). Verify with `pnpm exec tsc -b` and existing staff tests
- [x] 1.2 `hire()` places the new staff member at a seeded street end with the door route in state `arriving`; `staffSystem` walks it and switches to `idle` on arrival (no tasks, station or register until then). Verify with tests: a hired cook is outside the lot and takes no task while walking; on arrival it is `idle` at the entrance tile and then claims a queued task; arrival time matches distance / walk speed
- [x] 1.3 `fire()` paths: in-restaurant member walks to the door then departs along the street to their end and is removed there; a member fired while `arriving` (on the lane, and on the door column) turns around and departs without entering; failed grid path still removes them immediately. Verify with tests for each case, including that the fired member's task returns to the queue and wages follow the existing rule
- [x] 1.4 Keep `addStaff` in `testkit.ts` instant (state `idle`, no route); update hand-stepped tests that hire through `dispatch` and assume instant availability; extend `checkInvariants` for staff street positions. Verify `pnpm test` passes (hire/fire fuzz and the 30-day invariants included)
- [ ] 1.5 UI text for the new staff states ("Walking to the door", "Heading home") in `text.ts`; the staff panel lists arriving staff as active and hides departing ones. Verify by screenshot of the Staff panel right after a hire

## 2. Save version 3 and autosave on open

- [x] 2.1 Bump `SAVE_VERSION` to 3 with `MIGRATIONS[2]` adding `side: 1` to staff. Verify with tests: v2 save loads and continues, v0 and v1 saves chain through all migrations, a save taken while staff are walking in round-trips exactly
- [x] 2.2 `openRestaurant` emits `autosave`. Verify with tests: opening emits exactly one autosave event; `handleAutosave` writes the autosave slot on open when enabled and does not when disabled; the nightly autosave still fires

## 3. Seated posture

- [ ] 3.1 Investigate the `sit` clip with a throwaway script (duration, tracks, bake at start/mid/end) and record the finding under Findings
- [ ] 3.2 Implement the chosen fix (D5: later frame, bake-time correction, and/or seat offsets) so seated customers sit upright facing the table; standing figures unchanged. Verify by screenshots (default zoom and zoomed in, all four rotations, 2-seat and 4-seat tables) and a standing-figure before/after comparison

## 4. Housekeeping

- [ ] 4.1 Re-check `npm view @react-three/fiber dist-tags`: upgrade within semver only if a stable release removes `THREE.Clock`, otherwise record the finding that the warning is upstream and left as is
- [ ] 4.2 Street ends: screenshot at minimum zoom with customers spawning at both ends; fix any visible pop-in (ground, spawn distance, fade) or record that none was seen
- [ ] 4.3 New `e2e/walls.spec.ts`: bins next to each wall can be selected by clicking and open the Inspect panel. Verify `pnpm test:e2e` passes

## 5. Playthrough audit

- [ ] 5.1 Scripted playthrough with screenshots at preparation, during a lunch rush at 3x, at night, after the expansion, and at each rotation; review every screenshot and record issues in Findings
- [ ] 5.2 Fix clear small defects found (one-file, obviously correct, with a test or screenshot as evidence); list the rest as follow-ups in Findings

## 6. Verify and ship

- [ ] 6.1 `pnpm lint`, `pnpm check:sim`, `pnpm exec tsc -b` (not the rtk summary), `pnpm test` (with `SOAK=1` once), `pnpm test:e2e`, `pnpm build` all pass
- [ ] 6.2 `pnpm simulate 30 <seed> competent` seeds 1-5 compared with the `world-dressing` results in `openspec/changes/archive/2026-10-06-world-dressing/tasks.md` Findings (star days within a day or two, no bankruptcies); record the table here
- [ ] 6.3 Update README/CLAUDE.md if behavior they describe changed; open PR, CI green, merged; archive the change

## Findings

_(filled in during apply)_
