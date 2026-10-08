import {
  CUSTOMERS,
  LOT,
  OPEN_HOUR,
  OPEN_TICKS,
  REPUTATION,
  RUSH,
  STAFF,
  STREET,
  TICKS_PER_HOUR,
  ticks,
} from '../data/balance'
import { CATALOGUE } from '../data/catalogue'
import { MENU, MENU_ITEM_IDS, type MenuItemId } from '../data/recipes'
import { earnSale } from './economy'
import { accessTiles, frontDir, manhattan, tileOf } from './geometry'
import { canReserve, release, reserve } from './inventory'
import { cancelOrder, createOrder, newTask } from './kitchen'
import { entranceTile, idx, isWalkable, streetEnd } from './layout'
import { attractiveness, isAvailable, itemNeeds, priceFairness } from './menu'
import { clearTarget, move, newAgent, setRoute, setTarget, walkRoute } from './movement'
import { distanceField } from './path'
import { recordVisit } from './reputation'
import { chance, rand, randInt, randRange, weightedIndex } from './rng'
import type { Sim } from './sim'
import type { Complaint, Group, PlacedObject, Vec, World } from './types'

// ---------- demand ----------

export function demandAt(hour: number): number {
  const c = CUSTOMERS.demandCurve
  const first = c[0] as [number, number]
  if (hour <= first[0]) return first[1]
  for (let i = 1; i < c.length; i++) {
    const [h1, v1] = c[i] as [number, number]
    const [h0, v0] = c[i - 1] as [number, number]
    if (hour <= h1) return v0 + ((v1 - v0) * (hour - h0)) / (h1 - h0)
  }
  return (c[c.length - 1] as [number, number])[1]
}

/** Rush knots: one per hour boundary from opening to closing. */
export const RUSH_KNOTS = 13

/** Linear interpolation of the day's rush multipliers at a game hour. */
export function rushAt(rush: readonly number[], hour: number): number {
  const x = Math.min(RUSH_KNOTS - 1, Math.max(0, hour - OPEN_HOUR))
  const i = Math.min(RUSH_KNOTS - 2, Math.floor(x))
  const a = rush[i] ?? 1
  const b = rush[i + 1] ?? 1
  return a + (b - a) * (x - i)
}

/**
 * Draw a day's rush pattern from the world RNG. Knots are rescaled so the expected number of
 * arrivals over the day (sum of base demand x multiplier per tick) equals the unmodulated total.
 */
export function drawRush(w: World): number[] {
  const raw: number[] = []
  for (let i = 0; i < RUSH_KNOTS; i++) raw.push(randRange(w.rng, RUSH.min, RUSH.max))
  let base = 0
  let modulated = 0
  for (let t = 0; t < OPEN_TICKS; t++) {
    const hour = OPEN_HOUR + t / TICKS_PER_HOUR
    const d = demandAt(hour)
    base += d
    modulated += d * rushAt(raw, hour)
  }
  const k = modulated > 0 ? base / modulated : 1
  return raw.map((m) => m * k)
}

export const reputationFactor = (rep: number) => 0.4 + 1.2 * (rep / 100)

/** Average attractiveness of available items' prices (1 = fair pricing). */
export function priceFactor(w: World): number {
  let sum = 0
  let n = 0
  for (const id of MENU_ITEM_IDS) {
    if (!isAvailable(w, id)) continue
    sum += attractiveness(w.menu[id].price, MENU[id].fairValue)
    n++
  }
  return n === 0 ? 1 : Math.min(1.6, Math.max(0.3, sum / n))
}

/** Expected groups per tick right now. */
export function arrivalRate(w: World): number {
  const hour = OPEN_HOUR + w.clock.tick / TICKS_PER_HOUR
  return (
    (demandAt(hour) / TICKS_PER_HOUR) *
    rushAt(w.rush, hour) *
    reputationFactor(w.reputation.value) *
    priceFactor(w)
  )
}

export function arrivalSystem(sim: Sim) {
  const w = sim.world
  if (w.clock.phase !== 'open' || !sim.arrivals) return
  if (Object.keys(w.groups).length >= CUSTOMERS.maxActiveGroups) return
  if (rand(w.rng) >= arrivalRate(w)) return
  spawnGroup(sim)
}

