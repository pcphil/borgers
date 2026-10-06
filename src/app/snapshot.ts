import { CLOSE_HOUR, NIGHT_TICKS, OPEN_HOUR, TICKS_PER_HOUR } from '../data/balance'
import { INGREDIENTS, type Ingredient, MENU_ITEM_IDS, type MenuItemId } from '../data/recipes'
import type { Hint } from '../sim/hints'
import { capacity, totalStock } from '../sim/inventory'
import { type Unavailable, unavailableReason } from '../sim/menu'
import type { Sim } from '../sim/sim'
import type { Candidate, DayRecord, Phase, PlacedObject, Staff } from '../sim/types'
import type { Speed } from './loop'

export type ObjectView = Pick<PlacedObject, 'id' | 'def' | 'x' | 'y' | 'rot' | 'tier'>

export type Snapshot = {
  tick: number
  day: number
  hour: number
  clockText: string
  phase: Phase
  speed: Speed
  cash: number
  loan: number
  reputation: number
  stars: number
  winPending: boolean
  hints: Hint[]
  layoutVersion: number
  lot: { w: number; h: number; expanded: boolean }
  objects: ObjectView[]
  staff: Pick<Staff, 'id' | 'name' | 'role' | 'pendingRole' | 'stats' | 'wage' | 'state'>[]
  candidates: Candidate[]
  menu: { id: MenuItemId; enabled: boolean; price: number; unavailable: Unavailable | null }[]
  inventory: {
    id: Ingredient
    stock: number
    reserved: number
    target: number
    auto: boolean
    pending: number
  }[]
  capacity: number
  totalStock: number
  today: DayRecord
  history: DayRecord[]
  customers: number
}

export function gameHour(sim: Sim): number {
  const c = sim.world.clock
  if (c.phase === 'night')
    return CLOSE_HOUR + ((24 - CLOSE_HOUR + OPEN_HOUR) * c.nightTick) / NIGHT_TICKS
  return OPEN_HOUR + c.tick / TICKS_PER_HOUR
}

export function formatClock(hour: number): string {
  const h = Math.floor(hour) % 24
  const m = Math.floor((hour - Math.floor(hour)) * 60)
  return `${String(h).padStart(2, '0')}:${String(m - (m % 5)).padStart(2, '0')}`
}

export function makeSnapshot(sim: Sim, speed: Speed): Snapshot {
  const w = sim.world
  const hour = gameHour(sim)
  return {
    tick: w.clock.totalTicks,
    day: w.clock.day,
    hour,
    clockText: formatClock(hour),
    phase: w.clock.phase,
    speed,
    cash: w.economy.cash,
    loan: w.economy.loan,
    reputation: w.reputation.value,
    stars: w.stars,
    winPending: w.stars >= 5 && !w.winSeen,
    hints: sim.hints.filter((h) => !w.dismissedHints.includes(h.id)),
    layoutVersion: w.layout.version,
    lot: { w: w.layout.w, h: w.layout.h, expanded: w.layout.expanded },
    objects: Object.values(w.objects).map(({ id, def, x, y, rot, tier }) => ({
      id,
      def,
      x,
      y,
      rot,
      tier,
    })),
    staff: Object.values(w.staff).map(({ id, name, role, pendingRole, stats, wage, state }) => ({
      id,
      name,
      role,
      pendingRole,
      stats,
      wage,
      state,
    })),
    candidates: w.candidates,
    menu: MENU_ITEM_IDS.map((id) => ({
      id,
      enabled: w.menu[id].enabled,
      price: w.menu[id].price,
      unavailable: unavailableReason(w, id),
    })),
    inventory: INGREDIENTS.map((id) => ({
      id,
      stock: w.inventory.stock[id],
      reserved: w.inventory.reserved[id],
      target: w.inventory.targets[id],
      auto: w.inventory.auto[id],
      pending: w.inventory.pending[id],
    })),
    capacity: capacity(w),
    totalStock: totalStock(w),
    today: w.economy.today,
    history: w.economy.history,
    customers: Object.keys(w.groups).length,
  }
}

export const money = (cents: number) => {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(Math.round(cents))
  const digits = abs % 100 === 0 ? 0 : 2
  return `${sign}$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}
