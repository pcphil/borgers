## Context

Greenfield repo (only README, `.gitignore`, `openspec/`). See proposal.md for motivation and specs/ for required behavior. Constraints settled during design review:

- Browser, desktop, mouse + keyboard, single-player. Static hosting (GitHub Pages).
- TypeScript + Vite + React + React Three Fiber + drei. pnpm, Biome.
- Up to ~100 agents and ~150 objects at 60 fps on integrated graphics.
- The simulation must be deterministic and runnable headless for tests and balancing.

## Goals / Non-Goals

**Goals:**
- Clean split: simulation (pure TS) → read-only view (R3F) and UI (React DOM). The sim never imports React or three.
- All gameplay numbers and content (recipes, catalogue, unlocks, balance) in data files so tuning needs no logic changes.
- Save = serialize sim state. No render/UI state is required to resume.

**Non-Goals:**
- Multiplayer, mobile/touch, table service, drive-thru, burger designer, marketing, morale, spoilage, multiple locations, music, keybind remapping, hard bankruptcy. The data shapes leave room for these but no code paths are built.
- Physics, crowd simulation or local avoidance beyond queue slots.

## Decisions

### D1. Layering and module layout
```
src/
  sim/        pure TS, no DOM/React/three. World, systems, commands, RNG, clock
  data/       recipes.ts, catalogue.ts, unlocks.ts, balance.ts, names.ts
  save/       serialize, migrations, idb slots, export/import
  render/     R3F scene: camera, grid, objects, agents, lights, picking
  ui/         React DOM overlay: HUD, panels, build mode, hints, menus (Tailwind)
  audio/      SFX player subscribed to sim events
  app/        GameHost: owns the sim instance + loop, wires render/ui/audio
```
The UI and render layers change the world only by issuing **commands** (`placeObject`, `hire`, `setPrice`, `setSpeed`, …) to the sim. Commands are applied at the start of the next tick and are validated inside the sim. Rationale: one choke point for validation and a path to command replay. Alternative (UI mutates the store directly) was rejected because it scatters rules and breaks determinism.

### D2. World: plain typed TS stores (no ECS library)
The world is a plain serializable object: per-kind `Record<id, Entity>` maps (`customers`, `staff`, `objects`, `orders`, `tasks`, …) plus singletons (clock, economy, inventory, layout). Ids come from one monotonic `nextId` counter in the world. Systems iterate in ascending id order, so iteration is deterministic and survives save/load with no extra work. Systems run in a fixed order per tick: commands → clock → arrivals → task assignment → movement → station work → customer state machines → cleanliness → reputation → economy events.

Alternative considered: Koota (pmndrs ECS). It was rejected during implementation because Koota 0.6 cannot spawn entities with chosen ids and has no serialization. Exact save/load (D7) would need an id-remap layer, and every query would need re-sorting for determinism. At ≤ ~100 agents, an ECS gives no meaningful performance benefit.

