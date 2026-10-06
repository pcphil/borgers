import type { ObjectDefId, StationType } from './catalogue'
import type { MenuItemId } from './recipes'

export type Role = 'cashier' | 'cook' | 'assembler' | 'cleaner'
export const ROLES: Role[] = ['cashier', 'cook', 'assembler', 'cleaner']

export type Unlock =
  | { kind: 'object'; id: ObjectDefId }
  | { kind: 'menu'; id: MenuItemId }
  | { kind: 'role'; id: Role }
  | { kind: 'tier2'; station: StationType }
  | { kind: 'expansion' }

export const UNLOCKS: Record<1 | 2 | 3 | 4 | 5, Unlock[]> = {
  1: [
    { kind: 'object', id: 'grill' },
    { kind: 'object', id: 'assembly' },
    { kind: 'object', id: 'register' },
    { kind: 'object', id: 'pickup' },
    { kind: 'object', id: 'soda' },
    { kind: 'object', id: 'fridge' },
    { kind: 'object', id: 'bin' },
    { kind: 'object', id: 'table2' },
    { kind: 'menu', id: 'classic' },
    { kind: 'menu', id: 'soda' },
    { kind: 'role', id: 'cashier' },
    { kind: 'role', id: 'cook' },
    { kind: 'role', id: 'assembler' },
  ],
  2: [
    { kind: 'object', id: 'fryer' },
    { kind: 'menu', id: 'fries' },
    { kind: 'role', id: 'cleaner' },
    { kind: 'object', id: 'table4' },
  ],
  3: [
    { kind: 'menu', id: 'cheese' },
    { kind: 'tier2', station: 'grill' },
    { kind: 'object', id: 'plant' },
    { kind: 'object', id: 'lamp' },
  ],
  4: [{ kind: 'menu', id: 'double' }, { kind: 'expansion' }],
  5: [
    { kind: 'tier2', station: 'fryer' },
    { kind: 'tier2', station: 'assembly' },
    { kind: 'tier2', station: 'soda' },
  ],
}

const key = (u: Unlock) =>
  u.kind === 'expansion'
    ? 'expansion'
    : u.kind === 'tier2'
      ? `tier2:${u.station}`
      : `${u.kind}:${u.id}`

const STAR_OF = new Map<string, number>()
for (const [star, list] of Object.entries(UNLOCKS)) {
  for (const u of list) STAR_OF.set(key(u), Number(star))
}

/** Star rating required for an unlock, or undefined if not in the ladder. */
export const requiredStars = (u: Unlock): number | undefined => STAR_OF.get(key(u))

export const isUnlocked = (stars: number, u: Unlock): boolean => {
  const req = requiredStars(u)
  return req !== undefined && stars >= req
}
