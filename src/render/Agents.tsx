import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, type InstancedMesh, Object3D, Vector3 } from 'three'
import { host } from '../app/host'
import { useUI } from '../app/store'
import { CUSTOMERS } from '../data/balance'
import type { Role } from '../data/unlocks'
import type { Agent, PlacedObject } from '../sim/types'
import { objectTransform } from './coords'

const MAX_CUSTOMERS = CUSTOMERS.maxActiveGroups * 4
const MAX_STAFF = 40
const MAX_TRASH = 64

const SHIRTS = [
  '#3e7cb1',
  '#7b4ea3',
  '#2f9e77',
  '#e07a3f',
  '#c94f6d',
  '#5b6c8f',
  '#8f9c3e',
  '#3fa7c9',
]
const ROLE_COLOR: Record<Role, string> = {
  cashier: '#d9483b',
  cook: '#f5f5f5',
  assembler: '#f2c14e',
  cleaner: '#3e9bd6',
}
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']

const FORMATION = [
  [0, 0],
  [0.32, 0.18],
  [-0.32, 0.18],
  [0, 0.38],
] as const

const SEATS: Record<string, [number, number][]> = {
  table2: [
    [-0.55, -0.1],
    [0.55, -0.1],
  ],
  table4: [
    [-0.45, -0.75],
    [0.45, -0.75],
    [-0.45, 0.75],
    [0.45, 0.75],
  ],
}

const tmp = new Object3D()
const col = new Color()
const v = new Vector3()

/** Interpolated world position of an agent between its previous and current tick. */
export function agentPosition(a: Agent, alpha: number, out: Vector3) {
  return out.set(
    a.prev.x + (a.pos.x - a.prev.x) * alpha,
    0,
    a.prev.y + (a.pos.y - a.prev.y) * alpha,
  )
}

function seatPosition(table: PlacedObject, i: number, out: Vector3): boolean {
  const seat = SEATS[table.def]?.[i]
  if (!seat) return false
  const t = objectTransform(table.def, table.x, table.y, table.rot)
  out
    .set(seat[0], 0, seat[1])
    .applyAxisAngle(new Vector3(0, 1, 0), t.rotationY)
    .add(t.position)
  return true
}

function place(mesh: InstancedMesh, i: number, x: number, y: number, z: number, s = 1) {
  tmp.position.set(x, y, z)
  tmp.scale.setScalar(s)
  tmp.updateMatrix()
  mesh.setMatrixAt(i, tmp.matrix)
}

export function Agents() {
  const custBody = useRef<InstancedMesh>(null)
  const custHead = useRef<InstancedMesh>(null)
  const staffBody = useRef<InstancedMesh>(null)
  const staffHead = useRef<InstancedMesh>(null)
  const trash = useRef<InstancedMesh>(null)
  const shadows = useUI((s) => s.settings.shadows)

  const skin = useMemo(() => SKIN.map((c) => new Color(c)), [])

  useFrame(({ clock }) => {
    const sim = host.sim
    const cb = custBody.current
    const ch = custHead.current
    const sb = staffBody.current
    const sh = staffHead.current
    const tr = trash.current
    if (!sim || !cb || !ch || !sb || !sh || !tr) return
    const w = sim.world
    const alpha = host.alpha
    const time = clock.elapsedTime

    let n = 0
    for (const g of Object.values(w.groups)) {
      const moving = g.pos.x !== g.prev.x || g.pos.y !== g.prev.y
      const table = g.state === 'eating' && g.tableId !== null ? w.objects[g.tableId] : undefined
      agentPosition(g, alpha, v)
      for (let m = 0; m < g.size && n < MAX_CUSTOMERS; m++) {
        let x = v.x
        let z = v.z
        let y = 0
        if (table && seatPosition(table, m, v)) {
          x = v.x
          z = v.z
          y = 0.15
          agentPosition(g, alpha, v)
        } else {
          const f = FORMATION[m] ?? [0, 0]
          x += f[0]
          z += f[1]
        }
        const bob = moving ? Math.abs(Math.sin(time * 12 + g.id + m)) * 0.06 : 0
        place(cb, n, x, 0.42 + y + bob, z)
        place(ch, n, x, 0.88 + y + bob, z)
        cb.setColorAt(
          n,
          col.set(g.angry ? '#7a1f1f' : (SHIRTS[(g.id + m * 3) % SHIRTS.length] ?? '#888')),
        )
        ch.setColorAt(n, skin[(g.id * 7 + m) % skin.length] ?? col)
        n++
      }
    }
    cb.count = n
    ch.count = n

    let s = 0
    for (const st of Object.values(w.staff)) {
      if (s >= MAX_STAFF) break
      agentPosition(st, alpha, v)
      const moving = st.pos.x !== st.prev.x || st.pos.y !== st.prev.y
      const bob = moving ? Math.abs(Math.sin(time * 12 + st.id)) * 0.06 : 0
      place(sb, s, v.x, 0.42 + bob, v.z)
      place(sh, s, v.x, 0.88 + bob, v.z)
      sb.setColorAt(s, col.set(ROLE_COLOR[st.role]))
      sh.setColorAt(s, skin[(st.id * 5) % skin.length] ?? col)
      s++
    }
    sb.count = s
    sh.count = s

    let t = 0
    for (const tr0 of Object.values(w.trash)) {
      if (t >= MAX_TRASH) break
      place(tr, t, tr0.x + ((tr0.id % 5) - 2) * 0.08, 0.04, tr0.y + ((tr0.id % 3) - 1) * 0.1)
      t++
    }
    tr.count = t

    for (const m of [cb, ch, sb, sh, tr]) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh
        ref={custBody}
        args={[undefined, undefined, MAX_CUSTOMERS]}
        castShadow={shadows}
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.15, 0.42, 3, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh
        ref={custHead}
        args={[undefined, undefined, MAX_CUSTOMERS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh
        ref={staffBody}
        args={[undefined, undefined, MAX_STAFF]}
        castShadow={shadows}
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.16, 0.44, 3, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={staffHead} args={[undefined, undefined, MAX_STAFF]} frustumCulled={false}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={trash} args={[undefined, undefined, MAX_TRASH]} frustumCulled={false}>
        <boxGeometry args={[0.18, 0.06, 0.14]} />
        <meshStandardMaterial color="#9b8b6a" />
      </instancedMesh>
    </>
  )
}
