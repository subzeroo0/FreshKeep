import type { LearnedShelfLife, Product } from '../lib/types';

// Seed catalogue of common Indian SKUs for the demo. Barcodes here are demo values used
// by the scanner's "try a sample" chips and by order matching; they are not verified GTINs.
export const SEED_PRODUCTS: Product[] = [
  { id: 'p-amul-taaza-500', barcode: '8901262010016', name: 'Amul Taaza Toned Milk 500ml', brand: 'Amul', packSize: '500 ml', category: 'milk', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 2900 },
  { id: 'p-amul-gold-1l', barcode: '8901262010023', name: 'Amul Gold Full Cream Milk 1L', brand: 'Amul', packSize: '1 l', category: 'milk', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 6800 },
  { id: 'p-nandini-toned-500', barcode: '8906001020011', name: 'Nandini Toned Milk 500ml', brand: 'Nandini', packSize: '500 ml', category: 'milk', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 2600 },
  { id: 'p-mother-dairy-dahi-400', barcode: '8904076300014', name: 'Mother Dairy Classic Dahi 400g', brand: 'Mother Dairy', packSize: '400 g', category: 'curd_yogurt', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 3500 },
  { id: 'p-amul-masti-dahi-400', barcode: '8901262030014', name: 'Amul Masti Dahi 400g', brand: 'Amul', packSize: '400 g', category: 'curd_yogurt', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 3500 },
  { id: 'p-milky-mist-paneer-200', barcode: '8906050110015', name: 'Milky Mist Paneer 200g', brand: 'Milky Mist', packSize: '200 g', category: 'paneer', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 9500 },
  { id: 'p-amul-paneer-200', barcode: '8901262050012', name: 'Amul Fresh Paneer 200g', brand: 'Amul', packSize: '200 g', category: 'paneer', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 9000 },
  { id: 'p-amul-butter-100', barcode: '8901262150019', name: 'Amul Butter 100g', brand: 'Amul', packSize: '100 g', category: 'butter_ghee', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 6200 },
  { id: 'p-amul-cheese-slices', barcode: '8901262160018', name: 'Amul Cheese Slices 200g', brand: 'Amul', packSize: '200 g', category: 'cheese', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 14500 },
  { id: 'p-amul-fresh-cream', barcode: '8901262170017', name: 'Amul Fresh Cream 250ml', brand: 'Amul', packSize: '250 ml', category: 'cream', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 7500 },
  { id: 'p-amul-tetra-1l', barcode: '8901262180016', name: 'Amul Taaza UHT Milk 1L', brand: 'Amul', packSize: '1 l', category: 'uht_milk', vegMark: 'veg', allergens: ['lactose'], source: 'seed', pricePaise: 7400 },
  { id: 'p-eggs-6', barcode: '8906012340016', name: 'Farm Fresh White Eggs (6 pcs)', brand: 'Eggoz', packSize: '6 pcs', category: 'eggs', vegMark: 'non_veg', allergens: ['egg'], source: 'seed', pricePaise: 6500 },
  { id: 'p-eggs-12', barcode: '8906012340023', name: 'Farm Fresh Brown Eggs (12 pcs)', brand: 'Eggoz', packSize: '12 pcs', category: 'eggs', vegMark: 'non_veg', allergens: ['egg'], source: 'seed', pricePaise: 14000 },
  { id: 'p-modern-bread', barcode: '8901725130015', name: 'Modern Whole Wheat Bread 400g', brand: 'Modern', packSize: '400 g', category: 'bread', vegMark: 'veg', allergens: ['gluten'], source: 'seed', pricePaise: 5500 },
  { id: 'p-britannia-bread', barcode: '8901063140010', name: 'Britannia Brown Bread 400g', brand: 'Britannia', packSize: '400 g', category: 'bread', vegMark: 'veg', allergens: ['gluten'], source: 'seed', pricePaise: 5000 },
  { id: 'p-id-dosa-batter', barcode: '8906056470014', name: 'iD Idly & Dosa Batter 1kg', brand: 'iD', packSize: '1 kg', category: 'batter', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 9000 },
  { id: 'p-spinach', name: 'Spinach (Palak) 1 bunch', packSize: '1 bunch', category: 'leafy_veg', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 3000 },
  { id: 'p-coriander', name: 'Coriander Leaves 100g', packSize: '100 g', category: 'leafy_veg', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 1500 },
  { id: 'p-tomato', name: 'Tomato (Hybrid) 500g', packSize: '500 g', category: 'vegetables', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 2400 },
  { id: 'p-onion', name: 'Onion 1kg', packSize: '1 kg', category: 'vegetables', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 3800 },
  { id: 'p-capsicum', name: 'Capsicum Green 250g', packSize: '250 g', category: 'vegetables', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 2500 },
  { id: 'p-banana', name: 'Banana Robusta (6 pcs)', packSize: '6 pcs', category: 'fruits', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 4500 },
  { id: 'p-apple', name: 'Apple Shimla 4 pcs', packSize: '4 pcs', category: 'fruits', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 16000 },
  { id: 'p-chicken-curry-cut', name: 'Chicken Curry Cut 500g', brand: 'Licious', packSize: '500 g', category: 'meat', vegMark: 'non_veg', allergens: [], source: 'seed', pricePaise: 22000 },
  { id: 'p-tofu', barcode: '8906078120015', name: 'Firm Tofu 200g', brand: 'Urban Platter', packSize: '200 g', category: 'tofu', vegMark: 'veg', allergens: ['soy'], source: 'seed', pricePaise: 9900 },
  { id: 'p-coke-can', barcode: '5449000000996', name: 'Coca-Cola Can 330ml', brand: 'Coca-Cola', packSize: '330 ml', category: 'beverages', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 4000 },
  { id: 'p-kissan-ketchup', barcode: '8901030530014', name: 'Kissan Fresh Tomato Ketchup 850g', brand: 'Kissan', packSize: '850 g', category: 'sauces_condiments', vegMark: 'veg', allergens: [], source: 'seed', pricePaise: 15000 },
];

