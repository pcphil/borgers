import type { SimEvent } from '../sim/types'

/** Trigger an autosave for a night-settlement `autosave` event when enabled. */
export async function handleAutosave(
  events: SimEvent[],
  enabled: boolean,
  save: () => Promise<unknown>,
): Promise<boolean> {
  if (!enabled || !events.some((e) => e.type === 'autosave')) return false
  await save()
  return true
}