/**
 * Create a customer group at a street end; it walks to the door and enters from there. With
 * `atDoor` (scenario tests, stress scenes) it skips the walk and enters immediately.
 */
export function spawnGroup(sim: Sim, opts: { atDoor?: boolean } = {}): Group {
  const w = sim.world
  const size = weightedIndex(w.rng, CUSTOMERS.groupSizeWeights) + 1
  const p = CUSTOMERS.patience
  const side: -1 | 1 = chance(w.rng, 0.5) ? 1 : -1
  const g: Group = {
    ...newAgent(streetEnd(side)),
    id: sim.newId(),
    size,
    takeout: chance(w.rng, CUSTOMERS.takeoutChance),
    side,
    state: 'arriving',
    timer: 0,
    patience: {
      queue: ticks(randRange(w.rng, p.queue[0], p.queue[1])),
      food: ticks(randRange(w.rng, p.food[0], p.food[1])),
      seat: ticks(randRange(w.rng, p.seat[0], p.seat[1])),
    },
    registerId: null,
    orderId: null,
    tableId: null,
    seatIdx: [],
    eatTicks: 0,
    queueWait: 0,
    foodWait: 0,
    complaint: null,
    angry: false,
    paid: false,
    dirtSeen: 0,
    gotSeat: false,
    satisfaction: null,
  }
  // Groups too big for every table in the restaurant get takeout instead of waiting for a seat.
  if (!g.takeout && !Object.values(w.objects).some((o) => (CATALOGUE[o.def].seats ?? 0) >= size))
    g.takeout = true
  w.groups[g.id] = g
  setRoute(g, [{ x: LOT.entranceX, y: STREET.laneY }, entranceTile()])
  if (opts.atDoor) {
    g.pos = { ...entranceTile() }
    g.prev = { ...g.pos }
    enterRestaurant(sim, g)
  }
  return g
}

/** The group steps through the door: only now does it queue and start its patience timers. */
function enterRestaurant(sim: Sim, g: Group) {
  const w = sim.world
  g.state = 'toQueue'
  g.timer = 0
  g.path = []
  g.pathIdx = 0
  sim.emit({ type: 'customerEnter', groupId: g.id })
  if (!MENU_ITEM_IDS.some((id) => isAvailable(w, id))) {
    leaveAngry(sim, g, 'nothingToOrder')
    return
  }
  const reg = chooseRegister(sim)
  if (!reg) {
    leaveAngry(sim, g, 'lineTooLong')
    return
  }
  reg.queue.push(g.id)
  g.registerId = reg.id
}

// ---------- queue ----------

export function queueSlots(sim: Sim, reg: PlacedObject): Vec[] {
  const w = sim.world
  const occ = sim.occupancy()
  const a = accessTiles(reg).find((t) => t.side === 'customer')
  if (!a) return []
  const d = frontDir(reg.rot)
  const out: Vec[] = []
  let x = a.x
  let y = a.y
  while (out.length < CUSTOMERS.queueLength && isWalkable(w, occ, x, y, true)) {
    out.push({ x, y })
    x += d.x
    y += d.y
  }
  return out
}

function chooseRegister(sim: Sim): PlacedObject | null {
  let best: PlacedObject | null = null
  for (const o of Object.values(sim.world.objects)) {
    if (o.def !== 'register') continue
    if (o.queue.length >= queueSlots(sim, o).length) continue
    if (!best || o.queue.length < best.queue.length) best = o
  }
  return best
}

function leaveQueue(sim: Sim, g: Group) {
  if (g.registerId === null) return
  const reg = sim.world.objects[g.registerId]
  if (reg) reg.queue = reg.queue.filter((id) => id !== g.id)
  g.registerId = null
}

// ---------- ordering ----------

