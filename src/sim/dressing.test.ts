// world-dressing: prep phase, open command, rush pattern, street approach and departure.
import { describe, expect, it } from 'vitest'
import {
  CUSTOMERS,
  OPEN_HOUR,
  OPEN_TICKS,
  STREET,
  TICKS_PER_HOUR,
  TICKS_PER_SECOND,
} from '../data/balance'
import { arrivalSystem, demandAt, drawRush, leaveAngry, rushAt, spawnGroup } from './customers'
import { entranceTile, MAXW } from './layout'
import { newAgent, setRoute, walkRoute } from './movement'
import { runDays } from './runner'
import { addStaff, BASIC_OBJECTS, BASIC_STOCK, makeSim, openIfPrep } from './testkit'
import { emptyWorld, newGame } from './world'

const hireAll = (sim: ReturnType<typeof newGame>) => {
  for (const c of [...sim.world.candidates]) sim.dispatch({ type: 'hire', candidateId: c.id })
}

describe('prep phase and open command', () => {
  it('a new game waits in prep: clock frozen, no customers, staff still move', () => {
    const sim = newGame(3)
    expect(sim.world.clock.phase).toBe('prep')
    hireAll(sim)
    const before = Object.values(sim.world.staff).map((s) => ({ ...s.pos }))
    for (let i = 0; i < 2000; i++) {
      sim.step()
      sim.drainEvents()
    }
    expect(sim.world.clock.phase).toBe('prep')
    expect(sim.world.clock.tick).toBe(0)
    expect(Object.keys(sim.world.groups)).toHaveLength(0)
    const after = Object.values(sim.world.staff).map((s) => s.pos)
    expect(after.some((p, i) => p.x !== before[i]?.x || p.y !== before[i]?.y)).toBe(true)
  })

  it('opening starts the clock and arrivals; opening again is rejected', () => {
    const sim = newGame(3)
    expect(sim.dispatch({ type: 'open' })).toEqual({ ok: true })
    expect(sim.world.clock.phase).toBe('open')
    expect(sim.dispatch({ type: 'open' })).toEqual({ ok: false, reason: 'notPreparing' })
    let seen = 0
    for (let i = 0; i < 4000; i++) {
      sim.step()
      seen += sim.drainEvents().filter((e) => e.type === 'customerEnter').length
    }
    expect(sim.world.clock.tick).toBe(4000)
    expect(seen).toBeGreaterThan(0)
  })

  it('night ends in prep, and the next day needs an explicit open', () => {
    const sim = newGame(4)
    sim.dispatch({ type: 'open' })
    runDays(sim, 1)
    expect(sim.world.clock.day).toBe(2)
    expect(sim.world.clock.phase).toBe('prep')
    for (let i = 0; i < 500; i++) sim.step()
    expect(sim.world.clock.tick).toBe(0)
  })

  it('wages cover whoever is employed at the moment of opening', () => {
    const paid = (fireOne: boolean) => {
      const sim = newGame(5)
      hireAll(sim) // hired in prep
      const staff = Object.values(sim.world.staff)
      if (fireOne) sim.dispatch({ type: 'fire', staffId: (staff[0] as { id: number }).id })
      sim.dispatch({ type: 'open' })
      runDays(sim, 1)
      return { wages: sim.world.economy.history[0]?.costs.wages ?? 0, staff }
    }
    const all = paid(false)
    const fewer = paid(true)
    expect(all.wages).toBe(all.staff.reduce((a, s) => a + s.wage, 0))
    expect(fewer.wages).toBe(fewer.staff.slice(1).reduce((a, s) => a + s.wage, 0))
  })

  it('runDays opens a prep day by itself (headless)', () => {
    const sim = newGame(6)
    runDays(sim, 2)
    expect(sim.world.clock.day).toBe(3)
  })
})

describe('rush pattern', () => {
  const base = () => {
    let sum = 0
    for (let t = 0; t < OPEN_TICKS; t++) sum += demandAt(OPEN_HOUR + t / TICKS_PER_HOUR)
    return sum
  }
  const modulated = (rush: number[]) => {
    let sum = 0
    for (let t = 0; t < OPEN_TICKS; t++) {
      const h = OPEN_HOUR + t / TICKS_PER_HOUR
      sum += demandAt(h) * rushAt(rush, h)
    }
    return sum
  }

  it('is normalized to keep the expected daily total', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = emptyWorld(seed)
      const rush = drawRush(w)
      expect(rush).toHaveLength(13)
      expect(modulated(rush)).toBeCloseTo(base(), 6)
    }
  })

  it('is reproducible per seed and differs between days', () => {
    const a = emptyWorld(9)
    const b = emptyWorld(9)
    const d1 = drawRush(a)
    expect(drawRush(b)).toEqual(d1)
    expect(drawRush(a)).not.toEqual(d1)
  })

  it('leaves scenario worlds (no open) unmodulated', () => {
    expect(makeSim().world.rush.every((m) => m === 1)).toBe(true)
    expect(rushAt(makeSim().world.rush, 15.3)).toBe(1)
  })

  it('keeps mean arrivals per day while varying the busiest hour', () => {
    const days = 200
    const sim = makeSim({ arrivals: true, seed: 21 })
    const w = sim.world
    w.clock.phase = 'open'
    let total = 0
    const busiest = new Set<number>()
    for (let d = 0; d < days; d++) {
      w.rush = drawRush(w)
      const perHour = new Array<number>(12).fill(0)
      for (let t = 0; t < OPEN_TICKS; t++) {
        w.clock.tick = t
        arrivalSystem(sim)
        const n = Object.keys(w.groups).length
        const hr = Math.min(11, Math.floor(t / TICKS_PER_HOUR))
        perHour[hr] = (perHour[hr] ?? 0) + n
        total += n
        w.groups = {}
      }
      busiest.add(perHour.indexOf(Math.max(...perHour)))
    }
    let expected = 0
    for (let t = 0; t < OPEN_TICKS; t++) expected += demandAt(OPEN_HOUR + t / TICKS_PER_HOUR)
    // Reputation (50) and fair prices give factor 1.0 here; allow statistical noise.
    const factor = 0.4 + 1.2 * (w.reputation.value / 100)
    const perDayExpected = (expected / TICKS_PER_HOUR) * factor
    expect(total / days).toBeGreaterThan(perDayExpected * 0.93)
    expect(total / days).toBeLessThan(perDayExpected * 1.07)
    expect(busiest.size).toBeGreaterThanOrEqual(3)
  })
})

