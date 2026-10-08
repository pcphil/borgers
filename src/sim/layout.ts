import { LOT, STREET } from '../data/balance'
import { CATALOGUE, type ObjectDefId } from '../data/catalogue'
import { isUnlocked } from '../data/unlocks'
import { accessTiles, footprintTiles, type Placement } from './geometry'
import type { Id, PlacedObject, Vec, World, Zone } from './types'
import { ZONE_DINING, ZONE_KITCHEN } from './types'

export const MAXW = LOT.expanded.w
export const MAXH = LOT.expanded.h
export const idx = (x: number, y: number) => y * MAXW + x

export const entranceTile = (): Vec => ({ x: LOT.entranceX, y: 0 })

/** Where a street route starts and ends for a side: just beyond the lot's side edges. */
export const streetEnd = (side: -1 | 1): Vec => ({
  x: side < 0 ? -STREET.spawnDistance : MAXW + STREET.spawnDistance,
  y: STREET.laneY,
})

export const inBounds = (w: World, x: number, y: number) =>
  x >= 0 && y >= 0 && x < w.layout.w && y < w.layout.h

export const zoneAt = (w: World, x: number, y: number): Zone =>
  (w.layout.zones[idx(x, y)] ?? ZONE_DINING) as Zone

export type PlacedLike = Placement & { id: Id }

export type LayoutError =
  | 'outOfBounds'
  | 'overlap'
  | 'blocksEntrance'
  | 'wrongZone'
  | 'accessBlocked'
  | 'accessUnreachable'
  | 'locked'
  | 'insufficientFunds'
  | 'notFound'
  | 'alreadyExpanded'
  | 'noUpgrade'

export const LAYOUT_ERROR_TEXT: Record<LayoutError, string> = {
  outOfBounds: 'Outside the lot',
  overlap: 'Overlaps another object',
  blocksEntrance: 'Blocks the entrance',
  wrongZone: 'Wrong zone for this object',
  accessBlocked: 'Would block access to an object',
  accessUnreachable: 'Would cut off an object from the entrance',
  locked: 'Not unlocked yet',
  insufficientFunds: 'Insufficient funds',
  notFound: 'Object not found',
  alreadyExpanded: 'Already expanded',
  noUpgrade: 'No upgrade available',
}

/** Occupancy grid: 0 = free, otherwise object id. Returns 'overlap'/'outOfBounds' on conflict. */
export function buildOccupancy(
  w: World,
  objects: PlacedLike[],
): { occ: Int32Array; error: LayoutError | null } {
  const occ = new Int32Array(MAXW * MAXH)
  const ent = entranceTile()
  for (const o of objects) {
    for (const t of footprintTiles(o)) {
      if (!inBounds(w, t.x, t.y)) return { occ, error: 'outOfBounds' }
      if (t.x === ent.x && t.y === ent.y) return { occ, error: 'blocksEntrance' }
      const i = idx(t.x, t.y)
      if (occ[i] !== 0) return { occ, error: 'overlap' }
      occ[i] = o.id
    }
  }
  return { occ, error: null }
}

export const isWalkable = (w: World, occ: Int32Array, x: number, y: number, customer: boolean) =>
  inBounds(w, x, y) && occ[idx(x, y)] === 0 && (!customer || zoneAt(w, x, y) === ZONE_DINING)

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

/** BFS flood fill from `from` over walkable tiles. Returns visited mask. */
export function flood(w: World, occ: Int32Array, from: Vec, customer: boolean): Uint8Array {
  const seen = new Uint8Array(MAXW * MAXH)
  if (!isWalkable(w, occ, from.x, from.y, customer)) return seen
  const q: number[] = [from.x, from.y]
  seen[idx(from.x, from.y)] = 1
  for (let h = 0; h < q.length; h += 2) {
    const x = q[h] as number
    const y = q[h + 1] as number
    for (const d of DIRS) {
      const nx = x + d.x
      const ny = y + d.y
      if (!isWalkable(w, occ, nx, ny, customer)) continue
      const i = idx(nx, ny)
      if (seen[i]) continue
      seen[i] = 1
      q.push(nx, ny)
    }
  }
  return seen
}