// Learned shelf life — seeded for ~20 SKUs in the MVP (crowd-built later from confirmed scans).
const LEARN = (productId: string, platform: LearnedShelfLife['platform'], city: string, days: number, n: number): LearnedShelfLife => ({
  productId, platform, city, medianDaysLeftAtDelivery: days, sampleSize: n,
});

export const SEED_LEARNED: LearnedShelfLife[] = [
  LEARN('p-amul-taaza-500', 'blinkit', 'Bengaluru', 3, 42), LEARN('p-amul-taaza-500', 'zepto', 'Bengaluru', 2, 31),
  LEARN('p-amul-taaza-500', 'instamart', 'Mumbai', 3, 18), LEARN('p-amul-gold-1l', 'blinkit', 'Bengaluru', 3, 22),
  LEARN('p-nandini-toned-500', 'instamart', 'Bengaluru', 2, 27), LEARN('p-mother-dairy-dahi-400', 'blinkit', 'Delhi', 9, 15),
  LEARN('p-mother-dairy-dahi-400', 'blinkit', 'Bengaluru', 8, 9), LEARN('p-amul-masti-dahi-400', 'zepto', 'Bengaluru', 10, 12),
  LEARN('p-milky-mist-paneer-200', 'blinkit', 'Bengaluru', 12, 19), LEARN('p-amul-paneer-200', 'instamart', 'Bengaluru', 6, 7),
  LEARN('p-modern-bread', 'blinkit', 'Bengaluru', 4, 25), LEARN('p-britannia-bread', 'zepto', 'Bengaluru', 3, 16),
  LEARN('p-id-dosa-batter', 'blinkit', 'Bengaluru', 4, 33), LEARN('p-id-dosa-batter', 'instamart', 'Bengaluru', 3, 21),
  LEARN('p-eggs-6', 'blinkit', 'Bengaluru', 16, 11), LEARN('p-eggs-12', 'zepto', 'Bengaluru', 15, 8),
  LEARN('p-amul-fresh-cream', 'blinkit', 'Bengaluru', 30, 6), LEARN('p-amul-butter-100', 'blinkit', 'Bengaluru', 120, 14),
  LEARN('p-amul-cheese-slices', 'instamart', 'Bengaluru', 150, 10), LEARN('p-tofu', 'blinkit', 'Bengaluru', 14, 3),
];