### D3. Fixed-step loop with accumulator
`GameHost` runs a `requestAnimationFrame` loop: `acc += dt * speed`, then while `acc >= TICK` (1/20 s game time) step the sim, capped at `MAX_TICKS_PER_FRAME` (e.g. 3x speed × a few frames' worth) and dropping the remainder. Render reads `alpha = acc / TICK` to interpolate agent positions between `prevPos` and `pos`. The headless runner calls `sim.step()` in a plain loop. Alternative: variable dt was rejected because it is non-deterministic.

### D4. Determinism
A single seeded PRNG (mulberry32 / sfc32) lives in world state, and its state is serialized. Banned inside `sim/`: `Math.random`, `Date.now`, `performance.now`, iteration over unordered sources whose order can vary. Entity iteration order must be stable (sort by id where order matters). A Biome lint rule or grep check in CI enforces the bans on `src/sim`. All sim time is integer ticks. Money is in integer cents.

### D5. Render ↔ sim bridge
- R3F components read the sim world in `useFrame` and write to `ref.current.position` / `InstancedMesh` matrices directly. No React re-render per tick.
- Agents and repeated furniture use `InstancedMesh` (one per model/variant). Unique or interactive objects can be regular meshes.
- React mounts and unmounts objects only on layout change, via a coarse `layoutVersion` counter in a zustand store.
- Picking: raycast against an invisible ground plane, then convert to tile coords (handles camera rotation). Agent/object picking uses a tile lookup first, with mesh raycast as a fallback.
- Day/night lighting: one directional "sun" plus ambient/hemisphere light, colors lerped from the clock, and point lights only inside at night (a few, no shadows).

### D6. UI state: throttled zustand snapshot
After ticks, `GameHost` publishes a small derived snapshot (cash, clock, reputation, stars, speed, hint list, panel data on demand) into zustand at ~10 Hz. Panels select slices. Heavy panel data (finance history, staff list) is computed when the panel is open. Rationale: React DOM stays cheap while the sim runs at 60 ticks/s at 3x.

### D7. Save format
A plain JSON object `{ version, seed, rngState, tick, world: { entities by trait arrays }, economy, settings-of-game }`. Stored with `idb-keyval` under keys `slot:<id>` and `slot:auto`, plus `slot-index` metadata. Export uses a Blob download; import uses a file input, then `JSON.parse`, then schema validation (handwritten guards or a small valibot schema) and migrations (`migrations[v] : (s) => s'` chained up to `CURRENT_VERSION`). A load round-trip test asserts `step^N(load(save(w))) == step^N(w)`. User settings (volume, shadows, UI scale, autosave) live in `localStorage`, separate from game saves.

### D8. Pathfinding
Custom A* on a 4-connected tile grid with Manhattan heuristic and a binary-heap open list. A walkability grid is rebuilt on layout change. Customers get a passability mask that excludes Kitchen tiles. Paths are cached per (from, to, mask) and keyed on `layoutVersion`, so all caches drop on any layout change and affected agents re-path lazily on their next move. The grid is small (≤ ~32×32), so A* per request is cheap. Flow fields were considered but are overkill at this size. Placement validation runs a flood fill from the entrance to check every access tile stays reachable.

### D9. Task model
`Task { id, role, kind, stationType?, targetEntity?, createdTick, claimedBy? }` sits in per-role queues. Idle staff claim the oldest task. For station tasks, the staff member picks the nearest free station of that type (path length via A*, with ties broken by entity id). A recipe step becomes a task when its predecessor completes. Ingredients are consumed at step start and stored on the task, so cancellation (sell/fire) can refund or requeue them. Order lifecycle: `taken → cooking → assembling → ready → collected | cancelled`.

### D10. Customer state machine
`arriving → queueing → ordering → waitingFood → collecting → (seeking seat → eating | leaving) → leaving → gone`. Each state can transition to `leavingAngry(complaint)` on patience expiry or an unreachable target. Satisfaction is computed on exit (D11).

### D11. Formulas live in `balance.ts`
Demand curve (piecewise-linear by hour), reputation factor, price elasticity (e.g. `attract = clamp((fair/price)^k)`), patience ranges, satisfaction weights, star thresholds, wage formula, rent, interest, fridge capacity, partial refund %, station tier stats. `scripts/simulate.ts` runs N headless days for a set of scripted strategies and prints CSV for tuning. Exact values are not part of the spec and are expected to change.

### D12. Assets
Kenney CC0 packs (Furniture Kit, Food Kit, Mini Characters) are loaded as GLB with drei `useGLTF`. Each model is fitted to its object's footprint at load time, and the primitive model is shown as the Suspense fallback. The GLBs total about 2.3 MB, so meshopt/draco compression was dropped (changed during implementation). Characters are skinned in the source files: the first frame of the `idle` and `sit` clips is baked into static geometry and drawn with one InstancedMesh per variant, which gives instancing without skeletal animation. SFX are Kenney CC0 OGG files played through a single WebAudio context. `ASSETS.md` lists sources and licenses. Register and pickup counter keep primitive models.

### D13. Tooling and CI
pnpm, Biome (lint + format), Vitest for `sim/` and `save/`, and Playwright with one smoke test (app loads, canvas renders, starting a new game advances the clock). A GitHub Actions job runs `biome ci`, `tsc --noEmit`, `vitest run` and `playwright test`, then builds with Vite `base` set to the repo name and deploys to GitHub Pages on `main`.

## Risks / Trade-offs

- [Determinism broken by stray nondeterminism] → A lint ban plus a CI test that runs the same seed twice for 3 days and compares state hashes.
- [Perf at 100 agents with GLTF characters] → Use instanced low-poly characters, ignore skeletal animation for instanced crowds (procedural bob instead), and add an `r3f-perf` overlay in dev with a stress-scene check.
- [Balance feels bad] → All numbers live in `balance.ts`, and the headless simulate script gives quick iteration. Balance is expected to be tuned after the slice is playable.
- [Agents passing through each other looks odd] → Queue slots and seat assignment cover the most visible cases. Accepted for v1.
- [IndexedDB unavailable (private mode)] → Detect it and fall back to in-memory slots with a warning. Export still works.
- [Scope creep in the vertical slice] → Non-goals are listed above, and tasks are ordered so a playable loop exists before polish.

## Migration Plan

Not applicable (greenfield). Deploy is a static build to GitHub Pages, and rollback means redeploying a previous commit. Save schema starts at version 1, and the migration chain begins with the first breaking save change.

## Open Questions

- Exact balance numbers (rent, wages, thresholds, patience) are tuned via the simulate script after the loop is playable.
- Lot sizes (initial vs. expanded) are set in `balance.ts`. Proposed initial size 12×10 and expanded 18×14, tuned while playtesting.

## Balance Results (task 14.2)

`pnpm simulate 30 <seed> competent` runs a scripted "competent player". It grows staff with the star plan, shifts the last kitchen hire toward the more backed-up role, shares storage between the ingredients in use, builds fridges, a fryer, 4-seat tables, a second grill and assembly, the expansion, a second register and pickup, and upgrades. It never takes a loan.

| Seed | 2★ | 3★ | 4★ | 5★ | Min cash |
| --- | --- | --- | --- | --- | --- |
| 1 | d4 | d9 | d16 | d26 | $2,291 |
| 2 | d4 | d8 | d15 | d28 | $2,125 |
| 3 | d3 | d9 | d17 | — (4★ at d30) | $2,146 |
| 4 | d4 | d10 | d15 | d25 | $2,678 |
| 5 | d3 | d9 | d15 | d25 | $2,205 |
| 6 | d3 | d11 | d16 | d26 | $2,324 |
| 7 | d3 | d9 | d15 | d25 | $2,342 |
| 8 | d4 | d8 | d16 | d27 | $2,205 |

Main changes during tuning:
- Grill and fryer steps went from 4s to 3s (double burger 5s to 4s). Assembly went from 2.5s to 1.5s (double 3s to 2s). Soda went from 1s to 0.6s. The assembler had been the bottleneck, then the cook.
- Demand curve peaks dropped from 10 to about 6 groups per game hour.
- Wages are now $25 + $50 × average stat per day. They used to be $40 + $80 × average stat, which made the business unprofitable.
- Star thresholds are now reputation 55/60/65/70 with cumulative revenue $1.5k/$5k/$11k/$20k. They used to be 55/62/68/75 with $1.5k/$6k/$15k/$35k.
- Added "Cooks/Assemblers can't keep up" hints when 6 or more steps are waiting for one role, so human players can see the same bottleneck the script reacts to.
