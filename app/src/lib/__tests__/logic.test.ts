import { describe, expect, it } from 'vitest';

import { SEED_LEARNED, SEED_PRODUCTS } from '../../data/catalogue';
import { RECIPES } from '../../data/recipes';
import { addDays, daysBetween } from '../dates';
import { parseDate } from '../dateParser';
import { computeExpiry, urgencyOf } from '../expiry';
import { computeImpact } from '../impact';
import { matchProduct, tokenScore } from '../match';
import { checkHardRules, rescueScore, suggestLocal, urgencyWeight } from '../meals';
import { SHELF_LIFE_RULES } from '../shelfLife';
import type { ConsumptionEvent, InventoryItem, LearnedShelfLife, UserProfile } from '../types';

// Learned rows exist only as a test fixture; the app ships with none until they are learned.
const LEARNED: LearnedShelfLife[] = [
  { productId: 'p-amul-taaza-500', platform: 'blinkit', city: 'Bengaluru', medianDaysLeftAtDelivery: 3, sampleSize: 12 },
  { productId: 'p-tofu', platform: 'blinkit', city: 'Bengaluru', medianDaysLeftAtDelivery: 14, sampleSize: 3 },
];

const TODAY = '2026-11-17'; // Tuesday

const profile: UserProfile = {
  id: 'u',
  householdSize: 2,
  dietType: 'vegetarian',
  goals: ['balanced'],
  allergies: [],
  dislikes: [],
  cuisines: [],
  mealsAtHome: { breakfast: true, lunch: true, dinner: true },
  cookTimeWeekdayMin: 45,
  cookTimeWeekendMin: 60,
  equipment: ['stove', 'pressure_cooker', 'mixer_grinder'],
  nudgeTime: '08:00',
};

// ---------- M14 expiry ----------
describe('computeExpiry', () => {
  it('uses the printed date first (confirmed)', () => {
    const r = computeExpiry({ category: 'milk', purchasedAt: TODAY, printedExpiry: '2026-11-20', location: 'fridge' }, SHELF_LIFE_RULES);
    expect(r).toMatchObject({ effectiveExpiry: '2026-11-20', confidence: 'confirmed', needsDateCheck: false });
  });

  it('uses learned shelf life when ≥5 samples exist', () => {
    const r = computeExpiry({ category: 'milk', productId: 'p-amul-taaza-500', platform: 'blinkit', purchasedAt: TODAY, location: 'fridge' }, SHELF_LIFE_RULES, LEARNED, 'Bengaluru');
    expect(r.confidence).toBe('learned');
    expect(r.effectiveExpiry).toBe(addDays(TODAY, 3));
  });

  it('ignores learned rows with fewer than 5 samples', () => {
    const r = computeExpiry({ category: 'tofu', productId: 'p-tofu', platform: 'blinkit', purchasedAt: TODAY, location: 'fridge' }, SHELF_LIFE_RULES, LEARNED, 'Bengaluru');
    expect(r.confidence).toBe('estimated');
  });

  it('falls back to the category estimate and flags perishables for a date check', () => {
    const r = computeExpiry({ category: 'paneer', purchasedAt: TODAY, location: 'fridge' }, SHELF_LIFE_RULES);
    expect(r).toMatchObject({ effectiveExpiry: addDays(TODAY, 4), confidence: 'estimated', needsDateCheck: true });
  });

  it('does not ask about long-life items', () => {
    const r = computeExpiry({ category: 'butter_ghee', purchasedAt: TODAY, location: 'fridge' }, SHELF_LIFE_RULES);
    expect(r.needsDateCheck).toBe(false);
  });

  it('opened override: milk with 6 days left drops to 2 days', () => {
    const r = computeExpiry({ category: 'milk', purchasedAt: TODAY, printedExpiry: addDays(TODAY, 6), openedAt: TODAY, location: 'fridge' }, SHELF_LIFE_RULES);
    expect(daysBetween(TODAY, r.effectiveExpiry)).toBe(2);
    expect(r.confidence).toBe('confirmed');
  });

  it('opened never extends the date', () => {
    const r = computeExpiry({ category: 'curd_yogurt', purchasedAt: TODAY, printedExpiry: addDays(TODAY, 1), openedAt: TODAY, location: 'fridge' }, SHELF_LIFE_RULES);
    expect(r.effectiveExpiry).toBe(addDays(TODAY, 1));
  });

  it('frozen items use the freezer rule', () => {
    const r = computeExpiry({ category: 'paneer', purchasedAt: TODAY, location: 'freezer' }, SHELF_LIFE_RULES);
    expect(r.effectiveExpiry).toBe(addDays(TODAY, 60));
  });

  it('buckets urgency', () => {
    expect([urgencyOf(-1), urgencyOf(0), urgencyOf(1), urgencyOf(2), urgencyOf(5), urgencyOf(6)]).toEqual(['expired', 'today', 'today', 'week', 'week', 'fine']);
  });
});

