import { ECONOMY, LOT, NIGHT_TICKS, OPEN_TICKS } from '../data/balance'
import { CATALOGUE, type ObjectDefId } from '../data/catalogue'
import type { Ingredient, MenuItemId } from '../data/recipes'
import { isUnlocked, type Role } from '../data/unlocks'
import { arrivalSystem, customerSystem, releaseGroupsAt } from './customers'
import { canAfford, newDayRecord, refund, repayLoan, spend, takeLoan } from './economy'
import { footprintTiles, type Placement } from './geometry'
import { computeHints, type Hint } from './hints'
import { deliver, manualOrder, setAuto, setTarget as setStockTarget } from './inventory'
import { newTask, unclaimTask } from './kitchen'
import {
  buildOccupancy,
  checkMove,
  checkPlace,
  idx,
  type LayoutError,
  newPlacedObject,
  objectList,
  objectValue,
  validateObjects,
} from './layout'
import { setMenu } from './menu'
import { evaluateStars } from './progression'
import { fire, generateCandidates, hire, setRole, staffSystem } from './staff'
import type { Id, MenuEntry, PlacedObject, Rot, SimEvent, Vec, World, Zone } from './types'

export type Command =
  | { type: 'place'; def: ObjectDefId; x: number; y: number; rot: Rot }
  | { type: 'move'; id: Id; x: number; y: number; rot: Rot }
  | { type: 'sell'; id: Id }
  | { type: 'upgrade'; id: Id }
  | { type: 'paint'; tiles: Vec[]; zone: Zone }
  | { type: 'expand' }
  | { type: 'hire'; candidateId: Id }
  | { type: 'fire'; staffId: Id }
  | { type: 'setRole'; staffId: Id; role: Role }
  | { type: 'setMenu'; item: MenuItemId; patch: Partial<MenuEntry> }
  | { type: 'setStockTarget'; ingredient: Ingredient; target: number }
  | { type: 'setAutoReorder'; ingredient: Ingredient; on: boolean }
  | { type: 'manualOrder'; ingredient: Ingredient; qty: number }
  | { type: 'takeLoan' }
  | { type: 'repayLoan' }
  | { type: 'dismissHint'; id: string }
  | { type: 'ackWin' }

export type CommandResult = { ok: true; id?: Id } | { ok: false; reason: LayoutError | string }

const OK: CommandResult = { ok: true }
const fail = (reason: LayoutError | string): CommandResult => ({ ok: false, reason })

/**
 * Owns the serializable world plus derived caches. `step()` advances one fixed tick;
 * `dispatch()` applies a player command between ticks (also while paused).
 */
export class Sim {
  world: World
  private events: SimEvent[] = []
  private cacheVersion = -1
  private cacheWorld: World | null = null
  private occ: Int32Array = new Int32Array(0)
  private paths = new Map<string, Vec[] | null>()
  hints: Hint[] = []
  /** Random customer arrivals (tests switch this off for scripted scenarios). */
  arrivals = true

  constructor(world: World) {
    this.world = world
    this.hints = computeHints(world)
  }

  newId(): Id {
    return this.world.nextId++
  }

  emit(e: SimEvent) {
    this.events.push(e)
  }

  /** Take and clear pending events (audio/UI). */
  drainEvents(): SimEvent[] {
    const e = this.events
    this.events = []
    return e
  }

  private ensureCache() {
    const w = this.world
    if (this.cacheVersion === w.layout.version && this.cacheWorld === w) return
    this.occ = buildOccupancy(w, objectList(w)).occ
    this.paths.clear()
    this.cacheVersion = w.layout.version
    this.cacheWorld = w
  }

  occupancy(): Int32Array {
    this.ensureCache()
    return this.occ
  }

  pathCache(): Map<string, Vec[] | null> {
    this.ensureCache()
    return this.paths
  }

  layoutChanged() {
    this.world.layout.version++
  }

  // ---------------- tick ----------------

  step() {
    const w = this.world
    w.clock.totalTicks++
    this.clockSystem()
    arrivalSystem(this)
    staffSystem(this)
    customerSystem(this)
    if (w.clock.totalTicks % 10 === 0) this.refreshHints()
  }

