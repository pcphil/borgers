import { describe, expect, it } from 'vitest'
import { ECONOMY, OPEN_TICKS, REPUTATION, STARS, TICKS_PER_HOUR } from '../data/balance'
import { arrivalRate, satisfaction, spawnGroup } from './customers'
import { computeHints } from './hints'
import { createOrder, newTask } from './kitchen'
import { computeReputation } from './reputation'
import { runDays } from './runner'
import { addStaff, BASIC_OBJECTS, BASIC_STOCK, makeSim, stepUntil } from './testkit'
import type { Group, PlacedObject } from './types'

const find = (sim: ReturnType<typeof makeSim>, def: string) =>
  Object.values(sim.world.objects).find((o) => o.def === def) as PlacedObject

describe('candidates (7.1)', () => {
  it('3 candidates, deterministic per seed, refreshed at night', () => {
    const a = makeSim({ seed: 5 })
    const b = makeSim({ seed: 5 })
    expect(a.world.candidates).toHaveLength(3)
    expect(a.world.candidates).toEqual(b.world.candidates)
    const before = a.world.candidates.map((c) => c.id)
    a.settle()
    expect(a.world.candidates.map((c) => c.id)).not.toEqual(before)
    for (const c of a.world.candidates) {
      expect(c.stats.cooking).toBeGreaterThanOrEqual(0.1)
      expect(c.wage).toBeGreaterThan(0)
    }
  })
  it('wage ask rises with stats', () => {
    const sim = makeSim({ seed: 3 })
    for (let i = 0; i < 10; i++) sim.settle()
    const all = sim.world.candidates
    const avg = (c: (typeof all)[0]) => c.stats.cooking + c.stats.speed + c.stats.service
    const sorted = [...all].sort((x, y) => avg(x) - avg(y))
    expect(sorted.at(-1)?.wage).toBeGreaterThanOrEqual(sorted[0]?.wage ?? 0)
  })
})

describe('hire / fire / wages (7.2)', () => {
  it('hiring removes candidate and spawns staff at entrance', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const c = sim.world.candidates[0]!
    const r = sim.dispatch({ type: 'hire', candidateId: c.id })
    expect(r.ok).toBe(true)
    expect(sim.world.candidates.find((x) => x.id === c.id)).toBeUndefined()
    expect(sim.world.staff[c.id]?.pos).toEqual({ x: 2, y: 0 })
  })
  it('firing mid-grill returns the step to the queue (ingredients kept) and the cook walks out', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const cook = addStaff(sim, 'cook', {}, { x: 3, y: 6 })
    const g = spawnGroup(sim)
    const o = createOrder(sim, g.id, ['classic'], 600)
    stepUntil(sim, () => cook.state === 'working')
    sim.dispatch({ type: 'fire', staffId: cook.id })
    const t = Object.values(sim.world.tasks).find((x) => x.orderId === o.id)
    expect(t?.claimedBy).toBeNull()
    expect(t?.consumed).toBe(true)
    expect(sim.world.inventory.stock.patty).toBe(39)
    stepUntil(sim, () => sim.world.staff[cook.id] === undefined)
  })
  it('wages charged at night for staff employed at opening', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const s = addStaff(sim, 'cook')
    s.wage = 6000
    s.employedAtOpen = true
    sim.settle()
    expect(sim.world.economy.history[0]?.costs.wages).toBe(6000)
  })
})

