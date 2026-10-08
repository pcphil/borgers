import type { Group } from '../sim/types'

/** Takeout groups carry a small bag marker, so they read differently from dine-in groups. */
export const hasBag = (g: Pick<Group, 'takeout'>) => g.takeout
