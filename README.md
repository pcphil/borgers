# borgers

A burger-restaurant tycoon that runs in the browser. Lay out a kitchen and dining room, hire and
assign staff, set the menu and prices, keep the shelves stocked, and grow from one star to five.

**Play:** https://pcphil.github.io/borgers/

Built with React, React Three Fiber (isometric 3D view) and TypeScript. Desktop browsers only,
single player, no account or server: saves live in your browser.

## How to play

- You manage the restaurant; staff do the cooking. Customers queue at a **register**, order, wait
  at the **pickup counter**, then eat at a table or take it away. Solo diners share tables;
  families keep a table to themselves. With no free seat, a group takes its food away instead of
  leaving angry.
- **Staff** (H): hire from the candidate pool (five on day 1, three new faces each night) and give each person a role: cashier, cook,
  assembler or cleaner. New hires walk in from the street and start work when they reach the
  door. Wages are charged every night.
- **Build** (B): place and move stations and furniture, paint kitchen and dining zones, upgrade
  stations, and expand the lot.
- **Menu** (M): enable items and set prices. Prices well above fair value cost you customers.
- **Stock** (I): set target levels and auto-reorder, or place a manual order that arrives the next
  morning.
- **Finances** (F): daily income and costs, and a $5,000 loan if you run short. Going into debt is
  allowed; there is no game over.
- Reputation and cumulative revenue earn stars, which unlock new items, roles and equipment.
  The goal is five stars.
- Every day starts in **Preparing**: the clock is frozen at 10:00 and nobody arrives, so you can
  build, hire, set prices and stock. Press **Open restaurant** to start the day. Customers walk in
  from the street and leave the same way.
- The day runs 10:00-22:00 in about four real minutes at 1x. Settlement happens at night and the
  game autosaves.

| Input | Action |
| --- | --- |
| Space / 1 / 2 / 3 | Pause / 1x / 2x / 3x speed |
| WASD, arrows, or drag | Pan the camera |
| Mouse wheel | Zoom |
| Q / E | Rotate the camera |
| R | Rotate the object being placed |
| Esc | Cancel tool, deselect, close panel |

## Development

Requires a recent Node and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev            # dev server (add ?perf to the URL for the r3f-perf overlay)
pnpm build          # typecheck + production build
pnpm lint           # Biome format + lint check
pnpm typecheck
pnpm check:sim      # fails if the simulation imports React/three/zustand or uses non-deterministic APIs
pnpm test           # Vitest unit and simulation tests
pnpm test:e2e       # Playwright (builds and serves the preview itself)
pnpm simulate 30 1 competent   # headless balance run: days, seed, strategy (idle|basic|competent)
```

Two opt-in extras: `SOAK=1 pnpm test src/sim/sweep.test.ts` runs the 100-day invariant soak, and
`node scripts/perf.mjs http://localhost:4173/` measures frame rate on a stress scene (needs a
built preview).

### How it is put together

- **The simulation is plain, deterministic TypeScript** in `src/sim`, fully separate from
  rendering. It uses a fixed tick, a seeded RNG, integer ticks and money in integer cents, so the
  same seed and inputs always give the same game. `pnpm check:sim` enforces the boundary.
- **Rendering** (`src/render`) reads the simulation each frame and interpolates between ticks.
  The UI (`src/ui`) is a DOM overlay styled with Tailwind, fed by a ~10 Hz snapshot in a Zustand
  store.
- **Content and tuning** are data in `src/data` (recipes, catalogue, unlocks, balance numbers).
  Tune there and check with `pnpm simulate`.
- **Saves** (`src/save`) serialize the whole world as versioned JSON with migrations, stored in
  IndexedDB (export and import supported).

The design decisions behind this are in the archived change's `design.md` under `openspec/changes/archive/`.

### Specs and change history

Behavior is specified with [OpenSpec](https://github.com/Fission-AI/OpenSpec) under `openspec/`:
`openspec/specs/` holds the current capability specs and `openspec/changes/` holds in-progress
changes; finished ones are in `openspec/changes/archive/`. Read the relevant spec before changing
behavior and update it in the same change.

### Deployment

CI (`.github/workflows/ci.yml`) runs lint, the simulation purity check, typecheck, unit tests and
e2e tests on every push and pull request, and deploys to GitHub Pages from `main`.

## Credits

Art and sound effects are [Kenney](https://www.kenney.nl) assets under CC0. See
[`ASSETS.md`](ASSETS.md) for the packs and files used.
