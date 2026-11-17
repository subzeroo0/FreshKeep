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

export function Screen({ children, scroll = true, padded = true, style, footer }: {
  children: ReactNode; scroll?: boolean; padded?: boolean; style?: StyleProp<ViewStyle>; footer?: ReactNode;
}) {
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[padded && { padding: space(4) }, { paddingBottom: space(footer ? 6 : 28) }, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { padding: space(4) }, style]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {body}
      {footer ? <Footer>{footer}</Footer> : null}
    </View>
  );
}

export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{children}</View>;
}

export function TopBar({ title, subtitle, right, back }: { title: string; subtitle?: string; right?: ReactNode; back?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topbar, { paddingTop: insets.top + 10 }]}>
      {back ? (
        <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[font.h2, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[font.small, { color: colors.textMuted, marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, style, small }: {
  title: string; onPress?: () => void; variant?: BtnVariant; icon?: IconName; disabled?: boolean; loading?: boolean;
  style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const v = {
    primary: { bg: colors.brand, fg: colors.white, border: colors.brand },
    secondary: { bg: colors.brandSoft, fg: colors.brand, border: colors.brandSoft },
    ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
    outline: { bg: colors.card, fg: colors.text, border: colors.border },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 19} color={v.fg} /> : null}
      <Text style={[styles.btnText, small && { fontSize: 14 }, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, style, tone }: {
  label: string; selected?: boolean; onPress?: () => void; icon?: string; style?: StyleProp<ViewStyle>; tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: tone === 'danger' ? colors.danger : colors.brand, borderColor: tone === 'danger' ? colors.danger : colors.brand },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {icon ? <Text style={{ fontSize: 15 }}>{icon}</Text> : null}
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, shadow, pressed && { opacity: 0.92 }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[styles.card, shadow, style]}>{children}</View>;
}

export function SectionTitle({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', marginTop: space(5), marginBottom: space(2) }, style]}>
      <Text style={[font.h3, { color: colors.text, flex: 1 }]}>{children}</Text>
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
    <View style={[styles.tag, { backgroundColor: c.bg }, small && { paddingHorizontal: 6, paddingVertical: 1 }]}>
      <Text style={[styles.tagText, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

export function Pill({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, suffix }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={8} onPress={() => onChange(Math.max(min, value - step))} style={styles.stepBtn}>
        <Ionicons name="remove" size={20} color={colors.brand} />
      </Pressable>
      <Text style={styles.stepVal}>{value}{suffix ? ` ${suffix}` : ''}</Text>
      <Pressable hitSlop={8} onPress={() => onChange(Math.min(max, value + step))} style={styles.stepBtn}>
        <Ionicons name="add" size={20} color={colors.brand} />
      </Pressable>
    </View>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, autoFocus, style }: {
  label?: string; value: string; onChangeText: (s: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'number-pad'; autoFocus?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        style={styles.input}
      />
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space(10), paddingHorizontal: space(6) }}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Text style={[font.h3, { color: colors.text, marginTop: space(3), textAlign: 'center' }]}>{title}</Text>
      <Muted style={{ textAlign: 'center', marginTop: space(1) }}>{body}</Muted>
      {action ? <View style={{ marginTop: space(5), alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

/**
 * Manual expiry entry (or Scan date when the AI server is connected).
 * Accepts any printed format the parser understands, plus quick chips.
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
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <Button small title="Scan date" icon="camera-outline" loading={scan.busy} onPress={() => scanDate('camera')} style={{ flex: 1 }} />
          <Button small title="From photo" icon="image-outline" variant="secondary" disabled={scan.busy} onPress={() => scanDate('library')} style={{ flex: 1 }} />
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
      <TextInput
        value={text}
        onChangeText={(s) => {
          setText(s);
          const p = s.trim() ? parseDate(s) : undefined;
          if (p?.isoDate && !p.unsure) onChange(p.isoDate);
        }}
        placeholder="e.g. 12/03/27, 12 Mar 2027, EXP 03/27"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        autoCapitalize="none"
      />
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
      {value ? <Muted style={{ marginTop: 6 }}>Selected: <Text style={{ fontWeight: '700', color: colors.text }}>{formatDate(value)}</Text></Muted> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: space(4),
    paddingTop: space(3),
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: space(2),
  },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingBottom: space(3), backgroundColor: colors.bg, gap: 8 },
  backBtn: { marginLeft: -6, marginRight: 2, padding: 2 },
  btn: {
    minHeight: 52,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: space(5),
    borderWidth: 1,
  },
  btnSmall: { minHeight: 40, paddingHorizontal: space(3), borderRadius: radius.sm },
  btnText: { fontSize: 16, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space(3) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4) },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepVal: { minWidth: 56, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
  },
  parsedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 10, borderRadius: radius.sm, backgroundColor: colors.okSoft },
});
