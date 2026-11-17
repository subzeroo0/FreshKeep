import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_LEARNED, SEED_PRODUCTS } from '../data/catalogue';
import { daysBetween, today as todayISO } from '../lib/dates';
import { computeExpiry } from '../lib/expiry';
import { uid } from '../lib/id';
import { guessCategory } from '../lib/match';
import { SHELF_LIFE_RULES } from '../lib/shelfLife';
import type {
  Category, ConsumptionEvent, ConsumptionType, InventoryItem, ItemSource, Location, MealSuggestion,
  OrderImport, OrderImportLine, Platform, Product, Unit, UserProfile,
} from '../lib/types';

export const DEFAULT_PROFILE: UserProfile = {
  id: '',
  householdSize: 2,
  dietType: 'vegetarian',
  goals: ['balanced'],
  allergies: [],
  dislikes: [],
  cuisines: ['north_indian', 'south_indian'],
  mealsAtHome: { breakfast: true, lunch: true, dinner: true },
  cookTimeWeekdayMin: 20,
  cookTimeWeekendMin: 45,
  equipment: ['stove', 'pressure_cooker'],
  city: 'Bengaluru',
  nudgeTime: '08:00',
};

export interface NewItemInput {
  displayName: string;
  category?: Category;
  productId?: string;
  quantity?: number;
  unit?: Unit;
  location?: Location;
  purchasedAt?: string;
  printedExpiry?: string;
  source: ItemSource;
  pricePaise?: number;
  orderImportId?: string;
  platform?: Platform;
}

export interface MealCache {
  date: string;
  source: 'ai' | 'local';
  meals: MealSuggestion[]; // AI candidates (local ones are computed live)
  inventoryVersion: number;
}

interface State {
  hydrated: boolean;
  profile: UserProfile;
  products: Product[]; // user / AI / OFF products (seed lives in code)
  items: InventoryItem[];
  events: ConsumptionEvent[];
  orders: OrderImport[];
  orderLines: OrderImportLine[];
  mealStatus: Record<string, 'cooked' | 'skipped'>;
  cookedMeals: MealSuggestion[];
  mealCache?: MealCache;
  inventoryVersion: number;
  apiUrl: string;

  setHydrated: () => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  addProduct: (p: Omit<Product, 'id'> & { id?: string }) => Product;
  addItem: (input: NewItemInput) => InventoryItem;
  updateItem: (id: string, patch: Partial<InventoryItem>) => void;
  setPrintedDate: (id: string, iso: string | undefined) => void;
  markOpened: (id: string) => void;
  useSome: (id: string, fraction: number, mealSuggestionId?: string) => void;
  useUp: (id: string, mealSuggestionId?: string) => void;
  discard: (id: string) => void;
  moveTo: (id: string, location: Location) => void;
  deleteItem: (id: string) => void;
  cookMeal: (meal: MealSuggestion) => void;
  skipMeal: (mealId: string) => void;
  setMealCache: (c: MealCache | undefined) => void;
  createOrder: (o: Omit<OrderImport, 'id'>, lines: Omit<OrderImportLine, 'id' | 'orderImportId'>[]) => string;
  updateOrderLine: (id: string, patch: Partial<OrderImportLine>) => void;
  addOrderLine: (orderId: string, line: Omit<OrderImportLine, 'id' | 'orderImportId'>) => void;
  commitOrder: (orderId: string) => string[];
  setApiUrl: (url: string) => void;
  resetApp: () => void;
}

export function allProducts(products: Product[]): Product[] {
  return [...products, ...SEED_PRODUCTS];
}

function recompute(item: InventoryItem, city?: string): InventoryItem {
  const exp = computeExpiry(item, SHELF_LIFE_RULES, SEED_LEARNED, city);
  return { ...item, effectiveExpiry: exp.effectiveExpiry, confidence: exp.confidence, estimatedExpiry: exp.estimatedExpiry };
}