describe('roles and task selection (7.3)', () => {
  it('cleaner role is locked at 1 star', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const s = addStaff(sim, 'cook')
    expect(sim.dispatch({ type: 'setRole', staffId: s.id, role: 'cleaner' }).ok).toBe(false)
    sim.world.stars = 2
    expect(sim.dispatch({ type: 'setRole', staffId: s.id, role: 'cleaner' }).ok).toBe(true)
  })
  it('reassigning a cook to cashier: finishes step, then goes to register', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const cook = addStaff(sim, 'cook', {}, { x: 3, y: 6 })
    const g = spawnGroup(sim)
    const o = createOrder(sim, g.id, ['classic'], 600)
    stepUntil(sim, () => cook.state === 'working')
    sim.dispatch({ type: 'setRole', staffId: cook.id, role: 'cashier' })
    expect(cook.role).toBe('cook')
    stepUntil(sim, () => o.items[0]?.step === 1)
    stepUntil(sim, () => cook.role === 'cashier' && find(sim, 'register').cashierId === cook.id)
  })
  it('cook picks the nearer of two free grills', () => {
    const sim = makeSim({
      objects: [...(BASIC_OBJECTS ?? []), { def: 'grill', x: 0, y: 6, rot: 1 }],
      stock: BASIC_STOCK,
    })
    const far = find(sim, 'grill')
    const near = Object.values(sim.world.objects).filter((o) => o.def === 'grill')[1]!
    const cook = addStaff(sim, 'cook', {}, { x: 1, y: 5 })
    const g = spawnGroup(sim)
    createOrder(sim, g.id, ['classic'], 600)
    sim.step()
    expect(cook.stationId).toBe(near.id)
    expect(cook.stationId).not.toBe(far.id)
  })
  it('no cashier -> no orders taken and a hint', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const g = spawnGroup(sim)
    for (let i = 0; i < 200; i++) sim.step()
    expect(g.orderId).toBeNull()
    expect(computeHints(sim.world).map((h) => h.id)).toContain('no-cashier')
  })
})

describe('cleaning fallback (7.4)', () => {
  it('at 1 star an idle assembler cleans a dirty table', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const asm = addStaff(sim, 'assembler', {}, { x: 6, y: 7 })
    const table = find(sim, 'table2')
    table.dirty = true
    newTask(sim, { role: 'cleaner', kind: 'clean', tableId: table.id })
    stepUntil(sim, () => !table.dirty)
    expect(asm.role).toBe('assembler')
  })
})

describe('arrivals (8.1)', () => {
  const avgRate = (rep: number, fromHour: number, toHour: number) => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    sim.world.reputation.value = rep
    let sum = 0
    let n = 0
    for (let t = (fromHour - 10) * TICKS_PER_HOUR; t < (toHour - 10) * TICKS_PER_HOUR; t += 10) {
      sim.world.clock.tick = t
      sum += arrivalRate(sim.world)
      n++
    }
    return sum / n
  }
  it('lunch rush is busier than mid-afternoon', () => {
    expect(avgRate(50, 12, 13.5)).toBeGreaterThan(avgRate(50, 15, 16.5) * 1.5)
  })
  it('higher reputation brings more customers', () => {
    expect(avgRate(80, 10, 22)).toBeGreaterThan(avgRate(30, 10, 22))
  })
  it('cheap prices attract more, expensive fewer', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    sim.world.clock.tick = 2 * TICKS_PER_HOUR
    const fair = arrivalRate(sim.world)
    sim.dispatch({ type: 'setMenu', item: 'classic', patch: { price: 1200 } })
    sim.dispatch({ type: 'setMenu', item: 'soda', patch: { price: 400 } })
    expect(arrivalRate(sim.world)).toBeLessThan(fair)
  })
  it('groups are 1-4 people and simulated arrivals happen', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK, arrivals: true })
    const sizes = new Set<number>()
    for (let i = 0; i < OPEN_TICKS / 2; i++) {
      sim.step()
      for (const g of Object.values(sim.world.groups)) sizes.add(g.size)
    }
    expect(sizes.size).toBeGreaterThan(1)
    for (const s of sizes) expect(s >= 1 && s <= 4).toBe(true)
  })
})

