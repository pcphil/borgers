import { describe, expect, it } from 'vitest'
import { LOT } from '../data/balance'
import { CATALOGUE, OBJECT_IDS } from '../data/catalogue'
import { INGREDIENTS, MENU, MENU_ITEM_IDS } from '../data/recipes'
import { STARTER } from '../data/starterLayout'
import { ROLES, requiredStars, UNLOCKS } from '../data/unlocks'
import { accessTiles, footprintTiles } from './geometry'
import { checkPlace, objectList, validateObjects, zoneAt } from './layout'
import { addStaff, BASIC_OBJECTS, makeSim } from './testkit'
import { ZONE_DINING, ZONE_KITCHEN } from './types'
import { newGame } from './world'

describe('data (3.1–3.4)', () => {
  it('every catalogue entry has a valid footprint; usable objects have access tiles', () => {
    for (const id of OBJECT_IDS) {
      const d = CATALOGUE[id]
      expect(d.w).toBeGreaterThan(0)
      expect(d.h).toBeGreaterThan(0)
      expect(d.tiers.length).toBeGreaterThan(0)
      const usable = d.station || d.seats || d.category === 'counter' || id === 'fridge'
      if (usable) expect(d.access.length).toBeGreaterThan(0)
      for (const a of d.access) {
        const inside = a.dx >= 0 && a.dx < d.w && a.dy >= 0 && a.dy < d.h
        expect(inside).toBe(false)
      }
    }
  })
  it('every recipe step references an existing station and ingredients', () => {
    const stations = new Set(OBJECT_IDS.map((id) => CATALOGUE[id].station).filter(Boolean))
    for (const id of MENU_ITEM_IDS) {
      expect(MENU[id].steps.length).toBeGreaterThan(0)
      for (const s of MENU[id].steps) {
        expect(stations.has(s.station)).toBe(true)
        for (const i of Object.keys(s.consumes)) expect(INGREDIENTS).toContain(i)
      }
    }
  })
  it('every object, menu item, role and tier-2 is covered by exactly one unlock tier', () => {
    const counts = new Map<string, number>()
    for (const list of Object.values(UNLOCKS))
      for (const u of list) {
        const k = JSON.stringify(u)
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
    for (const n of counts.values()) expect(n).toBe(1)
    for (const id of OBJECT_IDS) expect(requiredStars({ kind: 'object', id })).toBeDefined()
    for (const id of MENU_ITEM_IDS) expect(requiredStars({ kind: 'menu', id })).toBeDefined()
    for (const id of ROLES) expect(requiredStars({ kind: 'role', id })).toBeDefined()
    for (const id of OBJECT_IDS) {
      const st = CATALOGUE[id].station
      if (st && CATALOGUE[id].tiers[1])
        expect(requiredStars({ kind: 'tier2', station: st })).toBeDefined()
    }
    expect(requiredStars({ kind: 'expansion' })).toBe(4)
  })
  it('starter layout is valid and has the spec objects, with no staff', () => {
    const sim = newGame(1)
    expect(validateObjects(sim.world, objectList(sim.world))).toBeNull()
    const defs = new Set(STARTER.objects.map((o) => o.def))
    for (const d of ['grill', 'assembly', 'soda', 'register', 'pickup', 'fridge', 'table2'])
      expect(defs.has(d as never)).toBe(true)
    expect(Object.keys(sim.world.staff)).toHaveLength(0)
  })
})

describe('grid and zones (4.1)', () => {
  it('lot has initial bounds and an entrance on the dining side', () => {
    const sim = makeSim()
    expect(sim.world.layout.w).toBe(LOT.initial.w)
    expect(sim.world.layout.h).toBe(LOT.initial.h)
    expect(zoneAt(sim.world, LOT.entranceX, 0)).toBe(ZONE_DINING)
    expect(zoneAt(sim.world, 0, 9)).toBe(ZONE_KITCHEN)
  })
  it('rotation keeps footprint size and moves access tiles around the object', () => {
    for (const rot of [0, 1, 2, 3] as const) {
      const p = { def: 'grill' as const, x: 4, y: 4, rot }
      expect(footprintTiles(p)).toHaveLength(2)
      for (const a of accessTiles(p))
        expect(footprintTiles(p).some((t) => t.x === a.x && t.y === a.y)).toBe(false)
    }
  })
})

describe('placement validation (4.2)', () => {
  const base = () => makeSim({ objects: BASIC_OBJECTS })
  const cases: [string, Parameters<typeof checkPlace>[1], string | null][] = [
    ['valid grill', { def: 'grill', x: 2, y: 6, rot: 2 }, null],
    ['out of bounds', { def: 'grill', x: 11, y: 8, rot: 0 }, 'outOfBounds'],
    ['overlap', { def: 'table2', x: 8, y: 2, rot: 0 }, 'overlap'],
    ['entrance', { def: 'table2', x: 2, y: 0, rot: 2 }, 'blocksEntrance'],
    ['kitchen station on dining', { def: 'grill', x: 6, y: 1, rot: 0 }, 'wrongZone'],
    ['table on kitchen', { def: 'table2', x: 0, y: 7, rot: 0 }, 'wrongZone'],
    ['blocks register access', { def: 'table2', x: 5, y: 4, rot: 0 }, 'accessBlocked'],
    ['locked object', { def: 'fryer', x: 0, y: 8, rot: 0 }, 'locked'],
  ]
  for (const [name, p, err] of cases) {
    it(name, () => expect(checkPlace(base().world, p)).toBe(err))
  }
  it('insufficient funds', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, cash: 100 })
    expect(checkPlace(sim.world, { def: 'grill', x: 2, y: 6, rot: 2 })).toBe('insufficientFunds')
  })
  it('purchases blocked while in debt', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, cash: -1 })
    expect(checkPlace(sim.world, { def: 'bin', x: 11, y: 0, rot: 0 })).toBe('insufficientFunds')
  })
  it('cutting off an object from the entrance is rejected', () => {
    // Wall off the 2-seat table at (8,2) with a ring of bins.
    const sim = makeSim({
      objects: [
        { def: 'table2', x: 8, y: 2 },
        { def: 'bin', x: 7, y: 1 },
        { def: 'bin', x: 10, y: 1 },
        { def: 'bin', x: 8, y: 0 },
      ],
    })
    expect(checkPlace(sim.world, { def: 'bin', x: 9, y: 0, rot: 0 })).toBe('accessUnreachable')
  })
  it('register must straddle the kitchen boundary', () => {
    const sim = makeSim()
    expect(checkPlace(sim.world, { def: 'register', x: 5, y: 5, rot: 0 })).toBeNull()
    expect(checkPlace(sim.world, { def: 'register', x: 5, y: 3, rot: 0 })).toBe('wrongZone')
  })
})

