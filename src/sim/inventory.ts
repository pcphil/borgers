import { INVENTORY } from '../data/balance'
import { CATALOGUE } from '../data/catalogue'
import { INGREDIENT_COST, INGREDIENTS, type Ingredient } from '../data/recipes'
import { canAfford, refund, spend } from './economy'
import type { Sim } from './sim'
import type { Inventory, World } from './types'

export const zeroIngredients = (): Record<Ingredient, number> =>
  Object.fromEntries(INGREDIENTS.map((i) => [i, 0])) as Record<Ingredient, number>

export function newInventory(): Inventory {
  return {
    stock: zeroIngredients(),
    reserved: zeroIngredients(),
    targets: zeroIngredients(),
    auto: Object.fromEntries(INGREDIENTS.map((i) => [i, false])) as Record<Ingredient, boolean>,
    pending: zeroIngredients(),
  }
}

export function capacity(w: World): number {
  let cap = INVENTORY.baseCapacity
  for (const o of Object.values(w.objects)) cap += CATALOGUE[o.def].storage ?? 0
  return cap
}

export function totalStock(w: World): number {
  let n = 0
  for (const i of INGREDIENTS) n += w.inventory.stock[i]
  return n
}

export const available = (w: World, i: Ingredient) => w.inventory.stock[i] - w.inventory.reserved[i]

export function canReserve(w: World, need: Partial<Record<Ingredient, number>>): boolean {
  for (const [i, n] of Object.entries(need) as [Ingredient, number][]) {
    if (available(w, i) < n) return false
  }
  return true
}

export function reserve(w: World, need: Partial<Record<Ingredient, number>>) {
  for (const [i, n] of Object.entries(need) as [Ingredient, number][]) w.inventory.reserved[i] += n
}

export function release(w: World, need: Partial<Record<Ingredient, number>>) {
  for (const [i, n] of Object.entries(need) as [Ingredient, number][])
    w.inventory.reserved[i] = Math.max(0, w.inventory.reserved[i] - n)
}

/** Consume reserved ingredients at step start. */
export function consume(w: World, need: Partial<Record<Ingredient, number>>) {
  for (const [i, n] of Object.entries(need) as [Ingredient, number][]) {
    w.inventory.stock[i] -= n
    w.inventory.reserved[i] = Math.max(0, w.inventory.reserved[i] - n)
  }
}

/** Return consumed ingredients to stock and re-reserve them for the requeued step. */
export function unconsume(w: World, need: Partial<Record<Ingredient, number>>) {
  for (const [i, n] of Object.entries(need) as [Ingredient, number][]) {
    w.inventory.stock[i] += n
    w.inventory.reserved[i] += n
  }
}

export function setTarget(sim: Sim, i: Ingredient, n: number) {
  sim.world.inventory.targets[i] = Math.max(0, Math.floor(n))
}

export function setAuto(sim: Sim, i: Ingredient, on: boolean) {
  sim.world.inventory.auto[i] = on
}

/** Manual order: paid now, delivered at next settlement. */
export function manualOrder(sim: Sim, i: Ingredient, n: number): boolean {
  const qty = Math.floor(n)
  if (qty <= 0) return false
  const cost = qty * INGREDIENT_COST[i]
  if (!canAfford(sim, cost)) return false
  spend(sim, cost, 'ingredients')
  sim.world.inventory.pending[i] += qty
  return true
}

/**
 * Night delivery: manual orders first, then auto-reorder up to target, truncated to capacity.
 * Truncated manual quantities are refunded. Auto-reorders may push cash negative.
 */
export function deliver(sim: Sim): number {
  const w = sim.world
  const inv = w.inventory
  const cap = capacity(w)
  let room = cap - totalStock(w)
  let truncated = 0
  for (const i of INGREDIENTS) {
    const want = inv.pending[i]
    if (want <= 0) continue
    const got = Math.max(0, Math.min(want, room))
    inv.stock[i] += got
    room -= got
    if (got < want) {
      truncated += want - got
      refund(sim, (want - got) * INGREDIENT_COST[i])
    }
    inv.pending[i] = 0
  }
  // Auto-reorder: share remaining room proportionally so no ingredient is starved.
  const wants = INGREDIENTS.map((i) =>
    inv.auto[i] ? Math.max(0, inv.targets[i] - inv.stock[i]) : 0,
  )
  const totalWant = wants.reduce((a, b) => a + b, 0)
  const scale = totalWant > room ? Math.max(0, room) / totalWant : 1
  INGREDIENTS.forEach((i, k) => {
    const want = wants[k] ?? 0
    if (want <= 0) return
    const got = Math.floor(want * scale)
    if (got > 0) {
      spend(sim, got * INGREDIENT_COST[i], 'ingredients')
      inv.stock[i] += got
    }
    truncated += want - got
  })
  if (truncated > 0)
    sim.emit({
      type: 'notice',
      text: `Storage full: ${truncated} ingredients could not be delivered. Build a fridge.`,
    })
  w.economy.today.deliveryTruncated = truncated
  return truncated
}