  refreshHints() {
    const w = this.world
    this.hints = computeHints(w)
    const live = new Set(this.hints.map((h) => h.id))
    // A dismissed hint whose cause cleared may show again next time it occurs.
    w.dismissedHints = w.dismissedHints.filter((id) => live.has(id))
  }

  private clockSystem() {
    const c = this.world.clock
    if (c.phase === 'open') {
      c.tick++
      if (c.tick >= OPEN_TICKS) c.phase = 'closing'
      return
    }
    if (c.phase === 'closing') {
      c.tick++
      if (Object.keys(this.world.groups).length === 0) {
        c.phase = 'night'
        c.nightTick = 0
        this.settle()
      }
      return
    }
    c.nightTick++
    if (c.nightTick >= NIGHT_TICKS) this.startDay()
  }

  /** Night settlement, in spec order. */
  settle() {
    const w = this.world
    const e = w.economy
    let wages = 0
    for (const s of Object.values(w.staff)) if (s.employedAtOpen) wages += s.wage
    if (wages) spend(this, wages, 'wages')
    spend(this, ECONOMY.rentPerDay, 'rent')
    if (e.loan > 0) spend(this, ECONOMY.loanInterestPerDay, 'interest')
    deliver(this)
    generateCandidates(this)
    evaluateStars(this)
    this.emit({ type: 'autosave' })
    e.today.repEnd = w.reputation.value
    e.history.push(e.today)
    if (e.history.length > ECONOMY.historyDays)
      e.history.splice(0, e.history.length - ECONOMY.historyDays)
    this.emit({ type: 'dayEnded', record: e.today })
    e.today = newDayRecord(w.clock.day + 1, w.reputation.value)
  }

  private startDay() {
    const w = this.world
    w.clock.day++
    w.clock.tick = 0
    w.clock.nightTick = 0
    w.clock.phase = 'open'
    for (const s of Object.values(w.staff)) s.employedAtOpen = s.state !== 'leaving'
  }

  // ---------------- commands ----------------

  dispatch(cmd: Command): CommandResult {
    const r = this.apply(cmd)
    this.refreshHints()
    return r
  }

