import { audioStatus } from '../audio/sfx'
import { LOT } from '../data/balance'
import type { ObjectDefId } from '../data/catalogue'
import { autoplay } from '../dev/autopilot'
import { spawnGroup } from '../sim/customers'
import { idx, newPlacedObject } from '../sim/layout'
import { newGame } from '../sim/world'
import { host } from './host'

/**
 * Stress scene for the perf budget (task 11.8): expanded lot, ~150 objects and 100 agents.
 * Objects are inserted directly (bypassing placement rules); the sim is paused afterwards.
 */
function stress(agents = 100, objects = 150) {
  const sim = newGame(99)
  const w = sim.world
  w.layout.w = LOT.expanded.w
  w.layout.h = LOT.expanded.h
  w.layout.expanded = true
  // Fill free tiles (keeping the entrance row clear) with 1x1 objects until the target count.
  const defs: ObjectDefId[] = ['plant', 'bin', 'lamp', 'fryer', 'soda', 'fridge']
  let placed = Object.keys(w.objects).length
  for (let y = 2; y < w.layout.h && placed < objects; y++)
    for (let x = 0; x < w.layout.w && placed < objects; x++) {
      if (sim.occupancy()[idx(x, y)] !== 0) continue
      const p = newPlacedObject(sim.newId(), {
        def: defs[placed % defs.length] as ObjectDefId,
        x,
        y,
        rot: 0,
      })
      w.objects[p.id] = p
      sim.layoutChanged()
      placed++
    }
  sim.layoutChanged()
  for (const c of [...w.candidates]) sim.dispatch({ type: 'hire', candidateId: c.id })
  let people = Object.keys(w.staff).length
  while (people < agents) {
    const g = spawnGroup(sim, { atDoor: true })
    g.size = Math.min(4, agents - people)
    g.angry = false
    g.state = 'leaving'
    g.pos = { x: (people * 7) % w.layout.w, y: (people * 3) % w.layout.h }
    g.prev = { ...g.pos }
    g.target = null
    people += g.size
  }
  host.start(sim)
  host.setSpeed(0)
  return { objects: Object.keys(w.objects).length, agents: people }
}

/** Average frames per second over `ms` milliseconds. */
function measureFps(ms = 5000): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0
    const start = performance.now()
    const tick = (t: number) => {
      frames++
      if (t - start < ms) requestAnimationFrame(tick)
      else resolve((frames * 1000) / (t - start))
    }
    requestAnimationFrame(tick)
  })
}

/** Dev/test hook: exposes the host on window for scripted playtests (not used by the game). */
export function exposeDebug() {
  ;(window as unknown as { borgers: unknown }).borgers = {
    host,
    audioStatus,
    stress,
    measureFps,
    /** Fast-forward `days` with the scripted competent player (dev/testing only). */
    autoplay: (days: number) => {
      if (!host.sim) return null
      autoplay(host.sim, days)
      host.sim.drainEvents()
      host.publish()
      const w = host.sim.world
      return { day: w.clock.day, stars: w.stars, cash: w.economy.cash }
    },
  }
}
