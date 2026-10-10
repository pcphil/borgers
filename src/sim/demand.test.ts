import { describe, expect, it } from 'vitest'
import { TICKS_PER_HOUR } from '../data/balance'
import { arrivalRate, reputationFactor } from './customers'
import { runDays } from './runner'
import { BASIC_OBJECTS, BASIC_STOCK, hireCoreThree, makeSim } from './testkit'
import { newGame } from './world'

describe('reputation demand table', () => {
  it('has a casual floor, a small start and the old top end, rising with reputation', () => {
    expect(reputationFactor(0)).toBeCloseTo(0.3, 5)
    expect(reputationFactor(50)).toBeCloseTo(0.45, 5)
    expect(reputationFactor(100)).toBeCloseTo(1.6, 5)
    let prev = 0
    for (let rep = 0; rep <= 100; rep += 5) {
      const f = reputationFactor(rep)
      expect(f, `rep ${rep}`).toBeGreaterThanOrEqual(prev)
      prev = f
    }
  })
})

describe('demand builds up toward reputation at each opening', () => {
  const lunchRate = (sim: ReturnType<typeof makeSim>) => {
    sim.world.clock.tick = 2.5 * TICKS_PER_HOUR
    return arrivalRate(sim.world)
  }
  const openWith = (rep: number) => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    sim.world.clock.phase = 'prep'
    sim.world.reputation.value = rep
    sim.dispatch({ type: 'open' })
    return sim
  }

  it('a bad reputation does not empty the restaurant', () => {
    expect(lunchRate(openWith(0))).toBeGreaterThanOrEqual(lunchRate(openWith(50)) * 0.5)
  })

  it('reputation changes during the day do not change the rate; the next opening does', () => {
    const sim = openWith(50)
    const before = lunchRate(sim)
    sim.world.reputation.value = 95
    expect(lunchRate(sim)).toBe(before)
    sim.world.clock.phase = 'prep'
    sim.dispatch({ type: 'open' })
    expect(lunchRate(sim)).toBeGreaterThan(before)
  })

  it('the crowd grows part of the way toward a better reputation each day', () => {
    const sim = openWith(90)
    expect(sim.world.demandRep).toBeGreaterThan(50)
    expect(sim.world.demandRep).toBeLessThan(90)
    const first = sim.world.demandRep
    sim.world.clock.phase = 'prep'
    sim.dispatch({ type: 'open' })
    expect(sim.world.demandRep).toBeGreaterThan(first)
    expect(sim.world.demandRep).toBeLessThan(90)
  })

  it('a bad day dents the crowd less than a good day builds it', () => {
    const up = openWith(90).world.demandRep - 50
    const down = 50 - openWith(10).world.demandRep
    expect(down / 40).toBeLessThan(up / 40)
    expect(down).toBeGreaterThan(0)
  })
})

describe('the first day is small', () => {
  it('averages 18 to 26 groups over many seeds, and none is overwhelming', () => {
    const counts: number[] = []
    for (let seed = 1; seed <= 20; seed++) {
      const sim = newGame(seed)
      hireCoreThree(sim)
      runDays(sim, 1)
      const day = sim.world.economy.history.at(-1)
      counts.push((day?.served ?? 0) + (day?.lost ?? 0))
    }
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length
    expect(mean).toBeGreaterThanOrEqual(18)
    expect(mean).toBeLessThanOrEqual(26)
    expect(Math.max(...counts)).toBeLessThan(40)
  })
})
