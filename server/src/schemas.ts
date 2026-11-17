import { z } from 'zod';

// Contracts from docs/PRD.md "API endpoints". Shared by request validation and model output parsing.

export const CATEGORIES = [
  'milk', 'uht_milk', 'curd_yogurt', 'paneer', 'cheese', 'butter_ghee', 'cream', 'eggs', 'bread', 'batter', 'leafy_veg',
  'vegetables', 'fruits', 'meat', 'fish', 'tofu', 'sauces_condiments', 'beverages', 'ready_to_eat', 'leftovers', 'other',
] as const;
export const Category = z.enum(CATEGORIES);
const Equipment = z.enum(['stove', 'pressure_cooker', 'microwave', 'oven', 'air_fryer', 'mixer_grinder']);
const Slot = z.enum(['breakfast', 'lunch', 'dinner']);

// base64 JPEG/PNG; ~1 MB images become ~1.4 MB of base64
const Base64Image = z.string().min(100).max(4_000_000);

// ---------- requests ----------
export const IdentifyProductReq = z.object({ image: Base64Image });
export const ReadDateReq = z.object({ image: Base64Image, productCategory: Category.optional() });
export const ParseOrderReq = z.object({ images: z.array(Base64Image).min(1).max(5) });
export const SuggestMealsReq = z.object({
  profile: z.object({
    householdSize: z.number().int().min(1).max(8),
    dietType: z.enum(['vegetarian', 'eggetarian', 'jain', 'vegan', 'non_vegetarian', 'pescatarian']),
    goals: z.array(z.string()),
    allergies: z.array(z.string()),
    dislikes: z.array(z.string()),
    cuisines: z.array(z.string()),
    mealsAtHome: z.object({ breakfast: z.boolean(), lunch: z.boolean(), dinner: z.boolean() }),
    cookTimeWeekdayMin: z.number(),
    cookTimeWeekendMin: z.number(),
    equipment: z.array(Equipment),
  }).passthrough(),
  items: z.array(z.object({ id: z.string(), name: z.string(), quantity: z.string(), daysLeft: z.number() })).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(Slot).min(1),
});

// ---------- model outputs ----------
export const IdentifyProductOut = z.object({
  name: z.string(),
  brand: z.string().nullable(),
  packSize: z.string().nullable(),
  category: Category,
  vegMark: z.enum(['veg', 'non_veg', 'unknown']),
  confidence: z.number(),
});

export const ReadDateOut = z.object({
  rawText: z.string(),
  dateType: z.enum(['expiry', 'best_before', 'use_by', 'packed', 'unknown']),
  isoDate: z.string().nullable(),
  bestBeforeMonths: z.number().nullable(),
  packedDate: z.string().nullable(),
  unsure: z.boolean(),
});

export const ParseOrderOut = z.object({
  platform: z.enum(['blinkit', 'instamart', 'zepto', 'bigbasket', 'other']),
  orderedAt: z.string().nullable(),
  lines: z.array(z.object({
    rawText: z.string(),
    name: z.string(),
    packSize: z.string().nullable(),
    quantity: z.number(),
    pricePaise: z.number().nullable(),
    categoryGuess: Category,
    isFood: z.boolean(),
  })),
});

export const SuggestMealsOut = z.object({
  meals: z.array(z.object({
    slot: Slot,
    title: z.string(),
    description: z.string(),
    cookTimeMin: z.number(),
    servings: z.number(),
    usesItems: z.array(z.object({ itemId: z.string(), amount: z.string(), fraction: z.number() })),
    extraIngredients: z.array(z.string()),
    equipmentNeeded: z.array(Equipment),
    steps: z.array(z.string()),
  })),
});
