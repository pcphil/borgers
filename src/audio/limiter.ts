/** Per-key minimum interval plus a global cap per window, so busy moments don't become noise. */
export class RateLimiter {
  private last = new Map<string, number>()
  private recent: number[] = []

  constructor(
    private minIntervalMs: Record<string, number>,
    private globalMax = 6,
    private windowMs = 1000,
  ) {}

  allow(key: string, now: number): boolean {
    const min = this.minIntervalMs[key] ?? 200
    const prev = this.last.get(key)
    if (prev !== undefined && now - prev < min) return false
    this.recent = this.recent.filter((t) => now - t < this.windowMs)
    if (this.recent.length >= this.globalMax) return false
    this.last.set(key, now)
    this.recent.push(now)
    return true
  }
}
