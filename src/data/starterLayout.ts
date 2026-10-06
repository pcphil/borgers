import type { ObjectDefId } from './catalogue'
import type { Ingredient } from './recipes'

export type StarterObject = { def: ObjectDefId; x: number; y: number; rot: 0 | 1 | 2 | 3 }

/** Rows with y >= kitchenFromRow are painted Kitchen; the rest are Dining. Front (entrance) is y = 0. */
export const STARTER = {
  kitchenFromRow: 6,
  objects: [
    { def: 'register', x: 5, y: 5, rot: 0 },
    { def: 'pickup', x: 8, y: 5, rot: 0 },
    { def: 'grill', x: 2, y: 8, rot: 0 },
    { def: 'assembly', x: 5, y: 8, rot: 0 },
    { def: 'soda', x: 8, y: 8, rot: 0 },
    { def: 'fridge', x: 10, y: 8, rot: 0 },
    { def: 'table2', x: 8, y: 2, rot: 0 },
    { def: 'table2', x: 10, y: 2, rot: 0 },
    { def: 'table2', x: 0, y: 3, rot: 0 },
    { def: 'bin', x: 11, y: 4, rot: 0 },
  ] satisfies StarterObject[] as StarterObject[],
  stock: { bun: 60, patty: 60, lettuce: 50, tomato: 50, syrup: 60 } as Partial<
    Record<Ingredient, number>
  >,
}
