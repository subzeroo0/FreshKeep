import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Display, EmptyState, Eyebrow, Muted, SectionTitle } from '../../components/ui';
import { formatShort, today as todayISO } from '../../lib/dates';
import { computeImpact, formatRupees, WASTE_TIPS } from '../../lib/impact';
import { CATEGORY_EMOJI, itemEmoji, SHELF_LIFE_RULES } from '../../lib/shelfLife';
import { useStore } from '../../store/useStore';
import { colors, font, radius, shadow, space, TAB_BAR_SPACE } from '../../theme';

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
  const rate = Math.round(stats.rescuedRate * 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: space(5), paddingBottom: TAB_BAR_SPACE }} showsVerticalScrollIndicator={false}>
        <Eyebrow>{MONTHS[Number(month.slice(5)) - 1]} so far</Eyebrow>
        <Display size="h1">Your impact</Display>

        {empty ? (
          <EmptyState
            icon="🌱"
            color={colors.mint}
            title="Nothing tracked yet"
            body="Swipe items as used or thrown out and cook suggested meals. Your rescued food and ₹ saved show up here."
            action={<Button title="Go to my fridge" variant="dark" icon="snow-outline" onPress={() => router.navigate('/')} />}
          />
        ) : (
          <>
            <View style={styles.hero}>
              <Eyebrow color={colors.textOnDarkMuted}>Saved by eating it in time</Eyebrow>
              <Text style={styles.heroValue}>{formatRupees(stats.savedPaise)}</Text>
              <View style={styles.heroRow}>
                <View style={styles.heroPill}>
                  <View style={[styles.dot, { backgroundColor: WASTED }]} />
                  <Text style={styles.heroPillText}>{formatRupees(stats.wastedPaise)} went in the bin</Text>
                </View>
              </View>
            </View>

            <View style={styles.tiles}>
              <View style={[styles.tile, { backgroundColor: colors.lime }]}>
                <Text style={styles.tileValue}>{rate}%</Text>
                <Text style={styles.tileLabel}>rescued{'\n'}rate</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: colors.mint }]}>
                <Text style={styles.tileValue}>{stats.rescued}</Text>
                <Text style={styles.tileLabel}>items{'\n'}rescued</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: colors.peach }]}>
                <Text style={styles.tileValue}>{stats.wasted}</Text>
                <Text style={styles.tileLabel}>thrown{'\n'}out</Text>
              </View>
            </View>
            <Muted style={{ marginTop: 8, fontSize: 12 }}>Goal: rescue at least 80% of what you buy.</Muted>

            <SectionTitle>Week by week</SectionTitle>
            <View style={[styles.card, shadow]}>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14 }}>
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
              <Muted style={{ fontSize: 12, marginTop: 6 }}>Tap a week to see its numbers</Muted>
            </View>

            {stats.mostWasted ? (
              <>
                <SectionTitle>Most wasted</SectionTitle>
                <View style={[styles.card, { backgroundColor: colors.peach, flexDirection: 'row', gap: 14 }]}>
                  <View style={styles.wasteIcon}><Text style={{ fontSize: 30 }}>{CATEGORY_EMOJI[stats.mostWasted.category]}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[font.section, { color: colors.ink }]}>{SHELF_LIFE_RULES[stats.mostWasted.category].label}</Text>
                    <Text style={{ color: colors.inkSoft, fontWeight: '700', marginTop: 2 }}>{stats.mostWasted.count} thrown out this month</Text>
                    <Text style={{ color: colors.inkSoft, marginTop: 8, lineHeight: 19 }}>💡 {WASTE_TIPS[stats.mostWasted.category] ?? 'Keep the oldest packs at the front of the fridge.'}</Text>
                  </View>
                </View>
              </>
            ) : null}

            {recent.length ? (
              <>
                <SectionTitle>Recent</SectionTitle>
                {recent.map((e) => (
                  <View key={e.id} style={styles.recent}>
                    <Text style={{ fontSize: 22 }}>{e.category ? itemEmoji(e.itemName ?? '', e.category) : '•'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{e.itemName}</Text>
                      <Text style={{ fontSize: 12, color: colors.textFaint }}>{formatShort(e.at.slice(0, 10))}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: e.type === 'used_up' ? colors.okSoft : '#FBE9D9' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: e.type === 'used_up' ? RESCUED : '#A85D12' }}>{e.type === 'used_up' ? 'Rescued' : 'Thrown out'}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
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
      <View style={{ width: 16, height: h, backgroundColor: color, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: space(5), backgroundColor: colors.ink, borderRadius: radius.xl, padding: space(6) },
  heroValue: { fontFamily: font.display, fontSize: 76, lineHeight: 84, color: colors.lime, marginTop: 4 },
  heroRow: { flexDirection: 'row', marginTop: space(2) },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  heroPillText: { color: colors.textOnDark, fontWeight: '600', fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tiles: { flexDirection: 'row', gap: 8, marginTop: space(3) },
  tile: { flex: 1, borderRadius: radius.lg, padding: space(4), minHeight: 108, justifyContent: 'space-between' },
  tileValue: { fontFamily: font.display, fontSize: 36, lineHeight: 40, color: colors.ink },
  tileLabel: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space(5) },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 170, position: 'relative' },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
  group: { alignItems: 'center', flex: 1 },
  bars: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  axis: { fontSize: 12, color: colors.textMuted, marginTop: 6, fontWeight: '600' },
  val: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  tip: { position: 'absolute', top: -6, zIndex: 2, backgroundColor: colors.ink, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  wasteIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