// ---------- M9 date parser ----------
describe('parseDate', () => {
  const p = (s: string, packedDate?: string) => parseDate(s, { today: TODAY, packedDate });
  it.each([
    ['EXP 12/03/27', '2027-03-12'],
    ['12/03/2027', '2027-03-12'],
    ['12.03.27', '2027-03-12'],
    ['12-Mar-27', '2027-03-12'],
    ['Best before 05 DEC 2026', '2026-12-05'],
    ['MAR 27', '2027-03-31'],
    ['02/27', '2027-02-28'],
    ['2026-11-30', '2026-11-30'],
    ['Use by 20/11/26', '2026-11-20'],
  ])('%s → %s', (input, iso) => {
    const r = p(input);
    expect(r.isoDate).toBe(iso);
    expect(r.unsure).toBe(false);
  });

  it('defaults ambiguous numeric dates to day-first', () => {
    expect(p('03/04/27').isoDate).toBe('2027-04-03');
  });

  it('computes "best before N months from manufacture" with a packed date', () => {
    expect(p('Best before 6 months from manufacture', '2026-10-01').isoDate).toBe('2027-04-01');
    expect(p('PKD 01/10/26 Best before 6 months from packing').isoDate).toBe('2027-04-01');
  });

  it('marks relative dates without a packed date as unsure', () => {
    expect(p('Best before 6 months from manufacture').unsure).toBe(true);
  });

  it('rejects dates more than 3 years ahead', () => {
    const r = p('12/03/2031');
    expect(r.unsure).toBe(true);
    expect(r.reason).toMatch(/3 years/);
  });

  it('rejects dates more than 30 days in the past', () => {
    expect(p('01/09/26').unsure).toBe(true);
    expect(p('01/11/26').unsure).toBe(false);
  });

  it('is unsure when nothing looks like a date', () => {
    expect(p('MRP Rs 29 incl. of all taxes').unsure).toBe(true);
  });
});

// ---------- M13 matching ----------
describe('matchProduct', () => {
  it('auto-matches "Amul Taaza Toned Fresh Milk 500 ml" to the seed product', () => {
    const r = matchProduct('Amul Taaza Toned Fresh Milk 500 ml', SEED_PRODUCTS);
    expect(r.kind).toBe('auto');
    expect(r.product?.id).toBe('p-amul-taaza-500');
  });
  it('returns new for unknown items', () => {
    expect(matchProduct('Surf Excel Matic Liquid', SEED_PRODUCTS).kind).toBe('new');
  });
  it('scores token overlap', () => {
    expect(tokenScore('Amul Butter 100g', 'Amul Butter')).toBe(1);
  });
});

