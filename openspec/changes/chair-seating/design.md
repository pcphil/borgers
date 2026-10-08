## Context

See proposal.md. Current model (`src/sim`): `PlacedObject.occupiedBy: Id | null` holds one group per table; `Group.tableId` points back. `canSeat(o, g)` is `seats >= g.size && occupiedBy === null`. `findTable` picks the nearest access tile among eligible, non-dirty tables (returns `'dirty'` if the only candidates are dirty). In `seeking` the group claims the table (`occupiedBy = g.id`), walks to an access tile (`toSeat`), then `eating`. `vacateTable` frees it and, only if the group was `eating`, sets `dirty = true`, queues a `clean` task (`tableId`) and may drop trash. `releaseGroupsAt` (on sell/move) frees the occupant. `testkit.checkInvariants` asserts `occupiedBy` matches `group.tableId`.

Rendering is separate: `Agents.tsx` places guest *m* of a seated group at `SEATS[table.def][m]`, so the chair index is already the member index, but only in the renderer. Labels (`Labels.tsx`) is a pool of 16 DOM nodes with kinds `bubble | ready | dirty`.

Saves are the whole `World` JSON, `SAVE_VERSION = 3`, with `MIGRATIONS` keyed by from-version. Baseline for balance is the `early-game-balance` archive Findings table (day-1 rep 61-74 on seeds 1-5; star days 2★ d3-5, 3★ d9-10, 4★ d16-19, 5★ d27-none).

## Goals / Non-Goals

**Goals:**
- Seat by chair: a table holds one slot per chair; a solo diner uses one chair; a group of 2+ owns the table while it eats.
- Dirty/clean at table level, once per use, when the last diner leaves.
- Takeout groups are visibly marked; shared tables render each guest on their own chair.
- Deterministic, save/load exact, with a v3 to v4 migration.
- Pacing stays in the `early-game-balance` band after re-tuning seats.

**Non-Goals:**
- Groups of 2+ sharing tables, per-guest takeout/dine-in, player-chosen chairs, new table types.
- Per-chair dirt (a table is dirty or clean as a whole).
- Changing the nightly candidate refresh.

## Decisions

**D1. Table state is an array of chair slots plus a `used` flag.**
`PlacedObject` gets `seatOccupants: (Id | null)[]` (length = `CATALOGUE[def].seats`, empty for non-tables) and `used: boolean`; `occupiedBy` is removed. `Group` gets `seatIdx: number[]` (chairs held, in member order) alongside `tableId`. Alternatives: keep `occupiedBy` and add a `sharedWith` list (two sources of truth); track chairs on the group only (table scan needed for every seating decision). The array makes the rule a pure function of the table and keeps one-way ownership checkable by invariant (`group.seatIdx[k]` on `table.seatOccupants` equals the group id).

**D2. Eligibility rule.** A table is eligible for group `g` when: it is a table, not dirty, and either (a) `g.size >= 2` and every chair is free and `seats >= g.size`, or (b) `g.size === 1`, at least one chair is free, and every occupant is a group of size 1. A group of 2+ takes chairs `0..size-1`; the remaining chairs of that table stay unusable because rule (b) requires all occupants to be solo. A solo takes the lowest free chair. This needs no extra "exclusive" field and also means a pair at a 4-seat table blocks the other two chairs, matching the agreed rule. Alternative: let a pair share with a pair. Rejected by the user (families keep a table).

**D3. Cleaning by `used`.** When a diner who was `eating` leaves, set `table.used = true`. When the last chair empties and `used` is true, set `dirty = true`, `used = false`, queue exactly one `clean` task and run the trash roll once for the leaving group as today. A diner who leaves without eating (angry during `toSeat`, sell/move release) only frees chairs. Alternatives: mark dirty at the first leaver (blocks sharing and cleans around people eating); per-chair dirt (more state, more tasks). `sell` already deletes clean tasks for the table, so no change there.

**D4. Choosing a table.** `findTable` keeps its distance-based choice over access tiles, with the D2 eligibility. Tie-break: prefer a table that already has a solo diner over a fully empty one only if it is strictly closer by path distance (no special preference), so layouts keep their current spread behaviour; the measurement in task 3.1 decides whether a "fill shared tables first" bias is needed to keep rooms from looking empty.

**D5. Chair identity is chosen in the sim, drawn by the renderer.** The renderer reads `g.seatIdx[m]` and `table.def` to pick `SEATS[def][chair]`; it no longer assumes chair = member index.

**D6. Takeout marker is a Label kind.** Add kind `bag` (a bag emoji) to `Labels.tsx` for takeout groups in states from queue to leaving. Pool size 16 is shared with bubbles and ready/dirty markers, so cap bag labels (shown only when the pool has room, after higher-priority kinds), as bubbles already are. Alternative: a 3D mesh attached to agents (more instancing work, rotation handling); rejected for this change.

**D7. Save v4 and migration.** `SAVE_VERSION = 4`. `MIGRATIONS[3]`: for every object with `occupiedBy` set, create `seatOccupants` with that group on chairs `0..size-1`, set the group's `seatIdx`, set `used = false`; every other table gets an all-null array; drop `occupiedBy`. Dirty tables keep `dirty` and their queued clean task. Objects that are not tables get `seatOccupants: []`.

**D8. Re-tune after the rule change.** Chairs go further, so the starter (14 seats: 2 table4, 3 table2) may become more than needed. Keep the starter layout unless measurement shows pacing too fast (2★ or 3★ more than ~2 days earlier than the `early-game-balance` table) or day-1 `noSeats` is gone with room to spare; then trim tables, not economy numbers. The autopilot's table spots (`src/dev/autopilot.ts`) are left unless a trimmed starter collides with them.

## Risks / Trade-offs

- [Orphaned or doubly-owned chairs after sell/move/fire/angry-leave paths] → Route every release through one `releaseSeat(group)` helper; extend `checkInvariants` (occupant ids exist, `seatIdx` matches, groups 2+ never share, no occupied chair on a dirty table) and run the fuzz and SOAK suites, which found a similar race in `early-game-balance`.
- [A group arriving at a table while another group's last diner is leaving and the table turns dirty] → Dirty is set in the same tick the last chair empties; `findTable` already skips dirty tables.
- [A solo takes the one chair left at a table whose other occupant is about to leave, delaying cleaning] → Accepted; cleaning happens when the table empties.
- [Pacing shifts] → D8 and the 30-day seeds 1-5 table in task 3.1.
- [Label pool exhaustion hides bubbles] → D6 priority.
- [Save v4 breaks exact replay for v3 saves mid-meal] → Migration seats groups on the first chairs; covered by a migration test and a round-trip test.

## Migration Plan

Add `MIGRATIONS[3]` and bump `SAVE_VERSION`; no data to back-fill elsewhere. Rollback is reverting the change, since v4 saves are refused by older builds ("newer version").

## Open Questions

- Whether solo diners should prefer a table that already has a solo (looks livelier, keeps empty tables free for groups) is left to the measurement in task 3.1; it does not change the specs or the task list.
