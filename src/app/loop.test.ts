import { describe, expect, it } from 'vitest'
import { MAX_TICKS_PER_FRAME, TICKS_PER_SECOND } from '../data/balance'
import { frameTicks } from './loop'

const runFrames = (speed: 0 | 1 | 2 | 3, frames: number, dt: number) => {
  let acc = 0
  let total = 0
  for (let i = 0; i < frames; i++) {
    const r = frameTicks(acc, dt, speed)
    acc = r.acc
    total += r.ticks
  }
  return total
}

describe('frame loop (2.6)', () => {
  it('runs TICKS_PER_SECOND ticks per real second at 1x regardless of frame rate', () => {
    expect(runFrames(1, 60, 1 / 60)).toBeCloseTo(TICKS_PER_SECOND, -0.5)
    expect(runFrames(1, 144, 1 / 144)).toBeCloseTo(TICKS_PER_SECOND, -0.5)
    expect(runFrames(1, 30, 1 / 30)).toBeCloseTo(TICKS_PER_SECOND, -0.5)
  })
  it('scales with speed and stops when paused', () => {
    expect(runFrames(0, 60, 1 / 60)).toBe(0)
    const one = runFrames(1, 600, 1 / 60)
    expect(runFrames(2, 600, 1 / 60)).toBeCloseTo(one * 2, -1)
    expect(runFrames(3, 600, 1 / 60)).toBeCloseTo(one * 3, -1)
  })
  it('caps backlog after a long hitch', () => {
    const r = frameTicks(0, 10, 3)
    expect(r.ticks).toBe(MAX_TICKS_PER_FRAME)
    expect(r.acc).toBeLessThan(1)
  })
  it('alpha stays within [0,1)', () => {
    let acc = 0
    for (let i = 0; i < 100; i++) {
      const r = frameTicks(acc, 0.013, 2)
      expect(r.alpha).toBeGreaterThanOrEqual(0)
      expect(r.alpha).toBeLessThan(1)
      acc = r.acc
    }
  })
})
