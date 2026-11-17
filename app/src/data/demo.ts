import { addDays, today as todayISO } from '../lib/dates';
import { computeExpiry } from '../lib/expiry';
import { SHELF_LIFE_RULES } from '../lib/shelfLife';
import type { Category, ConsumptionEvent, InventoryItem, Location, OrderImportLine, Platform, Unit } from '../lib/types';
import { SEED_LEARNED } from './catalogue';

interface DemoSpec {
  name: string;
  category: Category;
  qty: number;
  unit: Unit;
  daysLeft: number;
  conf: 'confirmed' | 'learned' | 'estimated';
  pricePaise: number;
  productId?: string;
  platform?: Platform;
  location?: Location;
  opened?: boolean;
  remaining?: number;
  source?: InventoryItem['source'];
}

// ~18 items across all urgency levels: milk today, spinach + paneer tomorrow, curd in 3, eggs in 10.
const SPECS: DemoSpec[] = [
  { name: 'Amul Taaza Toned Milk', category: 'milk', qty: 500, unit: 'ml', daysLeft: 0, conf: 'confirmed', pricePaise: 2900, productId: 'p-amul-taaza-500', source: 'scan' },
  { name: 'Spinach (Palak)', category: 'leafy_veg', qty: 1, unit: 'bunch', daysLeft: 1, conf: 'estimated', pricePaise: 3000, productId: 'p-spinach', platform: 'blinkit', source: 'order_import' },
  { name: 'Milky Mist Paneer', category: 'paneer', qty: 200, unit: 'g', daysLeft: 1, conf: 'confirmed', pricePaise: 9500, productId: 'p-milky-mist-paneer-200', platform: 'blinkit', source: 'order_import' },
  { name: 'iD Dosa Batter', category: 'batter', qty: 1, unit: 'kg', daysLeft: 1, conf: 'learned', pricePaise: 9000, productId: 'p-id-dosa-batter', platform: 'blinkit', source: 'order_import', opened: true, remaining: 0.6 },
  { name: 'Coriander Leaves', category: 'leafy_veg', qty: 1, unit: 'bunch', daysLeft: 2, conf: 'estimated', pricePaise: 1500, productId: 'p-coriander', platform: 'blinkit', source: 'order_import' },
  { name: 'Britannia Brown Bread', category: 'bread', qty: 1, unit: 'pack', daysLeft: 2, conf: 'confirmed', pricePaise: 5000, productId: 'p-britannia-bread', source: 'scan', opened: true, remaining: 0.5 },
  { name: 'Mother Dairy Dahi', category: 'curd_yogurt', qty: 400, unit: 'g', daysLeft: 3, conf: 'confirmed', pricePaise: 3500, productId: 'p-mother-dairy-dahi-400', source: 'scan' },
  { name: 'Banana Robusta', category: 'fruits', qty: 6, unit: 'pcs', daysLeft: 3, conf: 'estimated', pricePaise: 4500, productId: 'p-banana', platform: 'zepto', source: 'order_import' },
  { name: 'Tomato (Hybrid)', category: 'vegetables', qty: 500, unit: 'g', daysLeft: 4, conf: 'estimated', pricePaise: 2400, productId: 'p-tomato', platform: 'zepto', source: 'order_import' },
  { name: 'Capsicum Green', category: 'vegetables', qty: 250, unit: 'g', daysLeft: 5, conf: 'estimated', pricePaise: 2500, productId: 'p-capsicum', platform: 'zepto', source: 'order_import' },
  { name: 'Amul Fresh Cream', category: 'cream', qty: 250, unit: 'ml', daysLeft: 6, conf: 'learned', pricePaise: 7500, productId: 'p-amul-fresh-cream', platform: 'blinkit', source: 'order_import' },
  { name: 'Farm Fresh Eggs', category: 'eggs', qty: 6, unit: 'pcs', daysLeft: 10, conf: 'confirmed', pricePaise: 6500, productId: 'p-eggs-6', source: 'scan' },
  { name: 'Onion', category: 'vegetables', qty: 1, unit: 'kg', daysLeft: 9, conf: 'estimated', pricePaise: 3800, productId: 'p-onion', source: 'quick_add' },
  { name: 'Apple Shimla', category: 'fruits', qty: 4, unit: 'pcs', daysLeft: 8, conf: 'estimated', pricePaise: 16000, productId: 'p-apple', source: 'quick_add' },
  { name: 'Amul Cheese Slices', category: 'cheese', qty: 200, unit: 'g', daysLeft: 24, conf: 'confirmed', pricePaise: 14500, productId: 'p-amul-cheese-slices', source: 'scan' },
  { name: 'Amul Butter', category: 'butter_ghee', qty: 100, unit: 'g', daysLeft: 48, conf: 'confirmed', pricePaise: 6200, productId: 'p-amul-butter-100', source: 'scan', opened: false },
  { name: 'Kissan Tomato Ketchup', category: 'sauces_condiments', qty: 850, unit: 'g', daysLeft: 120, conf: 'confirmed', pricePaise: 15000, productId: 'p-kissan-ketchup', source: 'scan' },
  { name: 'Dal makhani (leftover)', category: 'leftovers', qty: 1, unit: 'pcs', daysLeft: -1, conf: 'estimated', pricePaise: 0, source: 'leftover' },
];

