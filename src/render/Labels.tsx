import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { host } from '../app/host'
import { CATALOGUE } from '../data/catalogue'
import { COMPLAINT_ICON } from '../ui/text'
import { agentPosition } from './Agents'
import { objectTransform } from './coords'

const POOL = 16
const v = new Vector3()

type Label = { x: number; y: number; z: number; text: string; kind: 'bubble' | 'ready' | 'dirty' }

/** Collect the few world labels worth showing this frame (sparse by design). */
function collect(alpha: number): Label[] {
  const w = host.sim?.world
  if (!w) return []
  const out: Label[] = []
  for (const o of Object.values(w.objects)) {
    if (o.def === 'pickup' && o.readyOrders.length > 0) {
      const t = objectTransform(o.def, o.x, o.y, o.rot)
      out.push({
        x: t.position.x,
        y: 2,
        z: t.position.z,
        text: `🍔 ${o.readyOrders.length} ready`,
        kind: 'ready',
      })
    }
    if (o.dirty && CATALOGUE[o.def].seats) {
      const t = objectTransform(o.def, o.x, o.y, o.rot)
      out.push({ x: t.position.x, y: 1.3, z: t.position.z, text: '🧽', kind: 'dirty' })
    }
  }
  for (const g of Object.values(w.groups)) {
    if (!g.complaint || out.length >= POOL) continue
    agentPosition(g, alpha, v)
    out.push({ x: v.x, y: 1.5, z: v.z, text: COMPLAINT_ICON[g.complaint], kind: 'bubble' })
  }
  return out.slice(0, POOL)
}

const STYLE: Record<Label['kind'], string> = {
  bubble:
    'background:white;border-radius:12px;padding:1px 6px;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,.3)',
  ready:
    'background:#2e7d32;color:white;border-radius:6px;padding:1px 6px;font-size:12px;font-weight:600;white-space:nowrap',
  dirty: 'font-size:16px',
}

/**
 * World-anchored labels: a fixed pool of plain DOM nodes over the canvas, projected each
 * frame. No React roots per label, so it stays cheap and re-render free.
 */
export function Labels() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const nodes = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    const parent = gl.domElement.parentElement
    if (!parent) return
    const layer = document.createElement('div')
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden'
    parent.appendChild(layer)
    nodes.current = Array.from({ length: POOL }, () => {
      const d = document.createElement('div')
      d.style.display = 'none'
      layer.appendChild(d)
      return d
    })
    return () => {
      layer.remove()
      nodes.current = []
    }
  }, [gl])

  useFrame(() => {
    const labels = collect(host.alpha)
    for (let i = 0; i < nodes.current.length; i++) {
      const d = nodes.current[i]
      const l = labels[i]
      if (!d) continue
      if (!l) {
        d.style.display = 'none'
        continue
      }
      v.set(l.x, l.y, l.z).project(camera)
      if (d.dataset.text !== l.text || d.dataset.kind !== l.kind) {
        d.textContent = l.text
        d.dataset.text = l.text
        d.dataset.kind = l.kind
        d.style.cssText = `${STYLE[l.kind]};position:absolute;left:0;top:0;user-select:none`
      }
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      d.style.display = 'block'
      d.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`
    }
  })

  return null
}
