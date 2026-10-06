import { describe, expect, it } from 'vitest'
import { INGREDIENTS } from '../data/recipes'
import { hashWorld } from './hash'
import { runDays } from './runner'
import type { Sim } from './sim'
import { newGame } from './world'

function checkInvariants(sim: Sim) {
  const w = sim.world
  for (const i of INGREDIENTS) {
    expect(w.inventory.stock[i]).toBeGreaterThanOrEqual(0)
    expect(w.inventory.reserved[i]).toBeGreaterThanOrEqual(0)
    expect(w.inventory.reserved[i]).toBeLessThanOrEqual(w.inventory.stock[i])
  }
  for (const a of [...Object.values(w.groups), ...Object.values(w.staff)]) {
    expect(a.pos.x).toBeGreaterThanOrEqual(0)
    expect(a.pos.y).toBeGreaterThanOrEqual(0)
    expect(a.pos.x).toBeLessThan(w.layout.w)
    expect(a.pos.y).toBeLessThan(w.layout.h)
  }
  for (const t of Object.values(w.tasks)) {
    if (t.claimedBy !== null) expect(w.staff[t.claimedBy]?.taskId).toBe(t.id)
    // A task for a vanished order may only be one already being worked on.
    if (t.orderId !== null && !w.orders[t.orderId]) expect(t.claimedBy).not.toBeNull()
  }
  for (const s of Object.values(w.staff))
    if (s.taskId !== null) expect(w.tasks[s.taskId]?.claimedBy).toBe(s.id)
  for (const o of Object.values(w.objects)) {
    for (const slot of o.slots) if (slot !== null) expect(w.tasks[slot]).toBeDefined()
    for (const g of o.queue) expect(w.groups[g]?.registerId).toBe(o.id)
    if (o.occupiedBy !== null) expect(w.groups[o.occupiedBy]?.tableId).toBe(o.id)
    for (const r of o.readyOrders) expect(w.orders[r]?.state).toBe('ready')
  }
}

type Strategy = (sim: Sim) => void
const STRATEGIES: Record<string, Strategy> = {
  noStaff: () => {},
  three: (sim) => {
    for (const c of [...sim.world.candidates].slice(0, Math.max(0, 3 - Object.keys(sim.world.staff).length)))
      sim.dispatch({ type: 'hire', candidateId: c.id })
  },
  churn: (sim) => {
    // Hire everyone, fire the oldest, rebuild the grill mid-day: stresses cancellation paths.
    for (const c of [...sim.world.candidates]) sim.dispatch({ type: 'hire', candidateId: c.id })
    const staff = Object.values(sim.world.staff)
    if (staff.length > 5 && staff[0]) sim.dispatch({ type: 'fire', staffId: staff[0].id })
    const grill = Object.values(sim.world.objects).find((o) => o.def === 'grill')
    if (grill) sim.dispatch({ type: 'move', id: grill.id, x: grill.x === 2 ? 0 : 2, y: 8, rot: 0 })
  },
}

describe('simulation invariants (9.4)', () => {
  for (const [name, strategy] of Object.entries(STRATEGIES)) {
    for (const seed of [1, 2, 3]) {
      it(`${name} seed ${seed}: 30 days hold invariants`, () => {
        const sim = newGame(seed)
        let tick = 0
        for (let d = 0; d < 30; d++) {
          strategy(sim)
          runDays(sim, 1, (s) => {
            if (++tick % 97 === 0) {
              if (tick % (97 * 50) === 0) strategy(s)
              checkInvariants(s)
            }
          })
        }
        checkInvariants(sim)
      }, 120_000)
    }
  }
  it('determinism: same seed + strategy gives the same hash', () => {
    const play = () => {
      const sim = newGame(77)
      for (let d = 0; d < 5; d++) {
        STRATEGIES.churn?.(sim)
        runDays(sim, 1)
      }
      return hashWorld(sim.world)
    }
    expect(play()).toBe(play())
  }, 120_000)
})
