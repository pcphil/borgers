// All gameplay tunables. Money in integer cents. Durations in real seconds at 1x
// (converted to ticks via TICKS_PER_SECOND). Tune with `pnpm simulate`.

export const TICKS_PER_SECOND = 20
export const OPEN_HOUR = 10
export const CLOSE_HOUR = 22
/** Real seconds at 1x for the open period (10:00–22:00). */
export const OPEN_SECONDS = 240
export const NIGHT_SECONDS = 5
export const MAX_TICKS_PER_FRAME = 12

export const ticks = (seconds: number) => Math.round(seconds * TICKS_PER_SECOND)
export const OPEN_TICKS = ticks(OPEN_SECONDS)
export const TICKS_PER_HOUR = OPEN_TICKS / (CLOSE_HOUR - OPEN_HOUR)
export const NIGHT_TICKS = ticks(NIGHT_SECONDS)

export const LOT = {
  initial: { w: 12, h: 10 },
  expanded: { w: 18, h: 14 },
  entranceX: 2,
  expansionCost: 600_000,
}

export const ECONOMY = {
  startingCash: 500_000,
  rentPerDay: 15_000,
  loanAmount: 500_000,
  loanInterestPerDay: 5_000,
  sellRefundRatio: 0.5,
  historyDays: 60,
}

export const INVENTORY = {
  baseCapacity: 150,
  perFridgeCapacity: 150,
}

export const STAFF = {
  candidates: 3,
  baseWage: 2_500,
  wagePerStat: 5_000,
  walkSpeed: 2.6,
  workSpeedMin: 0.6,
  workSpeedRange: 0.8,
  cleanSeconds: 3,
  collectSeconds: 0.5,
  orderSeconds: 2.5,
}

export const CUSTOMERS = {
  walkSpeed: 2.0,
  maxActiveGroups: 36,
  groupSizeWeights: [45, 35, 12, 8],
  takeoutChance: 0.4,
  extraSideChance: 0.35,
  drinkChance: 0.55,
  queueLength: 6,
  patience: {
    queue: [30, 50],
    food: [40, 70],
    seat: [15, 25],
  } as Record<'queue' | 'food' | 'seat', [number, number]>,
  eatSeconds: [15, 25] as [number, number],
  trashChance: 0.3,
  binRange: 4,
  dirtRadius: 3,
  /** Groups per game hour by hour of day (piecewise linear). */
  demandCurve: [
    [10, 1.5],
    [11, 3],
    [12, 6.5],
    [13, 6],
    [14, 3],
    [17, 3],
    [18, 6],
    [19, 6],
    [20, 3.5],
    [21.5, 1.5],
    [22, 0],
  ] as [number, number][],
  priceElasticity: 2,
}

export const REPUTATION = {
  neutral: 50,
  window: 50,
  priorWeight: 10,
  angryScore: 5,
  weights: { wait: 0.35, quality: 0.2, price: 0.2, clean: 0.15, seat: 0.1 },
}

export const QUALITY = { skillWeight: 0.5, tierWeight: 0.5 }

/** Star thresholds: index = target star. Reputation (0-100) and cumulative revenue (cents). */
export const STARS: Record<2 | 3 | 4 | 5, { reputation: number; revenue: number }> = {
  2: { reputation: 55, revenue: 150_000 },
  3: { reputation: 60, revenue: 500_000 },
  4: { reputation: 65, revenue: 1_100_000 },
  5: { reputation: 70, revenue: 2_000_000 },
}
