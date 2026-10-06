import { useEffect } from 'react'
import { host } from '../app/host'
import { type Panel as PanelId, useUI } from '../app/store'
import { Scene } from '../render/Scene'
import { Hud } from './Hud'
import { Inspect } from './Inspect'
import { MainMenu } from './MainMenu'
import { BuildStatus, DaySummary, Hints, SettingsModal, Toasts, WinBanner } from './Overlays'
import { BuildPanel, FinancesPanel, InventoryPanel, MenuPanel, StaffPanel } from './panels'
import { SavesPanel } from './Saves'

const PANEL_KEYS: Record<string, PanelId> = {
  b: 'build',
  h: 'staff',
  m: 'menu',
  i: 'inventory',
  f: 'finances',
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const ui = useUI.getState()
      if (ui.screen !== 'game') return
      const k = e.key.toLowerCase()
      if (k === ' ') {
        e.preventDefault()
        host.setSpeed(host.speed === 0 ? 1 : 0)
      } else if (k === '1' || k === '2' || k === '3') host.setSpeed(Number(k) as 1 | 2 | 3)
      else if (k === 'escape') {
        if (ui.tool.kind !== 'none') ui.setTool({ kind: 'none' })
        else if (ui.selection) ui.select(null)
        else ui.set({ panel: null })
      } else if (k === 'r' && (ui.tool.kind === 'place' || ui.tool.kind === 'move')) {
        ui.setTool({ ...ui.tool, rot: ((ui.tool.rot + 1) % 4) as 0 | 1 | 2 | 3 })
      } else if (PANEL_KEYS[k]) ui.setPanel(PANEL_KEYS[k])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function ActivePanel() {
  const panel = useUI((s) => s.panel)
  switch (panel) {
    case 'build':
      return <BuildPanel />
    case 'staff':
      return <StaffPanel />
    case 'menu':
      return <MenuPanel />
    case 'inventory':
      return <InventoryPanel />
    case 'finances':
      return <FinancesPanel />
    case 'saves':
      return <SavesPanel />
    default:
      return null
  }
}

function GameScreen() {
  const uiScale = useUI((s) => s.settings.uiScale)
  return (
    <div className="absolute inset-0">
      <Scene />
      <div
        className="pointer-events-none absolute inset-0 origin-top-left"
        style={{
          transform: `scale(${uiScale})`,
          width: `${100 / uiScale}%`,
          height: `${100 / uiScale}%`,
        }}
      >
        <div className="absolute inset-x-2 top-2 flex justify-center">
          <Hud />
        </div>
        <div className="absolute bottom-2 left-2 top-20 flex flex-col justify-start">
          <ActivePanel />
        </div>
        <div className="absolute bottom-2 right-2 top-20 flex flex-col items-end justify-between gap-2">
          <Hints />
          <Inspect />
        </div>
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1">
          <Toasts />
          <BuildStatus />
        </div>
        <DaySummary />
        <WinBanner />
      </div>
    </div>
  )
}

export function App() {
  const screen = useUI((s) => s.screen)
  useShortcuts()
  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-slate-900 font-sans">
      {screen === 'game' ? <GameScreen /> : <MainMenu />}
      <SettingsModal />
    </div>
  )
}
