import { MAX_TICKS_PER_FRAME, TICKS_PER_SECOND } from '../data/balance'

export type Speed = 0 | 1 | 2 | 3

/** Longest frame delta we honour; longer gaps (backgrounded tab) are clamped. */
export const MAX_FRAME_SECONDS = 0.25

/**
 * Fixed-step accumulator. `acc` is measured in ticks. Returns how many ticks to run this frame,
 * the leftover accumulator, and the interpolation alpha in [0, 1).
 * Backlog beyond MAX_TICKS_PER_FRAME is dropped instead of spiralling.
 */
export function frameTicks(
  acc: number,
  dtSeconds: number,
  speed: Speed,
): { ticks: number; acc: number; alpha: number } {
  const dt = Math.min(Math.max(0, dtSeconds), MAX_FRAME_SECONDS)
  let a = acc + dt * speed * TICKS_PER_SECOND
  let ticks = Math.floor(a)
  if (ticks > MAX_TICKS_PER_FRAME) {
    ticks = MAX_TICKS_PER_FRAME
    a = ticks + (a - Math.floor(a))
  }
  a -= ticks
  return { ticks, acc: a, alpha: a }
}
