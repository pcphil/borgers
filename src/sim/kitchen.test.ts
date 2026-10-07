import { describe, expect, it } from 'vitest'
import { CUSTOMERS, TICKS_PER_SECOND } from '../data/balance'
import { queueSlots, spawnGroup } from './customers'
import { createOrder } from './kitchen'
import { isAvailable, unavailableReason } from './menu'
import { move, newAgent, setTarget } from './movement'
import { findPath } from './path'
import { addStaff, BASIC_OBJECTS, BASIC_STOCK, makeSim, stepUntil } from './testkit'
import type { PlacedObject, Staff } from './types'

const find = (sim: ReturnType<typeof makeSim>, def: string) =>
  Object.values(sim.world.objects).find((o) => o.def === def) as PlacedObject

describe('pathfinding (5.1)', () => {
  it('routes around objects', () => {
    const sim = makeSim({ objects: [{ def: 'table4', x: 4, y: 1 }] })
    const p = findPath(sim, { x: 3, y: 2 }, { x: 6, y: 2 }, false)
    expect(p).not.toBeNull()
    expect(p?.length).toBeGreaterThan(3)
    for (const t of p ?? []) expect(t.x >= 4 && t.x <= 5 && t.y >= 1 && t.y <= 2).toBe(false)
  })
  it('customers never path through kitchen tiles; staff may', () => {
    const sim = makeSim({ kitchenFromRow: 4 })
    const from = { x: 0, y: 3 }
    const to = { x: 11, y: 3 }
    const c = findPath(sim, from, to, true)
    expect(c?.every((t) => t.y < 4)).toBe(true)
    expect(findPath(sim, from, { x: 5, y: 6 }, true)).toBeNull()
    expect(findPath(sim, from, { x: 5, y: 6 }, false)).not.toBeNull()
  })
})

describe('re-pathing (5.2)', () => {
  it('re-paths when the layout changes and reports unreachable targets', () => {
    const sim = makeSim({ cash: 1_000_000 })
    const a = newAgent({ x: 0, y: 0 })
    setTarget(sim, a, { x: 11, y: 0 }, true)
    const block = a.path[4] as { x: number; y: number }
    expect(sim.dispatch({ type: 'place', def: 'bin', x: block.x, y: block.y, rot: 0 }).ok).toBe(
      true,
    )
    move(sim, a, 1, true)
    expect(a.path.some((t) => t.x === block.x && t.y === block.y)).toBe(false)
    expect(a.navFailed).toBe(false)
    // Enclose the target completely.
    sim.dispatch({ type: 'place', def: 'bin', x: 10, y: 0, rot: 0 })
    sim.dispatch({ type: 'place', def: 'bin', x: 11, y: 1, rot: 0 })
    expect(move(sim, a, 1, true)).toBe('failed')
  })
})

describe('movement (5.3)', () => {
  it('travel time matches distance / speed', () => {
    const sim = makeSim()
    const a = newAgent({ x: 0, y: 0 })
    setTarget(sim, a, { x: 10, y: 0 }, true)
    let n = 0
    while (move(sim, a, 2, true) !== 'arrived') n++
    expect(Math.abs(n + 1 - 10 * (TICKS_PER_SECOND / 2))).toBeLessThanOrEqual(1)
  })
  it('keeps previous position for interpolation', () => {
    const sim = makeSim()
    const a = newAgent({ x: 0, y: 0 })
    setTarget(sim, a, { x: 3, y: 0 }, true)
    move(sim, a, 2, true)
    expect(a.prev).toEqual({ x: 0, y: 0 })
    expect(a.pos.x).toBeCloseTo(0.1)
  })
})

