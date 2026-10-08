import { describe, expect, it } from 'vitest'
import { spawnGroup } from '../sim/customers'
import { BASIC_OBJECTS, BASIC_STOCK, makeSim, stepUntil } from '../sim/testkit'
import { hasBag } from './labelRules'

describe('takeout bag marker', () => {
  it('marks takeout groups only, including a dine-in group that falls back to takeout', () => {
    const sim = makeSim({ objects: BASIC_OBJECTS, stock: BASIC_STOCK })
    const dineIn = spawnGroup(sim, { atDoor: true })
    const away = spawnGroup(sim, { atDoor: true })
    dineIn.takeout = false
    away.takeout = true
    expect(hasBag(dineIn)).toBe(false)
    expect(hasBag(away)).toBe(true)
    // No free chair anywhere: the dine-in group gives up waiting and takes its food away.
    for (const o of Object.values(sim.world.objects)) o.seatOccupants.fill(999)
    dineIn.state = 'seeking'
    dineIn.timer = 0
    stepUntil(sim, () => dineIn.state === 'leaving')
    expect(hasBag(dineIn)).toBe(true)
  })
})