function chooseItems(sim: Sim, g: Group): MenuItemId[] {
  const w = sim.world
  const out: MenuItemId[] = []
  const take = (cat: 'main' | 'side' | 'drink' | null) => {
    const ids = MENU_ITEM_IDS.filter(
      (id) =>
        (cat === null || MENU[id].category === cat) &&
        isAvailable(w, id) &&
        canReserve(w, itemNeeds(id)),
    )
    const weights = ids.map(
      (id) => MENU[id].appeal * attractiveness(w.menu[id].price, MENU[id].fairValue),
    )
    const i = weightedIndex(w.rng, weights)
    const id = ids[i]
    if (id === undefined) return false
    // Hold ingredients while choosing so later picks see reduced stock.
    reserve(w, itemNeeds(id))
    out.push(id)
    return true
  }
  for (let m = 0; m < g.size; m++) {
    if (!take('main')) take(null)
    if (chance(w.rng, CUSTOMERS.extraSideChance)) take('side')
    if (chance(w.rng, CUSTOMERS.drinkChance)) take('drink')
  }
  for (const id of out) release(w, itemNeeds(id))
  return out
}

export const orderSeconds = (service: number) => STAFF.orderSeconds / (0.6 + 0.8 * service)

function placeOrder(sim: Sim, g: Group) {
  const w = sim.world
  const items = chooseItems(sim, g)
  leaveQueue(sim, g)
  if (items.length === 0) {
    leaveAngry(sim, g, 'nothingToOrder')
    return
  }
  let price = 0
  let fair = 0
  for (const id of items) {
    price += w.menu[id].price
    fair += priceFairness(w.menu[id].price, MENU[id].fairValue)
  }
  const order = createOrder(sim, g.id, items, price)
  earnSale(sim, price)
  g.paid = true
  g.orderId = order.id
  if (fair / items.length < 0.6) g.complaint = 'tooExpensive'
  sim.emit({ type: 'orderTaken', orderId: order.id })
  g.state = 'toWait'
  g.timer = 0
  const spot = waitSpot(sim, g)
  if (spot) setTarget(sim, g, spot, true)
}

/** A free dining tile near a pickup counter, avoiding queue slots. */
function waitSpot(sim: Sim, g: Group): Vec | null {
  const w = sim.world
  const pickup = Object.values(w.objects).find((o) => o.def === 'pickup')
  const anchor = pickup ? accessTiles(pickup).find((a) => a.side === 'customer') : undefined
  if (!anchor) return tileOf(g.pos)
  const reserved = new Set<number>()
  for (const o of Object.values(w.objects)) {
    if (o.def === 'register') for (const t of queueSlots(sim, o)) reserved.add(idx(t.x, t.y))
    if (o.def === 'pickup') for (const t of accessTiles(o)) reserved.add(idx(t.x, t.y))
  }
  const taken = new Set<number>()
  for (const other of Object.values(w.groups)) {
    if (
      other.id !== g.id &&
      other.target &&
      (other.state === 'toWait' || other.state === 'waitingFood')
    )
      taken.add(idx(other.target.x, other.target.y))
  }
  const dist = distanceField(sim, anchor, true)
  let best: { t: Vec; d: number } | null = null
  for (let y = 0; y < w.layout.h; y++) {
    for (let x = 0; x < w.layout.w; x++) {
      const i = idx(x, y)
      const d = dist[i] ?? -1
      if (d < 1 || reserved.has(i) || taken.has(i)) continue
      if (!best || d < best.d) best = { t: { x, y }, d }
    }
  }
  return best?.t ?? anchor
}

// ---------- seating ----------

/**
 * Chair-level seating. A group of 2+ needs a table with every chair free and keeps it to itself;
 * a solo diner needs a free chair at a table where only other solo diners sit.
 */
function canSeat(w: World, o: PlacedObject, g: Group): boolean {
  if (o.seatOccupants.length < g.size) return false
  if (g.size >= 2) return o.seatOccupants.every((id) => id === null)
  let free = false
  for (const id of o.seatOccupants) {
    if (id === null) free = true
    else if ((w.groups[id]?.size ?? 1) !== 1) return false
  }
  return free
}

/** Take the chairs: a group of 2+ the first `size` chairs, a solo diner the lowest free chair. */
function claimSeats(o: PlacedObject, g: Group) {
  g.seatIdx = []
  for (let i = 0; i < o.seatOccupants.length && g.seatIdx.length < g.size; i++)
    if (o.seatOccupants[i] === null) {
      o.seatOccupants[i] = g.id
      g.seatIdx.push(i)
    }
  g.tableId = o.id
}

