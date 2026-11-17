import { Platform } from 'react-native';

// FreshKeep brand tokens. Primary green is sampled from the logo (#2A5731).
export const colors = {
  brand: '#2A5731',
  brandDark: '#1E4024',
  brandSoft: '#E4EDE3',
  brandTint: '#F0F5EE',
  lime: '#B9D36A',
  bg: '#F7F5EF',
  card: '#FFFFFF',
  text: '#18241B',
  textMuted: '#5F6E62',
  textFaint: '#94A096',
  border: '#E6E3DA',
  danger: '#D2433B',
  dangerSoft: '#FBE7E5',
  warn: '#D98E04',
  warnSoft: '#FCF1DA',
  ok: '#3E9B4F',
  okSoft: '#E3F2E5',
  expired: '#8E968F',
  expiredSoft: '#EDEEEC',
  white: '#FFFFFF',
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

export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 };
export const space = (n: number) => n * 4;

export const font = {
  family: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }),
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const },
};

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(24,36,27,0.06), 0 2px 8px rgba(24,36,27,0.05)' } as object,
  default: { shadowColor: '#18241B', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
});
