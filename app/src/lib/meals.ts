import { daysBetween, isWeekend } from './dates';
import type { Category, DietType, Equipment, InventoryItem, MealSuggestion, Slot, UserProfile } from './types';

// ---------- Hard rules (checked in code, never trusted to the model) ----------

const MEAT = ['chicken', 'mutton', 'meat', 'keema', 'lamb', 'pork', 'beef', 'bacon', 'ham', 'sausage', 'salami'];
const FISH = ['fish', 'prawn', 'prawns', 'shrimp', 'salmon', 'tuna', 'crab', 'lobster', 'rohu', 'pomfret', 'surmai'];
const EGG = ['egg', 'eggs', 'omelette', 'bhurji anda', 'anda'];
const DAIRY = ['milk', 'paneer', 'curd', 'dahi', 'yogurt', 'yoghurt', 'cheese', 'butter', 'ghee', 'cream', 'malai', 'khoa', 'raita', 'lassi', 'buttermilk', 'chaas', 'kheer'];
const HONEY = ['honey'];
const JAIN_EXCLUDED = ['onion', 'garlic', 'potato', 'aloo', 'carrot', 'beetroot', 'radish', 'mooli', 'ginger', 'sweet potato', 'shallot', 'spring onion', 'leek'];

export const DIET_EXCLUSIONS: Record<DietType, string[]> = {
  vegetarian: [...MEAT, ...FISH, ...EGG],
  eggetarian: [...MEAT, ...FISH],
  jain: [...MEAT, ...FISH, ...EGG, ...JAIN_EXCLUDED],
  vegan: [...MEAT, ...FISH, ...EGG, ...DAIRY, ...HONEY],
  pescatarian: [...MEAT],
  non_vegetarian: [],
};

export const ALLERGEN_WORDS: Record<string, string[]> = {
  peanut: ['peanut', 'peanuts', 'groundnut', 'moongphali', 'sing dana'],
  lactose: DAIRY.filter((w) => w !== 'ghee'),
  gluten: ['atta', 'wheat', 'bread', 'maida', 'pav', 'rava', 'suji', 'semolina', 'pasta', 'roti', 'chapati', 'paratha', 'noodles', 'toast', 'sandwich', 'upma'],
  soy: ['soy', 'soya', 'tofu', 'edamame'],
  shellfish: ['prawn', 'prawns', 'shrimp', 'crab', 'lobster'],
  egg: EGG,
  tree_nuts: ['cashew', 'almond', 'walnut', 'pistachio', 'kaju', 'badam'],
};

function mentions(text: string, word: string): boolean {
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(text);
}

function mealText(meal: Pick<MealSuggestion, 'title' | 'usesItems' | 'extraIngredients'>): string {
  return [meal.title, ...meal.usesItems.map((u) => u.name), ...meal.extraIngredients].join(' | ').toLowerCase();
}

export interface RuleViolation {
  rule: 'diet' | 'allergy' | 'dislike' | 'cook_time' | 'equipment';
  detail: string;
}

export function checkHardRules(
  meal: Pick<MealSuggestion, 'title' | 'usesItems' | 'extraIngredients' | 'cookTimeMin' | 'equipmentNeeded'>,
  profile: UserProfile,
  date: string,
): RuleViolation[] {
  const v: RuleViolation[] = [];
  const text = mealText(meal);
  // "cream (optional)" is still a dairy ingredient; we check every listed word.
  for (const w of DIET_EXCLUSIONS[profile.dietType]) {
    if (mentions(text, w)) {
      v.push({ rule: 'diet', detail: `${w} is not ${profile.dietType.replace('_', '-')}` });
      break;
    }
  }
  for (const a of profile.allergies) {
    const words = ALLERGEN_WORDS[a.toLowerCase()] ?? [a.toLowerCase()];
    const hit = words.find((w) => mentions(text, w));
    if (hit) {
      v.push({ rule: 'allergy', detail: `contains ${hit} (${a})` });
      break;
    }
  }
  for (const d of profile.dislikes) {
    if (d.trim() && mentions(text, d.trim().toLowerCase())) {
      v.push({ rule: 'dislike', detail: `has ${d}` });
      break;
    }
  }
  const limit = isWeekend(date) ? profile.cookTimeWeekendMin : profile.cookTimeWeekdayMin;
  if (meal.cookTimeMin > limit) v.push({ rule: 'cook_time', detail: `${meal.cookTimeMin} min > ${limit} min` });
  const missing = meal.equipmentNeeded.filter((e) => !profile.equipment.includes(e));
  if (missing.length) v.push({ rule: 'equipment', detail: `needs ${missing.join(', ')}` });
  return v;
}

