/** sfc32 PRNG. State is four uint32s stored in the world so it serializes with saves. */
export type RngState = [number, number, number, number]

export function seedRng(seed: number): RngState {
  const s: RngState = [0x9e3779b9, 0x243f6a88, 0xb7e15162, seed >>> 0]
  for (let i = 0; i < 15; i++) nextU32(s)
  return s
}

export function nextU32(s: RngState): number {
  let [a, b, c, d] = s
  a >>>= 0
  b >>>= 0
  c >>>= 0
  d >>>= 0
  const t = (((a + b) | 0) + d) | 0
  d = (d + 1) | 0
  a = b ^ (b >>> 9)
  b = (c + (c << 3)) | 0
  c = (c << 21) | (c >>> 11)
  c = (c + t) | 0
  s[0] = a >>> 0
  s[1] = b >>> 0
  s[2] = c >>> 0
  s[3] = d >>> 0
  return t >>> 0
}

/** Float in [0, 1). */
export const rand = (s: RngState) => nextU32(s) / 4294967296

export const randRange = (s: RngState, min: number, max: number) => min + rand(s) * (max - min)

export const randInt = (s: RngState, minIncl: number, maxIncl: number) =>
  minIncl + Math.floor(rand(s) * (maxIncl - minIncl + 1))

export const chance = (s: RngState, p: number) => rand(s) < p

export function pick<T>(s: RngState, list: readonly T[]): T {
  const v = list[Math.floor(rand(s) * list.length)]
  if (v === undefined) throw new Error('pick from empty list')
  return v
}

/** Index chosen with probability proportional to weight. Returns -1 if all weights are 0. */
export function weightedIndex(s: RngState, weights: readonly number[]): number {
  let total = 0
  for (const w of weights) total += Math.max(0, w)
  if (total <= 0) return -1
  let r = rand(s) * total
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i] ?? 0)
    if (r < 0) return i
  }
  return weights.length - 1
}
