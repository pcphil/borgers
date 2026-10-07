import { describe, expect, it } from 'vitest'
import { CUSTOMERS } from '../data/balance'
import { spawnGroup } from './customers'
import type { Sim } from './sim'
import { newGame } from './world'

/** Arrival ticks and group sizes for `days` open days with no player actions. */
function recordArrivals(sim: Sim, days: number) {
  const ticks: number[] = []
  const sizes: number[] = []
  const endDay = sim.world.clock.day + days
  while (sim.world.clock.day < endDay) {
    sim.step()
    for (const e of sim.drainEvents()) {
      if (e.type !== 'customerEnter') continue
      ticks.push(sim.world.clock.totalTicks)
      sizes.push(sim.world.groups[e.groupId]?.size ?? 0)
    }
  }
  return { ticks, sizes }
}

const gaps = (ticks: number[]) => ticks.slice(1).map((t, i) => t - (ticks[i] as number))
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const cv = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2))) / mean(xs)

describe('arrivals', () => {
  it('has irregular gaps between arrivals', () => {
    for (const seed of [1, 2, 3]) {
      const { ticks } = recordArrivals(newGame(seed), 2)
      const g = gaps(ticks)
      expect(g.length).toBeGreaterThan(30)
      expect(new Set(g).size).toBeGreaterThan(10)
      // Independent random draws give a coefficient of variation near 1 (a fixed period gives 0).
      expect(cv(g)).toBeGreaterThan(0.5)
    }
  })

  it('is reproducible for the same seed and differs between seeds', () => {
    const a = recordArrivals(newGame(7), 1)
    const b = recordArrivals(newGame(7), 1)
    const c = recordArrivals(newGame(8), 1)
    expect(a).toEqual(b)
    expect(a.ticks).not.toEqual(c.ticks)
  })

  it('draws group sizes 1-4 with the configured weights', () => {
    const sim = newGame(11)
    const n = 2000
    const counts = [0, 0, 0, 0]
    for (let i = 0; i < n; i++) {
      const size = spawnGroup(sim).size
      counts[size - 1] = (counts[size - 1] as number) + 1
    }
    const total = CUSTOMERS.groupSizeWeights.reduce((a, b) => a + b, 0)
    CUSTOMERS.groupSizeWeights.forEach((w, i) => {
      expect((counts[i] as number) / n).toBeCloseTo(w / total, 1)
      expect((counts[i] as number) / n).toBeGreaterThan(0)
    })
    expect(counts[0]).toBeGreaterThan(counts[1] as number)
  })
})