// The 30 most common quick-add chips.
export const QUICK_ADD_CHIPS: { name: string; category: Product['category']; unit: 'pcs' | 'g' | 'kg' | 'ml' | 'l' | 'pack' | 'bunch'; qty: number; pricePaise?: number }[] = [
  { name: 'Tomato', category: 'vegetables', unit: 'g', qty: 500, pricePaise: 2400 },
  { name: 'Onion', category: 'vegetables', unit: 'kg', qty: 1, pricePaise: 3800 },
  { name: 'Spinach', category: 'leafy_veg', unit: 'bunch', qty: 1, pricePaise: 3000 },
  { name: 'Milk', category: 'milk', unit: 'ml', qty: 500, pricePaise: 2900 },
  { name: 'Curd', category: 'curd_yogurt', unit: 'g', qty: 400, pricePaise: 3500 },
  { name: 'Paneer', category: 'paneer', unit: 'g', qty: 200, pricePaise: 9000 },
  { name: 'Eggs', category: 'eggs', unit: 'pcs', qty: 6, pricePaise: 6500 },
  { name: 'Bread', category: 'bread', unit: 'pack', qty: 1, pricePaise: 5000 },
  { name: 'Coriander', category: 'leafy_veg', unit: 'bunch', qty: 1, pricePaise: 1500 },
  { name: 'Dosa batter', category: 'batter', unit: 'kg', qty: 1, pricePaise: 9000 },
  { name: 'Potato', category: 'vegetables', unit: 'kg', qty: 1, pricePaise: 3500 },
  { name: 'Capsicum', category: 'vegetables', unit: 'g', qty: 250, pricePaise: 2500 },
  { name: 'Carrot', category: 'vegetables', unit: 'g', qty: 500, pricePaise: 3000 },
  { name: 'Cucumber', category: 'vegetables', unit: 'pcs', qty: 2, pricePaise: 2000 },
  { name: 'Methi', category: 'leafy_veg', unit: 'bunch', qty: 1, pricePaise: 2000 },
  { name: 'Mint', category: 'leafy_veg', unit: 'bunch', qty: 1, pricePaise: 1500 },
  { name: 'Green chilli', category: 'vegetables', unit: 'g', qty: 100, pricePaise: 1000 },
  { name: 'Ginger', category: 'vegetables', unit: 'g', qty: 100, pricePaise: 1500 },
  { name: 'Lemon', category: 'vegetables', unit: 'pcs', qty: 4, pricePaise: 2000 },
  { name: 'Cauliflower', category: 'vegetables', unit: 'pcs', qty: 1, pricePaise: 4000 },
  { name: 'Bhindi', category: 'vegetables', unit: 'g', qty: 250, pricePaise: 3000 },
  { name: 'Lauki', category: 'vegetables', unit: 'pcs', qty: 1, pricePaise: 3500 },
  { name: 'Mushroom', category: 'vegetables', unit: 'g', qty: 200, pricePaise: 5000 },
  { name: 'Banana', category: 'fruits', unit: 'pcs', qty: 6, pricePaise: 4500 },
  { name: 'Apple', category: 'fruits', unit: 'pcs', qty: 4, pricePaise: 16000 },
  { name: 'Butter', category: 'butter_ghee', unit: 'g', qty: 100, pricePaise: 6200 },
  { name: 'Cheese', category: 'cheese', unit: 'g', qty: 200, pricePaise: 14500 },
  { name: 'Fresh cream', category: 'cream', unit: 'ml', qty: 250, pricePaise: 7500 },
  { name: 'Tofu', category: 'tofu', unit: 'g', qty: 200, pricePaise: 9900 },
  { name: 'Chicken', category: 'meat', unit: 'g', qty: 500, pricePaise: 22000 },
];
