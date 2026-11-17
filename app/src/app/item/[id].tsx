import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatQty } from '../../components/ItemRow';
import { Sheet } from '../../components/Sheet';
import { toast } from '../../components/Toast';
import { Button, Card, Chip, ConfidenceTag, DateInput, EmptyState, Muted, Screen, SectionTitle, Stepper, TopBar } from '../../components/ui';
import { RECIPES } from '../../data/recipes';
import { daysLeftLabel, formatDate, today as todayISO } from '../../lib/dates';
import { confidenceExplanation, daysLeft, urgencyOf } from '../../lib/expiry';
import { buildFromRecipe, daysLeftMap, wordConflicts } from '../../lib/meals';
import { itemEmoji, SHELF_LIFE_RULES } from '../../lib/shelfLife';
import { useStore } from '../../store/useStore';
import { colors, font, radius, space, urgencyColors } from '../../theme';

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
    const out: { title: string; time: number; slot: string }[] = [];
    for (const r of RECIPES) {
      const m = buildFromRecipe(r, items, dl, now, r.slots[0], profile);
      if (m && m.usesItems.some((u) => u.itemId === item.id) && !wordConflicts(m.title + ' ' + m.extraIngredients.join(' '), profile))
        out.push({ title: m.title, time: m.cookTimeMin, slot: r.slots.join(' / ') });
    }
    return out.slice(0, 4);
  }, [item, items, profile, now]);

  if (!item)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title="Item" back />
        <EmptyState icon="🤷" title="Item not found" body="It may have been removed." />
      </View>
    );

  const rule = SHELF_LIFE_RULES[item.category];
  const d = daysLeft(item.effectiveExpiry, now);
  const u = urgencyColors[urgencyOf(d)];
  const closed = item.status !== 'active';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="" back />
      <Screen>
        <View style={{ alignItems: 'center', marginTop: -space(2) }}>
          <View style={[styles.hero, { backgroundColor: u.bg }]}>
            <Text style={{ fontSize: 52 }}>{itemEmoji(item.displayName, item.category)}</Text>
          </View>
          <Text style={[font.h2, { color: colors.text, textAlign: 'center', marginTop: space(3) }]}>{item.displayName}</Text>
          <Muted style={{ marginTop: 4 }}>{formatQty(item)} · {rule.label}{item.location !== 'fridge' ? ` · ${item.location}` : ''}</Muted>
          {closed ? (
            <View style={[styles.daysPill, { backgroundColor: colors.expiredSoft }]}>
              <Text style={[styles.daysText, { color: colors.expired }]}>{item.status === 'used' ? 'Used up' : 'Thrown out'}</Text>
            </View>
          ) : (
            <View style={[styles.daysPill, { backgroundColor: u.bg }]}>
              <Text style={[styles.daysText, { color: u.fg }]}>{daysLeftLabel(d)}</Text>
            </View>
          )}
        </View>

        <Card style={{ marginTop: space(5) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ConfidenceTag confidence={item.confidence} />
            <Text style={{ flex: 1, fontWeight: '700', color: colors.text }}>Use by {formatDate(item.effectiveExpiry)}</Text>
          </View>
          <Muted>{confidenceExplanation(item, rule)}</Muted>
          {item.openedAt && rule.openedDays ? <Muted style={{ marginTop: 6 }}>Opened packs last about {rule.openedDays} days, so the date moved up.</Muted> : null}
          <View style={styles.dates}>
            <DateRow label={item.source === 'order_import' ? 'Delivered' : 'Purchased'} value={item.purchasedAt} />
            <DateRow label="Printed" value={item.printedExpiry} />
            <DateRow label="Opened" value={item.openedAt} />
            <DateRow label="Effective" value={item.effectiveExpiry} bold />
          </View>
        </Card>

        {!closed ? (
          <>
            <SectionTitle>How much is left?</SectionTitle>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.barBg}>
                  <View style={[styles.barFg, { width: `${Math.round(item.remainingFraction * 100)}%` }]} />
                </View>
                <Text style={{ fontWeight: '700', color: colors.text, width: 44, textAlign: 'right' }}>{Math.round(item.remainingFraction * 100)}%</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {[1, 0.75, 0.5, 0.25].map((f) => (
                  <Chip
                    key={f}
                    label={`${f * 100}%`}
                    selected={Math.abs(item.remainingFraction - f) < 0.01}
                    onPress={() => {
                      if (f < item.remainingFraction) useSome(item.id, item.remainingFraction - f);
                      else updateItem(item.id, { remainingFraction: f });
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <Muted>Quantity ({item.unit})</Muted>
                <Stepper value={item.quantity} min={1} max={5000} step={item.unit === 'g' || item.unit === 'ml' ? 50 : 1} onChange={(q) => updateItem(item.id, { quantity: q })} />
              </View>
            </Card>

            <SectionTitle>Actions</SectionTitle>
            <View style={styles.grid}>
              <ActionTile icon="lock-open-outline" label={item.openedAt ? 'Opened' : 'Mark opened'} disabled={!!item.openedAt} onPress={() => {
                const before = d;
                markOpened(item.id);
                const after = useStore.getState().items.find((i) => i.id === item.id);
                if (after) toast(`Opened — ${before} → ${daysLeft(after.effectiveExpiry, now)} day(s) left`);
              }} />
              <ActionTile icon="calendar-outline" label="Enter date" onPress={() => { setNewDate(item.printedExpiry); setDateSheet(true); }} />
              <ActionTile
                icon="snow-outline"
                label={item.location === 'freezer' ? 'Move to fridge' : 'Move to freezer'}
                disabled={item.location !== 'freezer' && rule.freezerDays == null}
                onPress={() => moveTo(item.id, item.location === 'freezer' ? 'fridge' : 'freezer')}
              />
            </View>
            {item.location !== 'freezer' && rule.freezerDays == null ? <Muted style={{ marginTop: 6, fontSize: 12 }}>{rule.label} doesn’t freeze well.</Muted> : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: space(4) }}>
              <Button title="Used up" icon="checkmark-circle" style={{ flex: 1 }} onPress={() => { useUp(item.id); toast(`${item.displayName} used up 🎉`); router.back(); }} />
              <Button title="Thrown out" icon="trash-outline" variant="danger" style={{ flex: 1 }} onPress={() => { discard(item.id); toast(`${item.displayName} thrown out`); router.back(); }} />
            </View>

            <SectionTitle>Meals that use this</SectionTitle>
            {meals.length ? (
              meals.map((m) => (
                <Card key={m.title} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => router.push('/meals')}>
                  <Text style={{ fontSize: 22 }}>🍽️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{m.title}</Text>
                    <Muted>{m.time} min · {m.slot}</Muted>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </Card>
              ))
            ) : (
              <Muted>No matching recipes for your diet yet.</Muted>
            )}
          </>
        ) : null}
        <Muted style={{ marginTop: space(6), fontSize: 12, textAlign: 'center' }}>Dates are guidance — always check before eating.</Muted>
      </Screen>

      <Sheet visible={dateSheet} onClose={() => setDateSheet(false)} title="Enter the printed date">
        <DateInput value={newDate} onChange={setNewDate} category={item.category} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: space(4) }}>
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

function DateRow({ label, value, bold }: { label: string; value?: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ color: value ? colors.text : colors.textFaint, fontWeight: bold ? '700' : '500' }}>{value ? formatDate(value) : '—'}</Text>
    </View>
  );
}

function ActionTile({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.tile, disabled && { opacity: 0.45 }, pressed && { backgroundColor: colors.brandTint }]}>
      <Ionicons name={icon} size={24} color={colors.brand} />
      <Text style={styles.tileText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  daysPill: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  daysText: { fontWeight: '800', fontSize: 15 },
  dates: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  barBg: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' },
  barFg: { height: 10, borderRadius: 5, backgroundColor: colors.brand },
  grid: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileText: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