describe('register queue (5.4)', () => {
  it('has slots extending from the register into the dining area', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const slots = queueSlots(sim, find(sim, 'register'))
    expect(slots[0]).toEqual({ x: 5, y: 4 })
    expect(slots.length).toBeLessThanOrEqual(CUSTOMERS.queueLength)
    expect(slots.map((s) => s.y)).toEqual([4, 3, 2, 1, 0])
  })
  it('line advances when the front group orders', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    addStaff(sim, 'cashier', { service: 1 })
    const a = spawnGroup(sim, { atDoor: true })
    const b = spawnGroup(sim, { atDoor: true })
    const reg = find(sim, 'register')
    expect(reg.queue).toEqual([a.id, b.id])
    stepUntil(sim, () => a.state === 'toWait' || a.state === 'waitingFood')
    expect(reg.queue[0]).toBe(b.id)
    stepUntil(sim, () => b.pos.x === 5 && b.pos.y === 4)
  })
  it('full line turns new customers away', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const reg = find(sim, 'register')
    const n = queueSlots(sim, reg).length
    for (let i = 0; i < n; i++) spawnGroup(sim, { atDoor: true })
    const late = spawnGroup(sim, { atDoor: true })
    expect(late.angry).toBe(true)
    expect(late.complaint).toBe('lineTooLong')
  })
})

describe('inventory (6.1, 6.2)', () => {
  it('consumes ingredients when the step starts, not when ordered', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const cook = addStaff(sim, 'cook', {}, { x: 3, y: 6 })
    const g = spawnGroup(sim, { atDoor: true })
    createOrder(sim, g.id, ['classic'], 600)
    expect(sim.world.inventory.stock.patty).toBe(40)
    expect(sim.world.inventory.reserved.patty).toBe(1)
    stepUntil(sim, () => cook.state === 'working')
    expect(sim.world.inventory.stock.patty).toBe(39)
    expect(sim.world.inventory.reserved.patty).toBe(0)
  })
  it('items needing an empty ingredient are unavailable', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: { ...BASIC_STOCK, patty: 0 } })
    expect(unavailableReason(sim.world, 'classic')).toBe('outOfStock')
    expect(isAvailable(sim.world, 'soda')).toBe(true)
  })
  it('nightly auto-reorder tops up to target (12 -> 50)', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: { patty: 12 } })
    sim.world.inventory.auto.patty = true
    sim.world.inventory.targets.patty = 50
    const cash = sim.world.economy.cash
    sim.settle()
    expect(sim.world.inventory.stock.patty).toBe(50)
    expect(sim.world.economy.history[0]?.costs.ingredients).toBe(38 * 80)
    expect(cash - sim.world.economy.cash).toBeGreaterThanOrEqual(38 * 80)
  })
  it('manual orders arrive next morning; deliveries are truncated to capacity and refunded', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: { bun: 290 } })
    expect(sim.dispatch({ type: 'manualOrder', ingredient: 'patty', qty: 20 }).ok).toBe(true)
    expect(sim.world.inventory.stock.patty).toBe(0)
    const cash = sim.world.economy.cash
    sim.settle()
    expect(sim.world.inventory.stock.patty).toBe(10)
    expect(sim.world.economy.cash).toBe(cash + 10 * 80 - 15_000)
  })
  it('a fridge raises capacity', async () => {
    const { capacity } = await import('./inventory')
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const before = capacity(sim.world)
    sim.dispatch({ type: 'place', def: 'fridge', x: 11, y: 8, rot: 0 })
    expect(capacity(sim.world)).toBe(before + 150)
  })
})

describe('menu (6.3)', () => {
  it('disabled items are not ordered; price is settable', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    sim.dispatch({ type: 'setMenu', item: 'soda', patch: { enabled: false } })
    expect(unavailableReason(sim.world, 'soda')).toBe('disabled')
    sim.dispatch({ type: 'setMenu', item: 'classic', patch: { price: 750 } })
    expect(sim.world.menu.classic.price).toBe(750)
    addStaff(sim, 'cashier')
    for (let i = 0; i < 20; i++) spawnGroup(sim, { atDoor: true })
    stepUntil(sim, () => Object.keys(sim.world.orders).length >= 3)
    for (const o of Object.values(sim.world.orders))
      expect(o.items.some((i) => i.menu === 'soda')).toBe(false)
  })
  it('missing station makes item unavailable', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: { potato: 10 }, stars: 2 })
    expect(unavailableReason(sim.world, 'fries')).toBe('noStation')
  })
})

