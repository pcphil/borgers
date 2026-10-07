import type { ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { Color, type InstancedMesh, Object3D } from 'three'
import { host } from '../app/host'
import { useUI } from '../app/store'
import { LOT, STREET } from '../data/balance'
import { idx, MAXH, MAXW, zoneAt } from '../sim/layout'
import { ZONE_KITCHEN } from '../sim/types'
import { reasonText } from '../ui/text'
import { worldToTile } from './coords'

const tmp = new Object3D()
const col = new Color()
const DINING = ['#e9d8b4', '#e2cfa8']
const KITCHEN = ['#c9d2d6', '#bcc6cb']

/** Ground wide enough that customers appear from beyond the default view at either end. */
const GROUND_W = MAXW + 2 * STREET.spawnDistance + 60

/** Dashed centre line down the street. */
function StreetMarkings() {
  const ref = useRef<InstancedMesh>(null)
  const count = Math.floor(GROUND_W / 2)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    for (let i = 0; i < count; i++) {
      tmp.position.set(MAXW / 2 - GROUND_W / 2 + i * 2 + 1, 0.0, STREET.laneY - 0.55)
      tmp.rotation.set(-Math.PI / 2, 0, 0)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [count])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[0.9, 0.08]} />
      <meshStandardMaterial color="#e8e0b0" />
    </instancedMesh>
  )
}

function Tiles() {
  const ref = useRef<InstancedMesh>(null)
  const version = useUI((s) => s.snapshot?.layoutVersion)
  const lotW = useUI((s) => s.snapshot?.lot.w ?? 0)
  const lotH = useUI((s) => s.snapshot?.lot.h ?? 0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: version signals zone/layout changes
  useLayoutEffect(() => {
    const m = ref.current
    const sim = host.sim
    if (!m || !sim) return
    let n = 0
    for (let y = 0; y < lotH; y++)
      for (let x = 0; x < lotW; x++) {
        tmp.position.set(x, 0.001, y)
        tmp.rotation.set(-Math.PI / 2, 0, 0)
        tmp.updateMatrix()
        m.setMatrixAt(n, tmp.matrix)
        const pal = zoneAt(sim.world, x, y) === ZONE_KITCHEN ? KITCHEN : DINING
        m.setColorAt(n, col.set(pal[(x + y) % 2] ?? '#ccc'))
        n++
      }
    m.count = n
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [version, lotW, lotH])

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, MAXW * MAXH]}
      receiveShadow
      frustumCulled={false}
    >
      <planeGeometry args={[0.98, 0.98]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

/** Nearest customer group or staff member to a ground point, within reach. */
function agentAt(px: number, pz: number) {
  const w = host.sim?.world
  if (!w) return null
  let best: { kind: 'group' | 'staff'; id: number; d: number } | null = null
  for (const g of Object.values(w.groups)) {
    const d = Math.hypot(g.pos.x - px, g.pos.y - pz)
    if (d < 0.55 && (!best || d < best.d)) best = { kind: 'group', id: g.id, d }
  }
  for (const s of Object.values(w.staff)) {
    const d = Math.hypot(s.pos.x - px, s.pos.y - pz)
    if (d < 0.55 && (!best || d < best.d)) best = { kind: 'staff', id: s.id, d }
  }
  return best
}

function objectAt(x: number, y: number) {
  const sim = host.sim
  if (!sim || x < 0 || y < 0 || x >= sim.world.layout.w || y >= sim.world.layout.h) return null
  const id = sim.occupancy()[idx(x, y)] ?? 0
  return id > 0 ? id : null
}

export function Ground() {
  const lot = useUI((s) => s.snapshot?.lot)
  const painting = useRef(false)

  const paintAt = (x: number, y: number) => {
    const tool = useUI.getState().tool
    if (tool.kind !== 'paint') return
    host.dispatch({ type: 'paint', tiles: [{ x, y }], zone: tool.zone })
  }

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const t = worldToTile(e.point)
    const ui = useUI.getState()
    if (!ui.hover || ui.hover.x !== t.x || ui.hover.y !== t.y) {
      ui.set({ hover: t })
      if (painting.current) paintAt(t.x, t.y)
    }
  }

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    if (useUI.getState().tool.kind === 'paint') {
      painting.current = true
      const t = worldToTile(e.point)
      paintAt(t.x, t.y)
    }
  }

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.button !== 0 || e.delta > 6) return
    const ui = useUI.getState()
    const t = worldToTile(e.point)
    const tool = ui.tool
    if (tool.kind === 'place') {
      const r = host.dispatch({ type: 'place', def: tool.def, x: t.x, y: t.y, rot: tool.rot })
      if (!r.ok) ui.toast(`Can't place here: ${reasonText(r.reason)}`)
      return
    }
    if (tool.kind === 'move') {
      const r = host.dispatch({ type: 'move', id: tool.id, x: t.x, y: t.y, rot: tool.rot })
      if (r.ok) ui.set({ tool: { kind: 'none' } })
      else ui.toast(`Can't move here: ${reasonText(r.reason)}`)
      return
    }
    if (tool.kind === 'paint') return
    const agent = agentAt(e.point.x, e.point.z)
    if (agent) return ui.select({ kind: agent.kind, id: agent.id })
    const obj = objectAt(t.x, t.y)
    ui.select(obj ? { kind: 'object', id: obj } : null)
  }

  if (!lot) return null
  return (
    <group>
      {/* Sidewalk and surroundings */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[MAXW / 2, -0.01, MAXH / 2 - 3]}
        receiveShadow
      >
        <planeGeometry args={[GROUND_W, MAXH + 60]} />
        <meshStandardMaterial color="#8fb06b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[MAXW / 2, -0.005, -1.5]} receiveShadow>
        <planeGeometry args={[GROUND_W, 2]} />
        <meshStandardMaterial color="#6f7377" />
      </mesh>
      <StreetMarkings />
      <Tiles />
      {/* Entrance mat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LOT.entranceX, 0.01, 0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshStandardMaterial color="#8c2f2f" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[MAXW / 2, 0.005, MAXH / 2]}
        visible={false}
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={() => {
          painting.current = false
        }}
        onPointerLeave={() => {
          painting.current = false
          useUI.getState().set({ hover: null })
        }}
        onClick={onClick}
      >
        <planeGeometry args={[MAXW + 30, MAXH + 30]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  )
}
