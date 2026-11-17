import type { Category, Product } from './types';

const NOISE = new Set([
  'fresh', 'pack', 'pouch', 'of', 'the', 'and', 'with', 'premium', 'pure', 'natural', 'organic', 'combo', 'x', 'pc', 'pcs',
  'piece', 'pieces', 'g', 'gm', 'gms', 'kg', 'ml', 'l', 'ltr', 'litre', 'liter', 'approx', 'n', 'new',
]);

/** Lowercase, strip pack sizes / punctuation / noise words. */
export function normaliseName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\d+(\.\d+)?\s*(ml|l|ltr|g|gm|gms|kg|pcs|pc|x)\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !NOISE.has(t) && !/^\d+$/.test(t));
}

/** Token-overlap score in [0,1] — Dice coefficient over normalised tokens. */
export function tokenScore(a: string, b: string): number {
  const ta = new Set(normaliseName(a));
  const tb = new Set(normaliseName(b));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach((t) => tb.has(t) && common++);
  return (2 * common) / (ta.size + tb.size);
}

export interface MatchResult {
  product?: Product;
  score: number;
  kind: 'auto' | 'suggest' | 'new';
}

/** M13 — ≥0.8 auto-match, 0.5–0.8 "Did you mean?", <0.5 new product. */
export function matchProduct(name: string, products: Product[]): MatchResult {
  let best: Product | undefined;
  let bestScore = 0;
  for (const p of products) {
    const s = tokenScore(name, p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.brand} ${p.name}` : p.name);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  if (bestScore >= 0.8) return { product: best, score: bestScore, kind: 'auto' };
  if (bestScore >= 0.5) return { product: best, score: bestScore, kind: 'suggest' };
  return { score: bestScore, kind: 'new' };
}

// Keyword → category map used by quick add and order import when nothing matches.
const KEYWORDS: [RegExp, Category][] = [
  [/\b(uht|tetra|long life)\b/, 'uht_milk'],
  [/\bmilk\b/, 'milk'],
  [/\b(curd|dahi|yogurt|yoghurt|raita|lassi|chaas|buttermilk)\b/, 'curd_yogurt'],
  [/\bpaneer\b/, 'paneer'],
  [/\b(cheese|mozzarella|cheddar)\b/, 'cheese'],
  [/\b(butter|ghee)\b/, 'butter_ghee'],
  [/\bcream\b/, 'cream'],
  [/\beggs?\b/, 'eggs'],
  [/\b(bread|pav|bun|loaf)\b/, 'bread'],
  [/\b(batter|idli|dosa)\b/, 'batter'],
  [/\b(spinach|palak|methi|coriander|dhania|mint|pudina|lettuce|kale|amaranth|curry leaves|spring onion|leaves|greens)\b/, 'leafy_veg'],
  [/\b(tomato|onion|potato|carrot|capsicum|beans|cauliflower|cabbage|brinjal|okra|bhindi|ginger|garlic|cucumber|peas|lauki|gourd|chilli|chili|mushroom|broccoli|beetroot|radish|corn|lemon)\b/, 'vegetables'],
  [/\b(apple|banana|mango|orange|grapes|papaya|pomegranate|watermelon|guava|kiwi|berries|strawberry|pear|fruit)\b/, 'fruits'],
  [/\b(chicken|mutton|meat|keema|lamb)\b/, 'meat'],
  [/\b(fish|prawn|prawns|shrimp|salmon|rohu|pomfret)\b/, 'fish'],
  [/\btofu\b/, 'tofu'],
  [/\b(sauce|ketchup|chutney|pickle|jam|mayo|mayonnaise|dip|spread)\b/, 'sauces_condiments'],
  [/\b(juice|cola|coke|soda|drink|kombucha|coconut water)\b/, 'beverages'],
  [/\b(ready|instant|heat|frozen|momos|paratha)\b/, 'ready_to_eat'],
];

export function guessCategory(name: string): Category {
  const n = name.toLowerCase();
  for (const [re, cat] of KEYWORDS) if (re.test(n)) return cat;
  return 'other';
}

const NON_FOOD = /\b(detergent|tissue|tissues|soap|shampoo|toothpaste|toothbrush|cleaner|surf|vim|harpic|lizol|dettol|napkin|diaper|diapers|foil|garbage|bags?|sanitizer|handwash|deodorant|razor|battery|batteries|bulb|colin|odonil|wipes)\b/i;

export function isLikelyFood(name: string): boolean {
  return !NON_FOOD.test(name);
}
