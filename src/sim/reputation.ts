import { REPUTATION } from '../data/balance'
import type { Sim } from './sim'
import type { World } from './types'

/** Rolling average of the last N visit scores, blended toward neutral while samples are few. */
export function computeReputation(scores: number[]): number {
  const prior = Math.max(0, REPUTATION.priorWeight - scores.length)
  let sum = REPUTATION.neutral * prior
  for (const s of scores) sum += s
  const n = scores.length + prior
  return n === 0 ? REPUTATION.neutral : sum / n
}

export function recordVisit(sim: Sim, score: number) {
  const r = sim.world.reputation
  r.scores.push(score)
  if (r.scores.length > REPUTATION.window) r.scores.splice(0, r.scores.length - REPUTATION.window)
  r.value = computeReputation(r.scores)
}

export const newReputation = (): World['reputation'] => ({ scores: [], value: REPUTATION.neutral })
