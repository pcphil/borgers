import { STARS } from '../data/balance'
import type { Sim } from './sim'

/** Night evaluation: gain at most one star if both thresholds for the next star are met. */
export function evaluateStars(sim: Sim): boolean {
  const w = sim.world
  if (w.stars >= 5) return false
  const next = (w.stars + 1) as 2 | 3 | 4 | 5
  const t = STARS[next]
  if (w.reputation.value < t.reputation || w.economy.cumulativeRevenue < t.revenue) return false
  w.stars = next
  w.economy.today.starsGained++
  sim.emit({ type: 'starGained', stars: next })
  return true
}
