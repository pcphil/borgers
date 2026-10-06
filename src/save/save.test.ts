import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { handleAutosave } from '../app/autosave'
import { hashWorld } from '../sim/hash'
import { runTicks } from '../sim/runner'
import { newGame, SAVE_VERSION } from '../sim/world'
import { deserialize, exportJson, importJson, migrate, SaveError, serialize, toSim } from './format'
import { AUTO_SLOT, idbKV, memoryKV, openKV, SaveSlots } from './slots'

const busyGame = () => {
  const sim = newGame(11)
  for (const c of [...sim.world.candidates]) sim.dispatch({ type: 'hire', candidateId: c.id })
  runTicks(sim, 2000) // mid-service: customers, orders and tasks in flight
  return sim
}

describe('serialize / deserialize (10.1)', () => {
  it('step^N(load(save(w))) equals step^N(w), mid-service', () => {
    const sim = busyGame()
    const inFlight = Object.keys(sim.world.groups).length + Object.keys(sim.world.tasks).length
    expect(inFlight).toBeGreaterThan(0)
    const loaded = toSim(deserialize(JSON.parse(exportJson(serialize(sim)))))
    runTicks(sim, 1500)
    runTicks(loaded, 1500)
    expect(hashWorld(loaded.world)).toBe(hashWorld(sim.world))
  })
})

describe('versioning (10.2)', () => {
  it('migrates older saves', () => {
    const v0 = JSON.parse(JSON.stringify(newGame(1).world))
    delete v0.winSeen
    delete v0.dismissedHints
    v0.version = 0
    const save = deserialize({ format: 'borgers-save', version: 0, savedAt: '', world: v0 })
    expect(save.world.winSeen).toBe(false)
    expect(save.world.dismissedHints).toEqual([])
    expect(save.version).toBe(SAVE_VERSION)
    expect(migrate({}, 0).version).toBe(1)
  })
  it('refuses saves from a newer version', () => {
    const s = { ...serialize(newGame(1)), version: SAVE_VERSION + 1 }
    expect(() => deserialize(s)).toThrow(/newer version/)
  })
})

describe('slots (10.3)', () => {
  for (const [name, make] of [
    ['memory', memoryKV],
    ['indexeddb', idbKV],
  ] as const) {
    it(`${name}: save, list, load, delete`, async () => {
      const slots = new SaveSlots(make())
      for (const m of await slots.list()) await slots.remove(m.id)
      const sim = newGame(3)
      await slots.saveSim('a', 'My burger place', sim)
      await slots.saveSim(AUTO_SLOT, 'Autosave', sim)
      const list = await slots.list()
      expect(list.map((m) => m.id)).toEqual([AUTO_SLOT, 'a'])
      expect(list[1]).toMatchObject({
        name: 'My burger place',
        day: 1,
        stars: 1,
        cash: sim.world.economy.cash,
      })
      expect(await slots.has('a')).toBe(true)
      expect(hashWorld((await slots.load('a')).world)).toBe(hashWorld(sim.world))
      await slots.remove('a')
      expect(await slots.has('a')).toBe(false)
    })
  }
  it('openKV uses IndexedDB when present', async () => {
    expect((await openKV()).persistent).toBe(true)
  })
})

describe('export / import (10.4)', () => {
  it('round-trips JSON', () => {
    const sim = newGame(4)
    expect(hashWorld(importJson(exportJson(serialize(sim))).world)).toBe(hashWorld(sim.world))
  })
  it('rejects invalid files without touching slots', async () => {
    const slots = new SaveSlots(memoryKV())
    await slots.saveSim('a', 'keep', newGame(1))
    for (const bad of [
      'not json',
      '{}',
      '{"format":"borgers-save","version":1,"world":{"seed":1}}',
    ]) {
      expect(() => importJson(bad)).toThrow(SaveError)
    }
    expect((await slots.list()).map((m) => m.name)).toEqual(['keep'])
  })
})

describe('autosave (10.5)', () => {
  it('saves on settlement events only when enabled', async () => {
    let saves = 0
    const save = async () => {
      saves++
    }
    expect(await handleAutosave([{ type: 'autosave' }], true, save)).toBe(true)
    expect(await handleAutosave([{ type: 'autosave' }], false, save)).toBe(false)
    expect(await handleAutosave([{ type: 'purchase', amount: 1 }], true, save)).toBe(false)
    expect(saves).toBe(1)
  })
  it('night settlement emits an autosave event', () => {
    const sim = newGame(1)
    let saw = false
    while (sim.world.clock.phase !== 'night') {
      sim.step()
      if (sim.drainEvents().some((e) => e.type === 'autosave')) saw = true
    }
    expect(saw).toBe(true)
  })
})
