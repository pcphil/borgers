// Scripted "competent player" used for balancing (scripts/simulate.ts) and playthrough tests.
// Not part of the game: it only issues the same commands a player could.
import { CATALOGUE, type ObjectDefId } from '../data/catalogue'
import { INGREDIENTS, type Ingredient, MENU, MENU_ITEM_IDS } from '../data/recipes'
import type { Role } from '../data/unlocks'
import { capacity } from '../sim/inventory'
import { isMenuUnlocked, itemNeeds } from '../sim/menu'
import { runDays } from '../sim/runner'
import type { Sim } from '../sim/sim'
import type { Rot } from '../sim/types'

export type Strategy = (sim: Sim) => void

const count = (sim: Sim, def: ObjectDefId) =>
  Object.values(sim.world.objects).filter((o) => o.def === def).length

/** Try each spot until one placement succeeds (keeps a cash reserve). */
function build(sim: Sim, def: ObjectDefId, spots: [number, number, Rot][], reserve = 100_000) {
  const cost = CATALOGUE[def].tiers[0]?.cost ?? 0
  if (sim.world.economy.cash - cost < reserve) return false
  for (const [x, y, rot] of spots)
    if (sim.dispatch({ type: 'place', def, x, y, rot }).ok) return true
  return false
}

const score = (c: { stats: { cooking: number; speed: number; service: number } }) =>
  c.stats.cooking + c.stats.speed + c.stats.service

/** Staff plan by star rating; a competent player grows the team as stars unlock things. */
const PLAN: Record<number, Role[]> = {
  1: ['cashier', 'cook', 'assembler'],
  2: ['cashier', 'cook', 'assembler', 'cook', 'cleaner', 'assembler'],
  3: ['cashier', 'cook', 'assembler', 'cook', 'cleaner', 'assembler', 'cook', 'cashier'],
  4: ['cashier', 'cook', 'assembler', 'cook', 'cleaner', 'assembler', 'cook', 'cashier', 'cook'],
  5: [
    'cashier',
    'cook',
    'assembler',
    'cook',
    'cleaner',
    'assembler',
    'cook',
    'cashier',
    'cook',
    'assembler',
  ],
}

/** Average unclaimed kitchen tasks per role seen during the last day (what a player sees as queues). */
export const pressure = { cook: 0, assembler: 0 }

export function samplePressure(sim: Sim, acc: { cook: number; assembler: number; n: number }) {
  if (sim.world.clock.phase !== 'open') return
  for (const t of Object.values(sim.world.tasks))
    if (t.claimedBy === null && (t.role === 'cook' || t.role === 'assembler')) acc[t.role]++
  acc.n++
}

function manageStaff(sim: Sim) {
  const w = sim.world
  const plan = [...(PLAN[w.stars] ?? PLAN[5] ?? [])]
  // If one kitchen role is clearly swamped (twice the other's queue), lend it the last flexible hire.
  const last = plan.length - 1
  if (pressure.cook > 2 * pressure.assembler + 1 && plan[last] === 'assembler') plan[last] = 'cook'
  if (pressure.assembler > 2 * pressure.cook + 1 && plan[last] === 'cook') plan[last] = 'assembler'
  const staff = Object.values(w.staff)
  const wages = staff.reduce((a, s) => a + s.wage, 0)
  while (Object.keys(w.staff).length < plan.length && w.candidates.length) {
    const best = [...w.candidates].sort((a, b) => score(b) - score(a))[0]
    // Hire only with a few days of wages in the bank.
    if (!best || w.economy.cash < (wages + best.wage) * 3) break
    sim.dispatch({ type: 'hire', candidateId: best.id })
  }
  Object.values(w.staff).forEach((s, i) => {
    const role = plan[i] ?? 'cook'
    if (s.role !== role) sim.dispatch({ type: 'setRole', staffId: s.id, role })
  })
}

function manageMenuAndStock(sim: Sim) {
  const w = sim.world
  for (const id of MENU_ITEM_IDS)
    if (isMenuUnlocked(w, id))
      sim.dispatch({
        type: 'setMenu',
        item: id,
        patch: { enabled: true, price: MENU[id].fairValue },
      })
  // Share storage between needed ingredients, weighted by how many recipes use them.
  const weight = Object.fromEntries(INGREDIENTS.map((i) => [i, 0])) as Record<Ingredient, number>
  for (const id of MENU_ITEM_IDS) {
    if (!isMenuUnlocked(w, id)) continue
    for (const [i, n] of Object.entries(itemNeeds(id)) as [Ingredient, number][]) weight[i] += n
  }
  const total = Object.values(weight).reduce((a, b) => a + b, 0)
  const cap = capacity(w) * 0.95
  for (const i of INGREDIENTS) {
    const target = total ? Math.floor((cap * weight[i]) / total) : 0
    sim.dispatch({ type: 'setStockTarget', ingredient: i, target })
    sim.dispatch({ type: 'setAutoReorder', ingredient: i, on: target > 0 })
  }
}

