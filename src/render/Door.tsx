import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh } from 'three'
import { host } from '../app/host'
import { LOT } from '../data/balance'
import { wallState } from './Walls'

const DOOR_W = 0.96
/** Anyone closer than this to the door opens it (street walkers approach along the lane). */
const REACH = 1.8
const DOOR_Z = -0.5

/** Hinged door in the front-wall gap; swings inward while a customer or staff member is near. */
export function Door() {
  const hinge = useRef<Group>(null)
  const leaf = useRef<Mesh>(null)
  const open = useRef(0)

  useFrame((_, dt) => {
    const w = host.sim?.world
    if (!w || !hinge.current || !leaf.current) return
    let near = false
    const check = (p: { x: number; y: number }) => {
      if (Math.hypot(p.x - LOT.entranceX, p.y - DOOR_Z) < REACH) near = true
    }
    for (const g of Object.values(w.groups)) check(g.pos)
    for (const s of Object.values(w.staff)) check(s.pos)
    open.current += ((near ? 1 : 0) - open.current) * Math.min(1, dt * 9)
    hinge.current.rotation.y = -open.current * 1.55
    const h = wallState.front
    leaf.current.scale.y = h
    leaf.current.position.y = h / 2
  })

  return (
    <group ref={hinge} position={[LOT.entranceX - DOOR_W / 2, 0, DOOR_Z - 0.07]}>
      <mesh
        ref={leaf}
        position={[DOOR_W / 2, 0.125, 0]}
        scale={[DOOR_W, 0.25, 0.06]}
        raycast={() => null}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8a5a35" />
      </mesh>
    </group>
  )
}