function findTable(sim: Sim, g: Group): { table: PlacedObject; tile: Vec } | 'dirty' | null {
  const w = sim.world
  const dist = distanceField(sim, tileOf(g.pos), true)
  let best: { table: PlacedObject; tile: Vec; d: number } | null = null
  let sawDirty = false
  for (const o of Object.values(w.objects)) {
    if (!canSeat(w, o, g)) continue
    if (o.dirty) {
      sawDirty = true
      continue
    }
    for (const a of accessTiles(o)) {
      const d = dist[idx(a.x, a.y)] ?? -1
      if (d >= 0 && (!best || d < best.d)) best = { table: o, tile: { x: a.x, y: a.y }, d }
    }
  }
  if (best) return { table: best.table, tile: best.tile }
  return sawDirty ? 'dirty' : null
}

function dirtNear(w: World, at: Vec): number {
  const r = CUSTOMERS.dirtRadius
  let n = 0
  for (const o of Object.values(w.objects)) if (o.dirty && manhattan(o, at) <= r) n++
  for (const t of Object.values(w.trash)) if (manhattan(t, at) <= r) n++
  return n
}

/**
 * Give up the chairs. A table that someone ate at turns dirty, with one cleaning task, when its
 * last diner has left; a diner who never ate (or a mid-meal release) only frees chairs.
 */
function vacateTable(sim: Sim, g: Group) {
  const w = sim.world
  if (g.tableId === null) return
  const t = w.objects[g.tableId]
  const held = g.seatIdx
  g.tableId = null
  g.seatIdx = []
  if (!t) return
  for (const i of held) if (t.seatOccupants[i] === g.id) t.seatOccupants[i] = null
  if (g.state !== 'eating') return
  t.used = true
  if (t.seatOccupants.every((id) => id === null)) {
    t.used = false
    t.dirty = true
    newTask(sim, { role: 'cleaner', kind: 'clean', tableId: t.id })
  }
  const binNear = Object.values(w.objects).some(
    (o) => o.def === 'bin' && manhattan(o, t) <= CUSTOMERS.binRange,
  )
  if (!binNear && chance(w.rng, CUSTOMERS.trashChance)) dropTrash(sim, t)
}

function dropTrash(sim: Sim, near: PlacedObject) {
  const w = sim.world
  const tiles = accessTiles(near).filter((a) => isWalkable(w, sim.occupancy(), a.x, a.y, true))
  const at = tiles[randInt(w.rng, 0, Math.max(0, tiles.length - 1))]
  if (!at) return
  if (Object.values(w.trash).some((t) => t.x === at.x && t.y === at.y)) return
  const id = sim.newId()
  const task = newTask(sim, { role: 'cleaner', kind: 'clean', trashId: id })
  w.trash[id] = { id, x: at.x, y: at.y, taskId: task.id }
}

// ---------- leaving ----------

export function leaveAngry(sim: Sim, g: Group, complaint: Complaint) {
  const w = sim.world
  g.angry = true
  g.complaint = complaint
  leaveQueue(sim, g)
  if (g.orderId !== null) {
    const o = w.orders[g.orderId]
    if (o) cancelOrder(sim, o)
  }
  vacateTable(sim, g)
  startLeaving(sim, g)
  w.economy.today.complaints[complaint] = (w.economy.today.complaints[complaint] ?? 0) + 1
  sim.emit({ type: 'customerLost', complaint })
}

function startLeaving(sim: Sim, g: Group) {
  g.state = 'leaving'
  g.timer = 0
  if (!setTarget(sim, g, entranceTile(), true)) clearTarget(g)
}

