import { ECONOMY, LOT, STAFF } from '../data/balance'
import { INGREDIENTS } from '../data/recipes'
import { STARTER } from '../data/starterLayout'
import { RUSH_KNOTS } from './customers'
import { newDayRecord } from './economy'
import { newInventory } from './inventory'
import { MAXH, MAXW, newPlacedObject } from './layout'
import { newMenu } from './menu'
import { newReputation } from './reputation'
import { seedRng } from './rng'
import { Sim } from './sim'
import { generateCandidates } from './staff'
import { type World, ZONE_DINING, ZONE_KITCHEN, type Zone } from './types'

export const SAVE_VERSION = 5

/** Empty world with no objects, all-dining zones. */
export function emptyWorld(seed: number): World {
  const rep = newReputation()
  return {
    version: SAVE_VERSION,
    seed,
    rng: seedRng(seed),
    nextId: 1,
    clock: { day: 1, tick: 0, phase: 'open', nightTick: 0, totalTicks: 0 },
    layout: {
      w: LOT.initial.w,
      h: LOT.initial.h,
      expanded: false,
      zones: new Array<Zone>(MAXW * MAXH).fill(ZONE_DINING),
      version: 0,
    },
    objects: {},
    groups: {},
    staff: {},
    orders: {},
    tasks: {},
    trash: {},
    candidates: [],
    inventory: newInventory(),
    menu: newMenu(),
    economy: {
      cash: ECONOMY.startingCash,
      loan: 0,
      cumulativeRevenue: 0,
      today: newDayRecord(1, rep.value),
      history: [],
    },
    reputation: rep,
    demandRep: rep.value,
    stars: 1,
    winSeen: false,
    dismissedHints: [],
    rush: new Array<number>(RUSH_KNOTS).fill(1),
  }
}

/** New game: starter layout and stock, no staff, a fresh candidate pool. */
export function newGame(seed: number): Sim {
  const w = emptyWorld(seed)
  w.clock.phase = 'prep'
  for (let y = STARTER.kitchenFromRow; y < MAXH; y++)
    for (let x = 0; x < MAXW; x++) w.layout.zones[y * MAXW + x] = ZONE_KITCHEN
  const sim = new Sim(w)
  for (const o of STARTER.objects) {
    const p = newPlacedObject(sim.newId(), o)
    w.objects[p.id] = p
  }
  for (const i of INGREDIENTS) {
    const n = STARTER.stock[i] ?? 0
    w.inventory.stock[i] = n
    w.inventory.targets[i] = n
    w.inventory.auto[i] = n > 0
  }
  generateCandidates(sim, STAFF.firstCandidates)
  sim.layoutChanged()
  sim.refreshHints()
  return sim
}
