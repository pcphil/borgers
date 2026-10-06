// Headless balancing: pnpm simulate [days] [seed] [strategy]
// Prints one CSV row per day. Strategies are scripted player behaviours.
import { MENU_ITEM_IDS } from '../src/data/recipes'
import { runDays } from '../src/sim/runner'
import type { Sim } from '../src/sim/sim'
import { newGame } from '../src/sim/world'

type Strategy = (sim: Sim) => void

const hireUpTo = (sim: Sim, n: number) => {
  while (Object.keys(sim.world.staff).length < n && sim.world.candidates.length) {
    const best = [...sim.world.candidates].sort(
      (a, b) =>
        b.stats.cooking +
        b.stats.speed +
        b.stats.service -
        (a.stats.cooking + a.stats.speed + a.stats.service),
    )[0]
    if (!best) break
    sim.dispatch({ type: 'hire', candidateId: best.id })
  }
}

const STRATEGIES: Record<string, Strategy> = {
  idle: () => {},
  basic: (sim) => hireUpTo(sim, 3),
  grow: (sim) => {
    const w = sim.world
    hireUpTo(sim, Math.min(8, 3 + Math.floor(w.clock.day / 3)))
    const staff = Object.values(w.staff)
    const roles = [
      'cashier',
      'cook',
      'assembler',
      'cook',
      'assembler',
      'cleaner',
      'cook',
      'cashier',
    ] as const
    staff.forEach((s, i) => {
      const role = roles[i] ?? 'cook'
      if (s.role !== role) sim.dispatch({ type: 'setRole', staffId: s.id, role })
    })
    for (const id of MENU_ITEM_IDS) {
      if (w.inventory.targets.patty < 120)
        sim.dispatch({ type: 'setStockTarget', ingredient: 'patty', target: 120 })
      void id
    }
    for (const i of ['bun', 'lettuce', 'tomato', 'cheese', 'potato'] as const) {
      sim.dispatch({ type: 'setAutoReorder', ingredient: i, on: true })
      if (w.inventory.targets[i] < 100)
        sim.dispatch({ type: 'setStockTarget', ingredient: i, target: 100 })
    }
    if (w.stars >= 2 && !Object.values(w.objects).some((o) => o.def === 'fryer'))
      sim.dispatch({ type: 'place', def: 'fryer', x: 0, y: 8, rot: 0 })
    if (
      w.economy.cash > 300_000 &&
      Object.values(w.objects).filter((o) => o.def === 'grill').length < 2
    )
      sim.dispatch({ type: 'place', def: 'grill', x: 2, y: 6, rot: 2 })
  },
}

const days = Number(process.argv[2] ?? 30)
const seed = Number(process.argv[3] ?? 1)
const strategyName = process.argv[4] ?? 'grow'
const strategy = STRATEGIES[strategyName]
if (!strategy) throw new Error(`unknown strategy ${strategyName}`)

const sim = newGame(seed)
console.log('day,revenue,costs,cash,served,lost,reputation,stars,staff,topComplaint')
for (let d = 0; d < days; d++) {
  strategy(sim)
  runDays(sim, 1)
  const r = sim.world.economy.history.at(-1)
  if (!r) continue
  const costs = Object.values(r.costs).reduce((a, b) => a + b, 0)
  const top = Object.entries(r.complaints).sort((a, b) => b[1] - a[1])[0]
  console.log(
    [
      r.day,
      (r.revenue / 100).toFixed(0),
      (costs / 100).toFixed(0),
      (sim.world.economy.cash / 100).toFixed(0),
      r.served,
      r.lost,
      r.repEnd.toFixed(1),
      sim.world.stars,
      Object.keys(sim.world.staff).length,
      top ? `${top[0]}:${top[1]}` : '',
    ].join(','),
  )
}
