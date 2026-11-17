// A dish emoji for meal cards, picked from the dish title.
const MAP: [RegExp, string][] = [
  [/dosa|uttapam|idli|chilla|cheela|pancake/i, '🥞'], [/omelette|bhurji anda|egg/i, '🍳'], [/smoothie|lassi|shake/i, '🥤'],
  [/salad|kachumber/i, '🥗'], [/sandwich|toast/i, '🥪'], [/noodle|hakka/i, '🍜'], [/pasta/i, '🍝'], [/kheer|payasam/i, '🍮'],
  [/fruit|yogurt bowl|curd bowl/i, '🍓'], [/paratha|thepla|roti|wrap|roll/i, '🫓'], [/pulao|biryani|fried rice|rice|khichdi/i, '🍚'],
  [/curry|masala|paneer|palak|dal|kadhi|sabzi|rasam|sambar|gobi|bhindi/i, '🍛'], [/fish/i, '🐟'], [/chicken/i, '🍗'], [/poha|upma/i, '🥣'],
];
export function mealEmoji(title: string): string {
  for (const [re, e] of MAP) if (re.test(title)) return e;
  return '🍲';
}