// ---------- M18 meals ----------
function item(id: string, name: string, category: InventoryItem['category'], daysLeft: number): InventoryItem {
  return {
    id, displayName: name, category, quantity: 1, unit: 'pcs', remainingFraction: 1, location: 'fridge',
    addedAt: TODAY, purchasedAt: TODAY, effectiveExpiry: addDays(TODAY, daysLeft), confidence: 'estimated',
    status: 'active', source: 'manual', needsDateCheck: false,
  };
}

describe('meal engine', () => {
  const fridge = [
    item('spinach', 'Spinach (Palak)', 'leafy_veg', 1),
    item('paneer', 'Milky Mist Paneer', 'paneer', 1),
    item('tomato', 'Tomato', 'vegetables', 4),
    item('onion', 'Onion', 'vegetables', 9),
    item('curd', 'Curd', 'curd_yogurt', 3),
    item('eggs', 'Eggs', 'eggs', 10),
    item('bread', 'Bread', 'bread', 2),
  ];

  it('urgency weights: today 1, tomorrow 0.5, 3 days 0.25', () => {
    expect([urgencyWeight(0), urgencyWeight(1), urgencyWeight(3)]).toEqual([1, 0.5, 0.25]);
  });

  it('rescue score subtracts 0.05 per extra', () => {
    expect(rescueScore([{ itemId: 'a', fraction: 1 }], { a: 1 }, 2)).toBeCloseTo(0.4);
  });

  it('vegetarian: spinach + paneer expiring tomorrow — at least one slot uses both', () => {
    const plans = suggestLocal(RECIPES, fridge, profile, TODAY);
    const both = plans.some((p) => p.best && ['spinach', 'paneer'].every((id) => p.best!.usesItems.some((u) => u.itemId === id)));
    expect(both).toBe(true);
  });

  it('vegetarian never gets eggs', () => {
    const plans = suggestLocal(RECIPES, fridge, profile, TODAY);
    for (const p of plans) for (const m of [p.best, ...p.alternatives]) expect(m?.usesItems.some((u) => u.itemId === 'eggs')).toBeFalsy();
  });

  it('vegan profile never gets dairy (paneer disappears)', () => {
    const vegan = { ...profile, dietType: 'vegan' as const };
    const plans = suggestLocal(RECIPES, fridge, vegan, TODAY);
    expect(plans.some((p) => p.best)).toBe(true);
    for (const p of plans)
      for (const m of [p.best, ...p.alternatives].filter(Boolean)) {
        expect(checkHardRules(m!, vegan, TODAY)).toEqual([]);
        expect(m!.usesItems.some((u) => ['paneer', 'curd'].includes(u.itemId))).toBe(false);
        expect(/paneer|curd|butter|cream|ghee|milk/i.test(m!.title)).toBe(false);
      }
  });

  it('jain profile avoids onion and garlic', () => {
    const jain = { ...profile, dietType: 'jain' as const };
    const plans = suggestLocal(RECIPES, fridge, jain, TODAY);
    for (const p of plans) for (const m of [p.best, ...p.alternatives].filter(Boolean)) expect(checkHardRules(m!, jain, TODAY)).toEqual([]);
  });

  it('allergy filter blocks lactose meals', () => {
    const r = checkHardRules({ title: 'Kadhi chawal', usesItems: [{ itemId: 'c', name: 'Curd', amount: '1', fraction: 1 }], extraIngredients: [], cookTimeMin: 20, equipmentNeeded: [] }, { ...profile, allergies: ['lactose'] }, TODAY);
    expect(r[0]?.rule).toBe('allergy');
  });

  it('cook time and equipment are hard rules', () => {
    const r = checkHardRules({ title: 'Cake', usesItems: [], extraIngredients: [], cookTimeMin: 90, equipmentNeeded: ['oven'] }, profile, TODAY);
    expect(r.map((v) => v.rule).sort()).toEqual(['cook_time', 'equipment']);
  });

  it('does not use the same urgent item as the main in all three slots', () => {
    const plans = suggestLocal(RECIPES, fridge, profile, TODAY);
    const mains = plans.map((p) => p.best?.usesItems[0]?.itemId).filter(Boolean);
    expect(new Set(mains).size).toBeGreaterThan(1);
  });
});

