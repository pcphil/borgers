import { describe, expect, it } from 'vitest'
import { facingYaw, moveYaw } from './facing'

describe('facing', () => {
  it('points along +z (yaw 0) and +x (yaw pi/2)', () => {
    expect(moveYaw({ x: 3, y: 1 }, { x: 3, y: 1.1 })).toBeCloseTo(0)
    expect(moveYaw({ x: 3, y: 1 }, { x: 3.1, y: 1 })).toBeCloseTo(Math.PI / 2)
  })

  it('points along -z (yaw pi) and -x (yaw -pi/2)', () => {
    expect(Math.abs(moveYaw({ x: 3, y: 1 }, { x: 3, y: 0.9 }) as number)).toBeCloseTo(Math.PI)
    expect(moveYaw({ x: 3, y: 1 }, { x: 2.9, y: 1 })).toBeCloseTo(-Math.PI / 2)
  })

  it('handles diagonals', () => {
    expect(moveYaw({ x: 0, y: 0 }, { x: 0.1, y: 0.1 })).toBeCloseTo(Math.PI / 4)
  })

  it('does not depend on step size, even for very slow movement', () => {
    for (const step of [0.1, 0.01, 0.002]) {
      expect(moveYaw({ x: 0, y: 0 }, { x: step, y: 0 })).toBeCloseTo(Math.PI / 2)
    }
  })

  it('keeps the last facing when not moving', () => {
    expect(moveYaw({ x: 2, y: 2 }, { x: 2, y: 2 })).toBeNull()
    expect(facingYaw({ x: 2, y: 2 }, { x: 2, y: 2 }, 1.25)).toBe(1.25)
    expect(facingYaw({ x: 2, y: 2 }, { x: 2.1, y: 2 }, 1.25)).toBeCloseTo(Math.PI / 2)
  })
})
