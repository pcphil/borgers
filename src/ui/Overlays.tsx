import { host } from '../app/host'
import { money } from '../app/snapshot'
import { useUI } from '../app/store'
import { checkMove, checkPlace } from '../sim/layout'
import type { Complaint } from '../sim/types'
import { Button, Panel, Stars } from './common'
import { COMPLAINT_TEXT, reasonText } from './text'

export function Hints() {
  const hints = useUI((s) => s.snapshot?.hints)
  if (!hints?.length) return null
  return (
    <div className="pointer-events-auto flex w-80 flex-col gap-1" data-testid="hints">
      {hints.slice(0, 5).map((h) => (
        <div
          key={h.id}
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm shadow ${h.severity === 'warn' ? 'bg-orange-100 text-orange-950' : 'bg-sky-100 text-sky-950'}`}
        >
          <span>{h.severity === 'warn' ? '⚠️' : '💡'}</span>
          <span className="flex-1">{h.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-xs opacity-60 hover:opacity-100"
            onClick={() => host.dispatch({ type: 'dismissHint', id: h.id })}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  return (
    <div className="pointer-events-none flex flex-col items-center gap-1">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-lg bg-amber-950/90 px-3 py-1.5 text-sm text-amber-50 shadow"
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}

/** Explains why the ghost preview is invalid, next to the HUD. */
export function BuildStatus() {
  const tool = useUI((s) => s.tool)
  const hover = useUI((s) => s.hover)
  useUI((s) => s.snapshot?.layoutVersion)
  const sim = host.sim
  if (!sim || (tool.kind !== 'place' && tool.kind !== 'move')) {
    if (tool.kind === 'paint') return <Chip text="Drag to paint zones · Esc to stop" />
    return null
  }
  if (!hover) return <Chip text="Point at the floor to place · R to rotate · Esc to cancel" />
  const p = { def: tool.def, x: hover.x, y: hover.y, rot: tool.rot }
  const err = tool.kind === 'place' ? checkPlace(sim.world, p) : checkMove(sim.world, tool.id, p)
  return <Chip text={err ? `✗ ${reasonText(err)}` : '✓ Click to place · R rotate'} bad={!!err} />
}

const Chip = ({ text, bad }: { text: string; bad?: boolean }) => (
  <div
    className={`pointer-events-none rounded-full px-3 py-1 text-sm font-medium shadow ${bad ? 'bg-red-600 text-white' : 'bg-amber-950/85 text-amber-50'}`}
  >
    {text}
  </div>
)

export function DaySummary() {
  const r = useUI((s) => s.summary)
  if (!r) return null
  const costs = Object.entries(r.costs).filter(([, v]) => v > 0)
  const totalCost = costs.reduce((a, [, v]) => a + v, 0)
  const complaints = Object.entries(r.complaints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const dismiss = () => useUI.getState().set({ summary: null })
  const label: Record<string, string> = {
    wages: 'Wages',
    rent: 'Rent',
    interest: 'Loan interest',
    ingredients: 'Ingredients',
    construction: 'Construction',
    loanRepay: 'Loan repayment',
  }
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/30 p-4">
      <Panel title={`Day ${r.day} summary`} onClose={dismiss} className="w-96">
        {r.starsGained ? (
          <div className="mb-2 rounded-lg bg-amber-200 p-2 text-center font-bold">
            ⭐ You earned a new star! Check the Build panel for unlocks.
          </div>
        ) : null}
        <div className="mb-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded bg-white p-2">
            <div className="text-xs text-amber-900/60">Revenue</div>
            <div className="font-mono font-bold text-green-700">{money(r.revenue)}</div>
          </div>
          <div className="rounded bg-white p-2">
            <div className="text-xs text-amber-900/60">Costs</div>
            <div className="font-mono font-bold text-red-700">−{money(totalCost)}</div>
          </div>
          <div className="rounded bg-white p-2">
            <div className="text-xs text-amber-900/60">Served / lost</div>
            <div className="font-bold">
              {r.served} / <span className="text-red-700">{r.lost}</span>
            </div>
          </div>
          <div className="rounded bg-white p-2">
            <div className="text-xs text-amber-900/60">Reputation</div>
            <div className="font-bold">
              {Math.round(r.repStart)} → {Math.round(r.repEnd)}
            </div>
          </div>
        </div>
        {costs.length ? (
          <div className="mb-2">
            {costs.map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span>{label[k] ?? k}</span>
                <span className="font-mono">−{money(v)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {complaints.length ? (
          <div className="mb-2">
            <div className="text-xs font-bold uppercase text-amber-900/60">Top complaints</div>
            {complaints.map(([k, n]) => (
              <div key={k} className="text-xs">
                {n}× “{COMPLAINT_TEXT[k as Complaint]}”
              </div>
            ))}
          </div>
        ) : null}
        <Button variant="primary" className="w-full" onClick={dismiss}>
          Continue
        </Button>
      </Panel>
    </div>
  )
}

export function WinBanner() {
  const pending = useUI((s) => s.snapshot?.winPending)
  const summary = useUI((s) => s.summary)
  if (!pending || summary) return null
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="max-w-md rounded-2xl bg-amber-50 p-6 text-center shadow-2xl">
        <div className="text-5xl">🏆</div>
        <h2 className="mt-2 text-2xl font-black text-red-700">Five stars!</h2>
        <div className="my-2 text-2xl">
          <Stars n={5} />
        </div>
        <p className="mb-4 text-amber-950">
          Your burger joint is the best in town. Keep playing as long as you like.
        </p>
        <Button variant="primary" onClick={() => host.dispatch({ type: 'ackWin' })}>
          Keep playing
        </Button>
      </div>
    </div>
  )
}

export function SettingsModal() {
  const open = useUI((s) => s.settingsOpen)
  const settings = useUI((s) => s.settings)
  const update = useUI((s) => s.updateSettings)
  const screen = useUI((s) => s.screen)
  if (!open) return null
  const closeIt = () => useUI.getState().set({ settingsOpen: false })
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/30 p-4">
      <Panel title="Settings" onClose={closeIt} className="w-80">
        <label className="mb-3 block">
          <span className="text-xs font-semibold">Volume {Math.round(settings.volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => update({ volume: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="mb-3 block">
          <span className="text-xs font-semibold">
            UI scale {Math.round(settings.uiScale * 100)}%
          </span>
          <input
            type="range"
            min={0.75}
            max={1.5}
            step={0.05}
            value={settings.uiScale}
            onChange={(e) => update({ uiScale: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="mb-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.shadows}
            onChange={(e) => update({ shadows: e.target.checked })}
          />
          Shadows
        </label>
        <label className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autosave}
            onChange={(e) => update({ autosave: e.target.checked })}
          />
          Autosave every night
        </label>
        {screen === 'game' ? (
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              closeIt()
              host.quitToMenu()
            }}
          >
            Quit to main menu
          </Button>
        ) : null}
      </Panel>
    </div>
  )
}
