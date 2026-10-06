import { ECONOMY } from '../data/balance'
import type { Sim } from './sim'
import type { CostCategory, DayRecord } from './types'

export function newDayRecord(day: number, rep: number): DayRecord {
  return {
    day,
    revenue: 0,
    costs: { wages: 0, rent: 0, interest: 0, ingredients: 0, construction: 0, loanRepay: 0 },
    income: { sales: 0, refunds: 0, loan: 0 },
    served: 0,
    lost: 0,
    complaints: {},
    repStart: rep,
    repEnd: rep,
    starsGained: 0,
    deliveryTruncated: 0,
  }
}

export function spend(sim: Sim, amount: number, category: CostCategory) {
  const e = sim.world.economy
  e.cash -= amount
  e.today.costs[category] += amount
  if (category === 'construction') sim.emit({ type: 'purchase', amount })
}

export function earnSale(sim: Sim, amount: number) {
  const e = sim.world.economy
  e.cash += amount
  e.today.revenue += amount
  e.today.income.sales += amount
  e.cumulativeRevenue += amount
}

export function refund(sim: Sim, amount: number) {
  const e = sim.world.economy
  e.cash += amount
  e.today.income.refunds += amount
}

/** Purchases (objects, upgrades, expansion, manual orders) need non-negative cash covering the cost. */
export const canAfford = (sim: Sim, cost: number) => sim.world.economy.cash >= cost

export function takeLoan(sim: Sim): boolean {
  const e = sim.world.economy
  if (e.loan > 0) return false
  e.loan = ECONOMY.loanAmount
  e.cash += ECONOMY.loanAmount
  e.today.income.loan += ECONOMY.loanAmount
  return true
}

export function repayLoan(sim: Sim): boolean {
  const e = sim.world.economy
  if (e.loan <= 0 || e.cash < e.loan) return false
  spend(sim, e.loan, 'loanRepay')
  e.loan = 0
  return true
}
