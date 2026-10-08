import { CATALOGUE } from '../data/catalogue'
import { INGREDIENT_LABEL, type Ingredient, MENU, MENU_ITEM_IDS } from '../data/recipes'
import { isMenuUnlocked, itemNeeds, stationExists } from './menu'
import { isLeaving, type World } from './types'

export type Hint = { id: string; text: string; severity: 'info' | 'warn' }

const STATION_NAME: Record<string, string> = {
  grill: 'Grill',
  fryer: 'Fryer',
  assembly: 'Assembly counter',
  soda: 'Soda fountain',
}

/** Problems derived from the current simulation state. Pure; filtered by dismissals in the UI. */
export function computeHints(w: World): Hint[] {
  const out: Hint[] = []
  const objs = Object.values(w.objects)
  const staff = Object.values(w.staff).filter((s) => !isLeaving(s.state))
  const hasRole = (r: string) => staff.some((s) => s.role === r || s.pendingRole === r)

  if (w.clock.phase === 'prep')
    out.push({
      id: 'closed',
      text: 'The restaurant is closed. Press Open restaurant when you are ready.',
      severity: 'info',
    })

  if (!objs.some((o) => o.def === 'register'))
    out.push({
      id: 'no-register',
      text: 'Build a Register so customers can order.',
      severity: 'warn',
    })
  if (!objs.some((o) => o.def === 'pickup'))
    out.push({
      id: 'no-pickup',
      text: 'Build a Pickup counter to hand out orders.',
      severity: 'warn',
    })
  if (!hasRole('cashier'))
    out.push({
      id: 'no-cashier',
      text: 'No cashier! Hire staff and assign a Cashier so customers can order.',
      severity: 'warn',
    })
  if (!hasRole('cook'))
    out.push({ id: 'no-cook', text: 'No cook! Assign a Cook to work the grill.', severity: 'warn' })
  if (!hasRole('assembler'))
    out.push({
      id: 'no-assembler',
      text: 'No assembler! Assign an Assembler to build burgers and serve orders.',
      severity: 'warn',
    })

  const neededIngredients = new Set<Ingredient>()
  for (const id of MENU_ITEM_IDS) {
    if (!isMenuUnlocked(w, id) || !w.menu[id].enabled) continue
    for (const step of MENU[id].steps) {
      if (!stationExists(w, step.station))
        out.push({
          id: `missing-station:${id}`,
          text: `${MENU[id].name} needs a ${STATION_NAME[step.station] ?? step.station}.`,
          severity: 'warn',
        })
    }
    for (const i of Object.keys(itemNeeds(id)) as Ingredient[]) neededIngredients.add(i)
  }
  for (const i of neededIngredients) {
    if (w.inventory.stock[i] - w.inventory.reserved[i] <= 0)
      out.push({
        id: `out-of-stock:${i}`,
        text: `Out of ${INGREDIENT_LABEL[i].toLowerCase()}! Order more in the Inventory panel.`,
        severity: 'warn',
      })
  }

  // Kitchen backlog: many unclaimed steps for one role means that role can't keep up.
  const backlog = { cook: 0, assembler: 0 }
  for (const t of Object.values(w.tasks))
    if (t.claimedBy === null && (t.role === 'cook' || t.role === 'assembler')) backlog[t.role]++
  if (backlog.cook >= 6 && hasRole('cook'))
    out.push({
      id: 'backlog-cook',
      text: `Cooks can't keep up (${backlog.cook} items waiting). Assign another Cook or add a grill.`,
      severity: 'warn',
    })
  if (backlog.assembler >= 6 && hasRole('assembler'))
    out.push({
      id: 'backlog-assembler',
      text: `Assemblers can't keep up (${backlog.assembler} items waiting). Assign another Assembler.`,
      severity: 'warn',
    })

  const regs = objs.filter((o) => o.def === 'register')
  if (regs.length > 0 && regs.every((r) => r.queue.length >= 5))
    out.push({
      id: 'line-too-long',
      text: 'The line is full. Customers are leaving. Add a register or cashier.',
      severity: 'warn',
    })

  if (w.economy.cash < 0)
    out.push({
      id: 'in-debt',
      text: 'You are in debt and cannot buy anything. Take a loan in the Finances panel.',
      severity: 'warn',
    })

  const dirty = objs.filter((o) => o.dirty).length
  if (dirty >= 2 && !hasRole('cleaner'))
    out.push({
      id: 'dirty-tables',
      text:
        w.stars >= 2
          ? 'Tables are dirty. Assign a Cleaner.'
          : 'Tables are dirty. Idle staff will clean them.',
      severity: 'info',
    })

  if (!objs.some((o) => (CATALOGUE[o.def].seats ?? 0) > 0))
    out.push({
      id: 'no-tables',
      text: 'No tables: dine-in customers will leave. Build tables.',
      severity: 'info',
    })

  return out
}
