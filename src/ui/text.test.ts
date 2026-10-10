import { describe, expect, it } from 'vitest'
import { reputationFactor } from '../sim/customers'
import { reputationTip } from './text'

describe('reputation tooltip', () => {
  it('names the reputation and the customer multiplier for the day', () => {
    expect(reputationTip(62.4, 0.7, false)).toBe('Reputation 62: customers ×0.7 today')
  })
  it('says "if you open now" while preparing, and trims the multiplier', () => {
    expect(reputationTip(50, reputationFactor(50), true)).toBe(
      'Reputation 50: customers ×0.45 if you open now',
    )
    expect(reputationTip(100, reputationFactor(100), false)).toBe(
      'Reputation 100: customers ×1.6 today',
    )
  })
})