describe('customer exits (8.2, 8.4)', () => {
  const kitchenless = () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    addStaff(sim, 'cashier', { service: 1 })
    return sim
  }
  it('waits too long for food -> leaves angry, order cancelled, reservations released', () => {
    const sim = kitchenless()
    const g = spawnGroup(sim)
    stepUntil(sim, () => g.orderId !== null)
    const orderId = g.orderId as number
    stepUntil(sim, () => g.state === 'leaving')
    expect(g.complaint).toBe('waitedTooLong')
    expect(sim.world.orders[orderId]?.state).toBe('cancelled')
    expect(sim.world.inventory.reserved.patty).toBe(0)
  })
  it('paid before leaving: no refund', () => {
    const sim = kitchenless()
    const g = spawnGroup(sim)
    stepUntil(sim, () => g.orderId !== null)
    const cash = sim.world.economy.cash
    stepUntil(sim, () => g.state === 'leaving')
    expect(sim.world.economy.cash).toBe(cash)
  })
  it('queue patience expiry -> leaves', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const g = spawnGroup(sim)
    stepUntil(sim, () => g.state === 'leaving')
    expect(g.complaint).toBe('lineTooLong')
    stepUntil(sim, () => sim.world.groups[g.id] === undefined)
    expect(sim.world.economy.today.lost).toBe(1)
  })
  it('group of 3 needs a 4-seat table', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const g = spawnGroup(sim)
    g.size = 3
    g.takeout = false
    g.state = 'seeking'
    g.pos = { x: 6, y: 3 }
    sim.step()
    const t = sim.world.objects[g.tableId as number]
    expect(t?.def).toBe('table4')
  })
  it('no seat before patience -> leaves with noSeats', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    for (const o of Object.values(sim.world.objects)) if (o.def.startsWith('table')) o.occupiedBy = 999
    const g = spawnGroup(sim)
    g.takeout = false
    g.state = 'seeking'
    g.timer = 0
    stepUntil(sim, () => g.state === 'leaving')
    expect(g.complaint).toBe('noSeats')
  })
  it('payment happens at order time', () => {
    const sim = kitchenless()
    const g = spawnGroup(sim)
    const cash = sim.world.economy.cash
    stepUntil(sim, () => g.orderId !== null)
    const order = sim.world.orders[g.orderId as number]
    expect(sim.world.economy.cash).toBe(cash + (order?.price ?? 0))
  })
})

describe('ordering choice (8.3)', () => {
  it('overpriced items are ordered less often', () => {
    const count = (price: number) => {
      const sim = makeSim({ objects: BASIC_OBJECTS, stock: { ...BASIC_STOCK, patty: 200, bun: 200 } })
      sim.world.stars = 3
      sim.dispatch({ type: 'setMenu', item: 'cheese', patch: { price } })
      addStaff(sim, 'cashier', { service: 1 })
      let cheese = 0
      for (let i = 0; i < 30; i++) {
        const g = spawnGroup(sim)
        g.patience.queue = 1_000_000
        stepUntil(sim, () => g.orderId !== null || g.angry)
        const o = g.orderId !== null ? sim.world.orders[g.orderId] : undefined
        cheese += o?.items.filter((x) => x.menu === 'cheese').length ?? 0
        g.state = 'leaving'
      }
      return cheese
    }
    expect(count(2000)).toBeLessThan(count(750))
  })
})

describe('dirt, trash, cleaning (8.5)', () => {
  it('table becomes dirty after eating; bin nearby suppresses trash', () => {
    const run = (withBin: boolean) => {
      const objs = [...(BASIC_OBJECTS ?? [])]
      if (withBin) objs.push({ def: 'bin', x: 10, y: 3 })
      let trash = 0
      for (let seed = 1; seed <= 15; seed++) {
        const sim = makeSim({ seed, objects: objs })
        const g = spawnGroup(sim)
        g.size = 2
        g.takeout = false
        g.state = 'seeking'
        g.pos = { x: 9, y: 1 }
        stepUntil(sim, () => g.state === 'leaving')
        expect(find(sim, 'table2').dirty || find(sim, 'table4').dirty).toBe(true)
        trash += Object.keys(sim.world.trash).length
      }
      return trash
    }
    expect(run(true)).toBe(0)
    expect(run(false)).toBeGreaterThan(0)
  })
  it('dirty tables are not used until cleaned', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    for (const o of Object.values(sim.world.objects)) if (o.def.startsWith('table')) o.dirty = true
    const g = spawnGroup(sim)
    g.takeout = false
    g.state = 'seeking'
    sim.step()
    expect(g.tableId).toBeNull()
    expect(g.complaint).toBe('dirty')
  })
  it('cleaner cleans dirty table', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stars: 2 })
    addStaff(sim, 'cleaner')
    const g = spawnGroup(sim)
    g.size = 2
    g.takeout = false
    g.state = 'seeking'
    stepUntil(sim, () => g.state === 'leaving')
    stepUntil(sim, () => Object.values(sim.world.objects).every((o) => !o.dirty))
  })
})

