// Helpers for building small deterministic scenarios in tests.
import { expect } from 'vitest'
import { CUSTOMERS, STREET } from '../data/balance'
import type { ObjectDefId } from '../data/catalogue'
import { INGREDIENTS, type Ingredient } from '../data/recipes'
import type { Role } from '../data/unlocks'
import { MAXH, MAXW, newPlacedObject } from './layout'
import { Sim } from './sim'
import { generateCandidates } from './staff'
import type { Rot, Staff, StaffStats } from './types'
import { ZONE_KITCHEN } from './types'
import { emptyWorld } from './world'

export type Scenario = {
  seed?: number
  kitchenFromRow?: number
  objects?: { def: ObjectDefId; x: number; y: number; rot?: Rot }[]
  stock?: Partial<Record<Ingredient, number>>
  stars?: number
  cash?: number
  arrivals?: boolean
}

export function makeSim(s: Scenario = {}): Sim {
  const w = emptyWorld(s.seed ?? 1)
  const k = s.kitchenFromRow ?? 6
  for (let y = k; y < MAXH; y++)
    for (let x = 0; x < MAXW; x++) w.layout.zones[y * MAXW + x] = ZONE_KITCHEN
  if (s.stars) w.stars = s.stars
  if (s.cash !== undefined) w.economy.cash = s.cash
  const sim = new Sim(w)
  sim.arrivals = s.arrivals ?? false
  for (const o of s.objects ?? []) {
    const p = newPlacedObject(sim.newId(), { def: o.def, x: o.x, y: o.y, rot: o.rot ?? 0 })
    w.objects[p.id] = p
  }
  for (const [i, n] of Object.entries(s.stock ?? {}) as [Ingredient, number][])
    w.inventory.stock[i] = n
  generateCandidates(sim)
  sim.layoutChanged()
  return sim
}

/** Hire a staff member with fixed stats directly (bypasses candidate pool randomness). */
export function addStaff(
  sim: Sim,
  role: Role,
  stats: Partial<StaffStats> = {},
  at = { x: 2, y: 0 },
): Staff {
  const id = sim.newId()
  sim.world.candidates.push({
    id,
    name: `S${id}`,
    stats: { cooking: 0.5, speed: 0.5, service: 0.5, ...stats },
    wage: 6000,
  })
  const r = sim.dispatch({ type: 'hire', candidateId: id })
  if (!r.ok) throw new Error('hire failed')
  const s = sim.world.staff[id] as Staff
  s.pos = { ...at }
  s.prev = { ...at }
  // Scenario staff are already inside: skip the street walk.
  s.state = 'idle'
  s.side = 1
  s.path = []
  s.pathIdx = 0
  sim.dispatch({ type: 'setRole', staffId: id, role })
  s.role = role
  s.pendingRole = null
  return s
}

/** Minimal working restaurant used by many tests (12x10 lot, kitchen rows >= 6). */
export const BASIC_OBJECTS: Scenario['objects'] = [
  { def: 'register', x: 5, y: 5 },
  { def: 'pickup', x: 8, y: 5 },
  { def: 'grill', x: 2, y: 8 },
  { def: 'assembly', x: 5, y: 8 },
  { def: 'soda', x: 8, y: 8 },
  { def: 'fridge', x: 10, y: 8 },
  { def: 'table2', x: 8, y: 2 },
  { def: 'table4', x: 0, y: 2 },
]

export const BASIC_STOCK = { bun: 40, patty: 40, lettuce: 40, tomato: 40, syrup: 40, cheese: 40 }

/** Open the restaurant if the day is still in preparation (hand-stepped multi-day tests). */
export function openIfPrep(sim: Sim) {
  if (sim.world.clock.phase === 'prep') sim.dispatch({ type: 'open' })
}

/** Cross-link and sanity checks shared by the invariant, soak and fuzz tests. */
export function checkInvariants(sim: Sim) {
  const w = sim.world
  expect(Number.isInteger(w.economy.cash)).toBe(true)
  expect(Number.isInteger(w.economy.loan)).toBe(true)
  for (const i of INGREDIENTS) {
    expect(w.inventory.stock[i]).toBeGreaterThanOrEqual(0)
    expect(w.inventory.reserved[i]).toBeGreaterThanOrEqual(0)
    expect(w.inventory.reserved[i]).toBeLessThanOrEqual(w.inventory.stock[i])
  }
  for (const a of [...Object.values(w.groups), ...Object.values(w.staff)]) {
    expect(Number.isFinite(a.pos.x) && Number.isFinite(a.pos.y)).toBe(true)
    if ('state' in a && (a.state === 'arriving' || a.state === 'departing')) {
      // On the street: on the lane or the door column between the lane and the entrance.
      expect(a.pos.y).toBeGreaterThanOrEqual(STREET.laneY)
      expect(a.pos.y).toBeLessThanOrEqual(0)
      expect(Math.abs(a.pos.x - w.layout.w / 2)).toBeLessThanOrEqual(STREET.spawnDistance + MAXW)
      continue
    }
    expect(a.pos.x).toBeGreaterThanOrEqual(0)
    expect(a.pos.y).toBeGreaterThanOrEqual(0)
    expect(a.pos.x).toBeLessThan(w.layout.w)
    expect(a.pos.y).toBeLessThan(w.layout.h)
  }
  for (const t of Object.values(w.tasks)) {
    if (t.claimedBy !== null) expect(w.staff[t.claimedBy]?.taskId).toBe(t.id)
    // A task for a vanished order may only be one already being worked on.
    if (t.orderId !== null && !w.orders[t.orderId]) expect(t.claimedBy).not.toBeNull()
  }
  for (const s of Object.values(w.staff))
    if (s.taskId !== null) expect(w.tasks[s.taskId]?.claimedBy).toBe(s.id)
  for (const o of Object.values(w.objects)) {
    for (const slot of o.slots) if (slot !== null) expect(w.tasks[slot]).toBeDefined()
    for (const g of o.queue) expect(w.groups[g]?.registerId).toBe(o.id)
    if (o.occupiedBy !== null) expect(w.groups[o.occupiedBy]?.tableId).toBe(o.id)
    for (const r of o.readyOrders) expect(w.orders[r]?.state).toBe('ready')
  }
  expect(Object.keys(w.groups).length).toBeLessThanOrEqual(CUSTOMERS.maxActiveGroups + 1)
}

export function stepUntil(sim: Sim, pred: () => boolean, max = 20_000): number {
  for (let i = 0; i < max; i++) {
    if (pred()) return i
    sim.step()
  }
  throw new Error('stepUntil: condition not reached')
}