export function satisfaction(w: World, g: Group): number {
  if (g.angry) return REPUTATION.angryScore
  const order = g.orderId !== null ? w.orders[g.orderId] : undefined
  const W = REPUTATION.weights
  const wait = 1 - Math.min(1, (g.queueWait + g.foodWait) / (g.patience.queue + g.patience.food))
  const quality = order ? order.quality : 0.5
  let price = 1
  if (order) {
    let s = 0
    for (const i of order.items) s += priceFairness(w.menu[i.menu].price, MENU[i.menu].fairValue)
    price = s / Math.max(1, order.items.length)
  }
  const clean = 1 - Math.min(1, g.dirtSeen / 4)
  const seat = g.takeout || g.gotSeat ? 1 : 0
  const score =
    W.wait * wait + W.quality * quality + W.price * price + W.clean * clean + W.seat * seat
  return Math.round(score * 100)
}

/** The visit ends as the group steps out of the door: record it and drop its order. */
function finishVisit(sim: Sim, g: Group) {
  const w = sim.world
  const score = satisfaction(w, g)
  g.satisfaction = score
  recordVisit(sim, score)
  if (g.angry) w.economy.today.lost++
  else w.economy.today.served++
  if (g.orderId !== null) delete w.orders[g.orderId]
  g.orderId = null
}

/** After the door, walk the street back to the end the group came from, then disappear. */
function startDeparture(g: Group) {
  g.state = 'departing'
  g.timer = 0
  setRoute(g, [{ x: LOT.entranceX, y: STREET.laneY }, streetEnd(g.side)])
}

// ---------- per-tick behaviour ----------

const SPEED = CUSTOMERS.walkSpeed

