import type { Category, ShelfLifeRule } from './types';

// Starting shelf-life rules from the PRD (fridge, approximate, to be checked against
// food-safety guidance before launch). Categories not in the PRD table use sensible defaults.
export const SHELF_LIFE_RULES: Record<Category, ShelfLifeRule> = {
  milk: { category: 'milk', label: 'Milk', unopenedDays: 2, openedDays: 2, perishable: true, freezerDays: 30 },
  uht_milk: { category: 'uht_milk', label: 'UHT / tetra milk', unopenedDays: 90, openedDays: 3, perishable: false, freezerDays: null },
  curd_yogurt: { category: 'curd_yogurt', label: 'Curd / yogurt', unopenedDays: 5, openedDays: 3, perishable: true, freezerDays: null },
  paneer: { category: 'paneer', label: 'Paneer', unopenedDays: 4, openedDays: 2, perishable: true, freezerDays: 60 },
  cheese: { category: 'cheese', label: 'Cheese', unopenedDays: 30, openedDays: 10, perishable: true, freezerDays: 90 },
  butter_ghee: { category: 'butter_ghee', label: 'Butter / ghee', unopenedDays: 60, openedDays: 30, perishable: false, freezerDays: 180 },
  cream: { category: 'cream', label: 'Fresh cream', unopenedDays: 7, openedDays: 3, perishable: true, freezerDays: null },
  eggs: { category: 'eggs', label: 'Eggs', unopenedDays: 14, openedDays: null, perishable: true, freezerDays: null },
  bread: { category: 'bread', label: 'Bread', unopenedDays: 4, openedDays: 3, perishable: true, freezerDays: 30 },
  batter: { category: 'batter', label: 'Idli / dosa batter', unopenedDays: 3, openedDays: 2, perishable: true, freezerDays: 30 },
  leafy_veg: { category: 'leafy_veg', label: 'Leafy vegetables', unopenedDays: 3, openedDays: null, perishable: true, freezerDays: null },
  vegetables: { category: 'vegetables', label: 'Vegetables', unopenedDays: 6, openedDays: null, perishable: true, freezerDays: null },
  fruits: { category: 'fruits', label: 'Fruits', unopenedDays: 5, openedDays: 2, perishable: true, freezerDays: null },
  meat: { category: 'meat', label: 'Meat / chicken', unopenedDays: 2, openedDays: 1, perishable: true, freezerDays: 90 },
  fish: { category: 'fish', label: 'Fish', unopenedDays: 1, openedDays: 1, perishable: true, freezerDays: 90 },
  tofu: { category: 'tofu', label: 'Tofu', unopenedDays: 5, openedDays: 3, perishable: true, freezerDays: 60 },
  sauces_condiments: { category: 'sauces_condiments', label: 'Sauces / condiments', unopenedDays: 180, openedDays: 30, perishable: false, freezerDays: null },
  beverages: { category: 'beverages', label: 'Beverages', unopenedDays: 30, openedDays: 3, perishable: false, freezerDays: null },
  ready_to_eat: { category: 'ready_to_eat', label: 'Ready to eat', unopenedDays: 3, openedDays: 1, perishable: true, freezerDays: 30 },
  leftovers: { category: 'leftovers', label: 'Leftovers', unopenedDays: 2, openedDays: null, perishable: true, freezerDays: 30 },
  other: { category: 'other', label: 'Other', unopenedDays: 7, openedDays: 3, perishable: false, freezerDays: null },
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  milk: '🥛', uht_milk: '🧃', curd_yogurt: '🥣', paneer: '🧀', cheese: '🧀', butter_ghee: '🧈', cream: '🍶',
  eggs: '🥚', bread: '🍞', batter: '🫓', leafy_veg: '🥬', vegetables: '🥕', fruits: '🍎', meat: '🍗',
  fish: '🐟', tofu: '⬜', sauces_condiments: '🫙', beverages: '🧃', ready_to_eat: '🥡', leftovers: '🍲', other: '📦',
};

export const ALL_CATEGORIES = Object.keys(SHELF_LIFE_RULES) as Category[];

const NAME_EMOJI: [RegExp, string][] = [
  [/tomato/i, '🍅'], [/banana/i, '🍌'], [/onion/i, '🧅'], [/potato|aloo/i, '🥔'], [/coriander|dhania|mint|pudina|curry leaves/i, '🌿'],
  [/capsicum|bell pepper/i, '🫑'], [/lemon|lime/i, '🍋'], [/apple/i, '🍎'], [/cucumber/i, '🥒'], [/mushroom/i, '🍄'], [/carrot/i, '🥕'],
  [/chilli|chili/i, '🌶️'], [/garlic/i, '🧄'], [/ginger/i, '🫚'], [/mango/i, '🥭'], [/grape/i, '🍇'], [/orange/i, '🍊'], [/broccoli|cauliflower|gobi/i, '🥦'],
  [/corn/i, '🌽'], [/brinjal|eggplant/i, '🍆'], [/strawberr/i, '🍓'], [/watermelon/i, '🍉'], [/coconut/i, '🥥'], [/chicken/i, '🍗'], [/prawn|shrimp/i, '🦐'],
];

/** Emoji for an item: by name when we recognise it, else by category. */
export function itemEmoji(name: string, category: Category): string {
  for (const [re, e] of NAME_EMOJI) if (re.test(name)) return e;
  return CATEGORY_EMOJI[category];
}