describe('satisfaction and reputation (8.6)', () => {
  it('fast fair clean visit scores high; angry scores low', () => {
    const sim = makeSim()
    const g = { ...spawnGroup(sim) } as Group
    g.takeout = true
    g.queueWait = 0
    g.foodWait = 0
    g.angry = false
    g.complaint = null
    const id = sim.newId()
    sim.world.orders[id] = {
      id,
      groupId: g.id,
      items: [{ menu: 'classic', step: 2, done: true, qualitySum: 2, taskId: null }],
      state: 'collected',
      createdTick: 0,
      pickupId: null,
      price: 600,
      quality: 0.9,
    }
    g.orderId = id
    expect(satisfaction(sim.world, g)).toBeGreaterThan(85)
    g.angry = true
    expect(satisfaction(sim.world, g)).toBe(REPUTATION.angryScore)
  })
  it('reputation is a rolling average that drops after bad service', () => {
    expect(computeReputation([])).toBe(REPUTATION.neutral)
    const good = Array.from({ length: 50 }, () => 90)
    expect(computeReputation(good)).toBe(90)
    const worse = [...good.slice(10), ...Array.from({ length: 10 }, () => 5)]
    expect(computeReputation(worse)).toBeLessThan(90)
  })
})

describe('hints (8.7)', () => {
  it('fresh game hints to hire cashier, cook, assembler; clears when resolved', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const ids = () => computeHints(sim.world).map((h) => h.id)
    expect(ids()).toEqual(expect.arrayContaining(['no-cashier', 'no-cook', 'no-assembler']))
    addStaff(sim, 'cashier')
    expect(ids()).not.toContain('no-cashier')
  })
  it('missing station, out of stock, debt', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: { ...BASIC_STOCK, patty: 0 }, stars: 2 })
    sim.world.economy.cash = -100
    const ids = computeHints(sim.world).map((h) => h.id)
    expect(ids).toContain('missing-station:fries')
    expect(ids).toContain('out-of-stock:patty')
    expect(ids).toContain('in-debt')
  })
  it('dismissed hints come back after their cause clears and recurs', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    sim.dispatch({ type: 'dismissHint', id: 'no-cook' })
    expect(sim.world.dismissedHints).toContain('no-cook')
    addStaff(sim, 'cook')
    sim.refreshHints()
    expect(sim.world.dismissedHints).not.toContain('no-cook')
  })
})

describe('economy (9.1, 9.2)', () => {
  it('starts with $5,000 and records daily history', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, arrivals: true })
    expect(sim.world.economy.cash).toBe(ECONOMY.startingCash)
    runDays(sim, 3)
    expect(sim.world.economy.history.map((d) => d.day)).toEqual([1, 2, 3])
  })
  it('debt allowed from recurring costs; loan take/repay/interest', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, cash: 1000 })
    sim.settle()
    expect(sim.world.economy.cash).toBeLessThan(0)
    expect(computeHints(sim.world).map((h) => h.id)).toContain('in-debt')
    expect(sim.dispatch({ type: 'takeLoan' }).ok).toBe(true)
    expect(sim.dispatch({ type: 'takeLoan' }).ok).toBe(false)
    const after = sim.world.economy.cash
    sim.settle()
    expect(sim.world.economy.history.at(-1)?.costs.interest).toBe(ECONOMY.loanInterestPerDay)
    sim.world.economy.cash = 600_000
    expect(sim.dispatch({ type: 'repayLoan' }).ok).toBe(true)
    expect(sim.world.economy.cash).toBe(100_000)
    expect(sim.world.economy.loan).toBe(0)
    sim.settle()
    expect(sim.world.economy.history.at(-1)?.costs.interest).toBe(0)
    expect(after).toBeGreaterThan(0)
  })
})

describe('progression (9.3)', () => {
  it('gains one star when both thresholds met; never loses stars', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    sim.world.reputation.value = 99
    sim.world.economy.cumulativeRevenue = STARS[5].revenue
    sim.settle()
    expect(sim.world.stars).toBe(2)
    sim.world.reputation.value = 0
    sim.settle()
    expect(sim.world.stars).toBe(2)
  })
  it('reaching 5 stars sets win state until acknowledged', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    sim.world.reputation.value = 99
    sim.world.economy.cumulativeRevenue = STARS[5].revenue
    for (let i = 0; i < 6; i++) sim.settle()
    expect(sim.world.stars).toBe(5)
    expect(sim.world.winSeen).toBe(false)
    sim.dispatch({ type: 'ackWin' })
    expect(sim.world.winSeen).toBe(true)
  })
})
