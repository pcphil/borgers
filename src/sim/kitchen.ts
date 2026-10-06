import { QUALITY, ticks } from '../data/balance'
import { CATALOGUE } from '../data/catalogue'
import { type Ingredient, MENU, type MenuItemId } from '../data/recipes'
import type { Role } from '../data/unlocks'
import { consume, release, reserve, unconsume } from './inventory'
import { itemNeeds } from './menu'
import type { Sim } from './sim'
import type { Id, Order, PlacedObject, Staff, Task } from './types'

export function roleForStation(station: string): Role {
  return station === 'grill' || station === 'fryer' ? 'cook' : 'assembler'
}

export function newTask(sim: Sim, partial: Partial<Task> & Pick<Task, 'role' | 'kind'>): Task {
  const t: Task = {
    id: sim.newId(),
    createdTick: sim.world.clock.totalTicks,
    claimedBy: null,
    stationId: null,
    orderId: null,
    itemIdx: 0,
    station: null,
    consumed: false,
    tableId: null,
    trashId: null,
    ...partial,
  }
  sim.world.tasks[t.id] = t
  return t
}

function queueStep(sim: Sim, order: Order, itemIdx: number) {
  const item = order.items[itemIdx]
  if (!item) return
  const step = MENU[item.menu].steps[item.step]
  if (!step) return
  const t = newTask(sim, {
    role: roleForStation(step.station),
    kind: 'step',
    orderId: order.id,
    itemIdx,
    station: step.station,
  })
  item.taskId = t.id
}

/** Create an order for already-chosen items; reserves all ingredients and queues first steps. */
export function createOrder(sim: Sim, groupId: Id, items: MenuItemId[], price: number): Order {
  const order: Order = {
    id: sim.newId(),
    groupId,
    items: items.map((menu) => ({ menu, step: 0, done: false, qualitySum: 0, taskId: null })),
    state: 'cooking',
    createdTick: sim.world.clock.totalTicks,
    pickupId: null,
    price,
    quality: 0,
  }
  sim.world.orders[order.id] = order
  for (const m of items) reserve(sim.world, itemNeeds(m))
  order.items.forEach((_, i) => {
    queueStep(sim, order, i)
  })
  return order
}

export const stepOf = (sim: Sim, t: Task) => {
  const order = t.orderId !== null ? sim.world.orders[t.orderId] : undefined
  const item = order?.items[t.itemIdx]
  return item ? MENU[item.menu].steps[item.step] : undefined
}

export function tierStats(o: PlacedObject) {
  const tiers = CATALOGUE[o.def].tiers
  return (tiers[o.tier] ?? tiers[0]) as NonNullable<(typeof tiers)[0]>
}

export const workSpeedFactor = (s: Staff) => 0.6 + 0.8 * s.stats.speed

/** Staff arrived at station: consume ingredients (once) and start the timer. */
export function beginStep(sim: Sim, t: Task, s: Staff, station: PlacedObject) {
  const step = stepOf(sim, t)
  if (!step) return
  if (!t.consumed) {
    consume(sim.world, step.consumes)
    t.consumed = true
  }
  const dur = step.seconds / (tierStats(station).speedMul * workSpeedFactor(s))
  s.workRemaining = Math.max(1, ticks(dur))
  sim.emit({ type: 'cookStart', station: step.station, stationId: station.id })
}

export function freeSlot(station: PlacedObject, taskId: Id) {
  const i = station.slots.indexOf(taskId)
  if (i >= 0) station.slots[i] = null
}

/** Step work finished. Advances the item, queues the next step or the delivery. */
export function completeStep(sim: Sim, t: Task, s: Staff) {
  const w = sim.world
  const station = t.stationId !== null ? w.objects[t.stationId] : undefined
  if (station) freeSlot(station, t.id)
  delete w.tasks[t.id]
  const order = t.orderId !== null ? w.orders[t.orderId] : undefined
  if (!order || order.state === 'cancelled') return
  const item = order.items[t.itemIdx]
  if (!item) return
  const tierQ = station ? tierStats(station).quality : 0
  item.qualitySum += QUALITY.skillWeight * s.stats.cooking + QUALITY.tierWeight * tierQ
  item.step++
  item.taskId = null
  if (item.step < MENU[item.menu].steps.length) {
    queueStep(sim, order, t.itemIdx)
    return
  }
  item.done = true
  if (order.items.every((i) => i.done)) {
    let q = 0
    for (const i of order.items) q += i.qualitySum / MENU[i.menu].steps.length
    order.quality = q / order.items.length
    order.state = 'delivering'
    newTask(sim, { role: 'assembler', kind: 'deliver', orderId: order.id })
  }
}

/** Release a staff member's claim on a task, returning it to the queue. */
export function unclaimTask(sim: Sim, t: Task, opts: { refund: boolean }) {
  const w = sim.world
  const station = t.stationId !== null ? w.objects[t.stationId] : undefined
  if (station) freeSlot(station, t.id)
  if (opts.refund && t.consumed) {
    const step = stepOf(sim, t)
    if (step) unconsume(w, step.consumes)
    t.consumed = false
  }
  if (t.claimedBy !== null) {
    const s = w.staff[t.claimedBy]
    if (s && s.taskId === t.id) {
      s.taskId = null
      s.stationId = null
      s.state = 'idle'
      s.workRemaining = 0
    }
  }
  t.claimedBy = null
  t.stationId = null
}

/** Cancel an order: release ingredient reservations for steps not yet started, drop queued tasks. */
export function cancelOrder(sim: Sim, order: Order) {
  const w = sim.world
  if (order.state === 'collected' || order.state === 'cancelled') return
  order.state = 'cancelled'
  for (const item of order.items) {
    if (item.done) continue
    const steps = MENU[item.menu].steps
    const t = item.taskId !== null ? w.tasks[item.taskId] : undefined
    const from = t?.consumed ? item.step + 1 : item.step
    const need: Partial<Record<Ingredient, number>> = {}
    for (let s = from; s < steps.length; s++)
      for (const [i, n] of Object.entries(steps[s]?.consumes ?? {}) as [Ingredient, number][])
        need[i] = (need[i] ?? 0) + n
    release(w, need)
    // Work already in progress finishes and is wasted; queued/walking claims are dropped.
    if (t && !(t.consumed && t.claimedBy !== null)) {
      unclaimTask(sim, t, { refund: false })
      delete w.tasks[t.id]
    }
  }
  for (const t of Object.values(w.tasks)) {
    if (t.kind === 'deliver' && t.orderId === order.id) {
      unclaimTask(sim, t, { refund: false })
      delete w.tasks[t.id]
    }
  }
  if (order.pickupId !== null) {
    const p = w.objects[order.pickupId]
    if (p) p.readyOrders = p.readyOrders.filter((id) => id !== order.id)
  }
}