export function customerSystem(sim: Sim) {
  const w = sim.world
  for (const g of Object.values(w.groups)) {
    g.timer++
    switch (g.state) {
      case 'toQueue':
      case 'queueing': {
        g.queueWait++
        const reg = g.registerId !== null ? w.objects[g.registerId] : undefined
        if (!reg) {
          // Register removed: try another line.
          const next = chooseRegister(sim)
          if (!next) {
            leaveAngry(sim, g, 'lineTooLong')
            break
          }
          next.queue.push(g.id)
          g.registerId = next.id
          break
        }
        if (g.queueWait > g.patience.queue) {
          leaveAngry(sim, g, 'lineTooLong')
          break
        }
        const slots = queueSlots(sim, reg)
        const pos = Math.min(reg.queue.indexOf(g.id), slots.length - 1)
        const slot = slots[pos]
        if (!slot) break
        if (!g.target || g.target.x !== slot.x || g.target.y !== slot.y)
          setTarget(sim, g, slot, true)
        const r = move(sim, g, SPEED, true)
        if (r === 'failed') {
          leaveAngry(sim, g, 'unreachable')
          break
        }
        g.state = r === 'arrived' ? 'queueing' : 'toQueue'
        if (r === 'arrived' && pos === 0 && reg.queue[0] === g.id) {
          const cashier = reg.cashierId !== null ? w.staff[reg.cashierId] : undefined
          if (cashier && cashier.state === 'working' && cashier.stationId === reg.id) {
            g.state = 'ordering'
            g.timer = 0
          }
        }
        break
      }
      case 'ordering': {
        g.queueWait++
        g.prev = { ...g.pos }
        const reg = g.registerId !== null ? w.objects[g.registerId] : undefined
        const cashier = reg?.cashierId != null ? w.staff[reg.cashierId] : undefined
        if (!reg || !cashier || cashier.state !== 'working') {
          g.state = 'queueing'
          break
        }
        if (g.timer >= ticks(orderSeconds(cashier.stats.service))) placeOrder(sim, g)
        break
      }
      case 'toWait':
      case 'waitingFood': {
        g.foodWait++
        const order = g.orderId !== null ? w.orders[g.orderId] : undefined
        if (g.foodWait > g.patience.food) {
          leaveAngry(sim, g, 'waitedTooLong')
          break
        }
        g.dirtSeen = Math.max(g.dirtSeen, dirtNear(w, tileOf(g.pos)))
        if (move(sim, g, SPEED, true) === 'arrived') g.state = 'waitingFood'
        if (order?.state === 'ready' && order.pickupId !== null) {
          const p = w.objects[order.pickupId]
          const tile = p && accessTiles(p).find((a) => a.side === 'customer')
          if (tile) {
            g.state = 'toPickup'
            setTarget(sim, g, tile, true)
          }
        }
        break
      }
      case 'toPickup': {
        g.foodWait++
        const order = g.orderId !== null ? w.orders[g.orderId] : undefined
        if (order?.state !== 'ready') {
          g.state = 'waitingFood'
          break
        }
        const r = move(sim, g, SPEED, true)
        if (r === 'failed') leaveAngry(sim, g, 'unreachable')
        else if (r === 'arrived') {
          g.state = 'collecting'
          g.timer = 0
        }
        break
      }
      case 'collecting': {
        g.prev = { ...g.pos }
        if (g.timer < ticks(STAFF.collectSeconds)) break
        const order = g.orderId !== null ? w.orders[g.orderId] : undefined
        if (order && order.state !== 'ready') {
          // The pickup counter was sold or moved while we reached for the food: the order is
          // being re-delivered, so go back to waiting instead of leaving a stray delivery task.
          g.state = 'waitingFood'
          break
        }
        if (order) {
          order.state = 'collected'
          if (order.pickupId !== null) {
            const p = w.objects[order.pickupId]
            if (p) p.readyOrders = p.readyOrders.filter((id) => id !== order.id)
          }
        }
        if (g.takeout) startLeaving(sim, g)
        else {
          g.state = 'seeking'
          g.timer = 0
        }
        break
      }
      case 'seeking': {
        g.prev = { ...g.pos }
        if (g.timer > g.patience.seat) {
          // No seat is not a failure: the group already has its food, so it takes it away.
          g.takeout = true
          startLeaving(sim, g)
          break
        }
        const found = findTable(sim, g)
        if (found === 'dirty') {
          if (!g.complaint) g.complaint = 'dirty'
          break
        }
        if (!found) break
        claimSeats(found.table, g)
        g.state = 'toSeat'
        setTarget(sim, g, found.tile, true)
        break
      }
      case 'toSeat': {
        const r = move(sim, g, SPEED, true)
        if (r === 'failed') {
          vacateTable(sim, g)
          g.complaint = 'unreachable'
          g.state = 'seeking'
          break
        }
        if (r === 'arrived') {
          g.state = 'eating'
          g.timer = 0
          g.gotSeat = true
          g.eatTicks = ticks(randRange(w.rng, CUSTOMERS.eatSeconds[0], CUSTOMERS.eatSeconds[1]))
        }
        break
      }
      case 'eating': {
        g.prev = { ...g.pos }
        const near = dirtNear(w, tileOf(g.pos))
        g.dirtSeen = Math.max(g.dirtSeen, near)
        if (near > 0 && !g.complaint) g.complaint = 'dirty'
        if (g.timer >= g.eatTicks) {
          vacateTable(sim, g)
          startLeaving(sim, g)
        }
        break
      }
      case 'arriving': {
        if (walkRoute(g, SPEED) === 'arrived') enterRestaurant(sim, g)
        break
      }
      case 'leaving': {
        const r = move(sim, g, SPEED, true)
        if (r === 'moving') break
        finishVisit(sim, g)
        const door = entranceTile()
        // Only groups that actually reached the door walk out along the street.
        if (r === 'arrived' && g.pos.x === door.x && g.pos.y === door.y) startDeparture(g)
        else delete w.groups[g.id]
        break
      }
      case 'departing': {
        if (walkRoute(g, SPEED) === 'arrived') delete w.groups[g.id]
        break
      }
    }
  }
}

/** Groups currently bound to an object, for release on sell/move. */
export function releaseGroupsAt(sim: Sim, o: PlacedObject) {
  const w = sim.world
  if (o.seatOccupants.some((id) => id !== null)) {
    for (const gid of new Set(o.seatOccupants)) {
      const g = gid !== null ? w.groups[gid] : undefined
      if (!g) continue
      const wasEating = g.state === 'eating'
      g.tableId = null
      g.seatIdx = []
      if (wasEating) startLeaving(sim, g)
      else g.state = 'seeking'
    }
    o.seatOccupants.fill(null)
    o.used = false
  }
  if (o.def === 'register') {
    for (const gid of o.queue) {
      const g = w.groups[gid]
      if (g) {
        g.registerId = null
        g.state = 'toQueue'
      }
    }
    o.queue = []
  }
}
