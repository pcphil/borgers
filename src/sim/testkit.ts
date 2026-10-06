// Helpers for building small deterministic scenarios in tests.
import type { ObjectDefId } from '../data/catalogue'
import type { Ingredient } from '../data/recipes'
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

export function stepUntil(sim: Sim, pred: () => boolean, max = 20_000): number {
  for (let i = 0; i < max; i++) {
    if (pred()) return i
    sim.step()
  }
  throw new Error('stepUntil: condition not reached')
}
