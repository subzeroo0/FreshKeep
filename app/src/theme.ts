import { Platform } from 'react-native';

import type { Category } from './lib/types';

// FreshKeep design tokens — "fresh market editorial":
// deep brand green (from the logo) + lime action colour, bold condensed display type,
// big colour-blocked hero cards, pill controls on soft sage surfaces.
export const colors = {
  // surfaces
  bg: '#EDF1E7',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F8F2',
  // ink + brand
  ink: '#13221A',
  inkSoft: '#2A3A30',
  brand: '#2A5731',
  brandDark: '#1C3D22',
  brandSoft: '#DCE8D5',
  brandTint: '#EEF4EA',
  lime: '#C8E86E',
  limeDeep: '#A8CC43',
  limeSoft: '#EEF7D3',
  // text
  text: '#13221A',
  textMuted: '#5B6A5F',
  textFaint: '#97A39A',
  textOnDark: '#F3F7EE',
  textOnDarkMuted: '#A9B8AC',
  border: '#E0E6DA',
  // semantic (urgency) — kept separate from brand colours
  danger: '#D6473A',
  dangerSoft: '#FCE5E1',
  warn: '#DB930A',
  warnSoft: '#FDF0D3',
  ok: '#3E9B4F',
  okSoft: '#E0F2E2',
  expired: '#8C958E',
  expiredSoft: '#ECEEEA',
  white: '#FFFFFF',
  // hero palette for colour-blocked cards
  butter: '#F7D96A',
  peach: '#F8C9AE',
  sky: '#BFDAF3',
  lilac: '#D8CBF3',
  mint: '#C4E8C9',
  blush: '#F5C6D2',
  sage: '#D6E4C7',
  // legacy aliases used across screens
  card: '#FFFFFF',
};

export const urgencyColors = {
  today: { fg: colors.danger, bg: colors.dangerSoft, label: 'Use today' },
  week: { fg: colors.warn, bg: colors.warnSoft, label: 'This week' },
  fine: { fg: colors.ok, bg: colors.okSoft, label: 'Fine' },
  expired: { fg: colors.expired, bg: colors.expiredSoft, label: 'Expired' },
} as const;

export const confidenceColors = {
  confirmed: { fg: '#1F6B3A', bg: '#DDF0E2', label: 'Confirmed' },
  learned: { fg: '#2A5A8A', bg: '#E0ECF7', label: 'Learned' },
  estimated: { fg: '#7A5B12', bg: '#F6EDD5', label: 'Estimated' },
} as const;

/** Each food category gets a hero colour for its tiles and detail page. */
export const categoryColor: Record<Category, string> = {
  milk: colors.sky, uht_milk: colors.sky, curd_yogurt: colors.lilac, paneer: colors.butter, cheese: colors.butter,
  butter_ghee: colors.butter, cream: colors.sky, eggs: colors.peach, bread: colors.peach, batter: colors.peach,
  leafy_veg: colors.mint, vegetables: colors.mint, fruits: colors.blush, meat: colors.blush, fish: colors.sky,
  tofu: colors.sage, sauces_condiments: colors.peach, beverages: colors.lilac, ready_to_eat: colors.lilac,
  leftovers: colors.sage, other: colors.sage,
};

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 };
export const space = (n: number) => n * 4;

// Bottom space so content clears the floating tab bar.
export const TAB_BAR_SPACE = 120;

const DISPLAY = 'Anton_400Regular';

export const font = {
  display: DISPLAY,
  hero: { fontFamily: DISPLAY, fontSize: 52, lineHeight: 54, textTransform: 'uppercase' as const, letterSpacing: 0.2 },
  h1: { fontFamily: DISPLAY, fontSize: 38, lineHeight: 42, textTransform: 'uppercase' as const, letterSpacing: 0.2 },
  h2: { fontFamily: DISPLAY, fontSize: 26, lineHeight: 30, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  section: { fontFamily: DISPLAY, fontSize: 20, lineHeight: 24, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const },
  eyebrow: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(19,34,26,0.05), 0 6px 18px rgba(19,34,26,0.06)' } as object,
  default: { shadowColor: '#13221A', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
});

export const shadowStrong = Platform.select({
  web: { boxShadow: '0 10px 30px rgba(19,34,26,0.22)' } as object,
  default: { shadowColor: '#13221A', shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
});
