import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import { Color, type InstancedMesh, Object3D, Vector3 } from 'three'
import { host } from '../app/host'
import { useUI } from '../app/store'
import { CUSTOMERS } from '../data/balance'
import type { Role } from '../data/unlocks'
import type { Agent, Group, PlacedObject, World } from '../sim/types'
import { objectTransform } from './coords'
import { type BakedCharacter, bakeCharacter, CHARACTER_URLS } from './kenney'

const MAX_CUSTOMERS = CUSTOMERS.maxActiveGroups * 4
const MAX_STAFF = 40
const MAX_TRASH = 64
const CHAR_HEIGHT = 0.95

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

/** Seat positions in table-local space (match the chairs in kenneyModels). */
const SEATS: Record<string, [number, number][]> = {
  table2: [
    [-0.75, 0],
    [0.75, 0],
  ],
  table4: [
    [-0.4, -0.75],
    [0.4, -0.75],
    [-0.4, 0.75],
    [0.4, 0.75],
  ],
}

const tmp = new Object3D()
const col = new Color()
const v = new Vector3()
const up = new Vector3(0, 1, 0)

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
  out.set(seat[0], 0, seat[1]).applyAxisAngle(up, t.rotationY).add(t.position)
  return true
}

function place(mesh: InstancedMesh, i: number, x: number, y: number, z: number, yaw = 0, s = 1) {
  tmp.position.set(x, y, z)
  tmp.rotation.set(0, yaw, 0)
  tmp.scale.setScalar(s)
  tmp.updateMatrix()
  mesh.setMatrixAt(i, tmp.matrix)
}

function flush(meshes: (InstancedMesh | null | undefined)[]) {
  for (const m of meshes) {
    if (!m) continue
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }
}

type Figure = {
  key: number
  x: number
  z: number
  y: number
  moving: boolean
  seated: boolean
  /** Yaw to face when seated (toward the table centre). */
  faceYaw: number | null
  variant: number
  /** Role colour (staff) used for hats and capsule bodies. */
  color: string | null
  angry: boolean
  bobSeed: number
}

/** Expand groups and staff into individual figures with interpolated positions. */
function figures(w: World, alpha: number, staff: boolean): Figure[] {
  const out: Figure[] = []
  if (staff) {
    for (const s of Object.values(w.staff)) {
      agentPosition(s, alpha, v)
      out.push({
        key: s.id * 8,
        x: v.x,
        z: v.z,
        y: 0,
        moving: s.pos.x !== s.prev.x || s.pos.y !== s.prev.y,
        seated: false,
        faceYaw: null,
        variant: s.id % 8,
        color: ROLE_COLOR[s.role],
        angry: false,
        bobSeed: s.id,
      })
    }
    return out
  }
  for (const g of Object.values(w.groups) as Group[]) {
    const moving = g.pos.x !== g.prev.x || g.pos.y !== g.prev.y
    const table = g.state === 'eating' && g.tableId !== null ? w.objects[g.tableId] : undefined
    agentPosition(g, alpha, v)
    const gx = v.x
    const gz = v.z
    for (let m = 0; m < g.size; m++) {
      const fig: Figure = {
        key: g.id * 8 + m,
        x: gx,
        z: gz,
        y: 0,
        moving,
        seated: false,
        faceYaw: null,
        variant: (g.id * 3 + m) % 8,
        color: null,
        angry: g.angry,
        bobSeed: g.id + m,
      }
      if (table && seatPosition(table, m, v)) {
        const t = objectTransform(table.def, table.x, table.y, table.rot)
        fig.x = v.x
        fig.z = v.z
        fig.seated = true
        fig.faceYaw = Math.atan2(t.position.x - v.x, t.position.z - v.z)
      } else {
        const f = FORMATION[m] ?? [0, 0]
        fig.x += f[0]
        fig.z += f[1]
      }
      out.push(fig)
    }
  }
  return out
}

/** Remember each figure's facing so standing agents keep looking where they last walked. */
function useFacing() {
  const yaw = useRef(new Map<number, { x: number; z: number; yaw: number }>())
  return (f: Figure) => {
    const prev = yaw.current.get(f.key)
    let y = prev?.yaw ?? Math.PI
    if (f.faceYaw !== null) y = f.faceYaw
    else if (prev) {
      const dx = f.x - prev.x
      const dz = f.z - prev.z
      if (dx * dx + dz * dz > 1e-5) y = Math.atan2(dx, dz)
    }
    yaw.current.set(f.key, { x: f.x, z: f.z, yaw: y })
    return y
  }
}