// ---------- M21 impact ----------
describe('impact', () => {
  it('matches the event log for 10 seeded events', () => {
    const ev = (i: number, type: ConsumptionEvent['type'], value: number, fraction = 1): ConsumptionEvent => ({
      id: `e${i}`, itemId: `i${i}`, type, at: `2026-11-${String(i + 1).padStart(2, '0')}T10:00:00`, valuePaise: value, fraction,
      category: type === 'discarded' ? 'leafy_veg' : 'milk', beforeExpiry: type !== 'discarded',
    });
    const events = [
      ev(0, 'used_up', 2900), ev(1, 'used_up', 3500), ev(2, 'discarded', 3000), ev(3, 'used_up', 9000), ev(4, 'used_partly', 5000, 0.5),
      ev(5, 'discarded', 1500), ev(6, 'used_up', 2400), ev(7, 'used_up', 6500), ev(8, 'opened', 0), ev(9, 'used_up', 4500),
    ];
    const s = computeImpact(events, '2026-11');
    expect(s.rescued).toBe(6);
    expect(s.wasted).toBe(2);
    expect(s.rescuedRate).toBeCloseTo(0.75);
    expect(s.savedPaise).toBe(2900 + 3500 + 9000 + 2500 + 2400 + 6500 + 4500);
    expect(s.wastedPaise).toBe(4500);
    expect(s.mostWasted?.category).toBe('leafy_veg');
  });

  it('ships with no invented learned data or demo barcodes', () => {
    expect(SEED_LEARNED).toEqual([]);
    expect(SEED_PRODUCTS.some((p) => p.barcode)).toBe(false);
  });
});

// ---------- M8 read-date normalisation (server reply → app date) ----------
import { vi } from 'vitest';
vi.mock('../api', () => ({ api: { readDate: vi.fn() } }));
import { api } from '../api';
import { readDateFromPhoto } from '../readDate';

describe('readDateFromPhoto', () => {
  const photo = { uri: 'x', base64: 'y' };
  const mock = api.readDate as unknown as ReturnType<typeof vi.fn>;
  const inFuture = addDays(new Date().toISOString().slice(0, 10), 120);

  it('accepts a clear ISO date', async () => {
    mock.mockResolvedValueOnce({ rawText: 'EXP', dateType: 'expiry', isoDate: inFuture, unsure: false });
    expect(await readDateFromPhoto(photo, 'milk')).toMatchObject({ isoDate: inFuture, unsure: false });
  });
  it('computes best-before-N-months from the packed date', async () => {
    const packed = addDays(new Date().toISOString().slice(0, 10), -10);
    mock.mockResolvedValueOnce({ rawText: 'BB 6 months', dateType: 'best_before', bestBeforeMonths: 6, packedDate: packed, unsure: false });
    const r = await readDateFromPhoto(photo);
    expect(r.isoDate).toBeDefined();
    expect(daysBetween(packed, r.isoDate!)).toBeGreaterThan(170);
  });
  it('flags implausible dates as unsure', async () => {
    mock.mockResolvedValueOnce({ rawText: 'EXP 2035', dateType: 'expiry', isoDate: '2035-01-01', unsure: false });
    expect((await readDateFromPhoto(photo)).unsure).toBe(true);
  });
  it('falls back to parsing the raw text', async () => {
    mock.mockResolvedValueOnce({ rawText: `EXP ${inFuture.slice(8, 10)}/${inFuture.slice(5, 7)}/${inFuture.slice(2, 4)}`, dateType: 'expiry', unsure: true });
    expect(await readDateFromPhoto(photo)).toMatchObject({ isoDate: inFuture, unsure: true });
  });
});
