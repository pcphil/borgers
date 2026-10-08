import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import {
  AnimationMixer,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Group,
  type Material,
  type Mesh,
  type Object3D,
  type SkinnedMesh,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

// Kenney CC0 models (see ASSETS.md). Furniture faces +z in the source files; our front is -z.

export const MODEL_BASE = `${import.meta.env.BASE_URL}assets/models/`

export const CHARACTER_URLS = [
  'character-female-a',
  'character-female-b',
  'character-female-c',
  'character-female-d',
  'character-male-a',
  'character-male-b',
  'character-male-c',
  'character-male-d',
].map((n) => `${MODEL_BASE}characters/${n}.glb`)

/** Target box. `stretch` scales each axis independently instead of uniformly. */
type Fit = { w?: number; d?: number; h?: number; rotY?: number; stretch?: boolean }

/** Clone a GLTF scene and scale it uniformly to fit the given box, base on y = 0, centred. */
function fitClone(scene: Object3D, fit: Fit): Group {
  const inner = scene.clone(true)
  inner.rotation.y = fit.rotY ?? Math.PI
  const holder = new Group()
  holder.add(inner)
  holder.updateMatrixWorld(true)
  const box = new Box3().setFromObject(holder)
  const size = box.getSize(new Vector3())
  const scales = [
    fit.w ? fit.w / size.x : Number.POSITIVE_INFINITY,
    fit.d ? fit.d / size.z : Number.POSITIVE_INFINITY,
    fit.h ? fit.h / size.y : Number.POSITIVE_INFINITY,
  ]
  if (fit.stretch) {
    holder.scale.set(
      fit.w ? fit.w / size.x : 1,
      fit.h ? fit.h / size.y : 1,
      fit.d ? fit.d / size.z : 1,
    )
  } else {
    const s = Math.min(...scales)
    holder.scale.setScalar(Number.isFinite(s) ? s : 1)
  }
  holder.updateMatrixWorld(true)
  const b2 = new Box3().setFromObject(holder)
  const c = b2.getCenter(new Vector3())
  holder.position.set(-c.x, -b2.min.y, -c.z)
  const out = new Group()
  out.add(holder)
  out.traverse((o) => {
    const m = o as Mesh
    if (m.isMesh) {
      m.castShadow = true
      m.receiveShadow = true
    }
  })
  return out
}

export function Kenney({
  path,
  position = [0, 0, 0],
  ...fit
}: Fit & { path: string; position?: [number, number, number] }) {
  const { scene } = useGLTF(MODEL_BASE + path)
  // biome-ignore lint/correctness/useExhaustiveDependencies: fit fields listed individually
  const obj = useMemo(
    () => fitClone(scene, fit),
    [scene, fit.w, fit.d, fit.h, fit.rotY, fit.stretch],
  )
  return <primitive object={obj} position={position} />
}

export type BakedCharacter = { geometry: BufferGeometry; material: Material; scale: number }

export type BakeOptions = {
  /** Use this scale instead of fitting the pose to `height` (so poses of one model match). */
  scale?: number
  /** Keep the clip's own vertical origin (e.g. hips at seat level) instead of standing on y = 0. */
  keepOrigin?: boolean
}

/**
 * Bake a skinned character into static geometry posed at the first frame of `clipName`,
 * normalised to `height` with feet at y = 0. Static geometry can then be instanced.
 * Seated poses pass the standing `scale` and `keepOrigin` so the figure keeps its size and the
 * caller sets the seat height.
 */
export function bakeCharacter(
  scene: Object3D,
  animations: { name: string }[],
  clipName: string,
  height: number,
  opts: BakeOptions = {},
): BakedCharacter | null {
  // SkeletonUtils.clone rebinds skinned meshes to the cloned bones (Object3D.clone does not).
  const root = cloneSkinned(scene)
  const clip = animations.find((a) => a.name === clipName)
  root.updateMatrixWorld(true)
  if (clip) {
    const mixer = new AnimationMixer(root)
    mixer.clipAction(clip as never).play()
    mixer.update(0)
    root.updateMatrixWorld(true)
  }
  const parts: BufferGeometry[] = []
  let material: Material | null = null
  const v = new Vector3()
  root.traverse((o) => {
    const sm = o as SkinnedMesh
    if (!sm.isMesh) return
    if (sm.isSkinnedMesh) sm.skeleton.update()
    const src = sm.geometry
    const pos = src.getAttribute('position')
    const out = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      sm.getVertexPosition(i, v)
      v.applyMatrix4(sm.matrixWorld)
      out.set([v.x, v.y, v.z], i * 3)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(out, 3))
    const uv = src.getAttribute('uv')
    if (uv) g.setAttribute('uv', uv.clone())
    if (src.index) g.setIndex(src.index.clone())
    g.computeVertexNormals()
    parts.push(g)
    material ??= Array.isArray(sm.material) ? (sm.material[0] ?? null) : sm.material
  })
  if (!parts.length || !material) return null
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false)
  if (!merged) return null
  merged.computeBoundingBox()
  const bb = merged.boundingBox as Box3
  const size = bb.getSize(new Vector3())
  const s = opts.scale ?? height / size.y
  const c = bb.getCenter(new Vector3())
  merged.translate(-c.x, opts.keepOrigin ? 0 : -bb.min.y, -c.z)
  merged.scale(s, s, s)
  // Characters face +z in the source and Agents yaws them with atan2(dx, dz), so keep +z forward.
  return { geometry: merged, material, scale: s }
}

for (const url of CHARACTER_URLS) useGLTF.preload(url)
