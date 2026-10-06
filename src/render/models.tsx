import type { ReactNode } from 'react'
import type { ObjectDefId } from '../data/catalogue'

// Low-poly primitive models. Each is built in local space at rotation 0, centred on its
// footprint (w along x, h along z), with its front facing -z.

const C = {
  steel: '#9aa3ad',
  darkSteel: '#5d6670',
  black: '#2b2b2b',
  wood: '#b07a4a',
  darkWood: '#7a5230',
  red: '#d9483b',
  cream: '#f3e3c3',
  white: '#f5f5f5',
  green: '#4f9d4a',
  pot: '#a0522d',
  yellow: '#f2c14e',
  blue: '#3e7cb1',
}

const Box = ({
  size,
  pos,
  color,
  cast = true,
}: {
  size: [number, number, number]
  pos: [number, number, number]
  color: string
  cast?: boolean
}) => (
  <mesh position={pos} castShadow={cast} receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} />
  </mesh>
)

function Counter({ w, color, top }: { w: number; color: string; top: string }) {
  return (
    <>
      <Box size={[w - 0.08, 0.85, 0.9]} pos={[0, 0.425, 0]} color={color} />
      <Box size={[w, 0.08, 0.95]} pos={[0, 0.89, 0]} color={top} />
    </>
  )
}

const Chair = ({ x, z }: { x: number; z: number }) => (
  <group position={[x, 0, z]}>
    <Box size={[0.36, 0.06, 0.36]} pos={[0, 0.45, 0]} color={C.darkWood} />
    <Box size={[0.06, 0.45, 0.06]} pos={[0.14, 0.22, 0.14]} color={C.darkWood} />
    <Box size={[0.06, 0.45, 0.06]} pos={[-0.14, 0.22, 0.14]} color={C.darkWood} />
    <Box size={[0.06, 0.45, 0.06]} pos={[0.14, 0.22, -0.14]} color={C.darkWood} />
    <Box size={[0.06, 0.45, 0.06]} pos={[-0.14, 0.22, -0.14]} color={C.darkWood} />
  </group>
)

export const MODELS: Record<ObjectDefId, (tier: number) => ReactNode> = {
  grill: (tier) => (
    <>
      <Counter w={2} color={tier ? C.darkSteel : C.steel} top={C.black} />
      <Box size={[1.7, 0.03, 0.7]} pos={[0, 0.945, 0]} color="#3a3a3a" cast={false} />
      <Box size={[1.9, 0.5, 0.1]} pos={[0, 1.15, 0.42]} color={C.darkSteel} />
    </>
  ),
  fryer: (tier) => (
    <>
      <Counter w={1} color={tier ? C.darkSteel : C.steel} top={C.darkSteel} />
      <Box size={[0.6, 0.06, 0.6]} pos={[0, 0.95, 0]} color={C.yellow} cast={false} />
    </>
  ),
  assembly: (tier) => (
    <>
      <Counter w={2} color={tier ? C.darkSteel : C.steel} top={C.white} />
      <Box size={[0.3, 0.12, 0.3]} pos={[-0.6, 1, 0.2]} color={C.green} />
      <Box size={[0.3, 0.12, 0.3]} pos={[-0.25, 1, 0.2]} color={C.red} />
      <Box size={[0.3, 0.12, 0.3]} pos={[0.1, 1, 0.2]} color={C.yellow} />
    </>
  ),
  soda: (tier) => (
    <>
      <Counter w={1} color={tier ? C.darkSteel : C.steel} top={C.darkSteel} />
      <Box size={[0.7, 0.7, 0.45]} pos={[0, 1.3, 0.15]} color={C.red} />
      <Box size={[0.5, 0.2, 0.05]} pos={[0, 1.45, -0.09]} color={C.white} />
    </>
  ),
  fridge: () => (
    <>
      <Box size={[0.9, 1.9, 0.85]} pos={[0, 0.95, 0]} color={C.white} />
      <Box size={[0.05, 0.6, 0.05]} pos={[0.3, 1.2, -0.45]} color={C.darkSteel} />
    </>
  ),
  register: () => (
    <>
      <Counter w={1} color={C.red} top={C.cream} />
      <Box size={[0.45, 0.3, 0.35]} pos={[0, 1.08, 0]} color={C.black} />
      <Box size={[0.4, 0.22, 0.04]} pos={[0, 1.32, -0.05]} color={C.blue} />
    </>
  ),
  pickup: () => (
    <>
      <Counter w={2} color={C.red} top={C.cream} />
      <Box size={[1.6, 0.05, 0.25]} pos={[0, 1.5, 0]} color={C.yellow} />
      <Box size={[0.05, 0.6, 0.05]} pos={[-0.75, 1.2, 0]} color={C.darkSteel} />
      <Box size={[0.05, 0.6, 0.05]} pos={[0.75, 1.2, 0]} color={C.darkSteel} />
    </>
  ),
  table2: () => (
    <>
      <Box size={[1.1, 0.06, 0.7]} pos={[0, 0.72, 0]} color={C.wood} />
      <Box size={[0.1, 0.7, 0.1]} pos={[0, 0.35, 0]} color={C.darkWood} />
      <Chair x={-0.55} z={-0.1} />
      <Chair x={0.55} z={-0.1} />
    </>
  ),
  table4: () => (
    <>
      <Box size={[1.3, 0.06, 1.1]} pos={[0, 0.72, 0]} color={C.wood} />
      <Box size={[0.12, 0.7, 0.12]} pos={[0, 0.35, 0]} color={C.darkWood} />
      <Chair x={-0.45} z={-0.75} />
      <Chair x={0.45} z={-0.75} />
      <Chair x={-0.45} z={0.75} />
      <Chair x={0.45} z={0.75} />
    </>
  ),
  bin: () => (
    <>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.22, 0.8, 10]} />
        <meshStandardMaterial color={C.green} />
      </mesh>
      <Box size={[0.52, 0.06, 0.52]} pos={[0, 0.83, 0]} color={C.darkSteel} />
    </>
  ),
  plant: () => (
    <>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.2, 0.5, 8]} />
        <meshStandardMaterial color={C.pot} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color={C.green} flatShading />
      </mesh>
    </>
  ),
  lamp: () => (
    <>
      <Box size={[0.08, 1.6, 0.08]} pos={[0, 0.8, 0]} color={C.darkSteel} />
      <mesh position={[0, 1.65, 0]}>
        <coneGeometry args={[0.3, 0.3, 10, 1, true]} />
        <meshStandardMaterial color={C.yellow} emissive={C.yellow} emissiveIntensity={0.4} />
      </mesh>
    </>
  ),
}