// ---------- Rescue score ----------

/** w_i = 1 / (1 + max(d_i, 0)) — today 1, tomorrow 0.5, in 3 days 0.25. */
export function urgencyWeight(daysLeft: number): number {
  return 1 / (1 + Math.max(daysLeft, 0));
}

/** score = Σ w_i · f_i − 0.05 · n_extra */
export function rescueScore(
  uses: { itemId: string; fraction: number }[],
  daysLeftById: Record<string, number>,
  nExtra: number,
): number {
  let s = 0;
  for (const u of uses) {
    const d = daysLeftById[u.itemId];
    if (d === undefined || d < 0) continue;
    s += urgencyWeight(d) * Math.min(Math.max(u.fraction, 0), 1);
  }
  return Math.round((s - 0.05 * nExtra) * 1000) / 1000;
}

// ---------- Local recipe library + candidate building ----------

export interface RecipeIngredient {
  cats?: Category[];
  words?: string[];
  amount: string;
  fraction: number; // of the fridge item used
  main?: boolean; // must be in the fridge for this recipe to be suggested
  label: string; // what to call it if missing (becomes an extra)
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  slots: Slot[];
  cuisine: string;
  cookTimeMin: number;
  servings: number;
  equipment: Equipment[];
  ingredients: RecipeIngredient[];
  staples: string[]; // assumed in the pantry — listed for diet checks, not counted as extras
  extras: string[]; // need buying if not in fridge
  steps: string[];
}

export function itemMatches(item: Pick<InventoryItem, 'displayName' | 'category'>, ing: RecipeIngredient): boolean {
  const name = item.displayName.toLowerCase();
  if (ing.words?.some((w) => mentions(name, w))) return true;
  if (ing.cats?.includes(item.category)) {
    // a category match is enough unless words are also given (then the words must match)
    return !ing.words?.length;
  }
  return false;
}

/** True if a single ingredient/item name breaks the profile's diet, allergies or dislikes. */
export function wordConflicts(text: string, profile: UserProfile): boolean {
  const t = text.toLowerCase();
  if (DIET_EXCLUSIONS[profile.dietType].some((w) => mentions(t, w))) return true;
  for (const a of profile.allergies) {
    const words = ALLERGEN_WORDS[a.toLowerCase()] ?? [a.toLowerCase()];
    if (words.some((w) => mentions(t, w))) return true;
  }
  return profile.dislikes.some((d) => d.trim() && mentions(t, d.trim().toLowerCase()));
}

export function buildFromRecipe(
  recipe: Recipe,
  items: InventoryItem[],
  daysLeftById: Record<string, number>,
  date: string,
  slot: Slot,
  profile?: UserProfile,
): MealSuggestion | null {
  const pool = items
    .filter((i) => i.status === 'active' && (daysLeftById[i.id] ?? 0) >= 0)
    .sort((a, b) => (daysLeftById[a.id] ?? 99) - (daysLeftById[b.id] ?? 99));
  const used = new Set<string>();
  const usesItems: MealSuggestion['usesItems'] = [];
  const extra: string[] = [];
  for (const ing of recipe.ingredients) {
    // Optional (non-main) ingredients that clash with the profile are simply left out.
    if (!ing.main && profile && wordConflicts(ing.label, profile)) continue;
    const hit = pool.find((i) => !used.has(i.id) && itemMatches(i, ing) && !(profile && wordConflicts(i.displayName, profile)));
    if (hit) {
      used.add(hit.id);
      usesItems.push({
        itemId: hit.id,
        name: hit.displayName,
        amount: ing.amount,
        fraction: Math.round(Math.min(ing.fraction, hit.remainingFraction) * 100) / 100, // of the whole item
      });
    } else if (ing.main) {
      return null;
    } else {
      extra.push(ing.label);
    }
  }
  if (!usesItems.length) return null;
  const extras = [...extra, ...recipe.extras];
  return {
    id: `${date}-${slot}-${recipe.id}`,
    date,
    slot,
    title: recipe.title,
    description: recipe.description,
    cookTimeMin: recipe.cookTimeMin,
    servings: recipe.servings,
    usesItems,
    extraIngredients: [...extras, ...recipe.staples.map((s) => `${s} (staple)`)],
    equipmentNeeded: recipe.equipment,
    steps: recipe.steps,
    rescueScore: rescueScore(usesItems, daysLeftById, extras.length),
    status: 'suggested',
    cuisine: recipe.cuisine,
  };
}

