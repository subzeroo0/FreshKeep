import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatQty } from '../../components/ItemRow';
import { Sheet } from '../../components/Sheet';
import { toast } from '../../components/Toast';
import { Button, Chip, DateInput, Display, EmptyState, Eyebrow, Footer, IconButton, Muted, SectionTitle, Stepper, TopBar } from '../../components/ui';
import { RECIPES } from '../../data/recipes';
import { daysLeftLabel, formatDate, today as todayISO } from '../../lib/dates';
import { confidenceExplanation, daysLeft, urgencyOf } from '../../lib/expiry';
import { buildFromRecipe, daysLeftMap, wordConflicts } from '../../lib/meals';
import { itemEmoji, SHELF_LIFE_RULES } from '../../lib/shelfLife';
import { useStore } from '../../store/useStore';
import { categoryColor, colors, confidenceColors, font, radius, shadow, space, urgencyColors } from '../../theme';

// M17 — item detail and actions.
export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const item = useStore((s) => s.items.find((i) => i.id === id));
  const items = useStore((s) => s.items);
  const profile = useStore((s) => s.profile);
  const { markOpened, useUp, discard, moveTo, setPrintedDate, updateItem, useSome } = useStore();
  const [dateSheet, setDateSheet] = useState(false);
  const [newDate, setNewDate] = useState<string | undefined>();
  const now = todayISO();

  const meals = useMemo(() => {
    if (!item) return [];
    const dl = daysLeftMap(items, now);
    const out: { id: string; title: string; time: number; slot: string }[] = [];
    for (const r of RECIPES) {
      if (r.id.startsWith('jain-') && profile.dietType !== 'jain') continue;
      const m = buildFromRecipe(r, items, dl, now, r.slots[0], profile);
      if (m && m.usesItems.some((u) => u.itemId === item.id) && !wordConflicts(m.title + ' ' + m.extraIngredients.join(' '), profile))
        out.push({ id: r.id, title: m.title, time: m.cookTimeMin, slot: r.slots[0] });
    }
    return out.slice(0, 6);
  }, [item, items, profile, now]);

  if (!item)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title="Item" back />
        <View style={{ paddingHorizontal: space(5) }}>
          <EmptyState icon="🤷" title="Item not found" body="It may have been removed." />
        </View>
      </View>
    );

  const rule = SHELF_LIFE_RULES[item.category];
  const d = daysLeft(item.effectiveExpiry, now);
  const u = urgencyColors[urgencyOf(d)];
  const conf = confidenceColors[item.confidence];
  const closed = item.status !== 'active';
  const heroColor = categoryColor[item.category];
  const daysBig = d < 0 ? 'Expired' : d === 0 ? 'Today' : `${d} day${d === 1 ? '' : 's'}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8) }}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: heroColor, paddingTop: insets.top + 8 }]}>
          <Text style={styles.watermark} numberOfLines={2}>{rule.label}</Text>
          <View style={styles.heroBar}>
            <IconButton icon="chevron-back" tone="glass" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
            {!closed ? <IconButton icon="calendar-outline" tone="glass" label="Enter the printed date" onPress={() => { setNewDate(item.printedExpiry); setDateSheet(true); }} /> : null}
          </View>
          <View style={styles.emojiPlate}>
            <Text style={{ fontSize: 84 }}>{itemEmoji(item.displayName, item.category)}</Text>
          </View>
        </View>

        {/* Body sheet */}
        <View style={styles.sheet}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow>{rule.label}{item.location !== 'fridge' ? ` · ${item.location}` : ''}</Eyebrow>
              <Display size="h1" style={{ marginTop: 4 }}>{item.displayName}</Display>
              <Muted style={{ marginTop: 4, fontSize: 14 }}>{formatQty(item)}{item.openedAt ? ' · Opened' : ''}</Muted>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Display size="h2" color={closed ? colors.expired : u.fg}>{closed ? (item.status === 'used' ? 'Used' : 'Binned') : daysBig}</Display>
              {!closed ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{d >= 0 ? 'left' : 'check before eating'}</Text> : null}
            </View>
          </View>

          {/* Info tiles */}
          <View style={styles.tiles}>
            <View style={styles.tile}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.dot, { backgroundColor: conf.fg }]} />
                <Text style={[styles.tileLabel, { color: conf.fg }]}>{conf.label}</Text>
              </View>
              <Text style={styles.tileValue}>{formatDate(item.effectiveExpiry)}</Text>
              <Text style={styles.tileSub}>use-by date</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Left in the pack</Text>
              <Text style={styles.tileValue}>{Math.round(item.remainingFraction * 100)}%</Text>
              <View style={styles.barBg}><View style={[styles.barFg, { width: `${Math.round(item.remainingFraction * 100)}%` }]} /></View>
            </View>
          </View>
          <Muted style={{ marginTop: space(3) }}>
            {confidenceExplanation(item, rule)}
            {item.openedAt && rule.openedDays ? ` Opened packs last about ${rule.openedDays} days, so the date moved up.` : ''}
          </Muted>

          {!closed ? (
            <>
              <SectionTitle>How much is left?</SectionTitle>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[1, 0.75, 0.5, 0.25].map((f) => (
                  <Chip
                    key={f}
                    label={f === 1 ? 'Full' : `${f * 100}%`}
                    selected={Math.abs(item.remainingFraction - f) < 0.01}
                    onPress={() => {
                      if (f < item.remainingFraction) useSome(item.id, item.remainingFraction - f);
                      else updateItem(item.id, { remainingFraction: f });
                    }}
                  />
                ))}
              </View>
              <View style={styles.qtyRow}>
                <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>Quantity ({item.unit})</Text>
                <Stepper value={item.quantity} dark min={1} max={5000} step={item.unit === 'g' || item.unit === 'ml' ? 50 : 1} onChange={(q) => updateItem(item.id, { quantity: q })} />
              </View>

              <SectionTitle>Actions</SectionTitle>
              <View style={styles.actions}>
                <Action icon="lock-open-outline" label={item.openedAt ? 'Opened' : 'Mark opened'} color={colors.lilac} disabled={!!item.openedAt} onPress={() => {
                  const before = d;
                  markOpened(item.id);
                  const after = useStore.getState().items.find((i) => i.id === item.id);
                  if (after) toast(`Opened — ${before} → ${daysLeft(after.effectiveExpiry, now)} day(s) left`);
                }} />
                <Action icon="calendar-outline" label="Enter date" color={colors.sky} onPress={() => { setNewDate(item.printedExpiry); setDateSheet(true); }} />
                <Action
                  icon="snow-outline"
                  label={item.location === 'freezer' ? 'To fridge' : 'Freeze'}
                  color={colors.mint}
                  disabled={item.location !== 'freezer' && rule.freezerDays == null}
                  onPress={() => moveTo(item.id, item.location === 'freezer' ? 'fridge' : 'freezer')}
                />
                <Action icon="trash-outline" label="Thrown out" color={colors.dangerSoft} iconColor={colors.danger} onPress={() => { discard(item.id); toast(`${item.displayName} thrown out`); router.back(); }} />
              </View>
              {item.location !== 'freezer' && rule.freezerDays == null ? <Muted style={{ marginTop: 8, fontSize: 12 }}>{rule.label} doesn’t freeze well.</Muted> : null}

              <SectionTitle>Dates</SectionTitle>
              <View style={styles.datesCard}>
                <DateRow label={item.source === 'order_import' ? 'Delivered' : 'Bought'} value={item.purchasedAt} />
                <DateRow label="Printed on pack" value={item.printedExpiry} />
                <DateRow label="Opened" value={item.openedAt} />
                <DateRow label="Use by" value={item.effectiveExpiry} bold last />
              </View>

              <SectionTitle>Meals that use this</SectionTitle>
              {meals.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(5) }} contentContainerStyle={{ gap: 10, paddingHorizontal: space(5) }}>
                  {meals.map((m, n) => (
                    <Pressable key={m.id} onPress={() => router.navigate('/meals')} style={[styles.mealCard, { backgroundColor: [colors.butter, colors.mint, colors.lilac, colors.peach][n % 4] }]}>
                      <Eyebrow color={colors.inkSoft}>{m.slot} · {m.time} min</Eyebrow>
                      <Text style={[font.section, { color: colors.ink, marginTop: 6 }]} numberOfLines={3}>{m.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Muted>No matching recipes for your diet yet.</Muted>
              )}
            </>
          ) : null}
          <Muted style={{ marginTop: space(7), fontSize: 12, textAlign: 'center' }}>Dates are guidance — always check before eating.</Muted>
        </View>
      </ScrollView>

      {!closed ? (
        <Footer>
          <Button title="Used up" icon="checkmark-circle" trailing={item.pricePaise ? `₹${Math.round((item.pricePaise * item.remainingFraction) / 100)} rescued` : undefined} onPress={() => { useUp(item.id); toast(`${item.displayName} used up 🎉`); router.back(); }} />
        </Footer>
      ) : null}

      <Sheet visible={dateSheet} onClose={() => setDateSheet(false)} title="Printed date">
        <DateInput value={newDate} onChange={setNewDate} category={item.category} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: space(5) }}>
          {item.printedExpiry ? (
            <Button title="Clear" variant="outline" style={{ flex: 1 }} onPress={() => { setPrintedDate(item.id, undefined); setDateSheet(false); }} />
          ) : null}
          <Button title="Save date" style={{ flex: 2 }} disabled={!newDate} onPress={() => {
            setPrintedDate(item.id, newDate);
            setDateSheet(false);
            toast('Date confirmed ✓');
          }} />
        </View>
      </Sheet>
    </View>
  );
}

function DateRow({ label, value, bold, last }: { label: string; value?: string; bold?: boolean; last?: boolean }) {
  return (
    <View style={[styles.dateRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ color: value ? colors.text : colors.textFaint, fontWeight: bold ? '800' : '600' }}>{value ? formatDate(value) : '—'}</Text>
    </View>
  );
}

function Action({ icon, label, onPress, disabled, color, iconColor = colors.ink }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean; color: string; iconColor?: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.action, disabled && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.96 }] }]}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.actionText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { height: 330, overflow: 'hidden', alignItems: 'center' },
  watermark: { position: 'absolute', top: 70, left: -6, right: -6, fontFamily: font.display, fontSize: 104, lineHeight: 100, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: space(5) },
  emojiPlate: { marginTop: space(4), width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -36, backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space(5), paddingTop: space(6) },
  tiles: { flexDirection: 'row', gap: 10, marginTop: space(5) },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(4), gap: 4, ...(shadow as object) },
  tileLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  tileValue: { fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  tileSub: { fontSize: 12, color: colors.textFaint },
  dot: { width: 8, height: 8, borderRadius: 4 },
  barBg: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: 4 },
  barFg: { height: 6, borderRadius: 3, backgroundColor: colors.limeDeep },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: space(4), backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(3), paddingLeft: space(5) },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', gap: 8, width: '24%' },
  actionIcon: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 12, fontWeight: '700', color: colors.text },
  datesCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space(5) },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  mealCard: { width: 170, height: 150, borderRadius: radius.lg, padding: space(4), justifyContent: 'space-between' },
});
