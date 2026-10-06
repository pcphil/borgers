import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { groundAxes, makeCamera, objectTransform, screenToTile } from './coords'

describe('screen -> tile (11.1)', () => {
  for (const rotation of [0, 1, 2, 3]) {
    it(`centre of screen hits the focus tile at rotation ${rotation}`, () => {
      const cam = makeCamera(new Vector3(6, 0, 4), rotation, 40)
      expect(screenToTile(cam, { x: 0, y: 0 })).toEqual({ x: 6, y: 4 })
    })
    it(`screen right moves along the ground right axis at rotation ${rotation}`, () => {
      const cam = makeCamera(new Vector3(6, 0, 4), rotation, 40)
      const t = screenToTile(cam, { x: 0.5, y: 0 })
      const { right } = groundAxes(rotation)
      expect(t).not.toBeNull()
      const dx = (t?.x ?? 0) - 6
      const dy = (t?.y ?? 0) - 4
      expect(dx * right.x + dy * right.z).toBeGreaterThan(0)
    })
  }
  it('rotating the view by four quarter turns returns to the start', () => {
    const a = groundAxes(0).forward
    const b = groundAxes(4).forward
    expect(a.distanceTo(b)).toBeLessThan(1e-9)
  })
  it('object transform centres footprint and rotates front', () => {
    const t = objectTransform('grill', 2, 8, 0)
    expect(t.position.x).toBeCloseTo(2.5)
    expect(t.position.z).toBeCloseTo(8)
    const r1 = objectTransform('grill', 2, 8, 1)
    expect(r1.position.x).toBeCloseTo(2)
    expect(r1.position.z).toBeCloseTo(8.5)
    // Front (-z) rotated by rot 1 should face +x.
    const front = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), r1.rotationY)
    expect(front.x).toBeCloseTo(1)
  })
})