export interface SlotPlan {
  slot: Slot;
  best?: MealSuggestion;
  alternatives: MealSuggestion[];
}

/**
 * Filter → score → pick best per slot, without using the same urgent item
 * as the main ingredient in all three slots. Keep the next 2 as alternatives.
 */
export function selectMeals(candidates: MealSuggestion[], profile: UserProfile, date: string, slots: Slot[]): SlotPlan[] {
  const valid = candidates
    .filter((c) => slots.includes(c.slot) && checkHardRules(c, profile, date).length === 0)
    .sort((a, b) => b.rescueScore - a.rescueScore || a.cookTimeMin - b.cookTimeMin);
  const chosen = new Map<Slot, MealSuggestion>();
  const alloc = new Map<string, number>(); // share of each fridge item already planned
  const mainUse = new Map<string, number>();
  const titles = new Set<string>();
  const fits = (c: MealSuggestion) => c.usesItems.every((u) => (alloc.get(u.itemId) ?? 0) + u.fraction <= 1.001);
  const mainOk = (c: MealSuggestion) => {
    const main = c.usesItems[0]?.itemId;
    return !main || (mainUse.get(main) ?? 0) < Math.max(1, slots.length - 1);
  };
  const take = (c: MealSuggestion) => {
    chosen.set(c.slot, c);
    titles.add(c.title);
    c.usesItems.forEach((u) => alloc.set(u.itemId, (alloc.get(u.itemId) ?? 0) + u.fraction));
    const main = c.usesItems[0]?.itemId;
    if (main) mainUse.set(main, (mainUse.get(main) ?? 0) + 1);
  };
  // Greedy across all slots: the meal that rescues the most goes first, so the most urgent
  // combination (e.g. spinach + paneer) gets its natural slot before smaller meals claim the items.
  for (const strict of [true, false]) {
    for (const c of valid) {
      if (chosen.has(c.slot) || titles.has(c.title)) continue;
      if (strict && (!fits(c) || !mainOk(c))) continue;
      take(c);
    }
  }
  return slots.map((slot) => {
    const best = chosen.get(slot);
    const seen = new Set<string>(best ? [best.title] : []);
    const alternatives = valid.filter((c) => c.slot === slot && !seen.has(c.title) && (seen.add(c.title), true)).slice(0, 2);
    return { slot, best, alternatives };
  });
}

export function daysLeftMap(items: InventoryItem[], now: string): Record<string, number> {
  const m: Record<string, number> = {};
  for (const i of items) m[i.id] = daysBetween(now, i.effectiveExpiry);
  return m;
}

export function suggestLocal(
  recipes: Recipe[],
  items: InventoryItem[],
  profile: UserProfile,
  date: string,
  opts: { maxCookTime?: number } = {},
): SlotPlan[] {
  const slots = (['breakfast', 'lunch', 'dinner'] as Slot[]).filter((s) => profile.mealsAtHome[s]);
  const dl = daysLeftMap(items, date);
  const candidates: MealSuggestion[] = [];
  for (const slot of slots) {
    for (const r of recipes) {
      if (!r.slots.includes(slot)) continue;
      if (r.id.startsWith('jain-') && profile.dietType !== 'jain') continue; // Jain variants only for Jain profiles
      if (opts.maxCookTime && r.cookTimeMin > opts.maxCookTime) continue;
      const m = buildFromRecipe(r, items, dl, date, slot, profile);
      if (m) candidates.push(m);
    }
  }
  return selectMeals(candidates, profile, date, slots.length ? slots : ['lunch']);
}

/** "What can I make now?" — best single quick meal (≤15 min) across all slots. */
export function quickestRescue(recipes: Recipe[], items: InventoryItem[], profile: UserProfile, date: string): MealSuggestion | undefined {
  const dl = daysLeftMap(items, date);
  const all: MealSuggestion[] = [];
  for (const r of recipes) {
    if (r.cookTimeMin > 15) continue;
    if (r.id.startsWith('jain-') && profile.dietType !== 'jain') continue;
    const m = buildFromRecipe(r, items, dl, date, r.slots[0], profile);
    if (m && checkHardRules(m, profile, date).filter((v) => v.rule !== 'cook_time').length === 0) all.push(m);
  }
  return all.sort((a, b) => b.rescueScore - a.rescueScore)[0];
}