export function buildDemoItems(now: string = todayISO()): InventoryItem[] {
  return SPECS.map((s, idx) => {
    const rule = SHELF_LIFE_RULES[s.category];
    const location: Location = s.location ?? 'fridge';
    let purchasedAt: string;
    let printedExpiry: string | undefined;
    let platform = s.platform;
    let learned = SEED_LEARNED;
    if (s.conf === 'confirmed') {
      purchasedAt = addDays(now, -Math.min(3, idx % 4));
      printedExpiry = addDays(now, s.daysLeft);
    } else if (s.conf === 'learned') {
      const l = SEED_LEARNED.find((x) => x.productId === s.productId && x.platform === s.platform);
      purchasedAt = addDays(now, s.daysLeft - (l?.medianDaysLeftAtDelivery ?? rule.unopenedDays));
      if (!l) learned = [];
    } else {
      purchasedAt = addDays(now, s.daysLeft - rule.unopenedDays);
      platform = undefined; // stay on the category estimate
    }
    const openedAt = s.opened ? addDays(now, -1) : undefined;
    const exp = computeExpiry({ category: s.category, productId: s.productId, purchasedAt, printedExpiry, location, platform }, SHELF_LIFE_RULES, learned, 'Bengaluru');
    // opened items: keep the shown date as specified (they were opened recently)
    return {
      id: `demo-${idx + 1}`,
      productId: s.productId,
      displayName: s.name,
      category: s.category,
      quantity: s.qty,
      unit: s.unit,
      remainingFraction: s.remaining ?? 1,
      location,
      addedAt: purchasedAt,
      purchasedAt,
      printedExpiry,
      estimatedExpiry: exp.estimatedExpiry,
      openedAt,
      effectiveExpiry: exp.effectiveExpiry,
      confidence: exp.confidence,
      status: 'active',
      source: s.source ?? 'manual',
      pricePaise: s.pricePaise || undefined,
      needsDateCheck: false,
      platform: s.platform,
    } satisfies InventoryItem;
  });
}

