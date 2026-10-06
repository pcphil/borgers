import { idx, inBounds, isWalkable, MAXH, MAXW } from './layout'
import type { Sim } from './sim'
import type { Vec } from './types'

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

/** Minimal binary min-heap of (priority, value). */
class Heap {
  private p: number[] = []
  private v: number[] = []
  get size() {
    return this.v.length
  }
  push(priority: number, value: number) {
    const p = this.p
    const v = this.v
    p.push(priority)
    v.push(value)
    let i = v.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if ((p[parent] as number) <= (p[i] as number)) break
      ;[p[parent], p[i]] = [p[i] as number, p[parent] as number]
      ;[v[parent], v[i]] = [v[i] as number, v[parent] as number]
      i = parent
    }
  }
  pop(): number {
    const p = this.p
    const v = this.v
    const top = v[0] as number
    const lp = p.pop() as number
    const lv = v.pop() as number
    if (v.length > 0) {
      p[0] = lp
      v[0] = lv
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < v.length && (p[l] as number) < (p[m] as number)) m = l
        if (r < v.length && (p[r] as number) < (p[m] as number)) m = r
        if (m === i) break
        ;[p[m], p[i]] = [p[i] as number, p[m] as number]
        ;[v[m], v[i]] = [v[i] as number, v[m] as number]
        i = m
      }
    }
    return top
  }
}

/**
 * A* on the 4-connected tile grid. Returns tiles after `from` up to and including `to`,
 * [] if from === to, or null if unreachable. `from` itself need not be walkable.
 */
export function findPath(sim: Sim, from: Vec, to: Vec, customer: boolean): Vec[] | null {
  const w = sim.world
  if (from.x === to.x && from.y === to.y) return []
  const occ = sim.occupancy()
  if (!isWalkable(w, occ, to.x, to.y, customer)) return null
  const key = `${from.x},${from.y},${to.x},${to.y},${customer ? 1 : 0}`
  const cache = sim.pathCache()
  const hit = cache.get(key)
  if (hit === null) return null
  if (hit !== undefined) return hit.map((t) => ({ ...t }))

  const n = MAXW * MAXH
  const g = new Float64Array(n).fill(Number.POSITIVE_INFINITY)
  const came = new Int32Array(n).fill(-1)
  const start = idx(from.x, from.y)
  const goal = idx(to.x, to.y)
  g[start] = 0
  const open = new Heap()
  open.push(Math.abs(from.x - to.x) + Math.abs(from.y - to.y), start)
  let found = false
  while (open.size) {
    const cur = open.pop()
    if (cur === goal) {
      found = true
      break
    }
    const cx = cur % MAXW
    const cy = (cur - cx) / MAXW
    const cg = g[cur] as number
    for (const d of DIRS) {
      const nx = cx + d.x
      const ny = cy + d.y
      if (!isWalkable(w, occ, nx, ny, customer)) continue
      const ni = idx(nx, ny)
      const ng = cg + 1
      if (ng < (g[ni] as number)) {
        g[ni] = ng
        came[ni] = cur
        // Tie-break toward goal deterministically via tiny heuristic bias.
        open.push(ng + (Math.abs(nx - to.x) + Math.abs(ny - to.y)) * 1.001, ni)
      }
    }
  }
  if (!found) {
    cache.set(key, null)
    return null
  }
  const out: Vec[] = []
  for (let c = goal; c !== start; c = came[c] as number) {
    const x = c % MAXW
    out.push({ x, y: (c - x) / MAXW })
  }
  out.reverse()
  cache.set(key, out)
  return out.map((t) => ({ ...t }))
}

/** BFS distances (in tiles) from `from` over walkable tiles; -1 if unreachable. */
export function distanceField(sim: Sim, from: Vec, customer: boolean): Int32Array {
  const w = sim.world
  const occ = sim.occupancy()
  const dist = new Int32Array(MAXW * MAXH).fill(-1)
  if (!inBounds(w, from.x, from.y)) return dist
  dist[idx(from.x, from.y)] = 0
  const q = [from.x, from.y]
  for (let h = 0; h < q.length; h += 2) {
    const x = q[h] as number
    const y = q[h + 1] as number
    const dd = dist[idx(x, y)] as number
    for (const d of DIRS) {
      const nx = x + d.x
      const ny = y + d.y
      if (!isWalkable(w, occ, nx, ny, customer)) continue
      const i = idx(nx, ny)
      if ((dist[i] as number) >= 0) continue
      dist[i] = dd + 1
      q.push(nx, ny)
    }
  }
  return dist
}

/** Nearest walkable tile to `from` (BFS over all in-bounds tiles), or null. */
export function nearestWalkable(sim: Sim, from: Vec, customer: boolean): Vec | null {
  const w = sim.world
  const occ = sim.occupancy()
  if (isWalkable(w, occ, from.x, from.y, customer)) return from
  const seen = new Uint8Array(MAXW * MAXH)
  const q = [from.x, from.y]
  if (inBounds(w, from.x, from.y)) seen[idx(from.x, from.y)] = 1
  for (let h = 0; h < q.length; h += 2) {
    const x = q[h] as number
    const y = q[h + 1] as number
    for (const d of DIRS) {
      const nx = x + d.x
      const ny = y + d.y
      if (!inBounds(w, nx, ny)) continue
      const i = idx(nx, ny)
      if (seen[i]) continue
      seen[i] = 1
      if (isWalkable(w, occ, nx, ny, customer)) return { x: nx, y: ny }
      q.push(nx, ny)
    }
  }
  return null
}
