import { useState } from 'react'
import { host } from '../app/host'
import { money } from '../app/snapshot'
import { useUI } from '../app/store'
import { ECONOMY, LOT } from '../data/balance'
import { CATALOGUE, OBJECT_IDS, type ObjectCategory } from '../data/catalogue'
import { INGREDIENT_COST, INGREDIENT_LABEL, MENU } from '../data/recipes'
import { isUnlocked, ROLES, requiredStars } from '../data/unlocks'
import { isLeaving, ZONE_DINING, ZONE_KITCHEN, type Zone } from '../sim/types'
import { Button, Panel, StatBar } from './common'
import { ROLE_LABEL, UNAVAILABLE_TEXT } from './text'

const close = () => useUI.getState().setPanel(null)

const CATEGORY_LABEL: Record<ObjectCategory, string> = {
  kitchen: 'Kitchen',
  counter: 'Counters',
  dining: 'Dining',
  any: 'Extras',
}

export function BuildPanel() {
  const snap = useUI((s) => s.snapshot)
  const tool = useUI((s) => s.tool)
  const setTool = useUI((s) => s.setTool)
  if (!snap) return null
  const cats: ObjectCategory[] = ['kitchen', 'counter', 'dining', 'any']
  return (
    <Panel title="Build" onClose={close} className="w-72">
      <p className="mb-2 text-xs text-amber-900/70">
        Click to place · <b>R</b> rotate · <b>Esc</b> cancel · drag to pan. Click a placed object to
        move, upgrade or sell it.
      </p>
      {cats.map((cat) => (
        <div key={cat} className="mb-3">
          <h3 className="mb-1 text-xs font-bold uppercase text-amber-900/60">
            {CATEGORY_LABEL[cat]}
          </h3>
          <div className="grid grid-cols-2 gap-1">
            {OBJECT_IDS.filter((id) => CATALOGUE[id].category === cat).map((id) => {
              const def = CATALOGUE[id]
              const unlocked = isUnlocked(snap.stars, { kind: 'object', id })
              const cost = def.tiers[0]?.cost ?? 0
              const active = tool.kind === 'place' && tool.def === id
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!unlocked}
                  title={unlocked ? def.name : `Requires ${requiredStars({ kind: 'object', id })}★`}
                  onClick={() =>
                    setTool(active ? { kind: 'none' } : { kind: 'place', def: id, rot: 0 })
                  }
                  className={`rounded-md border px-2 py-1 text-left text-xs disabled:opacity-40 ${active ? 'border-red-600 bg-red-50' : 'border-amber-900/20 bg-white hover:bg-amber-100'}`}
                >
                  <div className="font-semibold">{def.name}</div>
                  <div className={snap.cash < cost ? 'text-red-600' : 'text-amber-900/70'}>
                    {unlocked ? money(cost) : `🔒 ${requiredStars({ kind: 'object', id })}★`}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <h3 className="mb-1 text-xs font-bold uppercase text-amber-900/60">Zones</h3>
      <div className="mb-3 flex gap-1">
        {(
          [
            { zone: ZONE_DINING, label: 'Paint Dining' },
            { zone: ZONE_KITCHEN, label: 'Paint Kitchen' },
          ] as { zone: Zone; label: string }[]
        ).map(({ zone, label }) => {
          const active = tool.kind === 'paint' && tool.zone === zone
          return (
            <Button
              key={zone}
              variant={active ? 'primary' : 'default'}
              onClick={() => setTool(active ? { kind: 'none' } : { kind: 'paint', zone })}
            >
              {label}
            </Button>
          )
        })}
      </div>
      {!snap.lot.expanded ? (
        <div>
          <h3 className="mb-1 text-xs font-bold uppercase text-amber-900/60">Lot</h3>
          <Button
            disabled={snap.stars < 4 || snap.cash < LOT.expansionCost}
            title={snap.stars < 4 ? 'Requires 4★' : undefined}
            onClick={() => {
              const r = host.dispatch({ type: 'expand' })
              if (!r.ok) useUI.getState().toast(`Can't expand: ${r.reason}`)
            }}
          >
            Expand lot ({money(LOT.expansionCost)}){snap.stars < 4 ? ' 🔒 4★' : ''}
          </Button>
        </div>
      ) : null}
    </Panel>
  )
}

export function StaffPanel() {
  const snap = useUI((s) => s.snapshot)
  const select = useUI((s) => s.select)
  if (!snap) return null
  const active = snap.staff.filter((s) => !isLeaving(s.state))
  return (
    <Panel title="Staff" onClose={close} className="w-80">
      <h3 className="mb-1 text-xs font-bold uppercase text-amber-900/60">
        Your team ({active.length}) · {money(active.reduce((a, s) => a + s.wage, 0))}/day
      </h3>
      {active.length === 0 ? <p className="mb-2 text-amber-900/70">Nobody hired yet.</p> : null}
      <div className="mb-3 space-y-2">
        {active.map((s) => (
          <div key={s.id} className="rounded-lg border border-amber-900/15 bg-white p-2">
            <div className="mb-1 flex items-center justify-between">
              <button
                type="button"
                className="font-semibold hover:underline"
                onClick={() => select({ kind: 'staff', id: s.id })}
              >
                {s.name}
              </button>
              <span className="text-xs text-amber-900/70">{money(s.wage)}/day</span>
            </div>
            <StatBar label="Cooking" value={s.stats.cooking} />
            <StatBar label="Speed" value={s.stats.speed} />
            <StatBar label="Service" value={s.stats.service} />
            <div className="mt-1 flex items-center gap-1">
              <select
                className="flex-1 rounded border border-amber-900/20 bg-white px-1 py-0.5 text-sm"
                value={s.pendingRole ?? s.role}
                onChange={(e) =>
                  host.dispatch({
                    type: 'setRole',
                    staffId: s.id,
                    role: e.target.value as (typeof ROLES)[number],
                  })
                }
              >
                {ROLES.map((r) => (
                  <option
                    key={r}
                    value={r}
                    disabled={!isUnlocked(snap.stars, { kind: 'role', id: r })}
                  >
                    {ROLE_LABEL[r]}
                    {isUnlocked(snap.stars, { kind: 'role', id: r })
                      ? ''
                      : ` (🔒 ${requiredStars({ kind: 'role', id: r })}★)`}
                  </option>
                ))}
              </select>
              <FireButton id={s.id} />
            </div>
            {s.pendingRole ? (
              <div className="text-xs text-amber-700">
                Switching to {ROLE_LABEL[s.pendingRole]}…
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <h3 className="mb-1 text-xs font-bold uppercase text-amber-900/60">
        Candidates (new ones each night)
      </h3>
      <div className="space-y-2">
        {snap.candidates.map((c) => (
          <div key={c.id} className="rounded-lg border border-dashed border-amber-900/25 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold">{c.name}</span>
              <span className="text-xs text-amber-900/70">asks {money(c.wage)}/day</span>
            </div>
            <StatBar label="Cooking" value={c.stats.cooking} />
            <StatBar label="Speed" value={c.stats.speed} />
            <StatBar label="Service" value={c.stats.service} />
            <Button
              className="mt-1 w-full"
              variant="primary"
              onClick={() => host.dispatch({ type: 'hire', candidateId: c.id })}
            >
              Hire
            </Button>
          </div>
        ))}
        {snap.candidates.length === 0 ? (
          <p className="text-amber-900/70">No candidates left today.</p>
        ) : null}
      </div>
    </Panel>
  )
}

function FireButton({ id }: { id: number }) {
  const [confirm, setConfirm] = useState(false)
  return confirm ? (
    <span className="flex gap-1">
      <Button variant="danger" onClick={() => host.dispatch({ type: 'fire', staffId: id })}>
        Fire?
      </Button>
      <Button variant="ghost" onClick={() => setConfirm(false)}>
        No
      </Button>
    </span>
  ) : (
    <Button variant="danger" onClick={() => setConfirm(true)}>
      Fire
    </Button>
  )
}

export function MenuPanel() {
  const snap = useUI((s) => s.snapshot)
  if (!snap) return null
  return (
    <Panel title="Menu" onClose={close} className="w-80">
      <p className="mb-2 text-xs text-amber-900/70">
        Pricing above fair value means fewer customers and unhappier ones. Pricing below brings
        more.
      </p>
      <div className="space-y-2">
        {snap.menu.map((m) => {
          const def = MENU[m.id]
          const locked = m.unavailable === 'locked'
          return (
            <div
              key={m.id}
              className={`rounded-lg border border-amber-900/15 bg-white p-2 ${m.unavailable && m.unavailable !== 'disabled' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={m.enabled && !locked}
                    onChange={(e) =>
                      host.dispatch({
                        type: 'setMenu',
                        item: m.id,
                        patch: { enabled: e.target.checked },
                      })
                    }
                  />
                  {def.name}
                </label>
                {m.unavailable ? (
                  <span className="rounded bg-slate-200 px-1.5 text-xs">
                    {locked
                      ? `🔒 ${requiredStars({ kind: 'menu', id: m.id })}★`
                      : UNAVAILABLE_TEXT[m.unavailable]}
                  </span>
                ) : (
                  <span className="rounded bg-green-100 px-1.5 text-xs text-green-800">
                    Available
                  </span>
                )}
              </div>
              {!locked ? (
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      host.dispatch({ type: 'setMenu', item: m.id, patch: { price: m.price - 25 } })
                    }
                  >
                    −
                  </Button>
                  <span
                    className={`w-16 text-center font-mono font-bold ${m.price > def.fairValue ? 'text-red-700' : m.price < def.fairValue ? 'text-green-700' : ''}`}
                  >
                    {money(m.price)}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      host.dispatch({ type: 'setMenu', item: m.id, patch: { price: m.price + 25 } })
                    }
                  >
                    +
                  </Button>
                  <span className="text-xs text-amber-900/60">fair {money(def.fairValue)}</span>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

export function InventoryPanel() {
  const snap = useUI((s) => s.snapshot)
  if (!snap) return null
  const pct = Math.min(100, (snap.totalStock / snap.capacity) * 100)
  return (
    <Panel title="Inventory" onClose={close} className="w-96">
      <div className="mb-2">
        <div className="flex justify-between text-xs">
          <span>Storage</span>
          <span>
            {snap.totalStock} / {snap.capacity} (build fridges for more)
          </span>
        </div>
        <div className="h-2 rounded bg-amber-900/10">
          <div
            className={`h-2 rounded ${pct > 95 ? 'bg-red-500' : 'bg-amber-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="mb-2 text-xs text-amber-900/70">
        Auto-reorder buys up to the target every night. Manual orders are paid now and arrive next
        morning.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-amber-900/60">
            <th>Item</th>
            <th>Stock</th>
            <th>Target</th>
            <th>Auto</th>
            <th>Order</th>
          </tr>
        </thead>
        <tbody>
          {snap.inventory.map((i) => (
            <tr key={i.id} className="border-t border-amber-900/10">
              <td className="py-1">
                {INGREDIENT_LABEL[i.id]}
                <div className="text-xs text-amber-900/50">{money(INGREDIENT_COST[i.id])} ea</div>
              </td>
              <td className={i.stock - i.reserved <= 0 ? 'font-bold text-red-600' : ''}>
                {i.stock}
                {i.pending ? <span className="text-xs text-green-700"> +{i.pending}</span> : null}
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={i.target}
                  onChange={(e) =>
                    host.dispatch({
                      type: 'setStockTarget',
                      ingredient: i.id,
                      target: Number(e.target.value),
                    })
                  }
                  className="w-16 rounded border border-amber-900/20 px-1"
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={i.auto}
                  onChange={(e) =>
                    host.dispatch({
                      type: 'setAutoReorder',
                      ingredient: i.id,
                      on: e.target.checked,
                    })
                  }
                />
              </td>
              <td>
                <Button
                  variant="ghost"
                  title={`Buy 10 for ${money(10 * INGREDIENT_COST[i.id])}`}
                  onClick={() => {
                    const r = host.dispatch({ type: 'manualOrder', ingredient: i.id, qty: 10 })
                    if (!r.ok) useUI.getState().toast('Not enough cash to order.')
                  }}
                >
                  +10
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

export function FinancesPanel() {
  const snap = useUI((s) => s.snapshot)
  if (!snap) return null
  const days = [...snap.history].reverse().slice(0, 30)
  const totalCost = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...days.map((d) => Math.max(d.revenue, totalCost(d.costs))))
  return (
    <Panel title="Finances" onClose={close} className="w-96">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white p-2">
          <div className="text-xs text-amber-900/60">Cash</div>
          <div className={`font-mono text-lg font-bold ${snap.cash < 0 ? 'text-red-600' : ''}`}>
            {money(snap.cash)}
          </div>
        </div>
        <div className="rounded-lg bg-white p-2">
          <div className="text-xs text-amber-900/60">Today so far</div>
          <div className="font-mono">
            +{money(snap.today.revenue)} / −{money(totalCost(snap.today.costs))}
          </div>
        </div>
      </div>
      <div className="mb-3 rounded-lg bg-white p-2">
        <div className="mb-1 text-xs font-bold uppercase text-amber-900/60">Loan</div>
        {snap.loan > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <span>
              Owed {money(snap.loan)} · interest {money(ECONOMY.loanInterestPerDay)}/day
            </span>
            <Button
              disabled={snap.cash < snap.loan}
              onClick={() => host.dispatch({ type: 'repayLoan' })}
            >
              Repay
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span>
              Borrow {money(ECONOMY.loanAmount)} at {money(ECONOMY.loanInterestPerDay)}/day
            </span>
            <Button variant="primary" onClick={() => host.dispatch({ type: 'takeLoan' })}>
              Take loan
            </Button>
          </div>
        )}
      </div>
      <div className="mb-1 text-xs font-bold uppercase text-amber-900/60">History</div>
      {days.length === 0 ? <p className="text-amber-900/70">No completed days yet.</p> : null}
      <table className="w-full text-xs">
        <tbody>
          {days.map((d) => {
            const cost = totalCost(d.costs)
            return (
              <tr key={d.day} className="border-t border-amber-900/10">
                <td className="w-12 py-1">Day {d.day}</td>
                <td className="w-32">
                  <div
                    className="h-1.5 rounded bg-green-600"
                    style={{ width: `${(d.revenue / max) * 100}%` }}
                  />
                  <div
                    className="mt-0.5 h-1.5 rounded bg-red-500"
                    style={{ width: `${(cost / max) * 100}%` }}
                  />
                </td>
                <td className="pl-2 text-right font-mono">{money(d.revenue)}</td>
                <td className="pl-2 text-right font-mono text-red-700">−{money(cost)}</td>
                <td className="pl-2 text-right">
                  {d.served}✓ {d.lost}✗
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Panel>
  )
}
