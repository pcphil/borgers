import { describe, expect, it } from 'vitest'
import { NIGHT_TICKS, OPEN_SECONDS, OPEN_TICKS, TICKS_PER_SECOND } from '../data/balance'
import { hashWorld } from './hash'
import { nextU32, rand, seedRng } from './rng'
import { runDays, runTicks } from './runner'
import { addStaff, BASIC_OBJECTS, BASIC_STOCK, makeSim } from './testkit'
import type { SimEvent } from './types'
import { newGame } from './world'

describe('rng (2.1)', () => {
  it('same seed gives same sequence', () => {
    const a = seedRng(7)
    const b = seedRng(7)
    for (let i = 0; i < 100; i++) expect(nextU32(a)).toBe(nextU32(b))
  })
  it('different seeds differ', () => {
    expect(rand(seedRng(1))).not.toBe(rand(seedRng(2)))
  })
  it('state round-trips through JSON', () => {
    const a = seedRng(9)
    rand(a)
    const b = JSON.parse(JSON.stringify(a))
    for (let i = 0; i < 20; i++) expect(rand(a)).toBe(rand(b))
  })
})

describe('world and commands (2.2)', () => {
  it('ids are monotonic and objects iterate in id order', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const ids = Object.values(sim.world.objects).map((o) => o.id)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
    const before = sim.world.nextId
    expect(sim.newId()).toBe(before)
    expect(sim.newId()).toBe(before + 1)
  })
  it('rejects invalid commands without changing state', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const h = hashWorld(sim.world)
    expect(sim.dispatch({ type: 'sell', id: 9999 }).ok).toBe(false)
    expect(sim.dispatch({ type: 'place', def: 'fryer', x: 0, y: 8, rot: 0 })).toEqual({
      ok: false,
      reason: 'locked',
    })
    expect(hashWorld(sim.world)).toBe(h)
  })
  it('applies commands immediately between ticks (works while paused)', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const cash = sim.world.economy.cash
    const t = sim.world.clock.totalTicks
    const r = sim.dispatch({ type: 'place', def: 'table2', x: 10, y: 4, rot: 0 })
    expect(r.ok).toBe(true)
    expect(sim.world.economy.cash).toBe(cash - 15_000)
    expect(sim.world.clock.totalTicks).toBe(t)
  })
})

describe('determinism (2.3)', () => {
  const play = () => {
    const sim = newGame(1234)
    for (const c of [...sim.world.candidates]) sim.dispatch({ type: 'hire', candidateId: c.id })
    runDays(sim, 3)
    return hashWorld(sim.world)
  }
  it('same seed and inputs produce identical state after 3 days', () => {
    expect(play()).toBe(play())
  })
  it('different seeds diverge', () => {
    const a = newGame(1)
    const b = newGame(2)
    runTicks(a, 2000)
    runTicks(b, 2000)
    expect(hashWorld(a.world)).not.toBe(hashWorld(b.world))
  })
})

describe('clock (2.4)', () => {
  it('open period lasts ~4 real minutes at 1x', () => {
    expect(OPEN_TICKS / TICKS_PER_SECOND).toBe(OPEN_SECONDS)
    expect(OPEN_SECONDS).toBe(240)
  })
  it('reaches closing at 22:00 and stops arrivals', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK, arrivals: true })
    runTicks(sim, OPEN_TICKS)
    expect(sim.world.clock.phase).toBe('closing')
    const before = sim.world.nextId
    // No new groups should spawn during closing.
    const ids = new Set(Object.keys(sim.world.groups))
    for (let i = 0; i < 400 && sim.world.clock.phase === 'closing'; i++) {
      sim.step()
      for (const id of Object.keys(sim.world.groups)) expect(ids.has(id)).toBe(true)
    }
    expect(sim.world.nextId).toBeGreaterThanOrEqual(before)
  })
  it('night lasts NIGHT_TICKS and starts the next day at 10:00', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    while (sim.world.clock.phase !== 'night') sim.step()
    let n = 0
    while (sim.world.clock.phase === 'night') {
      sim.step()
      n++
    }
    expect(n).toBe(NIGHT_TICKS)
    expect(sim.world.clock.day).toBe(2)
    expect(sim.world.clock.tick).toBe(0)
  })
})

describe('night settlement (2.5)', () => {
  it('runs in spec order and records a day summary', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    addStaff(sim, 'cook')
    sim.world.inventory.auto.patty = true
    sim.world.inventory.targets.patty = 80
    sim.dispatch({ type: 'takeLoan' })
    // Staff count as employed once the day starts.
    for (const s of Object.values(sim.world.staff)) s.employedAtOpen = true
    const events: SimEvent[] = []
    while (sim.world.clock.phase !== 'night') {
      sim.step()
      events.push(...sim.drainEvents())
    }
    events.push(...sim.drainEvents())
    const day = sim.world.economy.history[0]
    expect(day).toBeDefined()
    expect(day?.costs.wages).toBe(6000)
    expect(day?.costs.rent).toBe(15_000)
    expect(day?.costs.interest).toBe(5_000)
    expect(day?.costs.ingredients).toBe(40 * 80)
    expect(sim.world.inventory.stock.patty).toBe(80)
    const order = events
      .filter((e) => ['starGained', 'autosave', 'dayEnded'].includes(e.type))
      .map((e) => e.type)
    expect(order).toEqual(['autosave', 'dayEnded'])
    expect(sim.world.candidates).toHaveLength(3)
  })
})
