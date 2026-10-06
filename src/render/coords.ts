import { OrthographicCamera, Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { ObjectDefId } from '../data/catalogue'
import { rotatedSize } from '../sim/geometry'
import type { Rot } from '../sim/types'

// World space: tile (x, y) has its centre at (x, 0, y). Front of the lot (entrance, y = 0) is -z.

export const CAMERA_DISTANCE = 40
export const MIN_ZOOM = 14
export const MAX_ZOOM = 110

/** Camera offset from the focus point for a view rotation (0..3 quarter turns). */
export function cameraOffset(rotation: number): Vector3 {
  const d = CAMERA_DISTANCE
  // Base view looks at the restaurant front from the front-right.
  const base = new Vector3(d * 0.7, d * 0.85, -d * 0.7)
  return base.applyAxisAngle(new Vector3(0, 1, 0), (rotation % 4) * (Math.PI / 2))
}

/** Unit vectors on the ground for screen-up and screen-right, given a view rotation. */
export function groundAxes(rotation: number): { forward: Vector3; right: Vector3 } {
  const o = cameraOffset(rotation)
  const forward = new Vector3(-o.x, 0, -o.z).normalize()
  const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize()
  return { forward, right }
}

export const worldToTile = (p: { x: number; z: number }) => ({
  x: Math.round(p.x),
  y: Math.round(p.z),
})

const ground = new Plane(new Vector3(0, 1, 0), 0)

/** Normalised device coords (-1..1) -> tile under the cursor, for a given camera. */
export function screenToTile(camera: OrthographicCamera, ndc: { x: number; y: number }) {
  const ray = new Raycaster()
  ray.setFromCamera(new Vector2(ndc.x, ndc.y), camera)
  const hit = new Vector3()
  if (!ray.ray.intersectPlane(ground, hit)) return null
  return worldToTile(hit)
}

/** Centre of an object's rotated footprint in world space, and its Y rotation. */
export function objectTransform(def: ObjectDefId, x: number, y: number, rot: Rot) {
  const { w, h } = rotatedSize(def, rot)
  return {
    position: new Vector3(x + w / 2 - 0.5, 0, y + h / 2 - 0.5),
    rotationY: -rot * (Math.PI / 2),
  }
}

/** Build an isometric orthographic camera looking at `focus` (used by tests and the rig). */
export function makeCamera(focus: Vector3, rotation: number, zoom: number, aspect = 16 / 9) {
  const cam = new OrthographicCamera(-aspect * 10, aspect * 10, 10, -10, 0.1, 500)
  cam.zoom = zoom / 40
  cam.position.copy(focus).add(cameraOffset(rotation))
  cam.lookAt(focus)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  return cam
}
