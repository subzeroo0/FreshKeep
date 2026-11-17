import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type { z } from 'zod';

import { AiError, askJson, hasKey, imageBlock } from './claude.js';
import { lookupProduct } from './products.js';
import {
  IdentifyProductOut, IdentifyProductReq, ParseOrderOut, ParseOrderReq, ReadDateOut, ReadDateReq, SuggestMealsOut, SuggestMealsReq,
} from './schemas.js';

// FreshKeep API proxy — keeps the Claude key off the phone. Holds no user data; stores no images.

export const app = new Hono();
app.use('*', cors());
app.use('/ai/*', bodyLimit({ maxSize: 12 * 1024 * 1024, onError: (c) => c.json({ error: 'Images too large — send up to 5 screenshots at 1280 px' }, 413) }));

async function body<S extends z.ZodType>(c: { req: { json: () => Promise<unknown> } }, schema: S): Promise<z.infer<S>> {
  const raw = await c.req.json().catch(() => {
    throw new AiError('Body must be JSON', 422);
  });
  const r = schema.safeParse(raw);
  if (!r.success) throw new AiError(`Invalid request: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`, 422);
  return r.data;
}

app.onError((err, c) => {
  if (err instanceof AiError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: 'Unexpected server error' }, 500);
});

app.get('/health', (c) => c.json({ ok: true, ai: hasKey() }));

app.get('/products/:barcode', async (c) => {
  const barcode = c.req.param('barcode');
  if (!/^\d{6,14}$/.test(barcode)) return c.json({ error: 'Barcode must be 6–14 digits' }, 422);
  return c.json(await lookupProduct(barcode));
});

app.post('/ai/identify-product', async (c) => {
  const { image } = await body(c, IdentifyProductReq);
  const out = await askJson({
    task: 'identify-product',
    system: 'You identify Indian grocery products from a photo of the front of the pack. Reply with JSON only. Use vegMark "veg" for a green FSSAI dot, "non_veg" for a brown/red dot, else "unknown". confidence is 0–1.',
    content: [imageBlock(image), { type: 'text', text: 'Identify this product: name as printed, brand, pack size, and category.' }],
    schema: IdentifyProductOut,
  });
  return c.json({ ...out, brand: out.brand ?? undefined, packSize: out.packSize ?? undefined, vegMark: out.vegMark === 'unknown' ? undefined : out.vegMark });
});

app.post('/ai/read-date', async (c) => {
  const { image, productCategory } = await body(c, ReadDateReq);
  const out = await askJson({
    task: 'read-date',
    system:
      'You read printed dates on Indian food packaging (dot-matrix, embossed, curved cans). Indian packs are day-first (DD/MM/YY). ' +
      'Copy the exact characters you read into rawText. If the pack says "best before N months from packing", set dateType "best_before", bestBeforeMonths N and packedDate (ISO) if visible. ' +
      'isoDate must be YYYY-MM-DD. Never guess: if any digit is unclear, set unsure true. Reply with JSON only.',
    content: [imageBlock(image), { type: 'text', text: `Read the expiry / best-before / use-by date${productCategory ? ` on this ${productCategory.replace('_', ' ')} pack` : ''}.` }],
    schema: ReadDateOut,
    maxTokens: 2000,
  });
  return c.json({
    rawText: out.rawText,
    dateType: out.dateType,
    isoDate: out.isoDate ?? undefined,
    bestBeforeMonths: out.bestBeforeMonths ?? undefined,
    packedDate: out.packedDate ?? undefined,
    unsure: out.unsure,
  });
});

app.post('/ai/parse-order', async (c) => {
  const { images } = await body(c, ParseOrderReq);
  const out = await askJson({
    task: 'parse-order',
    system:
      'You read Indian quick-commerce order screenshots (Blinkit, Swiggy Instamart, Zepto, BigBasket). Extract every purchased line item. ' +
      'Screenshots may overlap; list each item once. pricePaise is the line total in paise (₹29 → 2900). quantity is the count of packs. ' +
      'isFood is false for detergents, toiletries, cleaning and household items. Ignore fees, tips and totals. Reply with JSON only.',
    content: [...images.map(imageBlock), { type: 'text', text: 'List the platform, order date if visible (ISO), and every line item.' }],
    schema: ParseOrderOut,
    maxTokens: 12000,
    timeoutMs: 60_000,
  });
  return c.json({
    platform: out.platform,
    orderedAt: out.orderedAt ?? undefined,
    lines: out.lines.map((l) => ({ ...l, packSize: l.packSize ?? undefined, pricePaise: l.pricePaise ?? undefined })),
  });
});

app.post('/ai/suggest-meals', async (c) => {
  const { profile, items, date, slots } = await body(c, SuggestMealsReq);
  const weekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
  const p = profile;
  // Prompt from docs/PRD.md "Meal suggestion engine". Name and city are never sent.
  const user = [
    `Date: ${date} (${weekend ? 'weekend' : 'weekday'})`,
    `Household: ${p.householdSize} people. Meals at home: ${slots.join(', ')}.`,
    `Diet: ${p.dietType}. Goals: ${p.goals.join(', ') || 'none'}. Allergies: ${p.allergies.join(', ') || 'none'}. Dislikes: ${p.dislikes.join(', ') || 'none'}.`,
    `Cuisines: ${p.cuisines.join(', ') || 'any'}. Max cook time: ${weekend ? p.cookTimeWeekendMin : p.cookTimeWeekdayMin} min. Equipment: ${p.equipment.join(', ')}.`,
    'Fridge, most urgent first (id | name | qty | days left):',
    ...items.map((i) => `${i.id} | ${i.name} | ${i.quantity} | ${i.daysLeft}`),
    'Assume common staples are available: rice, atta, dal, oil, salt, spices, onion, tomato, unless the diet excludes them.',
    `Give 4 meal ideas for each of: ${slots.join(', ')}. Prefer items with 0-2 days left. Use realistic home dishes, not restaurant dishes.`,
    'usesItems.itemId must be an id from the fridge list; fraction is the share of that item the dish uses (0–1).',
  ].join('\n');
  const out = await askJson({
    task: 'suggest-meals',
    system: 'You are a home-cooking planner for an Indian household. You reduce food waste by using ingredients that expire soonest. Reply with JSON only, matching the schema.',
    content: [{ type: 'text', text: user }],
    schema: SuggestMealsOut,
    maxTokens: 16000,
    timeoutMs: 60_000,
  });
  // The app re-checks every hard rule (diet, allergy, time, equipment) in code; here we only drop unknown item ids.
  const ids = new Set(items.map((i) => i.id));
  return c.json({ meals: out.meals.map((m) => ({ ...m, usesItems: m.usesItems.filter((u) => ids.has(u.itemId)) })) });
});
