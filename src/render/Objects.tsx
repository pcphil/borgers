import { useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { host } from '../app/host'
import type { ObjectView } from '../app/snapshot'
import { useUI } from '../app/store'
import { CATALOGUE } from '../data/catalogue'
import { objectTransform } from './coords'
import { MODELS } from './models'

const FOOD: Record<string, { color: string; size: [number, number, number] }> = {
  grill: { color: '#6b3b1f', size: [0.3, 0.08, 0.3] },
  fryer: { color: '#f2c14e', size: [0.2, 0.15, 0.2] },
  assembly: { color: '#d99a4e', size: [0.28, 0.18, 0.28] },
  soda: { color: '#c0392b', size: [0.14, 0.25, 0.14] },
}

/** Busy-slot food, dirty plates and ready bags, toggled from live sim state each frame. */
function StateProps({ view }: { view: ObjectView }) {
  const def = CATALOGUE[view.def]
  const items = useRef<(Mesh | null)[]>([])
  const dirt = useRef<Group>(null)
  const food = def.station ? FOOD[def.station] : undefined
  const maxItems = view.def === 'pickup' ? 6 : (def.tiers[view.tier]?.slots ?? 0)

  useFrame(() => {
    const o = host.sim?.world.objects[view.id]
    if (!o) return
    const busy =
      view.def === 'pickup' ? o.readyOrders.length : o.slots.filter((s) => s !== null).length
    items.current.forEach((m, i) => {
      if (m) m.visible = i < busy
    })
    if (dirt.current) dirt.current.visible = o.dirty
  })

  const spread = (i: number, n: number) => (n <= 1 ? 0 : -0.6 + (1.2 * i) / (n - 1))
  const w = def.w

  return (
    <>
      {Array.from({ length: maxItems }, (_, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed pool of slot meshes
          key={i}
          ref={(m) => {
            items.current[i] = m
          }}
          visible={false}
          position={[
            spread(i, maxItems) * (w > 1 ? 1 : 0.4),
            view.def === 'pickup' ? 1.08 : 1.02,
            view.def === 'pickup' ? 0 : -0.1,
          ]}
        >
          <boxGeometry
            args={view.def === 'pickup' ? [0.22, 0.3, 0.18] : (food?.size ?? [0.2, 0.1, 0.2])}
          />
          <meshStandardMaterial
            color={view.def === 'pickup' ? '#c8a26b' : (food?.color ?? '#999')}
          />
        </mesh>
      ))}
      {def.seats ? (
        <group ref={dirt} visible={false}>
          <mesh position={[-0.2, 0.77, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.02, 10]} />
            <meshStandardMaterial color="#e6e6e6" />
          </mesh>
          <mesh position={[0.25, 0.79, 0.1]}>
            <boxGeometry args={[0.12, 0.05, 0.08]} />
            <meshStandardMaterial color="#8b5a2b" />
          </mesh>
          <mesh position={[0.05, 0.765, -0.15]}>
            <boxGeometry args={[0.2, 0.01, 0.12]} />
            <meshStandardMaterial color="#c9b37c" />
          </mesh>
        </group>
      ) : null}
    </>
  )
}

const ObjectMesh = memo(function ObjectMesh({
  view,
  selected,
}: {
  view: ObjectView
  selected: boolean
}) {
  const t = objectTransform(view.def, view.x, view.y, view.rot)
  const def = CATALOGUE[view.def]
  return (
    <group position={t.position} rotation={[0, t.rotationY, 0]} userData={{ objectId: view.id }}>
      {MODELS[view.def](view.tier)}
      <StateProps view={view} />
      {selected ? (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[def.w + 0.15, def.h + 0.15]} />
          <meshBasicMaterial color="#ffd54a" transparent opacity={0.45} />
        </mesh>
      ) : null}
    </group>
  )
})

export function Objects() {
  const layoutVersion = useUI((s) => s.snapshot?.layoutVersion)
  const selection = useUI((s) => s.selection)
  const movingId = useUI((s) => (s.tool.kind === 'move' ? s.tool.id : null))
  // Rebuild the object list only when the layout changes, not on every snapshot.
  // biome-ignore lint/correctness/useExhaustiveDependencies: layoutVersion is the change signal
  const objects = useMemo(() => useUI.getState().snapshot?.objects ?? [], [layoutVersion])
  return (
    <group>
      {objects.map((o) =>
        o.id === movingId ? null : (
          <ObjectMesh
            key={`${o.id}:${o.x}:${o.y}:${o.rot}:${o.tier}`}
            view={o}
            selected={selection?.kind === 'object' && selection.id === o.id}
          />
        ),
      )}
    </group>
  )
}
