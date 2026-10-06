import { type AccessTile, CATALOGUE, type ObjectDefId } from '../data/catalogue'
import type { Rot, Vec } from './types'

/** Footprint size after rotation. */
export function rotatedSize(def: ObjectDefId, rot: Rot): { w: number; h: number } {
  const d = CATALOGUE[def]
  return rot % 2 === 0 ? { w: d.w, h: d.h } : { w: d.h, h: d.w }
}

/**
 * Rotate a local offset (relative to the rot-0 footprint origin) by `rot` quarter turns clockwise,
 * returning an offset relative to the rotated footprint's origin.
 */
export function rotateOffset(dx: number, dy: number, w: number, h: number, rot: Rot): Vec {
  switch (rot) {
    case 0:
      return { x: dx, y: dy }
    case 1:
      return { x: h - 1 - dy, y: dx }
    case 2:
      return { x: w - 1 - dx, y: h - 1 - dy }
    case 3:
      return { x: dy, y: w - 1 - dx }
  }
}

export type Placement = { def: ObjectDefId; x: number; y: number; rot: Rot }

export function footprintTiles(p: Placement): Vec[] {
  const { w, h } = rotatedSize(p.def, p.rot)
  const out: Vec[] = []
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) out.push({ x: p.x + dx, y: p.y + dy })
  return out
}

export type WorldAccess = Vec & { side: AccessTile['side'] }

export function accessTiles(p: Placement): WorldAccess[] {
  const d = CATALOGUE[p.def]
  return d.access.map((a) => {
    const o = rotateOffset(a.dx, a.dy, d.w, d.h, p.rot)
    return { x: p.x + o.x, y: p.y + o.y, side: a.side }
  })
}

/** Direction from the footprint toward a rot-0 "front" (-y), after rotation. */
export function frontDir(rot: Rot): Vec {
  return [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ][rot] as Vec
}

export const manhattan = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

export const tileOf = (v: Vec): Vec => ({ x: Math.round(v.x), y: Math.round(v.y) })

export const sameTile = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y
