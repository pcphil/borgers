import { describe, expect, it } from 'vitest'
import { spawnGroup } from './customers'
import type { Sim } from './sim'
import { BASIC_STOCK, checkInvariants, makeSim, stepUntil } from './testkit'
import type { Group, PlacedObject } from './types'

/** A register, a working kitchen (so groups do not give up at the door) and one 4-seat table. */
const KITCHEN = [
  { def: 'register', x: 8, y: 5 },
  { def: 'grill', x: 2, y: 8 },
  { def: 'assembly', x: 5, y: 8 },
  { def: 'soda', x: 8, y: 8 },
] as const
const room = () =>
  makeSim({ objects: [...KITCHEN, { def: 'table4', x: 1, y: 1 }], stock: BASIC_STOCK })

/** A dine-in group that has its food and is looking for a seat. */
function seeker(sim: Sim, size: number, seatPatience = 100_000): Group {
  const g = spawnGroup(sim, { atDoor: true })
  const reg = Object.values(sim.world.objects).find((o) => o.def === 'register') as PlacedObject
  reg.queue = []
  g.registerId = null
  g.size = size
  g.takeout = false
  g.patience = { queue: 100_000, food: 100_000, seat: seatPatience }
  g.state = 'seeking'
  g.timer = 0
  return g
}

const table = (sim: Sim) =>
  Object.values(sim.world.objects).find((o) => o.def === 'table4') as PlacedObject
const cleanTasks = (sim: Sim) =>
  Object.values(sim.world.tasks).filter((t) => t.kind === 'clean' && t.tableId !== null)

describe('chair-level seating', () => {
  it('two solo diners share one 4-seat table', () => {
    const sim = room()
    const a = seeker(sim, 1)
    const b = seeker(sim, 1)
    stepUntil(sim, () => a.state === 'eating' && b.state === 'eating', 600)
    expect(a.tableId).toBe(table(sim).id)
    expect(b.tableId).toBe(table(sim).id)
    expect(a.seatIdx).not.toEqual(b.seatIdx)
    checkInvariants(sim)
  })

  it('a pair never sits with a solo diner', () => {
    const sim = room()
    const solo = seeker(sim, 1)
    stepUntil(sim, () => solo.state === 'eating', 600)
    const pair = seeker(sim, 2)
    for (let i = 0; i < 400; i++) sim.step()
    expect(pair.state).toBe('seeking')
    expect(pair.tableId).toBeNull()
  })

  it('a pair keeps the whole table: a solo cannot take either spare chair', () => {
    const sim = room()
    const pair = seeker(sim, 2)
    stepUntil(sim, () => pair.state === 'eating', 600)
    const solo = seeker(sim, 1)
    for (let i = 0; i < 400; i++) sim.step()
    expect(solo.state).toBe('seeking')
    expect(solo.tableId).toBeNull()
  })

  it('a freed chair is reusable while the other diner keeps eating', () => {
    const sim = room()
    const a = seeker(sim, 1)
    const b = seeker(sim, 1)
    stepUntil(sim, () => a.state === 'eating' && b.state === 'eating', 600)
    a.eatTicks = 1
    b.eatTicks = 100_000
    const c = seeker(sim, 1)
    stepUntil(sim, () => c.state === 'eating', 600)
    expect(b.state).toBe('eating')
    expect(c.tableId).toBe(table(sim).id)
    expect(table(sim).dirty).toBe(false)
  })

  it('a shared table turns dirty once, only after the last diner leaves', () => {
    const sim = room()
    const a = seeker(sim, 1)
    const b = seeker(sim, 1)
    stepUntil(sim, () => a.state === 'eating' && b.state === 'eating', 600)
    a.eatTicks = 1
    b.eatTicks = 400
    stepUntil(sim, () => a.state === 'leaving', 600)
    expect(table(sim).dirty).toBe(false)
    expect(cleanTasks(sim)).toHaveLength(0)
    stepUntil(sim, () => b.state === 'leaving', 1200)
    expect(table(sim).dirty).toBe(true)
    expect(cleanTasks(sim)).toHaveLength(1)
  })
})

describe('selling or moving a shared table', () => {
  it('releases every diner and leaves no stale chair or cleaning task', () => {
    for (const how of ['sell', 'move'] as const) {
      const sim = room()
      const a = seeker(sim, 1)
      const b = seeker(sim, 1)
      stepUntil(sim, () => a.state === 'eating' && b.state === 'eating', 600)
      const t = table(sim)
      const r =
        how === 'sell'
          ? sim.dispatch({ type: 'sell', id: t.id })
          : sim.dispatch({ type: 'move', id: t.id, x: 5, y: 1, rot: 0 })
      expect(r.ok, how).toBe(true)
      for (const g of [a, b]) {
        expect(g.tableId, how).toBeNull()
        expect(g.seatIdx, how).toEqual([])
        expect(g.state, how).toBe('leaving')
      }
      if (how === 'move') expect(table(sim).seatOccupants.every((id) => id === null)).toBe(true)
      expect(cleanTasks(sim), how).toHaveLength(0)
      for (let i = 0; i < 200; i++) sim.step()
      checkInvariants(sim)
    }
  })
})

describe('no seat means takeout', () => {
  it('a dine-in group with no seat becomes takeout, is served, and records no complaint', () => {
    const sim = makeSim({ objects: [...KITCHEN], stock: BASIC_STOCK })
    const g = seeker(sim, 2, 40)
    stepUntil(sim, () => g.state === 'leaving', 600)
    expect(g.takeout).toBe(true)
    expect(g.angry).toBe(false)
    expect(g.complaint).toBeNull()
    stepUntil(sim, () => !sim.world.groups[g.id], 3000)
    expect(sim.world.economy.today.served).toBe(1)
    expect(sim.world.economy.today.lost).toBe(0)
    expect(sim.world.economy.today.complaints.noSeats ?? 0).toBe(0)
    expect(g.satisfaction).toBeGreaterThan(50)
  })
})
