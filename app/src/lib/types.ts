// Data model — mirrors docs/PRD.md "Data model". Dates are ISO 'YYYY-MM-DD' in local time.

export type DietType = 'vegetarian' | 'eggetarian' | 'jain' | 'vegan' | 'non_vegetarian' | 'pescatarian';
export type Goal = 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'weight_loss' | 'diabetic_friendly';
export type Equipment = 'stove' | 'pressure_cooker' | 'microwave' | 'oven' | 'air_fryer' | 'mixer_grinder';
export type Slot = 'breakfast' | 'lunch' | 'dinner';

export interface UserProfile {
  id: string;
  name?: string;
  householdSize: number;
  dietType: DietType;
  goals: Goal[];
  allergies: string[];
  dislikes: string[];
  cuisines: string[];
  mealsAtHome: { breakfast: boolean; lunch: boolean; dinner: boolean };
  cookTimeWeekdayMin: number;
  cookTimeWeekendMin: number;
  equipment: Equipment[];
  city?: string;
  nudgeTime: string; // 'HH:mm'
  onboardedAt?: string;
}

export type Category =
  | 'milk' | 'uht_milk' | 'curd_yogurt' | 'paneer' | 'cheese' | 'butter_ghee' | 'cream' | 'eggs'
  | 'bread' | 'batter' | 'leafy_veg' | 'vegetables' | 'fruits' | 'meat' | 'fish' | 'tofu'
  | 'sauces_condiments' | 'beverages' | 'ready_to_eat' | 'leftovers' | 'other';

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  packSize?: string;
  category: Category;
  imageUrl?: string;
  vegMark?: 'veg' | 'non_veg';
  allergens: string[];
  source: 'off' | 'seed' | 'user' | 'ai';
  pricePaise?: number;
}

export type ExpiryConfidence = 'confirmed' | 'learned' | 'estimated';
export type ItemStatus = 'active' | 'used' | 'discarded';
export type Location = 'fridge' | 'freezer' | 'pantry';
export type Unit = 'pcs' | 'g' | 'kg' | 'ml' | 'l' | 'pack' | 'bunch';
export type ItemSource = 'scan' | 'order_import' | 'manual' | 'quick_add' | 'leftover';

export interface InventoryItem {
  id: string;
  productId?: string;
  displayName: string;
  category: Category;
  quantity: number;
  unit: Unit;
  remainingFraction: number;
  location: Location;
  addedAt: string;
  purchasedAt: string;
  printedExpiry?: string;
  estimatedExpiry?: string;
  openedAt?: string;
  effectiveExpiry: string;
  confidence: ExpiryConfidence;
  status: ItemStatus;
  source: ItemSource;
  orderImportId?: string;
  pricePaise?: number;
  needsDateCheck: boolean;
  closedAt?: string;
  platform?: Platform;
}

export interface ShelfLifeRule {
  category: Category;
  label: string;
  unopenedDays: number;
  openedDays: number | null;
  perishable: boolean;
  freezerDays: number | null;
}

export type Platform = 'blinkit' | 'instamart' | 'zepto' | 'bigbasket' | 'other';

export interface LearnedShelfLife {
  productId: string;
  platform: Platform;
  city: string;
  medianDaysLeftAtDelivery: number;
  sampleSize: number;
}

export interface OrderImport {
  id: string;
  platform: Platform;
  orderedAt?: string;
  deliveredAt: string;
  imageUri?: string;
  status: 'parsing' | 'review' | 'done' | 'failed';
  totalPaise?: number;
}

export interface OrderImportLine {
  id: string;
  orderImportId: string;
  rawText: string;
  parsedName: string;
  parsedPackSize?: string;
  quantity: number;
  pricePaise?: number;
  matchedProductId?: string;
  matchScore: number;
  include: boolean;
  categoryGuess: Category;
  isFood: boolean;
  printedExpiry?: string;
}

export type ConsumptionType = 'opened' | 'used_partly' | 'used_up' | 'discarded' | 'date_corrected';

export interface ConsumptionEvent {
  id: string;
  itemId: string;
  type: ConsumptionType;
  fraction?: number;
  at: string;
  mealSuggestionId?: string;
  // denormalised for Impact so it survives item edits
  itemName?: string;
  category?: Category;
  valuePaise?: number;
  beforeExpiry?: boolean;
}

export interface MealSuggestion {
  id: string;
  date: string;
  slot: Slot;
  title: string;
  description: string;
  cookTimeMin: number;
  servings: number;
  usesItems: { itemId: string; name: string; amount: string; fraction: number }[];
  extraIngredients: string[];
  equipmentNeeded: Equipment[];
  steps: string[];
  rescueScore: number;
  status: 'suggested' | 'cooked' | 'skipped';
  cuisine?: string;
}
