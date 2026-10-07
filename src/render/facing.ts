import type { Vec } from '../sim/types'

/** Smaller than any real step (a tile per tick is ~0.1) but above float noise. */
const EPSILON = 1e-6

/**
 * Yaw (rotation about +y) that points a +z-facing model along the sim movement `prev -> pos`.
 * Tile (x, y) maps to world (x, 0, z = y). Returns null when the agent did not move this tick.
 * Uses the fixed-tick sim vector, so it is independent of display frame rate and game speed.
 */
export function moveYaw(prev: Vec, pos: Vec): number | null {
  const dx = pos.x - prev.x
  const dy = pos.y - prev.y
  if (dx * dx + dy * dy < EPSILON) return null
  return Math.atan2(dx, dy)
}

/** Facing for an agent: its direction of travel, else keep the last facing. */
export const facingYaw = (prev: Vec, pos: Vec, lastYaw: number): number =>
  moveYaw(prev, pos) ?? lastYaw