function manageBuilding(sim: Sim) {
  const w = sim.world
  if (count(sim, 'fridge') < 2)
    build(sim, 'fridge', [
      [11, 8, 0],
      [11, 9, 0],
      [0, 9, 0],
    ])
  if (w.stars >= 2) {
    if (count(sim, 'fryer') < 1)
      build(sim, 'fryer', [
        [0, 8, 0],
        [11, 9, 0],
        [9, 9, 0],
      ])
    if (count(sim, 'table4') < 2)
      build(
        sim,
        'table4',
        [
          [2, 2, 0],
          [0, 4, 0],
          [10, 0, 0],
        ],
        150_000,
      )
    if (count(sim, 'fridge') < 3)
      build(
        sim,
        'fridge',
        [
          [11, 9, 0],
          [0, 9, 0],
          [1, 9, 0],
        ],
        200_000,
      )
  }
  if (w.stars >= 3) {
    const grill = Object.values(w.objects).find((o) => o.def === 'grill' && o.tier === 0)
    if (grill && w.economy.cash > 400_000) sim.dispatch({ type: 'upgrade', id: grill.id })
    if (count(sim, 'grill') < 2)
      build(
        sim,
        'grill',
        [
          [2, 9, 0],
          [7, 9, 0],
          [3, 6, 2],
        ],
        300_000,
      )
    if (count(sim, 'assembly') < 2)
      build(
        sim,
        'assembly',
        [
          [5, 9, 0],
          [5, 6, 2],
        ],
        300_000,
      )
  }
  if (w.stars >= 4) {
    if (!w.layout.expanded && w.economy.cash > 900_000) sim.dispatch({ type: 'expand' })
    if (w.layout.expanded) {
      if (count(sim, 'register') < 2)
        build(
          sim,
          'register',
          [
            [13, 5, 0],
            [12, 5, 0],
          ],
          300_000,
        )
      if (count(sim, 'table4') < 5)
        build(
          sim,
          'table4',
          [
            [14, 1, 0],
            [16, 1, 0],
            [14, 3, 0],
            [16, 3, 0],
            [12, 1, 0],
          ],
          300_000,
        )
      if (count(sim, 'pickup') < 2)
        build(
          sim,
          'pickup',
          [
            [15, 5, 0],
            [16, 5, 0],
          ],
          300_000,
        )
      if (count(sim, 'fridge') < 5)
        build(
          sim,
          'fridge',
          [
            [17, 8, 0],
            [17, 9, 0],
            [16, 9, 0],
          ],
          300_000,
        )
    }
  }
  if (w.stars >= 5) {
    for (const o of Object.values(w.objects))
      if (CATALOGUE[o.def].station && o.tier === 0 && w.economy.cash > 500_000)
        sim.dispatch({ type: 'upgrade', id: o.id })
  }
}

export const STRATEGIES: Record<string, Strategy> = {
  idle: () => {},
  basic: (sim) => {
    for (const c of [...sim.world.candidates].slice(
      0,
      Math.max(0, 3 - Object.keys(sim.world.staff).length),
    ))
      sim.dispatch({ type: 'hire', candidateId: c.id })
  },
  competent: (sim) => {
    manageBuilding(sim)
    manageStaff(sim)
    manageMenuAndStock(sim)
  },
}

/** Play `days` days with a strategy applied each morning; returns the day records. */
export function autoplay(sim: Sim, days: number, name = 'competent') {
  const strategy = STRATEGIES[name]
  if (!strategy) throw new Error(`unknown strategy ${name}`)
  for (let d = 0; d < days; d++) {
    strategy(sim)
    const acc = { cook: 0, assembler: 0, n: 0 }
    runDays(sim, 1, (s) => samplePressure(s, acc))
    pressure.cook = acc.cook / Math.max(1, acc.n)
    pressure.assembler = acc.assembler / Math.max(1, acc.n)
  }
  return sim.world.economy.history.slice(-days)
}