/** Validate a full set of objects against the world's lot and zones. */
export function validateObjects(w: World, objects: PlacedLike[]): LayoutError | null {
  const { occ, error } = buildOccupancy(w, objects)
  if (error) return error
  const ent = entranceTile()
  if (zoneAt(w, ent.x, ent.y) !== ZONE_DINING) return 'wrongZone'

  for (const o of objects) {
    const def = CATALOGUE[o.def]
    const tiles = footprintTiles(o)
    if (def.category === 'kitchen' && tiles.some((t) => zoneAt(w, t.x, t.y) !== ZONE_KITCHEN))
      return 'wrongZone'
    if (def.category === 'dining' && tiles.some((t) => zoneAt(w, t.x, t.y) !== ZONE_DINING))
      return 'wrongZone'
    for (const a of accessTiles(o)) {
      if (!inBounds(w, a.x, a.y)) return 'outOfBounds'
      if (occ[idx(a.x, a.y)] !== 0) return 'accessBlocked'
      const z = zoneAt(w, a.x, a.y)
      if (a.side === 'customer' && z !== ZONE_DINING) return 'wrongZone'
      if (def.category === 'counter' && a.side === 'staff' && z !== ZONE_KITCHEN) return 'wrongZone'
    }
  }

  const staffReach = flood(w, occ, ent, false)
  const custReach = flood(w, occ, ent, true)
  for (const o of objects) {
    const acc = accessTiles(o)
    const staffAcc = acc.filter((a) => a.side === 'staff')
    const custAcc = acc.filter((a) => a.side === 'customer')
    if (staffAcc.length && !staffAcc.some((a) => staffReach[idx(a.x, a.y)]))
      return 'accessUnreachable'
    if (custAcc.length && !custAcc.some((a) => custReach[idx(a.x, a.y)])) return 'accessUnreachable'
  }
  return null
}

export const objectList = (w: World): PlacedLike[] =>
  Object.values(w.objects).map((o) => ({ id: o.id, def: o.def, x: o.x, y: o.y, rot: o.rot }))

export const isObjectUnlocked = (w: World, def: ObjectDefId) =>
  isUnlocked(w.stars, { kind: 'object', id: def })

/** Read-only check used by build-mode previews and by the place command. */
export function checkPlace(w: World, p: Placement): LayoutError | null {
  if (!isObjectUnlocked(w, p.def)) return 'locked'
  const cost = CATALOGUE[p.def].tiers[0]?.cost ?? 0
  if (w.economy.cash < cost) return 'insufficientFunds'
  return validateObjects(w, [...objectList(w), { ...p, id: -1 }])
}

export function checkMove(w: World, id: Id, p: Omit<Placement, 'def'>): LayoutError | null {
  const o = w.objects[id]
  if (!o) return 'notFound'
  const others = objectList(w).filter((x) => x.id !== id)
  return validateObjects(w, [...others, { id, def: o.def, ...p }])
}

export function newPlacedObject(id: Id, p: Placement): PlacedObject {
  const def = CATALOGUE[p.def]
  return {
    id,
    def: p.def,
    x: p.x,
    y: p.y,
    rot: p.rot,
    tier: 0,
    slots: Array.from({ length: def.station ? (def.tiers[0]?.slots ?? 0) : 0 }, () => null),
    dirty: false,
    occupiedBy: null,
    cashierId: null,
    readyOrders: [],
    queue: [],
  }
}

/** Total purchase value of an object including upgrades (for sell refunds). */
export function objectValue(o: PlacedObject): number {
  const tiers = CATALOGUE[o.def].tiers
  let v = 0
  for (let t = 0; t <= o.tier; t++) v += tiers[t]?.cost ?? 0
  return v
}
