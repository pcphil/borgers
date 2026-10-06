import { TICKS_PER_SECOND } from '../data/balance'
import { tileOf } from './geometry'
import { isWalkable } from './layout'
import { findPath, nearestWalkable } from './path'
import type { Sim } from './sim'
import type { Agent, Vec } from './types'

export function newAgent(at: Vec): Agent {
  return {
    pos: { ...at },
    prev: { ...at },
    path: [],
    pathIdx: 0,
    target: null,
    pathVersion: -1,
    navFailed: false,
  }
}

/** Set a destination and compute a path. Returns false (and sets navFailed) if unreachable. */
export function setTarget(sim: Sim, a: Agent, to: Vec, customer: boolean): boolean {
  a.target = { x: to.x, y: to.y }
  a.navFailed = false
  return repath(sim, a, customer)
}

export function clearTarget(a: Agent) {
  a.target = null
  a.path = []
  a.pathIdx = 0
  a.navFailed = false
}

function repath(sim: Sim, a: Agent, customer: boolean): boolean {
  if (!a.target) return true
  let here = tileOf(a.pos)
  const occ = sim.occupancy()
  if (!isWalkable(sim.world, occ, here.x, here.y, customer)) {
    // Our tile became blocked (something was built on it): step to the nearest free tile.
    const free = nearestWalkable(sim, here, customer) ?? nearestWalkable(sim, here, false)
    if (free) {
      a.pos = { ...free }
      a.prev = { ...free }
      here = free
    }
  }
  const p = findPath(sim, here, a.target, customer)
  a.pathVersion = sim.world.layout.version
  if (!p) {
    a.path = []
    a.pathIdx = 0
    a.navFailed = true
    return false
  }
  a.path = p
  a.pathIdx = 0
  a.navFailed = false
  return true
}

export const atTarget = (a: Agent) =>
  a.target !== null && a.pos.x === a.target.x && a.pos.y === a.target.y

/**
 * Advance an agent along its path. Returns 'arrived' when at target, 'failed' if the target
 * is unreachable, else 'moving'. Agents with no target report 'arrived'.
 */
export function move(
  sim: Sim,
  a: Agent,
  tilesPerSecond: number,
  customer: boolean,
): 'arrived' | 'moving' | 'failed' {
  a.prev.x = a.pos.x
  a.prev.y = a.pos.y
  if (!a.target) return 'arrived'
  if (a.pathVersion !== sim.world.layout.version) repath(sim, a, customer)
  if (a.navFailed) return 'failed'
  let budget = tilesPerSecond / TICKS_PER_SECOND
  while (budget > 0 && a.pathIdx < a.path.length) {
    const next = a.path[a.pathIdx] as Vec
    const dx = next.x - a.pos.x
    const dy = next.y - a.pos.y
    const d = Math.abs(dx) + Math.abs(dy)
    if (d <= budget) {
      a.pos.x = next.x
      a.pos.y = next.y
      a.pathIdx++
      budget -= d
    } else {
      a.pos.x += (dx / d) * budget
      a.pos.y += (dy / d) * budget
      budget = 0
    }
  }
  if (a.pathIdx >= a.path.length) {
    a.pos.x = a.target.x
    a.pos.y = a.target.y
    return 'arrived'
  }
  return 'moving'
}
