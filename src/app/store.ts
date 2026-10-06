import { create } from 'zustand'
import type { ObjectDefId } from '../data/catalogue'
import type { DayRecord, Id, Rot, Zone } from '../sim/types'
import { loadSettings, type Settings, saveSettings } from './settings'
import type { Snapshot } from './snapshot'

export type BuildTool =
  | { kind: 'none' }
  | { kind: 'place'; def: ObjectDefId; rot: Rot }
  | { kind: 'move'; id: Id; def: ObjectDefId; rot: Rot }
  | { kind: 'paint'; zone: Zone }

export type Panel = 'staff' | 'menu' | 'inventory' | 'finances' | 'build' | 'saves' | null

export type Selection = { kind: 'object' | 'group' | 'staff'; id: Id } | null

export type Toast = { id: number; text: string }

type UIState = {
  screen: 'menu' | 'game'
  snapshot: Snapshot | null
  panel: Panel
  tool: BuildTool
  selection: Selection
  hover: { x: number; y: number } | null
  summary: DayRecord | null
  toasts: Toast[]
  settings: Settings
  settingsOpen: boolean
  persistent: boolean
  set: (patch: Partial<UIState>) => void
  setPanel: (p: Panel) => void
  setTool: (t: BuildTool) => void
  select: (s: Selection) => void
  toast: (text: string) => void
  updateSettings: (patch: Partial<Settings>) => void
}

let toastId = 0

export const useUI = create<UIState>((set, get) => ({
  screen: 'menu',
  snapshot: null,
  panel: null,
  tool: { kind: 'none' },
  selection: null,
  hover: null,
  summary: null,
  toasts: [],
  settings: loadSettings(),
  settingsOpen: false,
  persistent: true,
  set: (patch) => set(patch),
  setPanel: (panel) =>
    set({
      panel: get().panel === panel ? null : panel,
      tool: panel === 'build' ? get().tool : { kind: 'none' },
    }),
  setTool: (tool) => set({ tool }),
  select: (selection) => set({ selection }),
  toast: (text) => {
    const id = ++toastId
    set({ toasts: [...get().toasts, { id, text }].slice(-4) })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 5000)
  },
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    saveSettings(settings)
    set({ settings })
  },
}))
