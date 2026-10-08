import { LOT, STAFF, STREET, ticks } from '../data/balance'
import { CATALOGUE } from '../data/catalogue'
import { FIRST_NAMES, LAST_NAMES } from '../data/names'
import { isUnlocked, type Role } from '../data/unlocks'
import { accessTiles, tileOf } from './geometry'
import { beginStep, completeStep, newTask, unclaimTask } from './kitchen'
import { entranceTile, idx, streetEnd } from './layout'
import { clearTarget, move, newAgent, setRoute, setTarget, walkRoute } from './movement'
import { distanceField } from './path'
import { chance, pick, randRange } from './rng'
import type { Sim } from './sim'
import {
  type Candidate,
  type Id,
  isLeaving,
  type PlacedObject,
  type Staff,
  type Task,
  type Vec,
} from './types'

export function generateCandidates(sim: Sim, count = STAFF.candidates) {
  const w = sim.world
  w.candidates = []
  for (let i = 0; i < count; i++) {
    const stats = {
      cooking: round2(randRange(w.rng, 0.1, 1)),
      speed: round2(randRange(w.rng, 0.1, 1)),
      service: round2(randRange(w.rng, 0.1, 1)),
    }
    const avg = (stats.cooking + stats.speed + stats.service) / 3
    const wage = Math.round((STAFF.baseWage + STAFF.wagePerStat * avg) / 100) * 100
    const name = `${pick(w.rng, FIRST_NAMES)} ${pick(w.rng, LAST_NAMES)}`
    w.candidates.push({ id: sim.newId(), name, stats, wage })
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

export const activeStaff = (sim: Sim) =>
  Object.values(sim.world.staff).filter((s) => !isLeaving(s.state))

export const roleUnlocked = (sim: Sim, role: Role) =>
  isUnlocked(sim.world.stars, { kind: 'role', id: role })

export function hire(sim: Sim, candidateId: Id): Staff | null {
  const w = sim.world
  const c = w.candidates.find((x) => x.id === candidateId)
  if (!c) return null
  w.candidates = w.candidates.filter((x) => x.id !== candidateId)
  const present = new Set(activeStaff(sim).map((s) => s.role))
  const role = (['cashier', 'cook', 'assembler'] as Role[]).find((r) => !present.has(r)) ?? 'cook'
  const side: -1 | 1 = chance(w.rng, 0.5) ? 1 : -1
  const s = makeStaff(c, role, side)
  w.staff[s.id] = s
  setRoute(s, [{ x: LOT.entranceX, y: STREET.laneY }, entranceTile()])
  return s
}

function makeStaff(c: Candidate, role: Role, side: -1 | 1): Staff {
  return {
    ...newAgent(streetEnd(side)),
    id: c.id,
    name: c.name,
    stats: { ...c.stats },
    wage: c.wage,
    role,
    pendingRole: null,
    state: 'arriving',
    side,
    taskId: null,
    stationId: null,
    workRemaining: 0,
    employedAtOpen: false,
  }
}

function releaseBinding(sim: Sim, s: Staff) {
  const w = sim.world
  if (s.taskId !== null) {
    const t = w.tasks[s.taskId]
    if (t) unclaimTask(sim, t, { refund: false })
  }
  if (s.stationId !== null) {
    const o = w.objects[s.stationId]
    if (o && o.cashierId === s.id) o.cashierId = null
  }
  s.taskId = null
  s.stationId = null
  s.workRemaining = 0
}

export function fire(sim: Sim, staffId: Id): boolean {
  const s = sim.world.staff[staffId]
  if (!s || isLeaving(s.state)) return false
  releaseBinding(sim, s)
  if (s.state === 'arriving') {
    // Still outside: turn around, no need to enter.
    s.state = 'departing'
    const onDoorColumn = s.pos.x === LOT.entranceX && s.pos.y !== STREET.laneY
    setRoute(s, [
      ...(onDoorColumn ? [{ x: LOT.entranceX, y: STREET.laneY }] : []),
      streetEnd(s.side),
    ])
    return true
  }
  s.state = 'leaving'
  setTarget(sim, s, entranceTile(), false)
  return true
}

export function setRole(sim: Sim, staffId: Id, role: Role): boolean {
  const s = sim.world.staff[staffId]
  if (!s || isLeaving(s.state)) return false
  if (!roleUnlocked(sim, role)) return false
  if (s.role === role) {
    s.pendingRole = null
    return true
  }
  s.pendingRole = role
  // Walking to a task or standing at a register: drop it and switch now.
  if (s.state === 'walking' || (s.state === 'working' && s.taskId === null)) {
    releaseBinding(sim, s)
    s.state = 'idle'
    clearTarget(s)
  }
  return true
}

const walkSpeed = (s: Staff) => STAFF.walkSpeed * (0.8 + 0.4 * s.stats.speed)

const hasCleaner = (sim: Sim) => activeStaff(sim).some((s) => s.role === 'cleaner')

function nearest(dist: Int32Array, tiles: Vec[]): { tile: Vec; d: number } | null {
  let best: { tile: Vec; d: number } | null = null
  for (const t of tiles) {
    const d = dist[idx(t.x, t.y)] ?? -1
    if (d < 0) continue
    if (!best || d < best.d) best = { tile: t, d }
  }
  return best
}

const staffAccess = (o: PlacedObject) => accessTiles(o).filter((a) => a.side === 'staff')

/** Claim a task and head to the chosen tile. */
function claim(sim: Sim, s: Staff, t: Task, stationId: Id | null, tile: Vec) {
  t.claimedBy = s.id
  t.stationId = stationId
  s.taskId = t.id
  s.stationId = stationId
  s.state = 'walking'
  if (stationId !== null) {
    const st = sim.world.objects[stationId]
    if (st && t.kind === 'step') {
      const free = st.slots.indexOf(null)
      if (free >= 0) st.slots[free] = t.id
    }
  }
  setTarget(sim, s, tile, false)
}

function tryStepTask(sim: Sim, s: Staff, dist: Int32Array, kinds: string[]): boolean {
  const w = sim.world
  for (const t of Object.values(w.tasks)) {
    if (t.kind !== 'step' || t.claimedBy !== null || !t.station || !kinds.includes(t.station))
      continue
    let best: { o: PlacedObject; tile: Vec; d: number } | null = null
    for (const o of Object.values(w.objects)) {
      if (CATALOGUE[o.def].station !== t.station || !o.slots.includes(null)) continue
      const n = nearest(dist, staffAccess(o))
      if (n && (!best || n.d < best.d)) best = { o, ...n }
    }
    if (best) {
      claim(sim, s, t, best.o.id, best.tile)
      return true
    }
  }
  return false
}

function tryDeliverTask(sim: Sim, s: Staff, dist: Int32Array): boolean {
  const w = sim.world
  for (const t of Object.values(w.tasks)) {
    if (t.kind !== 'deliver' || t.claimedBy !== null) continue
    let best: { o: PlacedObject; tile: Vec; d: number } | null = null
    for (const o of Object.values(w.objects)) {
      if (o.def !== 'pickup') continue
      if (o.readyOrders.length >= (CATALOGUE.pickup.tiers[0]?.slots ?? 6)) continue
      const n = nearest(dist, staffAccess(o))
      if (n && (!best || n.d < best.d)) best = { o, ...n }
    }
    if (best) {
      claim(sim, s, t, best.o.id, best.tile)
      return true
    }
    return false
  }
  return false
}

function cleanTile(sim: Sim, t: Task, dist: Int32Array): Vec | null {
  const w = sim.world
  if (t.tableId !== null) {
    const o = w.objects[t.tableId]
    if (!o) return null
    return nearest(dist, accessTiles(o))?.tile ?? null
  }
  if (t.trashId !== null) {
    const tr = w.trash[t.trashId]
    if (!tr) return null
    return (dist[idx(tr.x, tr.y)] ?? -1) >= 0 ? { x: tr.x, y: tr.y } : null
  }
  return null
}

function tryCleanTask(sim: Sim, s: Staff, dist: Int32Array): boolean {
  for (const t of Object.values(sim.world.tasks)) {
    if (t.kind !== 'clean' || t.claimedBy !== null) continue
    const tile = cleanTile(sim, t, dist)
    if (tile) {
      claim(sim, s, t, null, tile)
      return true
    }
  }
  return false
}

const hasOpenCleanTask = (sim: Sim) =>
  Object.values(sim.world.tasks).some((t) => t.kind === 'clean' && t.claimedBy === null)

function tryRegister(sim: Sim, s: Staff, dist: Int32Array): boolean {
  let best: { o: PlacedObject; tile: Vec; d: number } | null = null
  for (const o of Object.values(sim.world.objects)) {
    if (o.def !== 'register' || o.cashierId !== null) continue
    const n = nearest(dist, staffAccess(o))
    if (n && (!best || n.d < best.d)) best = { o, ...n }
  }
  if (!best) return false
  best.o.cashierId = s.id
  s.stationId = best.o.id
  s.taskId = null
  s.state = 'walking'
  setTarget(sim, s, best.tile, false)
  return true
}

function pickWork(sim: Sim, s: Staff): boolean {
  const dist = distanceField(sim, tileOf(s.pos), false)
  switch (s.role) {
    case 'cashier': {
      const waiting = Object.values(sim.world.objects).some(
        (o) => o.def === 'register' && o.cashierId === null && o.queue.length > 0,
      )
      if (!waiting && !hasCleaner(sim) && tryCleanTask(sim, s, dist)) return true
      return tryRegister(sim, s, dist)
    }
    case 'cook':
      return tryStepTask(sim, s, dist, ['grill', 'fryer'])
    case 'assembler':
      if (tryDeliverTask(sim, s, dist)) return true
      if (tryStepTask(sim, s, dist, ['assembly', 'soda'])) return true
      return !hasCleaner(sim) && tryCleanTask(sim, s, dist)
    case 'cleaner':
      return tryCleanTask(sim, s, dist)
  }
}

function homeTile(sim: Sim, s: Staff): Vec | null {
  const want: Record<Role, string[]> = {
    cashier: ['register'],
    cook: ['grill', 'fryer'],
    assembler: ['assembly', 'soda', 'pickup'],
    cleaner: ['bin', 'register'],
  }
  for (const o of Object.values(sim.world.objects)) {
    if (!want[s.role].includes(o.def)) continue
    const a = staffAccess(o)[0] ?? accessTiles(o)[0]
    if (a) return { x: a.x, y: a.y }
  }
  return null
}

function arrive(sim: Sim, s: Staff) {
  const w = sim.world
  const t = s.taskId !== null ? w.tasks[s.taskId] : undefined
  if (!t) {
    // Cashier reached the register.
    s.state = s.stationId !== null ? 'working' : 'idle'
    return
  }
  if (t.kind === 'step') {
    const st = t.stationId !== null ? w.objects[t.stationId] : undefined
    if (!st) {
      unclaimTask(sim, t, { refund: false })
      return
    }
    beginStep(sim, t, s, st)
    s.state = 'working'
    return
  }
  if (t.kind === 'deliver') {
    const order = t.orderId !== null ? w.orders[t.orderId] : undefined
    const p = t.stationId !== null ? w.objects[t.stationId] : undefined
    delete w.tasks[t.id]
    s.taskId = null
    s.stationId = null
    s.state = 'idle'
    if (order && p && order.state === 'delivering') {
      order.state = 'ready'
      order.pickupId = p.id
      p.readyOrders.push(order.id)
      sim.emit({ type: 'orderReady', orderId: order.id, pickupId: p.id })
    } else if (order && order.state === 'delivering') {
      // Pickup counter vanished: requeue delivery.
      newTask(sim, { role: 'assembler', kind: 'deliver', orderId: order.id })
    }
    return
  }
  // clean
  s.workRemaining = ticks(STAFF.cleanSeconds)
  s.state = 'working'
}

function finishWork(sim: Sim, s: Staff) {
  const w = sim.world
  const t = s.taskId !== null ? w.tasks[s.taskId] : undefined
  s.state = 'idle'
  s.taskId = null
  s.stationId = null
  if (!t) return
  if (t.kind === 'step') {
    completeStep(sim, t, s)
    return
  }
  if (t.kind === 'clean') {
    if (t.tableId !== null) {
      const o = w.objects[t.tableId]
      if (o) o.dirty = false
    }
    if (t.trashId !== null) delete w.trash[t.trashId]
    delete w.tasks[t.id]
  }
}

export function staffSystem(sim: Sim) {
  const w = sim.world
  for (const s of Object.values(w.staff)) {
    if (s.state === 'arriving') {
      if (walkRoute(s, walkSpeed(s)) === 'arrived') {
        s.state = 'idle'
        clearTarget(s)
      }
      continue
    }
    if (s.state === 'departing') {
      if (walkRoute(s, walkSpeed(s)) === 'arrived') delete w.staff[s.id]
      continue
    }
    if (s.state === 'leaving') {
      const r = move(sim, s, walkSpeed(s), false)
      if (r === 'moving') continue
      const door = entranceTile()
      // Only members who reached the door walk out along the street.
      if (r === 'arrived' && s.pos.x === door.x && s.pos.y === door.y) {
        s.state = 'departing'
        setRoute(s, [{ x: LOT.entranceX, y: STREET.laneY }, streetEnd(s.side)])
      } else delete w.staff[s.id]
      continue
    }
    if (s.state === 'working') {
      s.prev.x = s.pos.x
      s.prev.y = s.pos.y
      if (s.taskId !== null) {
        if (--s.workRemaining <= 0) finishWork(sim, s)
        continue
      }
      // Cashier at register.
      const reg = s.stationId !== null ? w.objects[s.stationId] : undefined
      if (!reg || reg.cashierId !== s.id) {
        s.state = 'idle'
        s.stationId = null
      } else if (
        reg.queue.length === 0 &&
        !hasCleaner(sim) &&
        hasOpenCleanTask(sim) &&
        !Object.values(w.groups).some((g) => g.registerId === reg.id && g.state === 'ordering')
      ) {
        reg.cashierId = null
        s.stationId = null
        s.state = 'idle'
      } else continue
    }
    if (s.state === 'walking') {
      const r = move(sim, s, walkSpeed(s), false)
      if (r === 'failed') {
        releaseBinding(sim, s)
        s.state = 'idle'
        clearTarget(s)
      } else if (r === 'arrived') {
        arrive(sim, s)
      }
      continue
    }
    // idle
    if (s.pendingRole) {
      s.role = s.pendingRole
      s.pendingRole = null
    }
    if (pickWork(sim, s)) continue
    const home = homeTile(sim, s)
    if (home && (!s.target || s.target.x !== home.x || s.target.y !== home.y))
      setTarget(sim, s, home, false)
    move(sim, s, walkSpeed(s), false)
  }
}