  private apply(cmd: Command): CommandResult {
    const w = this.world
    switch (cmd.type) {
      case 'place': {
        const p: Placement = { def: cmd.def, x: cmd.x, y: cmd.y, rot: cmd.rot }
        const err = checkPlace(w, p)
        if (err) return fail(err)
        spend(this, CATALOGUE[cmd.def].tiers[0]?.cost ?? 0, 'construction')
        const o = newPlacedObject(this.newId(), p)
        w.objects[o.id] = o
        this.removeTrashUnder(o)
        this.layoutChanged()
        return { ok: true, id: o.id }
      }
      case 'move': {
        const o = w.objects[cmd.id]
        if (!o) return fail('notFound')
        const err = checkMove(w, cmd.id, { x: cmd.x, y: cmd.y, rot: cmd.rot })
        if (err) return fail(err)
        this.releaseObject(o)
        o.x = cmd.x
        o.y = cmd.y
        o.rot = cmd.rot
        this.removeTrashUnder(o)
        this.layoutChanged()
        return OK
      }
      case 'sell': {
        const o = w.objects[cmd.id]
        if (!o) return fail('notFound')
        const others = objectList(w).filter((x) => x.id !== o.id)
        const err = validateObjects(w, others)
        if (err) return fail(err)
        this.releaseObject(o)
        for (const t of Object.values(w.tasks))
          if (t.kind === 'clean' && t.tableId === o.id) {
            unclaimTask(this, t, { refund: false })
            delete w.tasks[t.id]
          }
        delete w.objects[o.id]
        refund(this, Math.round(objectValue(o) * ECONOMY.sellRefundRatio))
        this.layoutChanged()
        return OK
      }
      case 'upgrade': {
        const o = w.objects[cmd.id]
        if (!o) return fail('notFound')
        const def = CATALOGUE[o.def]
        const t2 = def.tiers[1]
        if (!def.station || !t2 || o.tier === 1) return fail('noUpgrade')
        if (!isUnlocked(w.stars, { kind: 'tier2', station: def.station })) return fail('locked')
        if (!canAfford(this, t2.cost)) return fail('insufficientFunds')
        spend(this, t2.cost, 'construction')
        o.tier = 1
        while (o.slots.length < t2.slots) o.slots.push(null)
        return OK
      }
      case 'paint': {
        let painted = 0
        for (const t of cmd.tiles) {
          if (t.x < 0 || t.y < 0 || t.x >= w.layout.w || t.y >= w.layout.h) continue
          const i = idx(t.x, t.y)
          const before = w.layout.zones[i]
          if (before === cmd.zone) continue
          w.layout.zones[i] = cmd.zone
          if (validateObjects(w, objectList(w))) w.layout.zones[i] = before as Zone
          else painted++
        }
        if (painted) this.layoutChanged()
        return painted || cmd.tiles.length === 0 ? OK : fail('wrongZone')
      }
      case 'expand': {
        if (w.layout.expanded) return fail('alreadyExpanded')
        if (!isUnlocked(w.stars, { kind: 'expansion' })) return fail('locked')
        if (!canAfford(this, LOT.expansionCost)) return fail('insufficientFunds')
        spend(this, LOT.expansionCost, 'construction')
        w.layout.w = LOT.expanded.w
        w.layout.h = LOT.expanded.h
        w.layout.expanded = true
        this.layoutChanged()
        return OK
      }
      case 'hire': {
        const s = hire(this, cmd.candidateId)
        return s ? { ok: true, id: s.id } : fail('notFound')
      }
      case 'fire':
        return fire(this, cmd.staffId) ? OK : fail('notFound')
      case 'setRole':
        return setRole(this, cmd.staffId, cmd.role) ? OK : fail('locked')
      case 'setMenu':
        setMenu(this, cmd.item, cmd.patch)
        return OK
      case 'setStockTarget':
        setStockTarget(this, cmd.ingredient, cmd.target)
        return OK
      case 'setAutoReorder':
        setAuto(this, cmd.ingredient, cmd.on)
        return OK
      case 'manualOrder':
        return manualOrder(this, cmd.ingredient, cmd.qty) ? OK : fail('insufficientFunds')
      case 'takeLoan':
        return takeLoan(this) ? OK : fail('loanOutstanding')
      case 'repayLoan':
        return repayLoan(this) ? OK : fail('insufficientFunds')
      case 'dismissHint':
        if (!w.dismissedHints.includes(cmd.id)) w.dismissedHints.push(cmd.id)
        return OK
      case 'ackWin':
        w.winSeen = true
        return OK
    }
  }

  /** Cancel work bound to an object being moved or sold. */
  private releaseObject(o: PlacedObject) {
    const w = this.world
    for (const t of Object.values(w.tasks)) {
      if (t.stationId === o.id) unclaimTask(this, t, { refund: true })
    }
    if (o.cashierId !== null) {
      const s = w.staff[o.cashierId]
      if (s && s.stationId === o.id) {
        s.stationId = null
        s.state = 'idle'
      }
      o.cashierId = null
    }
    releaseGroupsAt(this, o)
    if (o.def === 'pickup' && o.readyOrders.length) {
      for (const oid of o.readyOrders) {
        const order = w.orders[oid]
        if (!order) continue
        order.state = 'delivering'
        order.pickupId = null
        newTask(this, { role: 'assembler', kind: 'deliver', orderId: oid })
      }
      o.readyOrders = []
    }
    for (let i = 0; i < o.slots.length; i++) o.slots[i] = null
  }

  private removeTrashUnder(o: PlacedObject) {
    const w = this.world
    const tiles = new Set(footprintTiles(o).map((t) => idx(t.x, t.y)))
    for (const tr of Object.values(w.trash)) {
      if (!tiles.has(idx(tr.x, tr.y))) continue
      if (tr.taskId !== null) {
        const t = w.tasks[tr.taskId]
        if (t) {
          unclaimTask(this, t, { refund: false })
          delete w.tasks[t.id]
        }
      }
      delete w.trash[tr.id]
    }
  }
}
