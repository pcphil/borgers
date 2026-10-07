import type { ObjectDefId, StationType } from '../data/catalogue'
import type { Ingredient, MenuItemId } from '../data/recipes'
import type { Role } from '../data/unlocks'
import type { RngState } from './rng'

// The world is a plain JSON-serializable object. Entity maps are keyed by numeric id;
// JS iterates integer keys in ascending order, which gives deterministic iteration.

export type Id = number
export type Vec = { x: number; y: number }
export type Rot = 0 | 1 | 2 | 3

export const ZONE_DINING = 0
export const ZONE_KITCHEN = 1
export type Zone = typeof ZONE_DINING | typeof ZONE_KITCHEN

export type Complaint =
  | 'lineTooLong'
  | 'waitedTooLong'
  | 'tooExpensive'
  | 'dirty'
  | 'noSeats'
  | 'unreachable'
  | 'nothingToOrder'

export type PlacedObject = {
  id: Id
  def: ObjectDefId
  x: number
  y: number
  rot: Rot
  tier: 0 | 1
  /** Station work slots: task id or null. */
  slots: (Id | null)[]
  /** Tables. */
  dirty: boolean
  occupiedBy: Id | null
  /** Registers: assigned cashier. */
  cashierId: Id | null
  /** Pickup counters: orders waiting to be collected. */
  readyOrders: Id[]
  /** Registers: groups in line, front first. */
  queue: Id[]
}

export type Agent = {
  pos: Vec
  prev: Vec
  path: Vec[]
  pathIdx: number
  target: Vec | null
  /** layout version the current path was computed for. */
  pathVersion: number
  navFailed: boolean
}

export type GroupState =
  | 'toQueue'
  | 'queueing'
  | 'ordering'
  | 'toWait'
  | 'waitingFood'
  | 'toPickup'
  | 'collecting'
  | 'seeking'
  | 'toSeat'
  | 'eating'
  | 'leaving'
  | 'arriving'
  | 'departing'

export type Group = Agent & {
  id: Id
  size: number
  takeout: boolean
  /** Street end the group came from (-1 left, 1 right); it leaves the same way. */
  side: -1 | 1
  state: GroupState
  /** Ticks spent in current state. */
  timer: number
  patience: { queue: number; food: number; seat: number }
  registerId: Id | null
  orderId: Id | null
  tableId: Id | null
  eatTicks: number
  queueWait: number
  foodWait: number
  complaint: Complaint | null
  angry: boolean
  paid: boolean
  /** Worst cleanliness exposure seen (count of dirty things nearby). */
  dirtSeen: number
  gotSeat: boolean
  satisfaction: number | null
}

export type StaffState = 'idle' | 'walking' | 'working' | 'leaving'

export type StaffStats = { cooking: number; speed: number; service: number }

export type Staff = Agent & {
  id: Id
  name: string
  stats: StaffStats
  wage: number
  role: Role
  pendingRole: Role | null
  state: StaffState
  taskId: Id | null
  /** Station or register the staff member is bound to while working. */
  stationId: Id | null
  workRemaining: number
  employedAtOpen: boolean
}

export type Candidate = { id: Id; name: string; stats: StaffStats; wage: number }

export type OrderItem = {
  menu: MenuItemId
  step: number
  done: boolean
  qualitySum: number
  taskId: Id | null
}

export type OrderState = 'cooking' | 'delivering' | 'ready' | 'collected' | 'cancelled'

export type Order = {
  id: Id
  groupId: Id
  items: OrderItem[]
  state: OrderState
  createdTick: number
  pickupId: Id | null
  price: number
  quality: number
}

export type TaskKind = 'step' | 'deliver' | 'clean'

export type Task = {
  id: Id
  role: Role
  kind: TaskKind
  createdTick: number
  claimedBy: Id | null
  stationId: Id | null
  /** step tasks */
  orderId: Id | null
  itemIdx: number
  station: StationType | null
  consumed: boolean
  /** clean tasks */
  tableId: Id | null
  trashId: Id | null
}

export type Trash = { id: Id; x: number; y: number; taskId: Id | null }

export type Inventory = {
  stock: Record<Ingredient, number>
  reserved: Record<Ingredient, number>
  targets: Record<Ingredient, number>
  auto: Record<Ingredient, boolean>
  /** Manual orders paid today, delivered next morning. */
  pending: Record<Ingredient, number>
}

export type MenuEntry = { enabled: boolean; price: number }

export type CostCategory =
  | 'wages'
  | 'rent'
  | 'interest'
  | 'ingredients'
  | 'construction'
  | 'loanRepay'

export type DayRecord = {
  day: number
  revenue: number
  costs: Record<CostCategory, number>
  income: { sales: number; refunds: number; loan: number }
  served: number
  lost: number
  complaints: Partial<Record<Complaint, number>>
  repStart: number
  repEnd: number
  starsGained: number
  deliveryTruncated: number
}

export type Phase = 'prep' | 'open' | 'closing' | 'night'

export type Clock = {
  day: number
  /** Ticks since opening of the current day. */
  tick: number
  phase: Phase
  nightTick: number
  totalTicks: number
}

export type World = {
  version: number
  seed: number
  rng: RngState
  nextId: Id
  clock: Clock
  layout: { w: number; h: number; expanded: boolean; zones: Zone[]; version: number }
  objects: Record<Id, PlacedObject>
  groups: Record<Id, Group>
  staff: Record<Id, Staff>
  orders: Record<Id, Order>
  tasks: Record<Id, Task>
  trash: Record<Id, Trash>
  candidates: Candidate[]
  inventory: Inventory
  menu: Record<MenuItemId, MenuEntry>
  economy: {
    cash: number
    loan: number
    cumulativeRevenue: number
    today: DayRecord
    history: DayRecord[]
  }
  reputation: { scores: number[]; value: number }
  stars: number
  winSeen: boolean
  dismissedHints: string[]
  /** Per-day demand multipliers at hour boundaries 10:00..22:00 (all 1 until the day opens). */
  rush: number[]
}

export type SimEvent =
  | { type: 'customerEnter'; groupId: Id }
  | { type: 'orderTaken'; orderId: Id }
  | { type: 'cookStart'; station: StationType; stationId: Id }
  | { type: 'orderReady'; orderId: Id; pickupId: Id }
  | { type: 'purchase'; amount: number }
  | { type: 'starGained'; stars: number }
  | { type: 'customerLost'; complaint: Complaint }
  | { type: 'dayEnded'; record: DayRecord }
  | { type: 'autosave' }
  | { type: 'notice'; text: string }
