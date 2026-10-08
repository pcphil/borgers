import { host } from '../app/host'
import { money } from '../app/snapshot'
import { useUI } from '../app/store'
import { ECONOMY, TICKS_PER_SECOND } from '../data/balance'
import { CATALOGUE } from '../data/catalogue'
import { MENU } from '../data/recipes'
import { isUnlocked } from '../data/unlocks'
import { stepOf } from '../sim/kitchen'
import { objectValue } from '../sim/layout'
import { Button, Panel, StatBar } from './common'
import { COMPLAINT_TEXT, GROUP_STATE_TEXT, ROLE_LABEL, STAFF_STATE_TEXT } from './text'

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-3 py-0.5">
    <span className="text-amber-900/60">{k}</span>
    <span className="text-right">{v}</span>
  </div>
)

const secs = (ticks: number) => `${Math.max(0, Math.round(ticks / TICKS_PER_SECOND))}s`

/** Details for the clicked customer group, staff member or object (live, ~10 Hz). */
export function Inspect() {
  const selection = useUI((s) => s.selection)
  useUI((s) => s.snapshot?.tick) // re-render with snapshots
  const select = useUI((s) => s.select)
  const setTool = useUI((s) => s.setTool)
  const w = host.sim?.world
  if (!selection || !w) return null
  const closeIt = () => select(null)

  if (selection.kind === 'group') {
    const g = w.groups[selection.id]
    if (!g) return null
    const order = g.orderId !== null ? w.orders[g.orderId] : undefined
    const inLine = g.state === 'toQueue' || g.state === 'queueing' || g.state === 'ordering'
    const patienceLeft = inLine
      ? g.patience.queue - g.queueWait
      : g.state === 'seeking'
        ? g.patience.seat - g.timer
        : g.patience.food - g.foodWait
    return (
      <Panel title={`Customers (${g.size})`} onClose={closeIt} className="w-64">
        <Row k="Doing" v={GROUP_STATE_TEXT[g.state]} />
        <Row k="Type" v={g.takeout ? 'Takeout' : 'Dine-in'} />
        {order ? <Row k="Order" v={order.items.map((i) => MENU[i.menu].name).join(', ')} /> : null}
        {order ? <Row k="Paid" v={money(order.price)} /> : null}
        {g.state !== 'eating' &&
        g.state !== 'leaving' &&
        g.state !== 'arriving' &&
        g.state !== 'departing' ? (
          <Row k="Patience left" v={secs(patienceLeft)} />
        ) : null}
        {g.complaint ? (
          <div className="mt-2 rounded bg-red-50 p-2 text-red-800">
            “{COMPLAINT_TEXT[g.complaint]}”
          </div>
        ) : (
          <div className="mt-2 rounded bg-green-50 p-2 text-green-800">“Looks good so far!”</div>
        )}
      </Panel>
    )
  }

  if (selection.kind === 'staff') {
    const s = w.staff[selection.id]
    if (!s) return null
    const task = s.taskId !== null ? w.tasks[s.taskId] : undefined
    let doing: string = STAFF_STATE_TEXT[s.state]
    if (task?.kind === 'step') {
      const step = host.sim ? stepOf(host.sim, task) : undefined
      doing = `${s.state === 'working' ? 'Using' : 'Going to'} ${step?.station ?? 'station'}`
    } else if (task?.kind === 'deliver') doing = 'Delivering an order'
    else if (task?.kind === 'clean') doing = s.state === 'working' ? 'Cleaning' : 'Going to clean'
    else if (s.stationId !== null && w.objects[s.stationId]?.def === 'register')
      doing = s.state === 'working' ? 'At the register' : 'Going to the register'
    return (
      <Panel title={s.name} onClose={closeIt} className="w-64">
        <Row
          k="Role"
          v={ROLE_LABEL[s.role] + (s.pendingRole ? ` → ${ROLE_LABEL[s.pendingRole]}` : '')}
        />
        <Row k="Doing" v={doing} />
        <Row k="Wage" v={`${money(s.wage)}/day`} />
        <div className="mt-2 space-y-1">
          <StatBar label="Cooking" value={s.stats.cooking} />
          <StatBar label="Speed" value={s.stats.speed} />
          <StatBar label="Service" value={s.stats.service} />
        </div>
      </Panel>
    )
  }

  const o = w.objects[selection.id]
  if (!o) return null
  const def = CATALOGUE[o.def]
  const tier2 = def.tiers[1]
  const canUpgrade = def.station && tier2 && o.tier === 0
  const upgradeUnlocked = def.station
    ? isUnlocked(w.stars, { kind: 'tier2', station: def.station })
    : false
  const busy = o.slots.filter((x) => x !== null).length
  return (
    <Panel title={def.name + (o.tier ? ' (Tier 2)' : '')} onClose={closeIt} className="w-64">
      {def.station ? <Row k="Working" v={`${busy} / ${o.slots.length} slots`} /> : null}
      {o.def === 'register' ? (
        <>
          <Row
            k="Cashier"
            v={o.cashierId !== null ? (w.staff[o.cashierId]?.name ?? '—') : 'None!'}
          />
          <Row k="In line" v={o.queue.length} />
        </>
      ) : null}
      {o.def === 'pickup' ? <Row k="Orders ready" v={o.readyOrders.length} /> : null}
      {def.seats ? (
        <>
          <Row k="Seats" v={def.seats} />
          <Row
            k="State"
            v={
              o.dirty
                ? 'Dirty'
                : `${o.seatOccupants.filter((id) => id !== null).length} of ${def.seats} in use`
            }
          />
        </>
      ) : null}
      {def.storage ? <Row k="Storage" v={`+${def.storage}`} /> : null}
      <div className="mt-3 flex flex-wrap gap-1">
        <Button
          onClick={() => {
            setTool({ kind: 'move', id: o.id, def: o.def, rot: o.rot })
            useUI.getState().set({ panel: 'build' })
          }}
        >
          Move
        </Button>
        {canUpgrade ? (
          <Button
            disabled={!upgradeUnlocked || w.economy.cash < tier2.cost}
            title={upgradeUnlocked ? undefined : 'Not unlocked yet'}
            onClick={() => {
              const r = host.dispatch({ type: 'upgrade', id: o.id })
              if (!r.ok) useUI.getState().toast(`Can't upgrade: ${r.reason}`)
            }}
          >
            Upgrade {money(tier2.cost)}
            {upgradeUnlocked ? '' : ' 🔒'}
          </Button>
        ) : null}
        <Button
          variant="danger"
          onClick={() => {
            host.dispatch({ type: 'sell', id: o.id })
            select(null)
          }}
        >
          Sell +{money(Math.round(objectValue(o) * ECONOMY.sellRefundRatio))}
        </Button>
      </div>
    </Panel>
  )
}
