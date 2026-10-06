import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { type OrthographicCamera, Vector3 } from 'three'
import { useUI } from '../app/store'
import { cameraOffset, groundAxes, MAX_ZOOM, MIN_ZOOM } from './coords'

const PAN_SPEED = 10 // tiles per second
const keys = new Set<string>()

/** Isometric orthographic camera: WASD/arrows/drag to pan, wheel to zoom, Q/E to rotate. */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const gl = useThree((s) => s.gl)
  const lot = useUI((s) => s.snapshot?.lot)
  const focus = useRef(new Vector3(6, 0, 4))
  const rotation = useRef(0)
  const rotAnim = useRef(0)
  const zoom = useRef(48)
  const drag = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = gl.domElement
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const k = e.key.toLowerCase()
      if (e.type === 'keydown') {
        keys.add(k)
        if (k === 'q') rotation.current -= 1
        if (k === 'e') rotation.current += 1
      } else keys.delete(k)
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoom.current = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, zoom.current * (e.deltaY > 0 ? 0.9 : 1.1)),
      )
    }
    const onDown = (e: PointerEvent) => {
      // Right/middle drag always pans; left drag pans unless a build tool is active.
      const tool = useUI.getState().tool.kind
      if (e.button === 1 || e.button === 2 || (e.button === 0 && tool !== 'paint'))
        drag.current = { x: e.clientX, y: e.clientY }
    }
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      drag.current = { x: e.clientX, y: e.clientY }
      const { forward, right } = groundAxes(rotAnim.current)
      const scale = 1 / (camera.zoom * 1.0)
      focus.current.addScaledVector(right, -dx * scale)
      focus.current.addScaledVector(forward, dy * scale * 1.6)
    }
    const onUp = () => {
      drag.current = null
    }
    const blur = () => keys.clear()
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', blur)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('contextmenu', (e) => e.preventDefault())
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', blur)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gl, camera])

  useFrame((_, dt) => {
    const { forward, right } = groundAxes(rotAnim.current)
    const step = PAN_SPEED * Math.min(dt, 0.1)
    if (keys.has('w') || keys.has('arrowup')) focus.current.addScaledVector(forward, step)
    if (keys.has('s') || keys.has('arrowdown')) focus.current.addScaledVector(forward, -step)
    if (keys.has('d') || keys.has('arrowright')) focus.current.addScaledVector(right, step)
    if (keys.has('a') || keys.has('arrowleft')) focus.current.addScaledVector(right, -step)
    if (lot) {
      focus.current.x = Math.min(lot.w + 2, Math.max(-3, focus.current.x))
      focus.current.z = Math.min(lot.h + 2, Math.max(-3, focus.current.z))
    }
    // Ease rotation toward the target quarter turn.
    rotAnim.current += (rotation.current - rotAnim.current) * Math.min(1, dt * 10)
    if (Math.abs(rotation.current - rotAnim.current) < 0.001) rotAnim.current = rotation.current
    const offset = cameraOffset(0).applyAxisAngle(
      new Vector3(0, 1, 0),
      rotAnim.current * (Math.PI / 2),
    )
    camera.position.copy(focus.current).add(offset)
    camera.lookAt(focus.current)
    const z = zoom.current
    if (Math.abs(camera.zoom - z) > 0.01) {
      camera.zoom += (z - camera.zoom) * Math.min(1, dt * 12)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
