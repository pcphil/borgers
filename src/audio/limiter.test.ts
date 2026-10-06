import { describe, expect, it } from 'vitest'
import { RateLimiter } from './limiter'

describe('sfx rate limiting (13.1)', () => {
  it('enforces a per-sound minimum interval', () => {
    const r = new RateLimiter({ cook: 400 })
    expect(r.allow('cook', 0)).toBe(true)
    expect(r.allow('cook', 100)).toBe(false)
    expect(r.allow('cook', 450)).toBe(true)
  })
  it('caps total sounds per window', () => {
    const r = new RateLimiter({}, 3, 1000)
    expect([0, 1, 2, 3].map((i) => r.allow(`s${i}`, i * 10))).toEqual([true, true, true, false])
    expect(r.allow('s9', 1200)).toBe(true)
  })
})