function event(item: InventoryItem, type: ConsumptionType, fraction: number | undefined, mealSuggestionId?: string): ConsumptionEvent {
  const now = new Date();
  const local = `${todayISO(now)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  return {
    id: uid('ev-'),
    itemId: item.id,
    type,
    fraction,
    at: local,
    mealSuggestionId,
    itemName: item.displayName,
    category: item.category,
    valuePaise: item.pricePaise,
    beforeExpiry: daysBetween(todayISO(), item.effectiveExpiry) >= 0,
  };
}

const initial = {
  profile: DEFAULT_PROFILE,
  products: [] as Product[],
  items: [] as InventoryItem[],
  events: [] as ConsumptionEvent[],
  orders: [] as OrderImport[],
  orderLines: [] as OrderImportLine[],
  mealStatus: {} as Record<string, 'cooked' | 'skipped'>,
  cookedMeals: [] as MealSuggestion[],
  mealCache: undefined as MealCache | undefined,
  inventoryVersion: 0,
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, ''),
};

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const bump = (n = 1) => ({ inventoryVersion: get().inventoryVersion + n });
      const patchItem = (id: string, fn: (i: InventoryItem) => InventoryItem) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? fn(i) : i)), ...bump() }));

      return {
        ...initial,
        hydrated: false,
        setHydrated: () => set({ hydrated: true }),

        updateProfile: (patch) =>
          set((s) => {
            const profile = { ...s.profile, ...patch, id: s.profile.id || uid('u-') };
            const dietChanged = ['dietType', 'allergies', 'goals', 'dislikes', 'equipment', 'cookTimeWeekdayMin', 'cookTimeWeekendMin', 'mealsAtHome']
              .some((k) => k in patch);
            // Saving a diet, allergy or goal change clears today's unaccepted suggestions.
            return dietChanged ? { profile, mealCache: undefined } : { profile };
          }),

        completeOnboarding: () => set((s) => ({ profile: { ...s.profile, id: s.profile.id || uid('u-'), onboardedAt: new Date().toISOString() } })),

        addProduct: (p) => {
          const product: Product = { ...p, id: p.id ?? uid('p-') };
          set((s) => ({ products: [product, ...s.products.filter((x) => x.id !== product.id && (!product.barcode || x.barcode !== product.barcode))] }));
          return product;
        },

        addItem: (input) => {
          const now = todayISO();
          const category = input.category ?? guessCategory(input.displayName);
          const purchasedAt = input.purchasedAt ?? now;
          const base: InventoryItem = {
            id: uid('it-'),
            productId: input.productId,
            displayName: input.displayName.trim(),
            category,
            quantity: input.quantity ?? 1,
            unit: input.unit ?? 'pcs',
            remainingFraction: 1,
            location: input.location ?? 'fridge',
            addedAt: now,
            purchasedAt,
            printedExpiry: input.printedExpiry,
            effectiveExpiry: now,
            confidence: 'estimated',
            status: 'active',
            source: input.source,
            orderImportId: input.orderImportId,
            pricePaise: input.pricePaise,
            needsDateCheck: false,
            platform: input.platform,
          };
          const exp = computeExpiry(base, SHELF_LIFE_RULES, SEED_LEARNED, get().profile.city);
          const item: InventoryItem = { ...base, effectiveExpiry: exp.effectiveExpiry, estimatedExpiry: exp.estimatedExpiry, confidence: exp.confidence, needsDateCheck: exp.needsDateCheck };
          set((s) => ({ items: [item, ...s.items], ...bump() }));
          return item;
        },

        updateItem: (id, patch) => patchItem(id, (i) => recompute({ ...i, ...patch }, get().profile.city)),

        setPrintedDate: (id, iso) => {
          const item = get().items.find((i) => i.id === id);
          if (!item) return;
          set((s) => ({ events: [event(item, 'date_corrected', undefined), ...s.events] }));
          patchItem(id, (i) => ({ ...recompute({ ...i, printedExpiry: iso }, get().profile.city), needsDateCheck: false }));
        },

        markOpened: (id) => {
          const item = get().items.find((i) => i.id === id);
          if (!item || item.openedAt) return;
          set((s) => ({ events: [event(item, 'opened', undefined), ...s.events] }));
          patchItem(id, (i) => recompute({ ...i, openedAt: todayISO() }, get().profile.city));
        },

        useSome: (id, fraction, mealSuggestionId) => {
          const item = get().items.find((i) => i.id === id);
          if (!item) return;
          const f = Math.min(fraction, item.remainingFraction);
          const left = Math.round((item.remainingFraction - f) * 100) / 100;
          if (left <= 0.05) return get().useUp(id, mealSuggestionId);
          set((s) => ({ events: [event(item, 'used_partly', f, mealSuggestionId), ...s.events] }));
          // using some of a pack implies it is open
          patchItem(id, (i) => recompute({ ...i, remainingFraction: left, openedAt: i.openedAt ?? todayISO() }, get().profile.city));
        },

        useUp: (id, mealSuggestionId) => {
          const item = get().items.find((i) => i.id === id);
          if (!item) return;
          set((s) => ({
            events: [event(item, 'used_up', item.remainingFraction, mealSuggestionId), ...s.events],
            items: s.items.map((i) => (i.id === id ? { ...i, status: 'used', remainingFraction: 0, closedAt: todayISO() } : i)),
            ...bump(),
          }));
        },

        discard: (id) => {
          const item = get().items.find((i) => i.id === id);
          if (!item) return;
          set((s) => ({
            events: [event(item, 'discarded', item.remainingFraction), ...s.events],
            items: s.items.map((i) => (i.id === id ? { ...i, status: 'discarded', closedAt: todayISO() } : i)),
            ...bump(),
          }));
        },

        moveTo: (id, location) => patchItem(id, (i) => recompute({ ...i, location, purchasedAt: location === 'freezer' ? todayISO() : i.purchasedAt }, get().profile.city)),

        deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id), ...bump() })),

        cookMeal: (meal) => {
          for (const u of meal.usesItems) {
            const it = get().items.find((i) => i.id === u.itemId && i.status === 'active');
            if (it) get().useSome(it.id, u.fraction, meal.id);
          }
          set((s) => ({
            mealStatus: { ...s.mealStatus, [meal.id]: 'cooked' },
            cookedMeals: [{ ...meal, status: 'cooked' as const }, ...s.cookedMeals.filter((m) => m.id !== meal.id)].slice(0, 60),
          }));
        },

        skipMeal: (mealId) => set((s) => ({ mealStatus: { ...s.mealStatus, [mealId]: 'skipped' } })),

        setMealCache: (c) => set({ mealCache: c }),

        createOrder: (o, lines) => {
          const id = uid('ord-');
          set((s) => ({
            orders: [{ ...o, id }, ...s.orders],
            orderLines: [...lines.map((l) => ({ ...l, id: uid('ol-'), orderImportId: id })), ...s.orderLines],
          }));
          return id;
        },

        updateOrderLine: (id, patch) => set((s) => ({ orderLines: s.orderLines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

        addOrderLine: (orderId, line) => set((s) => ({ orderLines: [...s.orderLines, { ...line, id: uid('ol-'), orderImportId: orderId }] })),

        commitOrder: (orderId) => {
          const order = get().orders.find((o) => o.id === orderId);
          if (!order) return [];
          const lines = get().orderLines.filter((l) => l.orderImportId === orderId && l.include);
          const products = allProducts(get().products);
          const ids: string[] = [];
          for (const l of lines) {
            const p = l.matchedProductId ? products.find((x) => x.id === l.matchedProductId) : undefined;
            const { qty, unit } = qtyUnit(l.parsedPackSize, l.quantity);
            const item = get().addItem({
              displayName: p?.name ?? l.parsedName,
              category: p?.category ?? l.categoryGuess,
              productId: p?.id,
              quantity: qty,
              unit,
              purchasedAt: order.deliveredAt,
              printedExpiry: l.printedExpiry,
              source: 'order_import',
              pricePaise: l.pricePaise,
              orderImportId: orderId,
              platform: order.platform,
            });
            ids.push(item.id);
          }
          set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? { ...o, status: 'done' } : o)) }));
          return ids;
        },

        setApiUrl: (url) => set({ apiUrl: url.trim().replace(/\/$/, ''), mealCache: undefined }),

        resetApp: () => set({ ...initial, apiUrl: get().apiUrl, hydrated: true, inventoryVersion: get().inventoryVersion + 1 }),
      };
    },
    {
      name: 'freshkeep-v1',
      version: 2,
      // v2: real use only — clear anything that came from the old demo fridge.
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<State> & { demoMode?: boolean };
        if (version < 2) {
          const isDemo = (id?: string) => !!id && id.startsWith('demo-');
          s.items = (s.items ?? []).filter((i) => !isDemo(i.id));
          s.events = (s.events ?? []).filter((e) => !isDemo(e.id) && !isDemo(e.itemId));
          s.cookedMeals = (s.cookedMeals ?? []).filter((m) => !m.usesItems.some((u) => isDemo(u.itemId)));
          s.orders = (s.orders ?? []).filter((o) => o.imageUri !== 'sample');
          const orderIds = new Set(s.orders.map((o) => o.id));
          s.orderLines = (s.orderLines ?? []).filter((l) => orderIds.has(l.orderImportId));
          s.mealStatus = {};
          s.mealCache = undefined;
          delete s.demoMode;
        }
        return s as State;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, ...rest }) => rest,
      // A server URL baked into the build (EXPO_PUBLIC_API_URL) applies unless the user set one.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, apiUrl: p.apiUrl || current.apiUrl };
      },
      // Mark hydrated even if storage is unavailable (private window, blocked site data) so the app still opens.
      onRehydrateStorage: () => () => {
        setTimeout(() => useStore.setState({ hydrated: true }), 0);
      },
    },
  ),
);

/** "2 x 500 ml" → quantity 1000 ml; "6 pcs" → 6 pcs. */
export function qtyUnit(pack: string | undefined, count: number): { qty: number; unit: Unit } {
  const m = pack?.toLowerCase().match(/([\d.]+)\s*(ml|l|ltr|g|gm|kg|pcs|pc|bunch|pack)/);
  if (!m) return { qty: count || 1, unit: 'pack' };
  const n = Number(m[1]);
  const map: Record<string, Unit> = { ml: 'ml', l: 'l', ltr: 'l', g: 'g', gm: 'g', kg: 'kg', pcs: 'pcs', pc: 'pcs', bunch: 'bunch', pack: 'pack' };
  const unit = map[m[2]];
  if (unit === 'bunch' || unit === 'pack') return { qty: n * (count || 1), unit };
  return { qty: Math.round(n * (count || 1) * 100) / 100, unit };
}

export const activeItems = (items: InventoryItem[]) => items.filter((i) => i.status === 'active');
