// Headless balancing: pnpm simulate [days] [seed] [strategy]
// Prints one CSV row per day. Strategies live in src/dev/autopilot.ts.
import { autoplay } from '../src/dev/autopilot'
import { newGame } from '../src/sim/world'

const days = Number(process.argv[2] ?? 30)
const seed = Number(process.argv[3] ?? 1)
const strategyName = process.argv[4] ?? 'competent'

const sim = newGame(seed)
console.log('day,revenue,costs,cash,served,lost,reputation,stars,staff,topComplaint')
for (let d = 0; d < days; d++) {
  autoplay(sim, 1, strategyName)
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
