import { useMemo } from 'react'
import { host } from '../app/host'
import { useUI } from '../app/store'
import { CATALOGUE } from '../data/catalogue'
import { accessTiles } from '../sim/geometry'
import { checkMove, checkPlace } from '../sim/layout'
import { ZONE_KITCHEN } from '../sim/types'
import { objectTransform } from './coords'

/** Ghost footprint following the cursor in build mode, green when valid and red when not. */
export function BuildPreview() {
  const tool = useUI((s) => s.tool)
  const hover = useUI((s) => s.hover)
  const version = useUI((s) => s.snapshot?.layoutVersion)
  const cash = useUI((s) => s.snapshot?.cash)

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-check when layout or cash changes
  const state = useMemo(() => {
    const sim = host.sim
    if (!sim || !hover || (tool.kind !== 'place' && tool.kind !== 'move')) return null
    const p = { def: tool.def, x: hover.x, y: hover.y, rot: tool.rot }
    const error =
      tool.kind === 'place' ? checkPlace(sim.world, p) : checkMove(sim.world, tool.id, p)
    return { p, error }
  }, [tool, hover, version, cash])

  if (tool.kind === 'paint' && hover) {
    return (
      <mesh position={[hover.x, 0.03, hover.y]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={tool.zone === ZONE_KITCHEN ? '#6f8fa3' : '#d8b26e'}
          transparent
          opacity={0.6}
        />
      </mesh>
    )
  }
  if (!state) return null
  const def = CATALOGUE[state.p.def]
  const t = objectTransform(state.p.def, state.p.x, state.p.y, state.p.rot)
  const color = state.error ? '#e53935' : '#43a047'
  return (
    <group>
      <group position={t.position} rotation={[0, t.rotationY, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[def.w - 0.05, 1, def.h - 0.05]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
        </mesh>
        {/* Front marker */}
        <mesh position={[0, 0.05, -def.h / 2 - 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.12, 3]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
      {accessTiles(state.p).map((a) => (
        <mesh key={`${a.x},${a.y}`} position={[a.x, 0.03, a.y]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.35, 16]} />
          <meshBasicMaterial color={a.side === 'staff' ? '#1e88e5' : '#fb8c00'} />
        </mesh>
      ))}
    </group>
  )
}