// Two weeks of past events for the Impact screen.
const PAST: [string, Category, number, 'used_up' | 'discarded', number][] = [
  ['Amul Taaza Toned Milk', 'milk', 2900, 'used_up', 1], ['Mother Dairy Dahi', 'curd_yogurt', 3500, 'used_up', 2],
  ['Spinach (Palak)', 'leafy_veg', 3000, 'discarded', 2], ['Amul Fresh Paneer', 'paneer', 9000, 'used_up', 3],
  ['Modern Bread', 'bread', 5500, 'used_up', 4], ['Tomato', 'vegetables', 2400, 'used_up', 4],
  ['Coriander Leaves', 'leafy_veg', 1500, 'discarded', 5], ['Amul Gold Milk 1L', 'milk', 6800, 'used_up', 6],
  ['iD Dosa Batter', 'batter', 9000, 'used_up', 7], ['Banana', 'fruits', 4500, 'used_up', 8],
  ['Nandini Toned Milk', 'milk', 2600, 'used_up', 8], ['Methi', 'leafy_veg', 2000, 'discarded', 9],
  ['Eggs (6)', 'eggs', 6500, 'used_up', 10], ['Capsicum', 'vegetables', 2500, 'used_up', 10],
  ['Amul Masti Dahi', 'curd_yogurt', 3500, 'used_up', 11], ['Brown Bread', 'bread', 5000, 'discarded', 12],
  ['Cucumber', 'vegetables', 2000, 'used_up', 13], ['Amul Taaza Toned Milk', 'milk', 2900, 'used_up', 14],
];

export function buildDemoEvents(now: string = todayISO()): ConsumptionEvent[] {
  const monthStart = now.slice(0, 8) + '01';
  return PAST.map(([name, category, value, type, ago], i) => {
    let at = addDays(now, -ago);
    if (at < monthStart) at = monthStart;
    return {
      id: `demo-ev-${i + 1}`,
      itemId: `demo-past-${i + 1}`,
      type,
      fraction: 1,
      at: `${at}T12:00:00`,
      itemName: name,
      category,
      valuePaise: value,
      beforeExpiry: type === 'used_up',
    };
  });
}

// A synthetic order (rendered in assets/sample-order.png) for the import demo.
export const SAMPLE_ORDER = {
  platform: 'blinkit' as Platform,
  totalPaise: 66100,
  lines: [
    { rawText: 'Amul Taaza Toned Fresh Milk 500 ml x2', parsedName: 'Amul Taaza Toned Fresh Milk', parsedPackSize: '500 ml', quantity: 2, pricePaise: 5800 },
    { rawText: 'Milky Mist Paneer 200 g', parsedName: 'Milky Mist Paneer', parsedPackSize: '200 g', quantity: 1, pricePaise: 9500 },
    { rawText: 'Mother Dairy Classic Dahi 400 g', parsedName: 'Mother Dairy Classic Dahi', parsedPackSize: '400 g', quantity: 1, pricePaise: 3500 },
    { rawText: 'Spinach (Palak) 1 bunch', parsedName: 'Spinach (Palak)', parsedPackSize: '1 bunch', quantity: 1, pricePaise: 3000 },
    { rawText: 'Coriander Leaves 100 g', parsedName: 'Coriander Leaves', parsedPackSize: '100 g', quantity: 1, pricePaise: 1500 },
    { rawText: 'Tomato (Hybrid) 500 g', parsedName: 'Tomato (Hybrid)', parsedPackSize: '500 g', quantity: 1, pricePaise: 2400 },
    { rawText: 'iD Idly & Dosa Batter 1 kg', parsedName: 'iD Idly & Dosa Batter', parsedPackSize: '1 kg', quantity: 1, pricePaise: 9000 },
    { rawText: 'Britannia Brown Bread 400 g', parsedName: 'Britannia Brown Bread', parsedPackSize: '400 g', quantity: 1, pricePaise: 5000 },
    { rawText: 'Farm Fresh White Eggs 6 pcs', parsedName: 'Farm Fresh White Eggs', parsedPackSize: '6 pcs', quantity: 1, pricePaise: 6500 },
    { rawText: 'Banana Robusta 6 pcs', parsedName: 'Banana Robusta', parsedPackSize: '6 pcs', quantity: 1, pricePaise: 4500 },
    { rawText: 'Amul Butter 100 g', parsedName: 'Amul Butter', parsedPackSize: '100 g', quantity: 1, pricePaise: 6200 },
    { rawText: 'Surf Excel Matic Liquid 1 L', parsedName: 'Surf Excel Matic Liquid Detergent', parsedPackSize: '1 l', quantity: 1, pricePaise: 22900 },
  ] satisfies Partial<OrderImportLine>[],
};
