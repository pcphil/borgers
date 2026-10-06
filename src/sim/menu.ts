import { CUSTOMERS } from '../data/balance'
import { CATALOGUE, type StationType } from '../data/catalogue'
import { type Ingredient, MENU, MENU_ITEM_IDS, type MenuItemId } from '../data/recipes'
import { isUnlocked } from '../data/unlocks'
import { canReserve } from './inventory'
import type { Sim } from './sim'
import type { MenuEntry, World } from './types'

export function newMenu(): Record<MenuItemId, MenuEntry> {
  return Object.fromEntries(
    MENU_ITEM_IDS.map((id) => [id, { enabled: true, price: MENU[id].fairValue }]),
  ) as Record<MenuItemId, MenuEntry>
}

export const isMenuUnlocked = (w: World, id: MenuItemId) =>
  isUnlocked(w.stars, { kind: 'menu', id })

export function stationExists(w: World, type: StationType): boolean {
  for (const o of Object.values(w.objects)) if (CATALOGUE[o.def].station === type) return true
  return false
}

export function itemNeeds(id: MenuItemId): Partial<Record<Ingredient, number>> {
  const out: Partial<Record<Ingredient, number>> = {}
  for (const s of MENU[id].steps)
    for (const [i, n] of Object.entries(s.consumes) as [Ingredient, number][])
      out[i] = (out[i] ?? 0) + n
  return out
}

export type Unavailable = 'locked' | 'disabled' | 'noStation' | 'outOfStock'

export function unavailableReason(w: World, id: MenuItemId): Unavailable | null {
  if (!isMenuUnlocked(w, id)) return 'locked'
  if (!w.menu[id].enabled) return 'disabled'
  for (const s of MENU[id].steps) if (!stationExists(w, s.station)) return 'noStation'
  if (!canReserve(w, itemNeeds(id))) return 'outOfStock'
  return null
}

export const isAvailable = (w: World, id: MenuItemId) => unavailableReason(w, id) === null

/** Demand multiplier for a price relative to fair value. 1 at fair value. */
export function attractiveness(price: number, fair: number): number {
  if (price <= 0) return 2
  return Math.min(2, Math.max(0.05, (fair / price) ** CUSTOMERS.priceElasticity))
}

export function priceFairness(price: number, fair: number): number {
  if (price <= fair) return 1
  return Math.max(0, (fair / price) ** 2)
}

export function setMenu(sim: Sim, id: MenuItemId, patch: Partial<MenuEntry>) {
  const e = sim.world.menu[id]
  if (patch.enabled !== undefined) e.enabled = patch.enabled
  if (patch.price !== undefined) e.price = Math.max(0, Math.round(patch.price))
}
