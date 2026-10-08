import { describe, expect, it } from 'vitest'
import { CATALOGUE } from '../data/catalogue'
import type { Ingredient } from '../data/recipes'
import { MENU_ITEM_IDS } from '../data/recipes'
import { STARTER } from '../data/starterLayout'
import { STRATEGIES } from '../dev/autopilot'
import { itemNeeds, unavailableReason } from './menu'
import { runDays } from './runner'
import { newGame } from './world'

const SEEDS = [1, 2, 3, 4, 5]

describe('starter layout playability (early-game-balance)', () => {
  it('seats at least twelve diners', () => {
    const seats = STARTER.objects.reduce((n, o) => n + (CATALOGUE[o.def].seats ?? 0), 0)
    expect(seats).toBeGreaterThanOrEqual(12)
  })

  for (const seed of SEEDS) {
    it(`seed ${seed}: day 1 with three hires has no stock-out and is not a seating failure`, () => {
      const sim = newGame(seed)
      STRATEGIES.competent?.(sim)
      expect(Object.keys(sim.world.staff)).toHaveLength(3)
      // Ingredients of everything the player can sell on day 1.
      const used = new Set<Ingredient>()
      for (const id of MENU_ITEM_IDS)
        if (unavailableReason(sim.world, id) === null)
          for (const i of Object.keys(itemNeeds(id)) as Ingredient[]) used.add(i)
      expect(used.size).toBeGreaterThan(0)

      const low = new Map<Ingredient, number>()
      runDays(sim, 1, (s) => {
        if (s.world.clock.phase !== 'open') return
        for (const i of used)
          low.set(i, Math.min(low.get(i) ?? Infinity, s.world.inventory.stock[i] ?? 0))
      })
      for (const i of used) expect(low.get(i), `${i} ran out on day 1`).toBeGreaterThan(0)

      const day = sim.world.economy.history.at(-1)
      const top = Object.entries(day?.complaints ?? {}).sort((a, b) => b[1] - a[1])[0]
      expect(top?.[0]).not.toBe('noSeats')
      expect(day?.complaints.nothingToOrder ?? 0).toBe(0)
    })
  }
})
