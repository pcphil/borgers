import { host } from '../app/host'
import type { Speed } from '../app/loop'
import { money } from '../app/snapshot'
import { type Panel, useUI } from '../app/store'
import { ROTATE_EVENT } from '../render/CameraRig'
import { Stars } from './common'
import { reputationTip } from './text'

const SPEEDS: { s: Speed; label: string; key: string }[] = [
  { s: 0, label: '⏸', key: 'Space' },
  { s: 1, label: '▶', key: '1' },
  { s: 2, label: '▶▶', key: '2' },
  { s: 3, label: '▶▶▶', key: '3' },
]

const PANELS: { id: Exclude<Panel, null>; label: string; key: string }[] = [
  { id: 'build', label: '🔨 Build', key: 'B' },
  { id: 'staff', label: '👥 Staff', key: 'H' },
  { id: 'menu', label: '🍔 Menu', key: 'M' },
  { id: 'inventory', label: '📦 Stock', key: 'I' },
  { id: 'finances', label: '💰 Finances', key: 'F' },
  { id: 'saves', label: '💾 Save', key: '' },
]

export function Hud() {
  const snap = useUI((s) => s.snapshot)
  const panel = useUI((s) => s.panel)
  const setPanel = useUI((s) => s.setPanel)
  if (!snap) return null
  const phaseText = { prep: 'Preparing', open: 'Open', closing: 'Closing', night: 'Night' }[
    snap.phase
  ]
  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-xl bg-amber-50/95 px-2.5 py-2 shadow-lg">
      <div className="flex items-baseline gap-2">
        <span className="font-black text-red-700">borgers</span>
        <Stars n={snap.stars} />
      </div>
      <div
        className={`min-w-20 font-mono text-lg font-bold ${snap.cash < 0 ? 'text-red-600' : 'text-green-800'}`}
        data-testid="hud-cash"
      >
        {money(snap.cash)}
      </div>
      <div className="text-amber-950" data-testid="hud-clock">
        Day {snap.day} · <span className="font-mono">{snap.clockText}</span>{' '}
        <span
          className={`rounded px-1.5 text-xs font-semibold ${snap.phase === 'open' ? 'bg-green-200 text-green-900' : 'bg-slate-300 text-slate-800'}`}
        >
          {phaseText}
        </span>
      </div>
      {snap.phase === 'prep' ? (
        <button
          type="button"
          data-testid="open-button"
          onClick={() => host.dispatch({ type: 'open' })}
          className="rounded-md bg-green-600 px-3 py-1 text-sm font-bold text-white shadow hover:bg-green-700"
        >
          Open restaurant
        </button>
      ) : null}
      <div
        className="text-amber-950"
        title={reputationTip(snap.reputation, snap.demandFactor, snap.phase === 'prep')}
      >
        😊 {Math.round(snap.reputation)}
      </div>
      <div className="text-amber-950" title="Customers in the restaurant">
        🧍 {snap.customers}
      </div>
      <div className="flex gap-0.5 rounded-lg bg-amber-900/10 p-0.5">
        {SPEEDS.map(({ s, label, key }) => (
          <button
            key={s}
            type="button"
            title={`${s === 0 ? 'Pause' : `${s}x`} (${key})`}
            onClick={() => host.setSpeed(s)}
            className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${snap.speed === s ? 'bg-red-600 text-white' : 'text-amber-950 hover:bg-amber-200'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.key ? `${p.label} (${p.key})` : p.label}
            onClick={() => setPanel(p.id)}
            className={`rounded-md px-1.5 py-1 text-sm font-medium ${panel === p.id ? 'bg-amber-900 text-amber-50' : 'text-amber-950 hover:bg-amber-200'}`}
          >
            {p.label}
          </button>
        ))}
        {([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            title={`Rotate view ${dir < 0 ? 'left' : 'right'} (${dir < 0 ? 'Q' : 'E'})`}
            aria-label={`Rotate view ${dir < 0 ? 'left' : 'right'}`}
            onClick={() => window.dispatchEvent(new CustomEvent(ROTATE_EVENT, { detail: dir }))}
            className="rounded-md px-1 py-1 text-sm text-amber-950 hover:bg-amber-200"
          >
            {dir < 0 ? '↺' : '↻'}
          </button>
        ))}
        <button
          type="button"
          title="Settings"
          onClick={() => useUI.getState().set({ settingsOpen: true })}
          className="rounded-md px-2 py-1 text-sm text-amber-950 hover:bg-amber-200"
        >
          ⚙️
        </button>
      </div>
    </div>
  )
}
