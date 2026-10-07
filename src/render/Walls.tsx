import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { useUI } from '../app/store'
import { LOT } from '../data/balance'

const THICK = 0.14
const LOW = 0.25
const FULL = 1.8
const DOOR_W = 1

/** Current front-wall height, shared with the door so its leaf follows the cutaway. */
export const wallState = { front: LOW, full: FULL }

type Wall = {
  key: string
  /** Centre of the wall on the ground, size along x and z. */
  x: number
  z: number
  sx: number
  sz: number
  /** Outward horizontal normal; walls facing the camera are cut down. */
  nx: number
  nz: number
  front?: boolean
}

/** Four boundary walls around the lot tiles (-0.5..w-0.5, -0.5..h-0.5); the front has a door gap. */
export function wallsFor(w: number, h: number, doorX: number): Wall[] {
  const x0 = -0.5
  const x1 = w - 0.5
  const z0 = -0.5
  const z1 = h - 0.5
  const gapL = doorX - DOOR_W / 2
  const gapR = doorX + DOOR_W / 2
  const frontZ = z0 - THICK / 2
  return [
    {
      key: 'back',
      x: (x0 + x1) / 2,
      z: z1 + THICK / 2,
      sx: x1 - x0 + 2 * THICK,
      sz: THICK,
      nx: 0,
      nz: 1,
    },
    {
      key: 'left',
      x: x0 - THICK / 2,
      z: (z0 + z1) / 2,
      sx: THICK,
      sz: z1 - z0,
      nx: -1,
      nz: 0,
    },
    {
      key: 'right',
      x: x1 + THICK / 2,
      z: (z0 + z1) / 2,
      sx: THICK,
      sz: z1 - z0,
      nx: 1,
      nz: 0,
    },
    {
      key: 'front-l',
      x: (x0 - THICK + gapL) / 2,
      z: frontZ,
      sx: gapL - (x0 - THICK),
      sz: THICK,
      nx: 0,
      nz: -1,
      front: true,
    },
    {
      key: 'front-r',
      x: (gapR + x1 + THICK) / 2,
      z: frontZ,
      sx: x1 + THICK - gapR,
      sz: THICK,
      nx: 0,
      nz: -1,
      front: true,
    },
  ]
}

/**
 * Perimeter walls. Walls facing the camera are cut down to a low curb so the interior stays
 * visible; the far walls stay full height. Recomputed per frame, so rotating the view (Q/E)
 * animates the change. Render only: no raycast and no shadows.
 */
export function Walls() {
  const lot = useUI((s) => s.snapshot?.lot)
  const meshes = useRef<Record<string, Mesh | null>>({})
  const heights = useRef<Record<string, number>>({})

  useFrame(({ camera }, dt) => {
    if (!lot) return
    const cx = (lot.w - 1) / 2
    const cz = (lot.h - 1) / 2
    for (const wall of wallsFor(lot.w, lot.h, LOT.entranceX)) {
      const m = meshes.current[wall.key]
      if (!m) continue
      const facing = wall.nx * (camera.position.x - cx) + wall.nz * (camera.position.z - cz) > 0
      const target = facing ? LOW : FULL
      const cur = heights.current[wall.key] ?? target
      const next = cur + (target - cur) * Math.min(1, dt * 8)
      heights.current[wall.key] = next
      m.scale.y = next
      m.position.y = next / 2
      if (wall.front) wallState.front = next
    }
  })

  if (!lot) return null
  return (
    <group>
      {wallsFor(lot.w, lot.h, LOT.entranceX).map((wall) => (
        <mesh
          key={wall.key}
          ref={(m) => {
            meshes.current[wall.key] = m
          }}
          position={[wall.x, LOW / 2, wall.z]}
          scale={[wall.sx, LOW, wall.sz]}
          raycast={() => null}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ece0c6" />
        </mesh>
      ))}
    </group>
  )
}
