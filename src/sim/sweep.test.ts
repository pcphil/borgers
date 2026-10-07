// Stability sweep (fix-pass group 3): save/load mid-day, command fuzz, long soak.
import { describe, expect, it } from 'vitest'
import { CATALOGUE, type ObjectDefId } from '../data/catalogue'
import { INGREDIENTS, MENU_ITEM_IDS } from '../data/recipes'
import { autoplay } from '../dev/autopilot'
import { deserialize, serialize, toSim } from '../save/format'
import { hashWorld } from './hash'
import { pick, randInt, randRange, seedRng } from './rng'
import { runDays } from './runner'
import type { Command, Sim } from './sim'
import { checkInvariants } from './testkit'
import type { Rot } from './types'
import { newGame } from './world'

const ROLES = ['cashier', 'cook', 'assembler', 'cleaner'] as const
const DEFS = Object.keys(CATALOGUE) as ObjectDefId[]

function hireAll(sim: Sim) {
  for (const c of [...sim.world.candidates]) sim.dispatch({ type: 'hire', candidateId: c.id })
}

describe('save/load mid-day', () => {
  it('a reloaded world continues identically to the original', () => {
    const sim = newGame(5)
    hireAll(sim)
    // Mid-day with customers in every state: step until groups exist and orders are in flight.
    for (let i = 0; i < 2600; i++) sim.step()
    sim.drainEvents()
    expect(Object.keys(sim.world.groups).length).toBeGreaterThan(0)
    expect(sim.world.clock.phase).toBe('open')

    const loaded = toSim(deserialize(JSON.parse(JSON.stringify(serialize(sim)))))
    expect(hashWorld(loaded.world)).toBe(hashWorld(sim.world))
    for (let i = 0; i < 3000; i++) {
      sim.step()
      loaded.step()
    }
    expect(hashWorld(loaded.world)).toBe(hashWorld(sim.world))
    checkInvariants(loaded)
  })

  it('saving does not alias live state', () => {
    const sim = newGame(6)
    hireAll(sim)
    for (let i = 0; i < 400; i++) sim.step()
    const save = serialize(sim)
    const before = hashWorld(save.world)
    for (let i = 0; i < 400; i++) sim.step()
    expect(hashWorld(save.world)).toBe(before)
  })
})

/** A random command, deliberately including nonsense ids, coordinates and amounts. */
function randomCommand(sim: Sim, rng: ReturnType<typeof seedRng>): Command {
  const w = sim.world
  const objIds = Object.keys(w.objects).map(Number)
  const staffIds = Object.keys(w.staff).map(Number)
  const bogus = randInt(rng, 0, 4) === 0
  const objId = bogus || !objIds.length ? randInt(rng, 9000, 9999) : pick(rng, objIds)
  const staffId = bogus || !staffIds.length ? randInt(rng, 9000, 9999) : pick(rng, staffIds)
  const coord = () => (bogus ? randInt(rng, -5, 40) : randInt(rng, 0, w.layout.w))
  const rot = randInt(rng, 0, 3) as Rot
  switch (randInt(rng, 0, 14)) {
    case 0:
    case 1:
      return { type: 'place', def: pick(rng, DEFS), x: coord(), y: coord(), rot }
    case 2:
      return { type: 'move', id: objId, x: coord(), y: coord(), rot }
    case 3:
    case 4:
      return { type: 'sell', id: objId }
    case 5:
      return { type: 'upgrade', id: objId }
    case 6:
      return {
        type: 'paint',
        tiles: [{ x: coord(), y: coord() }],
        zone: randInt(rng, 0, 1) as 0 | 1,
      }
    case 7:
      return { type: 'expand' }
    case 8:
      return {
        type: 'hire',
        candidateId: w.candidates.length && !bogus ? pick(rng, w.candidates).id : 9999,
      }
    case 9:
      return { type: 'fire', staffId }
    case 10:
      return { type: 'setRole', staffId, role: pick(rng, ROLES) }
    case 11:
      return {
        type: 'setMenu',
        item: pick(rng, MENU_ITEM_IDS),
        patch: bogus
          ? { price: randInt(rng, -500, 100_000) }
          : { enabled: randInt(rng, 0, 1) === 1, price: randInt(rng, 100, 3000) },
      }
    case 12:
      return {
        type: 'manualOrder',
        ingredient: pick(rng, INGREDIENTS),
        qty: bogus ? randInt(rng, -50, 5000) : randInt(rng, 1, 40),
      }
    case 13:
      return {
        type: 'setStockTarget',
        ingredient: pick(rng, INGREDIENTS),
        target: randInt(rng, -10, 200),
      }
    default:
      return randInt(rng, 0, 1) ? { type: 'takeLoan' } : { type: 'repayLoan' }
  }
}

