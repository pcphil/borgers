// look-and-polish: staff walk in from the street when hired and out along it when fired.
import { describe, expect, it } from 'vitest'
import { LOT, STREET, TICKS_PER_SECOND } from '../data/balance'
import { spawnGroup } from './customers'
import { createOrder } from './kitchen'
import { entranceTile, streetEnd } from './layout'
import { BASIC_OBJECTS, BASIC_STOCK, checkInvariants, makeSim, stepUntil } from './testkit'
import type { Id } from './types'

function hireOne(sim: ReturnType<typeof makeSim>) {
  const c = sim.world.candidates[0]
  if (!c) throw new Error('no candidate')
  sim.dispatch({ type: 'hire', candidateId: c.id })
  const s = sim.world.staff[c.id]
  if (!s) throw new Error('not hired')
  return s
}

const fire = (sim: ReturnType<typeof makeSim>, id: Id) =>
  sim.dispatch({ type: 'fire', staffId: id })

describe('staff street entrance', () => {
  it('a hired cook starts outside, takes no task while walking, then goes idle at the door', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const s = hireOne(sim)
    s.role = 'cook'
    expect(s.state).toBe('arriving')
    expect(s.pos).toEqual(streetEnd(s.side))
    const g = spawnGroup(sim, { atDoor: true })
    createOrder(sim, g.id, ['classic'], 600)
    const steps = stepUntil(sim, () => s.state !== 'arriving')
    expect(s.taskId).toBeNull()
    expect(s.state).toBe('idle')
    expect(s.pos).toEqual(entranceTile())
    // distance / speed, in ticks
    const speed = 2.6 * (0.8 + 0.4 * s.stats.speed)
    const dist = Math.abs(streetEnd(s.side).x - LOT.entranceX) + Math.abs(STREET.laneY)
    expect(Math.abs(steps - (dist / speed) * TICKS_PER_SECOND)).toBeLessThan(TICKS_PER_SECOND * 2)
    stepUntil(sim, () => s.taskId !== null)
    expect(s.taskId).not.toBeNull()
    checkInvariants(sim)
  })

  it('fired while walking along the lane: turns around and disappears at their end', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const s = hireOne(sim)
    for (let i = 0; i < 40; i++) sim.step()
    expect(s.state).toBe('arriving')
    expect(fire(sim, s.id).ok).toBe(true)
    expect(s.state).toBe('departing')
    stepUntil(sim, () => sim.world.staff[s.id] === undefined)
    expect(sim.world.staff[s.id]).toBeUndefined()
  })

  it('fired on the door column: walks back to the lane, then to their end', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const s = hireOne(sim)
    stepUntil(sim, () => s.pos.x === LOT.entranceX && s.pos.y > STREET.laneY + 0.3)
    expect(s.state).toBe('arriving')
    fire(sim, s.id)
    expect(s.state).toBe('departing')
    let sawLane = false
    stepUntil(sim, () => {
      checkInvariants(sim)
      if (s.pos.y === STREET.laneY) sawLane = true
      return sim.world.staff[s.id] === undefined
    })
    expect(sawLane).toBe(true)
  })

  it('fired inside: walks to the door then out along the street, unemployed meanwhile', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const s = hireOne(sim)
    stepUntil(sim, () => s.state === 'idle')
    fire(sim, s.id)
    expect(s.state).toBe('leaving')
    stepUntil(sim, () => s.state === 'departing')
    expect(s.pos).toEqual(entranceTile())
    stepUntil(sim, () => sim.world.staff[s.id] === undefined)
    expect(fire(sim, s.id).ok).toBe(false)
  })

  it('role change while arriving is recorded and applied after arrival', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS })
    const s = hireOne(sim)
    s.role = 'cook'
    expect(sim.dispatch({ type: 'setRole', staffId: s.id, role: 'cashier' }).ok).toBe(true)
    expect(s.pendingRole).toBe('cashier')
    stepUntil(sim, () => s.state === 'idle')
    sim.step()
    expect(s.role).toBe('cashier')
  })
})
