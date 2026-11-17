import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useMemo, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDays, formatDate, today as todayISO } from '../lib/dates';
import { parseDate } from '../lib/dateParser';
import { takePhoto, type PhotoSource } from '../lib/photos';
import { readDateFromPhoto, type DateRead } from '../lib/readDate';
import type { Category, ExpiryConfidence } from '../lib/types';
import { useStore } from '../store/useStore';
import { colors, confidenceColors, font, radius, shadow, space } from '../theme';

export type IconName = keyof typeof Ionicons.glyphMap;

// ---------- layout ----------

export function Screen({ children, scroll = true, padded = true, style, footer }: {
  children: ReactNode; scroll?: boolean; padded?: boolean; style?: StyleProp<ViewStyle>; footer?: ReactNode;
}) {
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padded && { paddingHorizontal: space(5), paddingTop: space(2) }, { paddingBottom: space(footer ? 8 : 28) }, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { paddingHorizontal: space(5) }, style]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {body}
      {footer ? <Footer>{footer}</Footer> : null}
    </View>
  );
}

/** Sticky bottom action area, floating over the content like the reference designs. */
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>{children}</View>;
}

export function IconButton({ icon, onPress, tone = 'light', size = 44, label, badge }: {
  icon: IconName; onPress?: () => void; tone?: 'light' | 'dark' | 'lime' | 'glass'; size?: number; label?: string; badge?: boolean;
}) {
  const bg = { light: colors.surface, dark: colors.ink, lime: colors.lime, glass: 'rgba(255,255,255,0.55)' }[tone];
  const fg = tone === 'dark' ? colors.white : colors.ink;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        tone === 'light' && shadow,
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={fg} />
      {badge ? <View style={styles.badgeDot} /> : null}
    </Pressable>
  );
}

/** Sub-screen header: round back button, centred title (like "Bakery" in the references). */
export function TopBar({ title, subtitle, right, back, tone = 'bg' }: {
  title: string; subtitle?: string; right?: ReactNode; back?: boolean; tone?: 'bg' | 'transparent';
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topbar, { paddingTop: insets.top + 8 }, tone === 'bg' && { backgroundColor: colors.bg }]}>
      <View style={styles.topSide}>
        {back ? <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.topSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.topSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/** Big condensed display heading. */
export function Display({ children, size = 'h1', color = colors.text, style, numberOfLines }: {
  children: ReactNode; size?: 'hero' | 'h1' | 'h2' | 'section'; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  return <Text numberOfLines={numberOfLines} style={[font[size], { color }, style]}>{children}</Text>;
}

export function Eyebrow({ children, color = colors.textMuted, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[font.eyebrow, { color }, style]}>{children}</Text>;
}

// ---------- controls ----------

type BtnVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, style, small, trailing }: {
  title: string; onPress?: () => void; variant?: BtnVariant; icon?: IconName; disabled?: boolean; loading?: boolean;
  style?: StyleProp<ViewStyle>; small?: boolean; trailing?: string;
}) {
  const v = {
    primary: { bg: colors.lime, fg: colors.ink, border: colors.lime },
    dark: { bg: colors.ink, fg: colors.white, border: colors.ink },
    secondary: { bg: colors.brandSoft, fg: colors.brandDark, border: colors.brandSoft },
    ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
    outline: { bg: colors.surface, fg: colors.text, border: colors.border },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.4 : 1 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 19} color={v.fg} /> : null}
      <Text style={[styles.btnText, small && { fontSize: 14 }, { color: v.fg }]} numberOfLines={1}>
        {title}
        {trailing ? <Text style={{ fontWeight: '600', opacity: 0.75 }}>{`  ·  ${trailing}`}</Text> : null}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, style, tone, iconBg }: {
  label: string; selected?: boolean; onPress?: () => void; icon?: string; style?: StyleProp<ViewStyle>; tone?: 'default' | 'danger'; iconBg?: string;
}) {
  const selBg = tone === 'danger' ? colors.danger : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        icon && iconBg ? { paddingLeft: 5 } : null,
        selected && { backgroundColor: selBg, borderColor: selBg },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {icon ? (
        iconBg ? (
          <View style={[styles.chipIcon, { backgroundColor: iconBg }]}><Text style={{ fontSize: 15 }}>{icon}</Text></View>
        ) : (
          <Text style={{ fontSize: 15 }}>{icon}</Text>
        )
      ) : null}
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

/** Segmented control (Delivery / Pickup style). */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segmentItem, sel && styles.segmentSel]} accessibilityRole="tab" accessibilityState={{ selected: sel }}>
            <Text style={[styles.segmentText, sel && { color: colors.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, shadow, pressed && { transform: [{ scale: 0.99 }] }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[styles.card, shadow, style]}>{children}</View>;
}

export function SectionTitle({ children, right, style, count }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle>; count?: number }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', marginTop: space(7), marginBottom: space(3), gap: 8 }, style]}>
      <Text style={[font.section, { color: colors.text }]}>{children}</Text>
      {count != null ? <View style={styles.countPill}><Text style={styles.countText}>{count}</Text></View> : null}
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[font.small, { color: colors.textMuted, lineHeight: 19 }, style]}>{children}</Text>;
}

