import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, Muted, SectionTitle } from '../../components/ui';
import { formatShort, today as todayISO } from '../../lib/dates';
import { computeImpact, formatRupees, WASTE_TIPS } from '../../lib/impact';
import { CATEGORY_EMOJI, itemEmoji, SHELF_LIFE_RULES } from '../../lib/shelfLife';
import { useStore } from '../../store/useStore';
import { colors, font, radius, space } from '../../theme';

// Chart colours validated for colour-blind separation (dataviz validator, light surface).
const RESCUED = '#2F7D4A';
const WASTED = '#D9822B';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// M21 — this month's items rescued vs thrown out, rescued rate, ₹ saved and wasted.
export default function ImpactScreen() {
  const insets = useSafeAreaInsets();
  const events = useStore((s) => s.events);
  const now = todayISO();
  const month = now.slice(0, 7);
  const stats = useMemo(() => computeImpact(events, month), [events, month]);
  const [sel, setSel] = useState<number | null>(null);
  const recent = events.filter((e) => e.type === 'used_up' || e.type === 'discarded').slice(0, 6);
  const max = Math.max(1, ...stats.weekly.map((w) => Math.max(w.rescued, w.wasted)));
  const empty = stats.rescued + stats.wasted === 0 && stats.savedPaise === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(4), paddingBottom: 40 }}>
        <Text style={[font.h1, { color: colors.text }]}>Your impact</Text>
        <Muted style={{ marginTop: 4 }}>{MONTHS[Number(month.slice(5)) - 1]} so far</Muted>

        {empty ? (
          <EmptyState
            icon="🌱"
            title="Nothing tracked yet this month"
            body="Swipe items as used or thrown out and cook suggested meals — your rescued food and ₹ saved show up here."
            action={<Button title="Go to my fridge" variant="secondary" icon="snow-outline" onPress={() => router.navigate('/')} />}
          />
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Saved by eating it in time</Text>
              <Text style={styles.heroValue}>{formatRupees(stats.savedPaise)}</Text>
              <Text style={styles.heroSub}>{formatRupees(stats.wastedPaise)} went in the bin</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: space(3) }}>
              <Stat value={`${Math.round(stats.rescuedRate * 100)}%`} label="rescued rate" hint="target ≥ 80%" />
              <Stat value={String(stats.rescued)} label="items rescued" />
              <Stat value={String(stats.wasted)} label="thrown out" />
            </View>

            <SectionTitle>Rescued vs thrown out</SectionTitle>
            <Card>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                <Legend color={RESCUED} label="Rescued" />
                <Legend color={WASTED} label="Thrown out" />
              </View>
              <View style={styles.chart}>
                {[0.5, 1].map((g) => (
                  <View key={g} style={[styles.grid, { bottom: 22 + g * 120 }]} />
                ))}
                {stats.weekly.map((w, i) => (
                  <Pressable key={w.label} onPress={() => setSel(sel === i ? null : i)} style={styles.group} accessibilityLabel={`${w.label}: ${w.rescued} rescued, ${w.wasted} thrown out`}>
                    {sel === i ? (
                      <View style={styles.tip}>
                        <Text style={styles.tipText}>{w.rescued} rescued · {w.wasted} out</Text>
                      </View>
                    ) : null}
                    <View style={styles.bars}>
                      <Bar n={w.rescued} max={max} color={RESCUED} dim={sel !== null && sel !== i} />
                      <Bar n={w.wasted} max={max} color={WASTED} dim={sel !== null && sel !== i} />
                    </View>
                    <Text style={styles.axis}>{w.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Muted style={{ fontSize: 12, marginTop: 6 }}>Weeks of the month · tap a week for numbers</Muted>
            </Card>

            {stats.mostWasted ? (
              <>
                <SectionTitle>Most wasted</SectionTitle>
                <Card style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontSize: 30 }}>{CATEGORY_EMOJI[stats.mostWasted.category]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>
                      {SHELF_LIFE_RULES[stats.mostWasted.category].label} · {stats.mostWasted.count} thrown out
                    </Text>
                    <Muted style={{ marginTop: 4 }}>💡 {WASTE_TIPS[stats.mostWasted.category] ?? 'Keep the oldest packs at the front of the fridge.'}</Muted>
                  </View>
                </Card>
              </>
            ) : null}

            {recent.length ? (
              <>
                <SectionTitle>Recent</SectionTitle>
                <Card style={{ paddingVertical: 4 }}>
                  {recent.map((e, i) => (
                    <View key={e.id} style={[styles.recent, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                      <Text style={{ fontSize: 18 }}>{e.category ? itemEmoji(e.itemName ?? '', e.category) : '•'}</Text>
                      <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>{e.itemName}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: e.type === 'used_up' ? RESCUED : WASTED }}>
                        {e.type === 'used_up' ? 'Rescued' : 'Thrown out'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textFaint, width: 48, textAlign: 'right' }}>{formatShort(e.at.slice(0, 10))}</Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            <Pressable onPress={() => router.push('/meals')} style={{ marginTop: space(5) }}>
              <Text style={{ color: colors.brand, fontWeight: '700', textAlign: 'center' }}>Rescue more with today’s meals →</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
      {hint ? <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }}>{hint}</Text> : null}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

function Bar({ n, max, color, dim }: { n: number; max: number; color: string; dim: boolean }) {
  const h = n ? Math.max(4, (n / max) * 120) : 0;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'flex-end', height: 140, opacity: dim ? 0.35 : 1 }}>
      {n ? <Text style={styles.val}>{n}</Text> : null}
      <View style={{ width: 14, height: h, backgroundColor: color, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: space(4), backgroundColor: colors.brand, borderRadius: radius.lg, padding: space(5) },
  heroLabel: { color: '#CFE0CB', fontSize: 14, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  heroSub: { color: '#CFE0CB', fontSize: 14, marginTop: 2 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 170, position: 'relative' },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
  group: { alignItems: 'center', flex: 1 },
  bars: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  axis: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  val: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  tip: { position: 'absolute', top: -6, zIndex: 2, backgroundColor: colors.text, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
});
