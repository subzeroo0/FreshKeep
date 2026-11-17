import type { Recipe, RecipeIngredient } from '../lib/meals';
import type { Category, Equipment, Slot } from '../lib/types';

// Offline recipe library — used when the AI endpoint is unavailable (and always in demo mode).
// Ingredients marked main must be in the fridge; others become extras if missing.

const I = (label: string, amount: string, fraction: number, opts: { cats?: Category[]; words?: string[]; main?: boolean } = {}): RecipeIngredient => ({
  label,
  amount,
  fraction,
  ...opts,
});

const R = (
  id: string,
  title: string,
  description: string,
  slots: Slot[],
  cuisine: string,
  cookTimeMin: number,
  equipment: Equipment[],
  ingredients: RecipeIngredient[],
  staples: string[],
  extras: string[],
  steps: string[],
  servings = 2,
): Recipe => ({ id, title, description, slots, cuisine, cookTimeMin, servings, equipment, ingredients, staples, extras, steps });

const spinach = (main = true, f = 1) => I('spinach', '1 bunch', f, { words: ['spinach', 'palak'], main });
const paneer = (main = true, f = 1) => I('paneer', '200 g', f, { cats: ['paneer'], main });
const curd = (main = true, f = 0.5) => I('curd', '1 cup', f, { cats: ['curd_yogurt'], main });
const milk = (main = true, f = 0.5) => I('milk', '250 ml', f, { cats: ['milk', 'uht_milk'], main });
const eggs = (main = true, f = 0.33) => I('eggs', '3 eggs', f, { cats: ['eggs'], main });
const bread = (main = true, f = 0.4) => I('bread', '4 slices', f, { cats: ['bread'], main });
const batter = (main = true, f = 0.5) => I('dosa batter', '2 cups', f, { cats: ['batter'], main });
const tomato = (main = false, f = 0.4) => I('tomato', '2', f, { words: ['tomato', 'tomatoes'], main });
const onion = (main = false, f = 0.3) => I('onion', '1', f, { words: ['onion', 'onions'], main });
const coriander = () => I('coriander', 'a handful', 0.5, { words: ['coriander', 'dhania'] });
const capsicum = (main = false) => I('capsicum', '1', 1, { words: ['capsicum', 'bell pepper'], main });
const cream = () => I('fresh cream', '2 tbsp', 0.3, { cats: ['cream'] });
const butter = () => I('butter', '1 tbsp', 0.05, { cats: ['butter_ghee'] });
const cheese = (main = false) => I('cheese', '2 slices', 0.3, { cats: ['cheese'], main });
const chicken = (main = true) => I('chicken', '500 g', 1, { cats: ['meat'], words: ['chicken'], main });
const fish = (main = true) => I('fish', '400 g', 1, { cats: ['fish'], main });
const tofu = (main = true) => I('tofu', '200 g', 1, { cats: ['tofu'], main });
const methi = (main = true) => I('methi', '1 bunch', 1, { words: ['methi', 'fenugreek'], main });
const potato = (main = false) => I('potato', '2', 0.3, { words: ['potato', 'potatoes', 'aloo'], main });
const mixedVeg = (main = true, f = 0.5) => I('mixed vegetables', '2 cups', f, { cats: ['vegetables'], main });
const banana = (main = true) => I('banana', '2', 0.5, { words: ['banana', 'bananas'], main });
const fruit = (main = true) => I('fruit', '2 cups', 0.6, { cats: ['fruits'], main });
const leftovers = () => I('leftovers', 'all of it', 1, { cats: ['leftovers'], main: true });
const mushroom = (main = true) => I('mushroom', '200 g', 1, { words: ['mushroom', 'mushrooms'], main });
const peas = () => I('peas', '1/2 cup', 0.5, { words: ['peas', 'matar'] });
const cucumber = () => I('cucumber', '1', 1, { words: ['cucumber', 'kheera'] });
const lauki = (main = true) => I('lauki', '1', 1, { words: ['lauki', 'bottle gourd', 'gourd'], main });
const cauliflower = (main = true) => I('cauliflower', '1 small', 1, { words: ['cauliflower', 'gobi'], main });
const bhindi = (main = true) => I('bhindi', '250 g', 1, { words: ['bhindi', 'okra', 'ladies finger'], main });