export function ConfidenceTag({ confidence, small }: { confidence: ExpiryConfidence; small?: boolean }) {
  const c = confidenceColors[confidence];
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }, small && { paddingHorizontal: 7, paddingVertical: 2 }]}>
      <Text style={[styles.tagText, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

export function Pill({ label, fg, bg, icon }: { label: string; fg: string; bg: string; icon?: IconName }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.tagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, suffix, dark }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; suffix?: string; dark?: boolean;
}) {
  const btn = [styles.stepBtn, dark ? { backgroundColor: colors.ink } : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }];
  const ic = dark ? colors.white : colors.ink;
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={8} accessibilityLabel="Less" onPress={() => onChange(Math.max(min, value - step))} style={btn}>
        <Ionicons name="remove" size={18} color={ic} />
      </Pressable>
      <Text style={styles.stepVal}>{value}{suffix ? ` ${suffix}` : ''}</Text>
      <Pressable hitSlop={8} accessibilityLabel="More" onPress={() => onChange(Math.min(max, value + step))} style={btn}>
        <Ionicons name="add" size={18} color={ic} />
      </Pressable>
    </View>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, autoFocus, style, icon }: {
  label?: string; value: string; onChangeText: (s: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'number-pad'; autoFocus?: boolean; style?: StyleProp<ViewStyle>; icon?: IconName;
}) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textFaint} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          style={styles.inputText}
        />
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, body, action, color = colors.mint }: { icon: string; title: string; body: string; action?: ReactNode; color?: string }) {
  return (
    <View style={[styles.empty, { backgroundColor: color }]}>
      <Text style={{ fontSize: 56 }}>{icon}</Text>
      <Display size="h2" style={{ textAlign: 'center', marginTop: space(3) }}>{title}</Display>
      <Text style={{ textAlign: 'center', marginTop: space(2), color: colors.inkSoft, fontSize: 15, lineHeight: 21 }}>{body}</Text>
      {action ? <View style={{ marginTop: space(6), alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

// ---------- date entry ----------

/**
 * Expiry entry: Scan date (camera, when the AI server is connected), or type any printed
 * format the parser understands, or tap a quick chip.
 */
export function DateInput({ value, onChange, label = 'Expiry date (as printed on the pack)', category }: {
  value?: string; onChange: (iso: string | undefined) => void; label?: string; category?: Category;
}) {
  const [text, setText] = useState('');
  const apiUrl = useStore((s) => s.apiUrl);
  const [scan, setScan] = useState<{ busy?: boolean; read?: DateRead; error?: string }>({});
  const scanDate = async (source: PhotoSource) => {
    try {
      const photo = await takePhoto(source);
      if (!photo) return;
      setScan({ busy: true });
      const read = await readDateFromPhoto(photo, category);
      setScan({ read });
      setText('');
      if (read.isoDate && !read.unsure) onChange(read.isoDate);
    } catch (e) {
      setScan({ error: e instanceof Error ? e.message : 'Couldn’t read the date' });
    }
  };
  const parsed = useMemo(() => (text.trim() ? parseDate(text) : undefined), [text]);
  const now = todayISO();
  const quick = [
    { label: 'Today', d: 0 }, { label: 'Tomorrow', d: 1 }, { label: '+3 days', d: 3 },
    { label: '+1 week', d: 7 }, { label: '+2 weeks', d: 14 }, { label: '+1 month', d: 30 },
  ];
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {apiUrl ? (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Button small variant="dark" title="Scan date" icon="camera-outline" loading={scan.busy} onPress={() => scanDate('camera')} style={{ flex: 1 }} />
          <Button small title="From photo" icon="image-outline" variant="outline" disabled={scan.busy} onPress={() => scanDate('library')} style={{ flex: 1 }} />
        </View>
      ) : null}
      {scan.read ? (
        <View style={[styles.parsedRow, { marginTop: 0, marginBottom: 10 }, (scan.read.unsure || !scan.read.isoDate) && { backgroundColor: colors.warnSoft }]}>
          <Ionicons name={scan.read.isoDate && !scan.read.unsure ? 'checkmark-circle' : 'alert-circle'} size={18} color={scan.read.isoDate && !scan.read.unsure ? colors.ok : colors.warn} />
          <Text style={{ flex: 1, color: colors.text }}>
            <Text style={{ fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) }}>“{scan.read.rawText}”</Text>
            {scan.read.isoDate ? <Text> → <Text style={{ fontWeight: '700' }}>{formatDate(scan.read.isoDate)}</Text></Text> : null}
            {scan.read.unsure ? `  · ${scan.read.reason ?? 'please check'}` : ''}
          </Text>
          {scan.read.isoDate && scan.read.unsure ? (
            <Pressable onPress={() => onChange(scan.read!.isoDate)}>
              <Text style={{ color: colors.brand, fontWeight: '700' }}>Use it</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {scan.error ? <Muted style={{ color: colors.danger, marginBottom: 8 }}>{scan.error}</Muted> : null}
      <View style={styles.inputWrap}>
        <Ionicons name="calendar-outline" size={18} color={colors.textFaint} />
        <TextInput
          value={text}
          onChangeText={(s) => {
            setText(s);
            const p = s.trim() ? parseDate(s) : undefined;
            if (p?.isoDate && !p.unsure) onChange(p.isoDate);
          }}
          placeholder="Type it: 12/03/27, 12 Mar 2027, EXP 03/27"
          placeholderTextColor={colors.textFaint}
          style={styles.inputText}
          autoCapitalize="none"
        />
      </View>
      {parsed ? (
        parsed.isoDate ? (
          <View style={[styles.parsedRow, parsed.unsure && { backgroundColor: colors.warnSoft }]}>
            <Ionicons name={parsed.unsure ? 'alert-circle' : 'checkmark-circle'} size={18} color={parsed.unsure ? colors.warn : colors.ok} />
            <Text style={{ flex: 1, color: colors.text }}>
              {parsed.matchedText ? `"${parsed.matchedText}" → ` : ''}<Text style={{ fontWeight: '700' }}>{formatDate(parsed.isoDate)}</Text>
              {parsed.unsure ? `  · ${parsed.reason}` : ''}
            </Text>
            {parsed.unsure ? (
              <Pressable onPress={() => onChange(parsed.isoDate)}>
                <Text style={{ color: colors.brand, fontWeight: '700' }}>Use anyway</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Muted style={{ marginTop: 6 }}>Couldn’t read a date yet — try DD/MM/YY.</Muted>
        )
      ) : null}
      <View style={styles.chipWrap}>
        {quick.map((q) => {
          const iso = addDays(now, q.d);
          return (
            <Chip
              key={q.label}
              label={q.label}
              selected={value === iso}
              onPress={() => {
                setText('');
                onChange(value === iso ? undefined : iso);
              }}
            />
          );
        })}
      </View>
      {value ? (
        <View style={styles.selectedDate}>
          <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
          <Text style={{ color: colors.text }}>Use by <Text style={{ fontWeight: '800' }}>{formatDate(value)}</Text></Text>
        </View>
      ) : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: space(5),
    paddingTop: space(3),
    backgroundColor: colors.bg,
    gap: space(2),
  },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(5), paddingBottom: space(3), gap: 8 },
  topSide: { width: 52 },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  topSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  badgeDot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.surface },
  btn: {
    minHeight: 56,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: space(6),
    borderWidth: 1,
  },
  btnSmall: { minHeight: 42, paddingHorizontal: space(4) },
  btnText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space(3) },
  segment: { flexDirection: 'row', backgroundColor: colors.brandSoft, borderRadius: radius.pill, padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.pill },
  segmentSel: { backgroundColor: colors.surface, ...(shadow as object) },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(5) },
  countPill: { backgroundColor: colors.ink, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, minWidth: 24, alignItems: 'center' },
  countText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  stepVal: { minWidth: 48, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.text },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
  },
  inputText: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text, ...((Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object) },
  parsedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.okSoft },
  selectedDate: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.limeSoft },
  empty: { alignItems: 'center', paddingVertical: space(10), paddingHorizontal: space(6), borderRadius: radius.xl, marginTop: space(4) },
});