describe('order pipeline (6.4, 6.6)', () => {
  it('Classic + Soda generates grill and soda steps, then assembly, then delivery', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const g = spawnGroup(sim, { atDoor: true })
    const o = createOrder(sim, g.id, ['classic', 'soda'], 800)
    const kinds = () =>
      Object.values(sim.world.tasks)
        .map((t) => `${t.kind}:${t.station ?? ''}:${t.role}`)
        .sort()
    expect(kinds()).toEqual(['step:grill:cook', 'step:soda:assembler'])
    const cook = addStaff(sim, 'cook', {}, { x: 3, y: 6 })
    stepUntil(sim, () => o.items[0]?.step === 1)
    expect(kinds()).toContain('step:assembly:assembler')
    expect(cook.state).not.toBe('working')
  })
  it('full flow: order taken -> cooked -> ready at pickup -> collected', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    addStaff(sim, 'cashier', { service: 1 })
    addStaff(sim, 'cook', { speed: 1 })
    addStaff(sim, 'assembler', { speed: 1 })
    const g = spawnGroup(sim, { atDoor: true })
    g.patience = { queue: 100_000, food: 100_000, seat: 100_000 }
    stepUntil(sim, () => g.orderId !== null)
    const order = sim.world.orders[g.orderId as number]
    expect(order).toBeDefined()
    stepUntil(sim, () => order?.state === 'ready')
    expect(find(sim, 'pickup').readyOrders).toContain(order?.id)
    stepUntil(sim, () => order?.state === 'collected')
    expect(find(sim, 'pickup').readyOrders).not.toContain(order?.id)
    expect(g.angry).toBe(false)
  })
})

describe('stations (6.5, 6.7)', () => {
  it('grill capacity limits concurrent steps', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const g = spawnGroup(sim, { atDoor: true })
    createOrder(sim, g.id, ['classic', 'classic', 'classic'], 1800)
    const cooks = [0, 1, 2].map(() => addStaff(sim, 'cook', {}, { x: 3, y: 6 }))
    for (let i = 0; i < 3; i++) sim.step()
    const grill = find(sim, 'grill')
    expect(grill.slots.filter((s) => s !== null)).toHaveLength(2)
    expect(cooks.filter((c) => c.taskId === null)).toHaveLength(1)
  })
  it('skilled cook on tier-2 grill makes better food', () => {
    const quality = (cooking: number, tier: 0 | 1) => {
      const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
      find(sim, 'grill').tier = tier
      addStaff(sim, 'cook', { cooking }, { x: 3, y: 6 })
      addStaff(sim, 'assembler', { cooking }, { x: 5, y: 7 })
      const g = spawnGroup(sim, { atDoor: true })
      const o = createOrder(sim, g.id, ['classic'], 600)
      stepUntil(sim, () => o.state === 'delivering' || o.state === 'ready')
      return o.quality
    }
    expect(quality(1, 1)).toBeGreaterThan(quality(0.1, 0))
  })
  it('upgrade in place keeps position and needs the unlock', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const grill = find(sim, 'grill')
    expect(sim.dispatch({ type: 'upgrade', id: grill.id })).toEqual({ ok: false, reason: 'locked' })
    sim.world.stars = 3
    expect(sim.dispatch({ type: 'upgrade', id: grill.id }).ok).toBe(true)
    expect(grill.tier).toBe(1)
    expect(grill.slots).toHaveLength(3)
    expect([grill.x, grill.y, grill.rot]).toEqual([2, 8, 0])
  })
  it('selling a grill mid-cook refunds the patty and requeues the step', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const cook = addStaff(sim, 'cook', {}, { x: 3, y: 6 }) as Staff
    const g = spawnGroup(sim, { atDoor: true })
    const o = createOrder(sim, g.id, ['classic'], 600)
    stepUntil(sim, () => cook.state === 'working')
    expect(sim.world.inventory.stock.patty).toBe(39)
    sim.dispatch({ type: 'sell', id: find(sim, 'grill').id })
    expect(sim.world.inventory.stock.patty).toBe(40)
    expect(sim.world.inventory.reserved.patty).toBe(1)
    const t = Object.values(sim.world.tasks).find((x) => x.orderId === o.id)
    expect(t?.claimedBy).toBeNull()
    expect(t?.station).toBe('grill')
    expect(cook.state).toBe('idle')
  })
})
