// GET /products/:barcode — Open Food Facts (patchy for Indian SKUs; the app then asks for a photo).

type Category = string;

// Open Food Facts category tags → FreshKeep categories.
const OFF_MAP: [RegExp, Category][] = [
  [/uht|long-life/, 'uht_milk'], [/milks?\b|en:milk/, 'milk'], [/yogurt|curd|dahi/, 'curd_yogurt'], [/paneer/, 'paneer'],
  [/cheese/, 'cheese'], [/butter|ghee/, 'butter_ghee'], [/cream/, 'cream'], [/eggs/, 'eggs'], [/bread/, 'bread'],
  [/batter/, 'batter'], [/tofu/, 'tofu'], [/sauce|ketchup|condiment|pickle|jam|spread/, 'sauces_condiments'],
  [/beverage|drink|juice|soda/, 'beverages'], [/meat|chicken/, 'meat'], [/fish|seafood/, 'fish'], [/fruit/, 'fruits'], [/vegetable/, 'vegetables'],
];

export function mapOffCategory(tags: string[]): Category {
  const t = tags.join(' ').toLowerCase();
  for (const [re, c] of OFF_MAP) if (re.test(t)) return c;
  return 'other';
}

export async function lookupProduct(barcode: string) {
  try {
    const ua = process.env.OFF_USER_AGENT || 'FreshKeep/0.1 (demo)';
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,quantity,categories_tags,image_front_small_url,allergens_tags,labels_tags`, {
      headers: { 'User-Agent': ua },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { found: false };
    const j = (await res.json()) as { status?: number; product?: Record<string, unknown> };
    if (j.status !== 1 || !j.product?.product_name) return { found: false };
    const p = j.product;
    const labels = (p.labels_tags as string[] | undefined) ?? [];
    return {
      found: true,
      product: {
        name: String(p.product_name),
        brand: p.brands ? String(p.brands).split(',')[0] : undefined,
        packSize: p.quantity ? String(p.quantity) : undefined,
        category: mapOffCategory((p.categories_tags as string[] | undefined) ?? []),
        imageUrl: p.image_front_small_url ? String(p.image_front_small_url) : undefined,
        allergens: ((p.allergens_tags as string[] | undefined) ?? []).map((a) => a.replace(/^en:/, '')),
        vegMark: labels.some((l) => /non-vegetarian/.test(l)) ? 'non_veg' : labels.some((l) => /vegetarian|vegan/.test(l)) ? 'veg' : undefined,
        source: 'off',
      },
    };
  } catch {
    return { found: false };
  }
}
