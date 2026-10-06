export type StationType = 'grill' | 'fryer' | 'assembly' | 'soda'

export type ObjectDefId =
  | 'grill'
  | 'fryer'
  | 'assembly'
  | 'soda'
  | 'fridge'
  | 'register'
  | 'pickup'
  | 'table2'
  | 'table4'
  | 'bin'
  | 'plant'
  | 'lamp'

/**
 * kitchen: footprint on Kitchen tiles. dining: footprint on Dining tiles.
 * counter: straddles the boundary (customer access on Dining, staff access on Kitchen).
 * any: no zone restriction.
 */
export type ObjectCategory = 'kitchen' | 'counter' | 'dining' | 'any'

export type AccessTile = { dx: number; dy: number; side: 'staff' | 'customer' }

export type TierStats = { cost: number; slots: number; speedMul: number; quality: number }

export type ObjectDef = {
  id: ObjectDefId
  name: string
  category: ObjectCategory
  /** Footprint at rotation 0 (w along x, h along y). Front faces -y. */
  w: number
  h: number
  /** Access tiles relative to the footprint origin at rotation 0. */
  access: AccessTile[]
  /** tiers[0] is the base object; tiers[1] the upgrade, if any. tiers[0].cost is the purchase price. */
  tiers: TierStats[]
  station?: StationType
  seats?: number
  storage?: number
}

const staffFront: AccessTile[] = [{ dx: 0, dy: -1, side: 'staff' }]

export const CATALOGUE: Record<ObjectDefId, ObjectDef> = {
  grill: {
    id: 'grill',
    name: 'Grill',
    category: 'kitchen',
    w: 2,
    h: 1,
    access: [
      { dx: 0, dy: -1, side: 'staff' },
      { dx: 1, dy: -1, side: 'staff' },
    ],
    station: 'grill',
    tiers: [
      { cost: 120_000, slots: 2, speedMul: 1, quality: 0.45 },
      { cost: 200_000, slots: 3, speedMul: 1.4, quality: 0.9 },
    ],
  },
  fryer: {
    id: 'fryer',
    name: 'Fryer',
    category: 'kitchen',
    w: 1,
    h: 1,
    access: staffFront,
    station: 'fryer',
    tiers: [
      { cost: 90_000, slots: 2, speedMul: 1, quality: 0.45 },
      { cost: 150_000, slots: 3, speedMul: 1.4, quality: 0.9 },
    ],
  },
  assembly: {
    id: 'assembly',
    name: 'Assembly counter',
    category: 'kitchen',
    w: 2,
    h: 1,
    access: [
      { dx: 0, dy: -1, side: 'staff' },
      { dx: 1, dy: -1, side: 'staff' },
    ],
    station: 'assembly',
    tiers: [
      { cost: 60_000, slots: 2, speedMul: 1, quality: 0.45 },
      { cost: 120_000, slots: 3, speedMul: 1.4, quality: 0.9 },
    ],
  },
  soda: {
    id: 'soda',
    name: 'Soda fountain',
    category: 'kitchen',
    w: 1,
    h: 1,
    access: staffFront,
    station: 'soda',
    tiers: [
      { cost: 50_000, slots: 2, speedMul: 1, quality: 0.6 },
      { cost: 90_000, slots: 4, speedMul: 1.5, quality: 0.9 },
    ],
  },
  fridge: {
    id: 'fridge',
    name: 'Fridge',
    category: 'kitchen',
    w: 1,
    h: 1,
    access: staffFront,
    storage: 150,
    tiers: [{ cost: 40_000, slots: 0, speedMul: 1, quality: 0 }],
  },
  register: {
    id: 'register',
    name: 'Register',
    category: 'counter',
    w: 1,
    h: 1,
    access: [
      { dx: 0, dy: -1, side: 'customer' },
      { dx: 0, dy: 1, side: 'staff' },
    ],
    tiers: [{ cost: 50_000, slots: 1, speedMul: 1, quality: 0 }],
  },
  pickup: {
    id: 'pickup',
    name: 'Pickup counter',
    category: 'counter',
    w: 2,
    h: 1,
    access: [
      { dx: 0, dy: -1, side: 'customer' },
      { dx: 1, dy: -1, side: 'customer' },
      { dx: 0, dy: 1, side: 'staff' },
      { dx: 1, dy: 1, side: 'staff' },
    ],
    tiers: [{ cost: 40_000, slots: 6, speedMul: 1, quality: 0 }],
  },
  table2: {
    id: 'table2',
    name: '2-seat table',
    category: 'dining',
    w: 2,
    h: 1,
    access: [
      { dx: 0, dy: -1, side: 'customer' },
      { dx: 1, dy: -1, side: 'customer' },
    ],
    seats: 2,
    tiers: [{ cost: 15_000, slots: 0, speedMul: 1, quality: 0 }],
  },
  table4: {
    id: 'table4',
    name: '4-seat table',
    category: 'dining',
    w: 2,
    h: 2,
    access: [
      { dx: 0, dy: -1, side: 'customer' },
      { dx: 1, dy: -1, side: 'customer' },
      { dx: 0, dy: 2, side: 'customer' },
      { dx: 1, dy: 2, side: 'customer' },
    ],
    seats: 4,
    tiers: [{ cost: 30_000, slots: 0, speedMul: 1, quality: 0 }],
  },
  bin: {
    id: 'bin',
    name: 'Trash bin',
    category: 'any',
    w: 1,
    h: 1,
    access: [],
    tiers: [{ cost: 5_000, slots: 0, speedMul: 1, quality: 0 }],
  },
  plant: {
    id: 'plant',
    name: 'Potted plant',
    category: 'any',
    w: 1,
    h: 1,
    access: [],
    tiers: [{ cost: 8_000, slots: 0, speedMul: 1, quality: 0 }],
  },
  lamp: {
    id: 'lamp',
    name: 'Floor lamp',
    category: 'any',
    w: 1,
    h: 1,
    access: [],
    tiers: [{ cost: 10_000, slots: 0, speedMul: 1, quality: 0 }],
  },
}

export const OBJECT_IDS = Object.keys(CATALOGUE) as ObjectDefId[]
