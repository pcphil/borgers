## Why

`borgers` is an empty repo. We want a playable burger-restaurant tycoon game in the browser: the player designs and runs a counter-service burger joint while staff and customers are simulated as visible 3D agents. This change defines the first vertical slice — one restaurant, a small menu, hiring, building, and a star-rating progression — on an architecture that can grow into a full game (more locations, burger designer, table service, marketing) without rewrites.

## What Changes

- New web game built with TypeScript, Vite, React, React Three Fiber and drei, deployed as a static site.
- Deterministic, headless-testable simulation core running at a fixed tick, separate from rendering, with pause and 1x/2x/3x speed.
- Continuous in-game clock with open hours (10:00–22:00), demand curves with lunch/dinner rushes, and a fast-forwarded night where wages, rent, deliveries and autosave resolve.
- Grid-based build mode on a fixed lot (one purchasable expansion): place, rotate, move and sell stations, tables and decor; paint kitchen/dining zones; build while paused or open.
- Agent-based customers (groups, queueing, patience, ordering, eating, leaving) and staff (hired from a daily candidate pool, assigned to Cashier/Cook/Assembler/Cleaner roles) navigating the grid.
- Counter-service order pipeline driven by data-defined recipes across kitchen stations with upgrade tiers.
- Ingredient inventory with auto-reorder, next-morning deliveries, and fridge-based storage capacity.
- Economy: player-set prices with demand elasticity, wages, rent, ingredient costs, soft-fail debt and a one-click loan.
- Reputation from per-customer satisfaction (wait, quality, price, cleanliness, seating) with readable thought bubbles; tables and floor get dirty.
- Star rating 1–5 that unlocks equipment, menu items and the lot expansion.
- Multi-slot saves in IndexedDB with nightly autosave, JSON export/import and versioned migrations.
- DOM overlay HUD and management panels, contextual hints, settings, and SFX.

## Capabilities

### New Capabilities
- `sim-core`: fixed-tick deterministic simulation, seeded randomness, speed control, in-game clock and day/night cycle.
- `restaurant-layout`: tile grid, lot bounds and expansion, object catalogue/footprints/rotation/access tiles, placement rules, zones, building while running.
- `agent-navigation`: grid pathfinding for customers and staff, zone restrictions, re-pathing on layout changes, register queue slots.
- `kitchen-operations`: menu items as recipe data, stations and tiers, the order pipeline from register to pickup, food quality.
- `inventory`: ingredient stock, storage capacity, reorder targets, deliveries, out-of-stock behavior.
- `staff-management`: candidate pool, hiring/firing, stats, wages, role assignment, task selection.
- `customer-behavior`: arrival rate, groups, patience, ordering, takeout vs dine-in, seating, eating, leaving.
- `reputation-and-cleanliness`: satisfaction scoring, rolling reputation, complaints/thought bubbles, dirt and trash.
- `economy`: cash, prices and elasticity, revenue and costs, daily settlement, debt and loan.
- `progression`: star rating calculation and unlock ladder, win banner, sandbox continuation.
- `save-system`: save slots, autosave, manual save/load, export/import, schema versioning and migration.
- `game-ui`: HUD, management panels, build-mode UI, world labels, contextual hints, settings, starter layout.
- `world-rendering`: isometric camera controls, 3D presentation of the sim, day/night lighting, performance budget.
- `audio`: sound effects and volume control.

### Modified Capabilities
<!-- none: greenfield project -->

## Impact

- New codebase: `src/sim` (headless simulation), `src/render` (R3F scene), `src/ui` (React DOM overlay), `src/data` (recipes, catalogue, balance), `src/save`.
- New dependencies: react, react-dom, three, @react-three/fiber, @react-three/drei, zustand, idb-keyval, tailwindcss; dev: vite, typescript, vitest, @playwright/test, @biomejs/biome, r3f-perf.
- Third-party CC0 assets (Kenney / Quaternius models, Kenney SFX) vendored under `public/assets` with license notes.
- GitHub Actions workflow for lint, test and GitHub Pages deploy.