export const RECIPES: Recipe[] = [
  // ---------- Breakfast ----------
  R('masala-omelette', 'Masala omelette with toast', 'A quick protein breakfast that uses eggs and bread before they turn.', ['breakfast'], 'north_indian', 10, ['stove'],
    [eggs(), bread(false), onion(), tomato(), coriander()], ['oil', 'salt', 'green chilli'], [],
    ['Whisk eggs with chopped onion, tomato, chilli, coriander and salt.', 'Pour into a hot oiled pan; cook 2 min a side.', 'Toast the bread and serve.']),
  R('egg-bhurji', 'Egg bhurji with pav', 'Spiced scrambled eggs — the fastest way through a tray of eggs.', ['breakfast', 'dinner'], 'maharashtrian', 12, ['stove'],
    [eggs(true, 0.33), bread(false), onion(), tomato(), coriander()], ['oil', 'salt', 'turmeric', 'chilli powder'], [],
    ['Sauté onion and tomato with spices.', 'Add beaten eggs and scramble until just set.', 'Finish with coriander; serve with toasted pav.']),
  R('paneer-bhurji', 'Paneer bhurji with toast', 'Crumbled paneer with onion and tomato — protein that uses paneer before it goes sour.', ['breakfast', 'dinner'], 'north_indian', 15, ['stove'],
    [paneer(), bread(false), onion(), tomato(), capsicum(), coriander()], ['oil', 'salt', 'turmeric', 'garam masala'], [],
    ['Sauté onion, capsicum and tomato with spices.', 'Crumble in the paneer and cook 3 min.', 'Top with coriander and serve with toast.']),
  R('jain-paneer-bhurji', 'Jain paneer bhurji', 'No onion, no garlic paneer scramble with tomato and capsicum.', ['breakfast', 'dinner'], 'gujarati', 12, ['stove'],
    [paneer(), tomato(), capsicum(), coriander()], ['oil', 'salt', 'turmeric', 'jeera'], [],
    ['Temper jeera in oil; add tomato and capsicum.', 'Crumble in paneer with turmeric and salt.', 'Cook 3 min, finish with coriander.']),
  R('dosa-chutney', 'Dosa with coconut chutney', 'Crisp dosas from the batter before it gets too sour.', ['breakfast', 'dinner'], 'south_indian', 20, ['stove'],
    [batter(true, 0.6), curd(false, 0.1)], ['oil', 'salt'], ['coconut'],
    ['Heat a tawa, spread a ladle of batter thin.', 'Drizzle oil; cook until golden.', 'Serve with coconut chutney.']),
  R('veg-uttapam', 'Vegetable uttapam', 'Thick uttapam topped with whatever vegetables are in the drawer — great for slightly sour batter.', ['breakfast', 'dinner'], 'south_indian', 20, ['stove'],
    [batter(), onion(), tomato(), capsicum(), coriander()], ['oil', 'salt'], [],
    ['Spread batter thick on a hot tawa.', 'Press chopped vegetables on top.', 'Cook covered 3 min, flip and crisp.']),
  R('idli-sambar', 'Idli with sambar', 'Soft idlis from fresh batter and a pot of sambar.', ['breakfast'], 'south_indian', 30, ['stove', 'pressure_cooker'],
    [batter(), tomato(), mixedVeg(false, 0.3)], ['toor dal', 'sambar powder', 'tamarind'], [],
    ['Steam idlis for 10–12 min.', 'Pressure cook dal; simmer with vegetables, tamarind and sambar powder.', 'Temper and pour over.']),
  R('vegetable-poha', 'Vegetable poha', 'Light poha that picks up peas, onion and coriander.', ['breakfast'], 'maharashtrian', 15, ['stove'],
    [onion(true, 0.5), peas(), potato(), coriander()], ['poha', 'oil', 'mustard seeds', 'turmeric', 'peanuts'], [],
    ['Rinse poha and drain.', 'Temper mustard seeds, add onion, potato and peas.', 'Add poha, turmeric and salt; finish with lemon and coriander.']),
  R('rava-upma', 'Vegetable upma', 'Savoury semolina with mixed vegetables.', ['breakfast'], 'south_indian', 15, ['stove'],
    [mixedVeg(true, 0.3), onion(), coriander()], ['rava', 'oil', 'mustard seeds', 'curry leaves'], [],
    ['Roast rava until fragrant.', 'Temper and sauté vegetables.', 'Add water, then rava; stir till fluffy.']),
  R('methi-thepla', 'Methi thepla with curd', 'Gujarati flatbreads that use a whole bunch of methi.', ['breakfast', 'lunch'], 'gujarati', 25, ['stove'],
    [methi(), curd(false, 0.3)], ['atta', 'besan', 'oil', 'turmeric', 'ajwain'], [],
    ['Knead atta with chopped methi, curd and spices.', 'Roll thin.', 'Cook on a tawa with a little oil.']),
  R('palak-paratha', 'Palak paratha with curd', 'Spinach kneaded into the dough — a full bunch disappears.', ['breakfast', 'lunch'], 'north_indian', 25, ['stove'],
    [spinach(), curd(false, 0.3), butter()], ['atta', 'salt', 'ajwain', 'oil'], [],
    ['Blanch and purée spinach.', 'Knead into atta with salt and ajwain.', 'Roll and cook with ghee; serve with curd.']),
  R('aloo-paratha', 'Aloo paratha with curd', 'Stuffed parathas with a side of curd.', ['breakfast', 'lunch'], 'north_indian', 30, ['stove'],
    [potato(true), curd(false, 0.3), butter(), coriander()], ['atta', 'salt', 'chilli', 'oil'], [],
    ['Boil and mash potatoes with spices.', 'Stuff into dough and roll.', 'Cook with butter; serve with curd.']),
  R('banana-smoothie', 'Banana milk smoothie', 'Uses ripe bananas and the milk that needs finishing.', ['breakfast'], 'continental', 5, ['mixer_grinder'],
    [banana(), milk(true, 0.5), curd(false, 0.2)], [], ['oats (optional)'],
    ['Blend banana, milk and a spoon of curd.', 'Add ice and honey to taste.']),
  R('fruit-yogurt-bowl', 'Fruit and curd bowl', 'Chopped fruit over thick curd — five minutes, no cooking.', ['breakfast'], 'continental', 5, [],
    [fruit(), curd(true, 0.5)], [], ['granola (optional)'],
    ['Chop the ripest fruit.', 'Spoon over curd.', 'Top with nuts or granola.']),
  R('cheese-sandwich', 'Veg cheese sandwich', 'Grilled sandwich that uses bread, cheese and a tomato.', ['breakfast', 'dinner'], 'continental', 10, ['stove'],
    [bread(true, 0.4), cheese(), tomato(), cucumber(), butter()], ['salt', 'pepper'], ['green chutney'],
    ['Butter the bread; layer cheese, tomato and cucumber.', 'Toast in a pan until golden.']),
  R('french-toast', 'Masala French toast', 'Savoury French toast for bread and eggs nearing their date.', ['breakfast'], 'continental', 10, ['stove'],
    [bread(true, 0.4), eggs(true, 0.17), milk(false, 0.1), onion(), coriander()], ['salt', 'chilli'], [],
    ['Whisk egg, milk, onion, chilli and coriander.', 'Dip bread and pan-fry until golden.']),
  R('besan-chilla', 'Besan chilla with tomato', 'Vegan gram-flour pancakes loaded with vegetables.', ['breakfast', 'dinner'], 'north_indian', 15, ['stove'],
    [tomato(true, 0.5), onion(), capsicum(), coriander()], ['besan', 'oil', 'salt', 'ajwain'], [],
    ['Whisk besan with water and spices.', 'Stir in chopped vegetables.', 'Cook thin chillas on a hot tawa.']),
  R('tofu-scramble', 'Masala tofu scramble', 'A vegan bhurji with tofu and vegetables.', ['breakfast', 'dinner'], 'continental', 12, ['stove'],
    [tofu(), onion(), tomato(), capsicum(), coriander()], ['oil', 'turmeric', 'salt'], [],
    ['Sauté onion, tomato and capsicum.', 'Crumble in tofu with turmeric and salt.', 'Cook 4 min; finish with coriander.']),

  // ---------- Lunch / dinner ----------
  R('palak-paneer', 'Palak paneer with jeera rice', 'Uses the spinach and paneer before they turn.', ['lunch', 'dinner'], 'north_indian', 30, ['stove', 'mixer_grinder'],
    [spinach(), paneer(), onion(), tomato(), cream()], ['oil', 'garlic', 'ginger', 'garam masala', 'rice', 'jeera'], [],
    ['Blanch spinach 2 min; blend smooth.', 'Sauté onion, ginger-garlic and tomato; add the purée.', 'Simmer, add paneer cubes and a swirl of cream.', 'Serve with jeera rice.']),
  R('jain-palak-paneer', 'Jain palak paneer', 'No onion, no garlic palak paneer with tomato and jeera.', ['lunch', 'dinner'], 'gujarati', 25, ['stove', 'mixer_grinder'],
    [spinach(), paneer(), tomato()], ['oil', 'jeera', 'garam masala', 'rice'], [],
    ['Blanch and blend spinach with tomato.', 'Temper jeera; add the purée and spices.', 'Simmer with paneer; serve with rice.']),
  R('palak-dal', 'Palak dal with rice', 'Comforting dal that uses a whole bunch of spinach.', ['lunch', 'dinner'], 'north_indian', 25, ['stove', 'pressure_cooker'],
    [spinach(), tomato(), onion()], ['toor dal', 'garlic', 'jeera', 'turmeric', 'rice'], [],
    ['Pressure cook dal with turmeric.', 'Temper garlic and jeera; add onion, tomato and chopped spinach.', 'Mix in dal and simmer 5 min.']),
  R('aloo-palak', 'Aloo palak with roti', 'Dry potato and spinach sabzi.', ['lunch', 'dinner'], 'north_indian', 25, ['stove'],
    [spinach(), potato(true), onion(), tomato()], ['oil', 'garlic', 'jeera', 'atta'], [],
    ['Sauté jeera, garlic and onion.', 'Add cubed potato; cook covered till soft.', 'Add chopped spinach and cook down.']),
  R('palak-tofu', 'Palak tofu', 'A vegan take on palak paneer.', ['lunch', 'dinner'], 'north_indian', 25, ['stove', 'mixer_grinder'],
    [spinach(), tofu(), onion(), tomato()], ['oil', 'garlic', 'ginger', 'garam masala', 'rice'], [],
    ['Blanch and blend spinach.', 'Sauté aromatics and tomato, add the purée.', 'Fold in pan-seared tofu cubes.']),
  R('paneer-butter-masala', 'Paneer butter masala with roti', 'Rich tomato gravy that rescues paneer and cream.', ['lunch', 'dinner'], 'north_indian', 30, ['stove', 'mixer_grinder'],
    [paneer(), tomato(true, 0.6), cream(), butter(), onion()], ['cashews', 'garam masala', 'kasuri methi', 'atta'], [],
    ['Cook tomato, onion and cashews; blend smooth.', 'Simmer the gravy in butter with spices.', 'Add paneer and cream; serve with roti.']),
  R('kadai-paneer', 'Kadai paneer', 'Paneer and capsicum in a spicy masala.', ['lunch', 'dinner'], 'north_indian', 25, ['stove'],
    [paneer(), capsicum(true), onion(), tomato()], ['oil', 'kadai masala', 'ginger', 'atta'], [],
    ['Sauté capsicum and onion on high heat.', 'Add tomato and kadai masala; cook down.', 'Toss in paneer; serve with roti.']),
  R('matar-paneer', 'Matar paneer with rice', 'Classic peas and paneer curry.', ['lunch', 'dinner'], 'north_indian', 30, ['stove', 'mixer_grinder'],
    [paneer(), peas(), tomato(true, 0.5), onion()], ['ginger', 'garlic', 'garam masala', 'rice'], [],
    ['Blend onion and tomato; cook into a masala.', 'Add peas and water; simmer.', 'Add paneer and finish with garam masala.']),
  R('kadhi-chawal', 'Kadhi chawal', 'Turns curd near its date into a tangy kadhi.', ['lunch', 'dinner'], 'north_indian', 30, ['stove'],
    [curd(true, 0.8), onion()], ['besan', 'rice', 'turmeric', 'jeera', 'curry leaves'], [],
    ['Whisk curd with besan, turmeric and water.', 'Temper spices and add the curd mix.', 'Simmer 15 min stirring; serve with rice.']),
  R('gujarati-kadhi', 'Gujarati kadhi with rice', 'Sweet-sour kadhi, no onion — a Jain-friendly way to use curd.', ['lunch', 'dinner'], 'gujarati', 25, ['stove'],
    [curd(true, 0.8), coriander()], ['besan', 'jaggery', 'jeera', 'curry leaves', 'rice'], [],
    ['Whisk curd with besan and water.', 'Temper and simmer with jaggery.', 'Garnish with coriander.']),
  R('curd-rice', 'Curd rice', 'Cooling South Indian curd rice — finishes a big tub of curd.', ['lunch', 'dinner'], 'south_indian', 15, ['stove'],
    [curd(true, 0.7), cucumber(), coriander()], ['rice', 'mustard seeds', 'curry leaves', 'salt'], ['pomegranate (optional)'],
    ['Mash cooked rice with curd and salt.', 'Temper mustard seeds and curry leaves; pour over.', 'Add grated cucumber and coriander.']),
  R('raita-pulao', 'Veg pulao with raita', 'One-pot pulao with mixed vegetables and a side of raita.', ['lunch', 'dinner'], 'north_indian', 30, ['stove', 'pressure_cooker'],
    [mixedVeg(), curd(false, 0.4), onion(), peas(), cucumber()], ['rice', 'whole spices', 'ghee'], [],
    ['Sauté whole spices and onion in ghee.', 'Add vegetables and rice; pressure cook 2 whistles.', 'Serve with cucumber raita.']),
  R('mixed-veg-sabzi', 'Mixed veg sabzi with roti', 'A dry sabzi that clears the vegetable drawer.', ['lunch', 'dinner'], 'north_indian', 25, ['stove'],
    [mixedVeg(true, 0.7), onion(), tomato()], ['oil', 'jeera', 'turmeric', 'atta'], [],
    ['Temper jeera; add onion and tomato.', 'Add chopped vegetables and spices.', 'Cook covered till tender.']),
  R('sambar-rice', 'Sambar rice', 'One-pot sambar rice that uses tomatoes and vegetables.', ['lunch', 'dinner'], 'south_indian', 30, ['pressure_cooker', 'stove'],
    [mixedVeg(true, 0.5), tomato(), onion()], ['toor dal', 'rice', 'sambar powder', 'tamarind'], [],
    ['Pressure cook rice, dal and vegetables together.', 'Add tamarind and sambar powder; simmer.', 'Temper and serve.']),
  R('veg-fried-rice', 'Vegetable fried rice', 'Leftover rice tossed with the vegetables on their way out.', ['lunch', 'dinner'], 'asian', 15, ['stove'],
    [mixedVeg(true, 0.5), capsicum(), onion(), eggs(false, 0.17)], ['rice', 'soy sauce', 'oil', 'pepper'], ['spring onion'],
    ['Stir-fry vegetables on high heat.', 'Add cold rice, soy sauce and pepper.', 'Toss until hot.']),
  R('veg-hakka-noodles', 'Veg hakka noodles', 'Indo-Chinese noodles with capsicum and cabbage.', ['dinner'], 'asian', 20, ['stove'],
    [capsicum(true), mixedVeg(false, 0.4), onion()], ['noodles', 'soy sauce', 'vinegar', 'garlic'], [],
    ['Boil noodles and drain.', 'Stir-fry garlic and vegetables on high heat.', 'Toss with noodles and sauces.']),
  R('gobi-sabzi', 'Aloo gobi with roti', 'Dry cauliflower and potato sabzi.', ['lunch', 'dinner'], 'north_indian', 25, ['stove'],
    [cauliflower(), potato(), tomato()], ['oil', 'jeera', 'turmeric', 'ginger', 'atta'], [],
    ['Temper jeera; add potato and cauliflower florets.', 'Add spices and cook covered.', 'Finish with tomato and coriander.']),
  R('bhindi-masala', 'Bhindi masala with dal', 'Crisp okra masala.', ['lunch', 'dinner'], 'north_indian', 25, ['stove'],
    [bhindi(), onion(), tomato()], ['oil', 'amchur', 'jeera', 'toor dal'], [],
    ['Dry okra well; slice.', 'Fry until no longer sticky.', 'Add onion, tomato and spices.']),
  R('lauki-chana', 'Lauki chana dal', 'Light bottle-gourd dal.', ['lunch', 'dinner'], 'north_indian', 30, ['pressure_cooker', 'stove'],
    [lauki(), tomato()], ['chana dal', 'turmeric', 'jeera', 'rice'], [],
    ['Pressure cook chana dal with lauki.', 'Temper and add tomato.', 'Simmer together.']),
  R('mushroom-masala', 'Mushroom masala', 'Mushrooms in onion-tomato masala before they go slimy.', ['lunch', 'dinner'], 'north_indian', 20, ['stove'],
    [mushroom(), onion(), tomato(), capsicum(), cream()], ['oil', 'garam masala', 'atta'], [],
    ['Sauté mushrooms on high heat.', 'Add onion-tomato masala.', 'Finish with a spoon of cream.']),
  R('tomato-rasam', 'Tomato rasam with rice', 'Tangy rasam — the best use for soft, ripe tomatoes.', ['lunch', 'dinner'], 'south_indian', 20, ['stove'],
    [tomato(true, 0.8), coriander()], ['tamarind', 'rasam powder', 'garlic', 'rice'], [],
    ['Boil tomatoes with tamarind and rasam powder.', 'Temper garlic, mustard and curry leaves.', 'Garnish with coriander.']),
  R('chicken-curry', 'Home-style chicken curry', 'Uses the chicken on its last safe day.', ['lunch', 'dinner'], 'north_indian', 40, ['stove'],
    [chicken(), onion(true, 0.5), tomato(), curd(false, 0.2)], ['ginger', 'garlic', 'garam masala', 'rice'], [],
    ['Marinate chicken in curd and spices.', 'Brown onions; add ginger-garlic and tomato.', 'Add chicken and simmer 20 min.']),
  R('chicken-stir-fry', 'Chilli chicken stir-fry', 'Quick high-heat stir-fry with capsicum.', ['dinner'], 'asian', 20, ['stove'],
    [chicken(), capsicum(), onion()], ['soy sauce', 'garlic', 'cornflour'], [],
    ['Coat chicken in cornflour and sear.', 'Stir-fry capsicum and onion.', 'Toss with sauces.']),
  R('fish-curry', 'Fish curry with rice', 'Coastal-style curry — fish only keeps a day.', ['lunch', 'dinner'], 'bengali', 30, ['stove'],
    [fish(), tomato(), onion()], ['mustard oil', 'turmeric', 'chilli', 'rice'], [],
    ['Rub fish with turmeric and salt; shallow fry.', 'Make a gravy of onion, tomato and spices.', 'Simmer fish in gravy 8 min.']),
  R('egg-curry', 'Egg curry with rice', 'Boiled eggs in onion-tomato gravy.', ['lunch', 'dinner'], 'north_indian', 25, ['stove'],
    [eggs(true, 0.33), onion(true, 0.5), tomato()], ['oil', 'garam masala', 'rice'], [],
    ['Boil and peel eggs.', 'Make an onion-tomato masala.', 'Simmer eggs in the gravy.']),
  R('leftover-wrap', 'Leftover wrap', 'Turn last night’s sabzi into a quick roll.', ['lunch', 'dinner'], 'north_indian', 10, ['stove'],
    [leftovers(), onion(), curd(false, 0.1)], ['atta'], ['green chutney'],
    ['Warm the leftovers.', 'Roll in a roti with onion and chutney.', 'Toast the roll on a tawa.']),
  R('leftover-fried-rice', 'Leftover rice tadka', 'Give leftovers a fresh tadka.', ['lunch', 'dinner'], 'south_indian', 10, ['stove'],
    [leftovers(), onion(), coriander()], ['oil', 'mustard seeds', 'curry leaves'], [],
    ['Temper mustard seeds and curry leaves.', 'Add leftovers and toss on high heat.', 'Finish with coriander.']),
  R('pav-bhaji', 'Pav bhaji', 'Mashed vegetable bhaji — uses up pav and a mix of vegetables.', ['dinner'], 'maharashtrian', 35, ['stove', 'pressure_cooker'],
    [bread(true, 0.6), mixedVeg(true, 0.6), tomato(), capsicum(), butter(), onion()], ['pav bhaji masala', 'lemon'], [],
    ['Pressure cook vegetables and mash.', 'Cook with butter, tomato and pav bhaji masala.', 'Toast pav in butter and serve.']),
  R('veg-salad', 'Kachumber salad with chaas', 'No-cook salad and spiced buttermilk.', ['lunch'], 'north_indian', 10, [],
    [cucumber(), tomato(true, 0.5), onion(), curd(false, 0.3), coriander()], ['salt', 'chaat masala', 'lemon'], [],
    ['Dice cucumber, tomato and onion.', 'Toss with lemon and chaat masala.', 'Whisk curd with water and jeera for chaas.']),
  R('cheese-pasta', 'Creamy vegetable pasta', 'Pasta with milk, cheese and vegetables.', ['dinner'], 'continental', 25, ['stove'],
    [milk(true, 0.4), cheese(), mixedVeg(false, 0.4), capsicum(), butter()], ['pasta', 'maida', 'pepper'], [],
    ['Boil pasta.', 'Make a white sauce with butter, maida and milk.', 'Add vegetables, cheese and pasta.']),
  R('kheer', 'Rice kheer', 'Milk dessert that finishes a pouch nearing its date.', ['dinner'], 'north_indian', 35, ['stove'],
    [milk(true, 1)], ['rice', 'sugar', 'cardamom'], ['nuts (optional)'],
    ['Simmer milk with washed rice.', 'Stir until thick and creamy.', 'Add sugar and cardamom.']),
];