describe('place / move / sell (4.3)', () => {
  it('place deducts cost and bumps layout version', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const cash = sim.world.economy.cash
    const v = sim.world.layout.version
    const r = sim.dispatch({ type: 'place', def: 'bin', x: 11, y: 0, rot: 0 })
    expect(r.ok).toBe(true)
    expect(sim.world.economy.cash).toBe(cash - CATALOGUE.bin.tiers[0]!.cost)
    expect(sim.world.layout.version).toBe(v + 1)
  })
  it('move is free and validated', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const table = Object.values(sim.world.objects).find((o) => o.def === 'table2')!
    const cash = sim.world.economy.cash
    expect(sim.dispatch({ type: 'move', id: table.id, x: 10, y: 4, rot: 0 }).ok).toBe(true)
    expect(sim.world.economy.cash).toBe(cash)
    expect(sim.dispatch({ type: 'move', id: table.id, x: 0, y: 8, rot: 0 }).ok).toBe(false)
  })
  it('sell refunds half the purchase price', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const grill = Object.values(sim.world.objects).find((o) => o.def === 'grill')!
    const cash = sim.world.economy.cash
    expect(sim.dispatch({ type: 'sell', id: grill.id }).ok).toBe(true)
    expect(sim.world.economy.cash).toBe(cash + CATALOGUE.grill.tiers[0]!.cost / 2)
    expect(sim.world.objects[grill.id]).toBeUndefined()
  })
  it('placing on an agent re-paths it off the tile', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const s = addStaff(sim, 'cook', {}, { x: 10, y: 4 })
    sim.dispatch({ type: 'place', def: 'bin', x: 10, y: 4, rot: 0 })
    for (let i = 0; i < 5; i++) sim.step()
    expect(s.pos.x === 10 && s.pos.y === 4).toBe(false)
  })
})

describe('zone painting (4.4)', () => {
  it('paints free tiles and rejects tiles under incompatible objects', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    expect(sim.dispatch({ type: 'paint', tiles: [{ x: 11, y: 3 }], zone: ZONE_KITCHEN }).ok).toBe(
      true,
    )
    expect(zoneAt(sim.world, 11, 3)).toBe(ZONE_KITCHEN)
    const r = sim.dispatch({ type: 'paint', tiles: [{ x: 2, y: 8 }], zone: ZONE_DINING })
    expect(r.ok).toBe(false)
    expect(zoneAt(sim.world, 2, 8)).toBe(ZONE_KITCHEN)
  })
  it('cannot repaint a register customer access tile to kitchen', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    expect(sim.dispatch({ type: 'paint', tiles: [{ x: 5, y: 4 }], zone: ZONE_KITCHEN }).ok).toBe(
      false,
    )
  })
})

describe('lot expansion (4.5)', () => {
  it('requires 4 stars, grows bounds once', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, cash: 2_000_000 })
    expect(sim.dispatch({ type: 'expand' })).toEqual({ ok: false, reason: 'locked' })
    sim.world.stars = 4
    expect(sim.dispatch({ type: 'expand' }).ok).toBe(true)
    expect(sim.world.layout.w).toBe(LOT.expanded.w)
    expect(sim.world.layout.h).toBe(LOT.expanded.h)
    expect(sim.dispatch({ type: 'expand' })).toEqual({ ok: false, reason: 'alreadyExpanded' })
    expect(checkPlace(sim.world, { def: 'table2', x: 14, y: 2, rot: 0 })).toBeNull()
  })
})
