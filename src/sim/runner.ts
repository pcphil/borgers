import type { Sim } from './sim'

/** Advance until `days` more nights have completed (headless). Returns ticks advanced. */
export function runDays(sim: Sim, days: number, onTick?: (sim: Sim) => void): number {
  const target = sim.world.clock.day + days
  let n = 0
  const limit = days * 20_000 + 20_000
  while (sim.world.clock.day < target) {
    sim.step()
    sim.drainEvents()
    onTick?.(sim)
    if (++n > limit) throw new Error('runDays: day did not end (stuck customers?)')
  }
  return n
}

export function runTicks(sim: Sim, ticks: number, onTick?: (sim: Sim) => void) {
  for (let i = 0; i < ticks; i++) {
    sim.step()
    onTick?.(sim)
  }
}
