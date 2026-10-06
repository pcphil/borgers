import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type AmbientLight, Color, type DirectionalLight, type Group } from 'three'
import { host } from '../app/host'
import { gameHour } from '../app/snapshot'
import { useUI } from '../app/store'
import { MAXH, MAXW } from '../sim/layout'

const DAY = new Color('#fff4e0')
const EVENING = new Color('#ffb46b')
const NIGHT = new Color('#5368a8')
const SKY_DAY = new Color('#9fd3ff')
const SKY_EVE = new Color('#f2a36b')
const SKY_NIGHT = new Color('#1b2140')

/** 0 = full day, 1 = full night, from game hour (dusk 18-21, night 21-9, dawn 9-10.5). */
export function nightness(hour: number): number {
  const h = ((hour % 24) + 24) % 24
  if (h >= 10.5 && h < 18) return 0
  if (h >= 18 && h < 21) return (h - 18) / 3
  if (h >= 21 || h < 9) return 1
  return 1 - (h - 9) / 1.5
}

export function Lighting() {
  const sun = useRef<DirectionalLight>(null)
  const amb = useRef<AmbientLight>(null)
  const lamps = useRef<Group>(null)
  const shadows = useUI((s) => s.settings.shadows)
  const tmp = new Color()

  useFrame(({ scene }) => {
    const sim = host.sim
    if (!sim || !sun.current || !amb.current) return
    const n = nightness(gameHour(sim))
    const eve = n > 0 && n < 1 ? Math.sin(n * Math.PI) : 0
    tmp
      .copy(DAY)
      .lerp(NIGHT, n)
      .lerp(EVENING, eve * 0.6)
    sun.current.color.copy(tmp)
    sun.current.intensity = 2.2 * (1 - n) + 0.25
    amb.current.intensity = 0.9 * (1 - n) + 0.35
    const sky = SKY_DAY.clone()
      .lerp(SKY_NIGHT, n)
      .lerp(SKY_EVE, eve * 0.5)
    if (scene.background instanceof Color) scene.background.copy(sky)
    else scene.background = sky
    if (lamps.current) lamps.current.visible = n > 0.35
  })

  return (
    <>
      <ambientLight ref={amb} intensity={0.9} />
      <directionalLight
        ref={sun}
        position={[MAXW / 2 + 12, 22, -10]}
        intensity={2.2}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={80}
      >
        <object3D attach="target" position={[MAXW / 2, 0, MAXH / 2]} />
      </directionalLight>
      <group ref={lamps} visible={false}>
        {(
          [
            [4, 3],
            [10, 3],
            [4, 8],
            [12, 8],
          ] as [number, number][]
        ).map(([x, z]) => (
          <pointLight
            key={`${x},${z}`}
            position={[x, 3, z]}
            intensity={6}
            distance={9}
            color="#ffd59a"
          />
        ))}
      </group>
    </>
  )
}