describe('scripted street route', () => {
  it('walks at customer speed, ends exactly on the last waypoint and ignores layout changes', () => {
    const sim = makeSim()
    const a = newAgent({ x: -18, y: STREET.laneY })
    setRoute(a, [
      { x: 2, y: STREET.laneY },
      { x: 2, y: 0 },
    ])
    const step = CUSTOMERS.walkSpeed / TICKS_PER_SECOND
    expect(walkRoute(a, CUSTOMERS.walkSpeed)).toBe('moving')
    expect(a.pos.x).toBeCloseTo(-18 + step)
    expect(a.prev.x).toBe(-18)
    let n = 1
    while (walkRoute(a, CUSTOMERS.walkSpeed) === 'moving') {
      if (++n === 50) sim.layoutChanged() // grid edits must not matter on the street
      expect(n).toBeLessThan(1000)
    }
    expect(a.pos).toEqual({ x: 2, y: 0 })
    expect(n).toBeCloseTo((20 + 1.5) / step, -1)
  })
})

describe('street arrival and departure', () => {
  const restaurant = () =>
    makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK, arrivals: false, stars: 1 })

  it('a new group starts outside the lot, unqueued, and enters at the door', () => {
    const sim = restaurant()
    const g = spawnGroup(sim)
    expect(g.state).toBe('arriving')
    expect(g.pos.y).toBe(STREET.laneY)
    expect(Math.abs(g.pos.x - 6)).toBeGreaterThan(STREET.spawnDistance)
    expect(sim.world.objects[3]?.queue ?? []).toHaveLength(0)
    expect(g.registerId).toBeNull()
    sim.drainEvents()
    let enteredAt = -1
    for (let i = 0; i < 2000 && enteredAt < 0; i++) {
      sim.step()
      if (sim.drainEvents().some((e) => e.type === 'customerEnter')) enteredAt = i
      else expect(g.state).toBe('arriving')
    }
    expect(enteredAt).toBeGreaterThan(0)
    expect(g.pos).toEqual(entranceTile())
    expect(g.state).toBe('toQueue')
    expect(g.queueWait).toBe(0)
    expect(g.registerId).not.toBeNull()
    // Walking time is the street leg: about (distance + a bit) / walk speed.
    expect(enteredAt / TICKS_PER_SECOND).toBeGreaterThan(STREET.spawnDistance / CUSTOMERS.walkSpeed)
  })

  it('a leaving group is recorded at the door and removed at the street end it came from', () => {
    for (const side of [-1, 1] as const) {
      const sim = restaurant()
      const g = spawnGroup(sim, { atDoor: true })
      g.side = side
      expect(g.state).toBe('toQueue')
      leaveAngry(sim, g, 'lineTooLong')
      const lostBefore = sim.world.economy.today.lost
      expect(lostBefore).toBe(0) // not recorded until it steps out
      let sawDeparting = false
      let lastX = g.pos.x
      for (let i = 0; i < 3000 && sim.world.groups[g.id]; i++) {
        sim.step()
        if (g.state === 'departing') {
          sawDeparting = true
          expect(sim.world.economy.today.lost).toBe(1)
          expect(g.pos.y).toBeGreaterThanOrEqual(STREET.laneY)
          lastX = g.pos.x
        }
      }
      expect(sawDeparting).toBe(true)
      expect(sim.world.groups[g.id]).toBeUndefined()
      // Last seen on the street within one step of the end for its side.
      const end = side < 0 ? -STREET.spawnDistance : MAXW + STREET.spawnDistance
      expect(Math.abs(lastX - end)).toBeLessThanOrEqual(
        CUSTOMERS.walkSpeed / TICKS_PER_SECOND + 1e-9,
      )
    }
  })

  it('closing waits for a customer still walking in', () => {
    const sim = restaurant()
    addStaff(sim, 'cashier')
    openIfPrep(sim)
    const g = spawnGroup(sim)
    sim.world.clock.phase = 'closing'
    for (let i = 0; i < 30; i++) sim.step()
    expect(sim.world.groups[g.id]).toBeDefined()
    expect(sim.world.clock.phase).toBe('closing')
  })

  it('groups that find nothing to order turn around at the door and still leave via the street', () => {
    const sim = makeSim({ arrivals: false }) // no objects, no stock: nothing orderable
    const g = spawnGroup(sim)
    for (let i = 0; i < 4000 && sim.world.groups[g.id]; i++) {
      sim.step()
      sim.drainEvents()
    }
    expect(sim.world.groups[g.id]).toBeUndefined()
    expect(sim.world.economy.today.lost).toBe(1)
    expect(sim.world.economy.today.complaints.nothingToOrder).toBe(1)
  })
})
