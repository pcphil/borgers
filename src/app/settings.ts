export type Settings = {
  volume: number
  shadows: boolean
  uiScale: number
  autosave: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.6,
  shadows: false,
  uiScale: 1,
  autosave: true,
}

const KEY = 'borgers:settings'

/** Settings live in localStorage, separate from game saves. All access is guarded. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const s = JSON.parse(raw) as Partial<Settings>
    return {
      volume:
        typeof s.volume === 'number' ? Math.min(1, Math.max(0, s.volume)) : DEFAULT_SETTINGS.volume,
      shadows: typeof s.shadows === 'boolean' ? s.shadows : DEFAULT_SETTINGS.shadows,
      uiScale: typeof s.uiScale === 'number' ? Math.min(1.5, Math.max(0.75, s.uiScale)) : 1,
      autosave: typeof s.autosave === 'boolean' ? s.autosave : DEFAULT_SETTINGS.autosave,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Storage unavailable (private mode): settings last for this session only.
  }
}