/** Kenney mini-characters baked to static poses and drawn with one InstancedMesh per variant. */
function CharacterAgents() {
  const gltfs = useGLTF(CHARACTER_URLS)
  const baked = useMemo(
    () =>
      gltfs.map((g) => ({
        stand: bakeCharacter(g.scene, g.animations, 'idle', CHAR_HEIGHT),
        sit: bakeCharacter(g.scene, g.animations, 'sit', CHAR_HEIGHT),
      })),
    [gltfs],
  )
  const stand = useRef<(InstancedMesh | null)[]>([])
  const sit = useRef<(InstancedMesh | null)[]>([])
  const hats = useRef<InstancedMesh>(null)
  const shadows = useUI((s) => s.settings.shadows)
  const faceCustomer = useFacing()
  const faceStaff = useFacing()

  useFrame(({ clock }) => {
    const sim = host.sim
    if (!sim || !hats.current) return
    const counts = new Array(16).fill(0) as number[]
    const time = clock.elapsedTime
    const put = (f: Figure, yaw: number) => {
      const meshes = f.seated ? sit.current : stand.current
      const idx = (f.seated ? 8 : 0) + f.variant
      const m = meshes[f.variant]
      if (!m) return
      const i = counts[idx] ?? 0
      if (i >= m.instanceMatrix.count) return
      const bob = f.moving ? Math.abs(Math.sin(time * 12 + f.bobSeed)) * 0.05 : 0
      place(m, i, f.x, f.y + bob, f.z, yaw)
      m.setColorAt(i, col.set(f.angry ? '#ff8a80' : '#ffffff'))
      counts[idx] = i + 1
    }
    for (const f of figures(sim.world, host.alpha, false)) put(f, faceCustomer(f))
    let h = 0
    for (const f of figures(sim.world, host.alpha, true)) {
      put(f, faceStaff(f))
      const bob = f.moving ? Math.abs(Math.sin(time * 12 + f.bobSeed)) * 0.05 : 0
      place(hats.current, h, f.x, CHAR_HEIGHT + 0.02 + bob, f.z)
      hats.current.setColorAt(h, col.set(f.color ?? '#fff'))
      h++
    }
    hats.current.count = h
    for (let k = 0; k < 8; k++) {
      const s0 = stand.current[k]
      const s1 = sit.current[k]
      if (s0) s0.count = counts[k] ?? 0
      if (s1) s1.count = counts[8 + k] ?? 0
    }
    flush([...stand.current, ...sit.current, hats.current])
  })

  const mesh = (b: BakedCharacter | null, arr: typeof stand, k: number, cap: number) =>
    b ? (
      <instancedMesh
        key={k}
        ref={(m) => {
          arr.current[k] = m
        }}
        args={[b.geometry, b.material, cap]}
        castShadow={shadows}
        frustumCulled={false}
      />
    ) : null

  return (
    <>
      {baked.map((b, k) => mesh(b.stand, stand, k, MAX_CUSTOMERS + MAX_STAFF))}
      {baked.map((b, k) => mesh(b.sit, sit, k, MAX_CUSTOMERS))}
      <instancedMesh ref={hats} args={[undefined, undefined, MAX_STAFF]} frustumCulled={false}>
        <cylinderGeometry args={[0.13, 0.15, 0.08, 10]} />
        <meshStandardMaterial />
      </instancedMesh>
    </>
  )
}

/** Simple capsule people, shown while character models load (and as a fallback). */
function CapsuleAgents() {
  const custBody = useRef<InstancedMesh>(null)
  const custHead = useRef<InstancedMesh>(null)
  const staffBody = useRef<InstancedMesh>(null)
  const staffHead = useRef<InstancedMesh>(null)
  const skin = useMemo(() => SKIN.map((c) => new Color(c)), [])

  useFrame(({ clock }) => {
    const sim = host.sim
    const cb = custBody.current
    const ch = custHead.current
    const sb = staffBody.current
    const sh = staffHead.current
    if (!sim || !cb || !ch || !sb || !sh) return
    const time = clock.elapsedTime
    let n = 0
    for (const f of figures(sim.world, host.alpha, false)) {
      if (n >= MAX_CUSTOMERS) break
      const bob = f.moving ? Math.abs(Math.sin(time * 12 + f.bobSeed)) * 0.06 : 0
      place(cb, n, f.x, 0.42 + bob, f.z)
      place(ch, n, f.x, 0.88 + bob, f.z)
      cb.setColorAt(n, col.set(f.angry ? '#7a1f1f' : (SHIRTS[f.key % SHIRTS.length] ?? '#888')))
      ch.setColorAt(n, skin[f.key % skin.length] ?? col)
      n++
    }
    cb.count = n
    ch.count = n
    let s = 0
    for (const f of figures(sim.world, host.alpha, true)) {
      if (s >= MAX_STAFF) break
      const bob = f.moving ? Math.abs(Math.sin(time * 12 + f.bobSeed)) * 0.06 : 0
      place(sb, s, f.x, 0.42 + bob, f.z)
      place(sh, s, f.x, 0.88 + bob, f.z)
      sb.setColorAt(s, col.set(f.color ?? '#fff'))
      sh.setColorAt(s, skin[f.key % skin.length] ?? col)
      s++
    }
    sb.count = s
    sh.count = s
    flush([cb, ch, sb, sh])
  })

  return (
    <>
      <instancedMesh
        ref={custBody}
        args={[undefined, undefined, MAX_CUSTOMERS]}
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
      <instancedMesh ref={staffBody} args={[undefined, undefined, MAX_STAFF]} frustumCulled={false}>
        <capsuleGeometry args={[0.16, 0.44, 3, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={staffHead} args={[undefined, undefined, MAX_STAFF]} frustumCulled={false}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial />
      </instancedMesh>
    </>
  )
}

function Trash() {
  const ref = useRef<InstancedMesh>(null)
  useFrame(() => {
    const m = ref.current
    const w = host.sim?.world
    if (!m || !w) return
    let t = 0
    for (const tr of Object.values(w.trash)) {
      if (t >= MAX_TRASH) break
      place(m, t, tr.x + ((tr.id % 5) - 2) * 0.08, 0.04, tr.y + ((tr.id % 3) - 1) * 0.1, tr.id)
      t++
    }
    m.count = t
    flush([m])
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_TRASH]} frustumCulled={false}>
      <boxGeometry args={[0.18, 0.06, 0.14]} />
      <meshStandardMaterial color="#9b8b6a" />
    </instancedMesh>
  )
}

export function Agents() {
  return (
    <>
      <Suspense fallback={<CapsuleAgents />}>
        <CharacterAgents />
      </Suspense>
      <Trash />
    </>
  )
}
