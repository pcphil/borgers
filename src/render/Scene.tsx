import { Canvas, useFrame } from '@react-three/fiber'
import { lazy, Suspense } from 'react'
import { useUI } from '../app/store'
import { Agents } from './Agents'
import { BuildPreview } from './BuildPreview'
import { CameraRig } from './CameraRig'
import { Ground } from './Ground'
import { Labels } from './Labels'
import { Lighting } from './Lighting'
import { Objects } from './Objects'

const Perf = import.meta.env.DEV
  ? lazy(() => import('r3f-perf').then((m) => ({ default: m.Perf })))
  : null

/** Publishes renderer stats for the perf script (cheap: one object reference per frame). */
function RenderInfo() {
  useFrame(({ gl, camera, size }) => {
    const w = window as unknown as Record<string, unknown>
    w.__borgersRender = gl.info.render
    w.__borgersCamera = { camera, size }
  })
  return null
}

export function Scene() {
  const shadows = useUI((s) => s.settings.shadows)
  return (
    <Canvas
      orthographic
      shadows={shadows}
      dpr={[1, 2]}
      camera={{ position: [20, 30, -20], zoom: 48, near: 0.1, far: 500 }}
      data-testid="game-canvas"
    >
      <CameraRig />
      <Lighting />
      <Ground />
      <Objects />
      <Agents />
      <Labels />
      <BuildPreview />
      <RenderInfo />
      {Perf && new URLSearchParams(location.search).has('perf') ? (
        <Suspense fallback={null}>
          <Perf position="bottom-left" />
        </Suspense>
      ) : null}
    </Canvas>
  )
}
