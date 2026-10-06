import type { StationType } from './catalogue'

export const INGREDIENTS = [
  'bun',
  'patty',
  'cheese',
  'lettuce',
  'tomato',
  'potato',
  'syrup',
] as const
export type Ingredient = (typeof INGREDIENTS)[number]

export const INGREDIENT_COST: Record<Ingredient, number> = {
  bun: 30,
  patty: 80,
  cheese: 20,
  lettuce: 10,
  tomato: 10,
  potato: 25,
  syrup: 15,
}

export const INGREDIENT_LABEL: Record<Ingredient, string> = {
  bun: 'Buns',
  patty: 'Patties',
  cheese: 'Cheese',
  lettuce: 'Lettuce',
  tomato: 'Tomato',
  potato: 'Potatoes',
  syrup: 'Soda syrup',
}

export type RecipeStep = {
  station: StationType
  seconds: number
  consumes: Partial<Record<Ingredient, number>>
}

export type MenuCategory = 'main' | 'side' | 'drink'

export type MenuItemDef = {
  id: MenuItemId
  name: string
  category: MenuCategory
  /** Fair value in cents. Also the default price. */
  fairValue: number
  appeal: number
  steps: RecipeStep[]
}

export const MENU_ITEM_IDS = ['classic', 'cheese', 'double', 'fries', 'soda'] as const
export type MenuItemId = (typeof MENU_ITEM_IDS)[number]

export const MENU: Record<MenuItemId, MenuItemDef> = {
  classic: {
    id: 'classic',
    name: 'Classic burger',
    category: 'main',
    fairValue: 600,
    appeal: 1,
    steps: [
      { station: 'grill', seconds: 3, consumes: { patty: 1 } },
      { station: 'assembly', seconds: 1.5, consumes: { bun: 1, lettuce: 1, tomato: 1 } },
    ],
  },
  cheese: {
    id: 'cheese',
    name: 'Cheeseburger',
    category: 'main',
    fairValue: 750,
    appeal: 1.3,
    steps: [
      { station: 'grill', seconds: 3, consumes: { patty: 1 } },
      { station: 'assembly', seconds: 1.5, consumes: { bun: 1, cheese: 1, lettuce: 1 } },
    ],
  },
  double: {
    id: 'double',
    name: 'Double burger',
    category: 'main',
    fairValue: 1000,
    appeal: 1.5,
    steps: [
      { station: 'grill', seconds: 4, consumes: { patty: 2 } },
      { station: 'assembly', seconds: 2, consumes: { bun: 1, cheese: 2 } },
    ],
  },
  fries: {
    id: 'fries',
    name: 'Fries',
    category: 'side',
    fairValue: 300,
    appeal: 1,
    steps: [{ station: 'fryer', seconds: 3, consumes: { potato: 1 } }],
  },
  soda: {
    id: 'soda',
    name: 'Soda',
    category: 'drink',
    fairValue: 200,
    appeal: 1,
    steps: [{ station: 'soda', seconds: 0.6, consumes: { syrup: 1 } }],
  },
}