describe('command fuzz', () => {
  for (const seed of [1, 2, 3]) {
    it(`seed ${seed}: random valid and invalid commands never break the sim`, () => {
      const sim = newGame(seed)
      const rng = seedRng(1000 + seed)
      const accepted: Record<string, number> = {}
      for (let tick = 0; tick < 20 * 240 * 6; tick++) {
        if (tick % 15 === 0) {
          const cmd = randomCommand(sim, rng)
          const r = sim.dispatch(cmd)
          if (r.ok) accepted[cmd.type] = (accepted[cmd.type] ?? 0) + 1
        }
        sim.step()
        sim.drainEvents()
        if (tick % 101 === 0) checkInvariants(sim)
      }
      checkInvariants(sim)
      // The fuzz must actually exercise the risky paths, not just be rejected.
      expect(accepted.sell ?? 0).toBeGreaterThan(0)
      expect(accepted.fire ?? 0).toBeGreaterThan(0)
      expect(accepted.place ?? 0).toBeGreaterThan(0)
      expect(accepted.move ?? 0).toBeGreaterThan(0)
    }, 120_000)
  }

  it('ignores non-finite numbers in commands instead of corrupting the world', () => {
    const sim = newGame(4)
    const w = sim.world
    const item = MENU_ITEM_IDS[0] as (typeof MENU_ITEM_IDS)[number]
    const price = w.menu[item].price
    const target = w.inventory.targets.bun
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      sim.dispatch({ type: 'setMenu', item, patch: { price: bad } })
      sim.dispatch({ type: 'setStockTarget', ingredient: 'bun', target: bad })
      sim.dispatch({ type: 'manualOrder', ingredient: 'bun', qty: bad })
    }
    expect(w.menu[item].price).toBe(price)
    expect(w.inventory.targets.bun).toBe(target)
    expect(JSON.parse(JSON.stringify(w))).toEqual(w)
  })

  it('rapid price and menu flips mid-order keep reservations consistent', () => {
    const sim = newGame(9)
    hireAll(sim)
    const rng = seedRng(42)
    for (let tick = 0; tick < 20 * 240 * 2; tick++) {
      if (tick % 3 === 0)
        sim.dispatch({
          type: 'setMenu',
          item: pick(rng, MENU_ITEM_IDS),
          patch: { enabled: randRange(rng, 0, 1) > 0.5, price: randInt(rng, 100, 2500) },
        })
      sim.step()
      sim.drainEvents()
      if (tick % 53 === 0) checkInvariants(sim)
    }
    checkInvariants(sim)
  }, 120_000)
})

describe('soak', () => {
  // 100 competent-autopilot days per seed; slow, so opt in with SOAK=1 (run once for fix-pass).
  for (const seed of [1, 2, 3]) {
    it.skipIf(!import.meta.env.SOAK)(
      `seed ${seed}: 100 days hold invariants`,
      () => {
        const sim = newGame(seed)
        let tick = 0
        for (let d = 0; d < 100; d++) {
          autoplay(sim, 1)
          checkInvariants(sim)
        }
        runDays(sim, 1, () => {
          if (++tick % 211 === 0) checkInvariants(sim)
        })
        expect(Object.keys(sim.world.groups).length).toBeLessThanOrEqual(36)
        expect(sim.world.economy.history.length).toBeGreaterThan(0)
      },
      600_000,
    )
  }
})
