import type { Role } from '../data/unlocks'
import { LAYOUT_ERROR_TEXT, type LayoutError } from '../sim/layout'
import type { Unavailable } from '../sim/menu'
import type { Complaint, GroupState, StaffState } from '../sim/types'

export const reasonText = (r: string) => LAYOUT_ERROR_TEXT[r as LayoutError] ?? r

export const ROLE_LABEL: Record<Role, string> = {
  cashier: 'Cashier',
  cook: 'Cook',
  assembler: 'Assembler',
  cleaner: 'Cleaner',
}

export const COMPLAINT_TEXT: Record<Complaint, string> = {
  lineTooLong: 'The line is too long!',
  waitedTooLong: 'I waited too long for my food!',
  tooExpensive: 'This is too expensive.',
  dirty: "It's dirty in here.",
  noSeats: 'There are no free seats!',
  unreachable: "I can't get to my seat!",
  nothingToOrder: "There's nothing I can order!",
}

export const COMPLAINT_ICON: Record<Complaint, string> = {
  lineTooLong: '⏳',
  waitedTooLong: '😠',
  tooExpensive: '💸',
  dirty: '🤢',
  noSeats: '🪑',
  unreachable: '🚧',
  nothingToOrder: '🚫',
}

export const GROUP_STATE_TEXT: Record<GroupState, string> = {
  toQueue: 'Joining the line',
  queueing: 'Waiting in line',
  ordering: 'Ordering',
  toWait: 'Finding a spot to wait',
  waitingFood: 'Waiting for food',
  toPickup: 'Collecting order',
  collecting: 'Collecting order',
  seeking: 'Looking for a seat',
  toSeat: 'Walking to a table',
  eating: 'Eating',
  leaving: 'Leaving',
}

export const STAFF_STATE_TEXT: Record<StaffState, string> = {
  idle: 'Idle',
  walking: 'Walking',
  working: 'Working',
  leaving: 'Leaving',
}

export const UNAVAILABLE_TEXT: Record<Unavailable, string> = {
  locked: 'Locked',
  disabled: 'Off',
  noStation: 'Missing station',
  outOfStock: 'Out of stock',
}
