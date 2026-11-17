import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '../../../components/Sheet';
import { toast } from '../../../components/Toast';
import { Button, Card, ConfidenceTag, DateInput, Field, Muted, Screen, Stepper, TopBar } from '../../../components/ui';
import { SEED_LEARNED } from '../../../data/catalogue';
import { daysLeftLabel, formatShort, today as todayISO, daysBetween } from '../../../lib/dates';
import { computeExpiry } from '../../../lib/expiry';
import { formatRupees } from '../../../lib/impact';
import { guessCategory, isLikelyFood, matchProduct } from '../../../lib/match';
import { CATEGORY_EMOJI, itemEmoji, SHELF_LIFE_RULES } from '../../../lib/shelfLife';
import type { Category, OrderImportLine } from '../../../lib/types';
import { allProducts, useStore } from '../../../store/useStore';
import { colors, radius, space } from '../../../theme';

const PLATFORM_NAME: Record<string, string> = { blinkit: 'Blinkit', instamart: 'Instamart', zepto: 'Zepto', bigbasket: 'BigBasket', other: 'your order' };
const PICK_CATS: Category[] = ['milk', 'curd_yogurt', 'paneer', 'cheese', 'butter_ghee', 'cream', 'eggs', 'bread', 'batter', 'leafy_veg', 'vegetables', 'fruits', 'meat', 'fish', 'tofu', 'sauces_condiments', 'beverages', 'ready_to_eat', 'other'];

type Draft = { id?: string; name: string; qty: number; price: string; category: Category; printedExpiry?: string; matchedProductId?: string };

// M15 screen 1 — review: "12 items found from Blinkit"; untick, fix matches, add lines by hand.
export default function ReviewOrder() {
  const { id, manual } = useLocalSearchParams<{ id: string; manual?: string }>();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const allLines = useStore((s) => s.orderLines);
  const lines = useMemo(() => allLines.filter((l) => l.orderImportId === id), [allLines, id]);
  const products = useStore((s) => s.products);
  const city = useStore((s) => s.profile.city);
  const { updateOrderLine, addOrderLine, commitOrder } = useStore();
  const [draft, setDraft] = useState<Draft | null>(manual && !lines.length ? { name: '', qty: 1, price: '', category: 'other' } : null);
  const [showShot, setShowShot] = useState(!!manual);
  const all = useMemo(() => allProducts(products), [products]);
  const now = todayISO();

  if (!order) return null;

  const preview = (l: OrderImportLine) => {
    const p = l.matchedProductId ? all.find((x) => x.id === l.matchedProductId) : undefined;
    const cat = p?.category ?? l.categoryGuess;
    return {
      p,
      cat,
      exp: computeExpiry({ category: cat, productId: p?.id, purchasedAt: order.deliveredAt, printedExpiry: l.printedExpiry, location: 'fridge', platform: order.platform }, SHELF_LIFE_RULES, SEED_LEARNED, city),
    };
  };

  const included = lines.filter((l) => l.include);
  const food = lines.filter((l) => l.isFood);

  const saveDraft = () => {
    if (!draft || draft.name.trim().length < 2) return;
    const pricePaise = draft.price ? Math.round(Number(draft.price) * 100) : undefined;
    if (draft.id) {
      updateOrderLine(draft.id, {
        parsedName: draft.name.trim(),
        quantity: draft.qty,
        pricePaise,
        categoryGuess: draft.category,
        printedExpiry: draft.printedExpiry,
        matchedProductId: draft.matchedProductId,
      });
    } else {
      const m = matchProduct(draft.name, all);
      const isFood = isLikelyFood(draft.name);
      addOrderLine(order.id, {
        rawText: draft.name,
        parsedName: draft.name.trim(),
        quantity: draft.qty,
        pricePaise,
        matchedProductId: m.kind === 'auto' ? m.product?.id : undefined,
        matchScore: m.score,
        include: isFood,
        categoryGuess: m.kind === 'auto' && m.product ? m.product.category : draft.category,
        isFood,
        printedExpiry: draft.printedExpiry,
      });
    }
    setDraft(null);
  };

  const commit = () => {
    commitOrder(order.id);
    const added = useStore.getState().items.filter((i) => i.orderImportId === order.id && i.status === 'active');
    const toCheck = added.filter((i) => i.needsDateCheck);
    toast(`${added.length} items added to your fridge`);
    if (toCheck.length) router.replace(`/add/unpack/${order.id}`);
    else router.dismissTo('/');
  };

  const shot = order.imageUri ? { uri: order.imageUri } : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title={lines.length ? `${food.length} items found` : 'Add your items'}
        subtitle={`From ${PLATFORM_NAME[order.platform]} · delivered ${order.deliveredAt === now ? 'today' : formatShort(order.deliveredAt)}`}
        back
      />
      <Screen footer={<Button title={`Add ${included.length} to fridge`} icon="snow" disabled={!included.length} onPress={commit} />}>
        {shot ? (
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: space(4) }}>
            <Pressable onPress={() => setShowShot((v) => !v)} style={styles.shotHead}>
              <Ionicons name="image-outline" size={18} color={colors.brand} />
              <Text style={{ flex: 1, fontWeight: '700', color: colors.text }}>{showShot ? 'Hide screenshot' : 'Show screenshot'}</Text>
              <Ionicons name={showShot ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textFaint} />
            </Pressable>
            {showShot ? <Image source={shot} style={{ width: '100%', height: 420 }} contentFit="contain" /> : null}
          </Card>
        ) : null}

        {!lines.length ? (
          <Muted style={{ marginBottom: space(3) }}>Type each food item from your order. Prices are optional — they power the ₹ saved number.</Muted>
        ) : (
          <Muted style={{ marginBottom: space(3) }}>Dates are filled in from how long each item usually lasts. Untick anything that isn’t going in the fridge.</Muted>
        )}

        {lines.map((l) => {
          const { p, cat, exp } = preview(l);
          const d = daysBetween(now, exp.effectiveExpiry);
          const suggest = !l.matchedProductId && l.isFood ? matchProduct(l.parsedName, all) : undefined;
          return (
            <View key={l.id} style={[styles.line, !l.include && { opacity: 0.5 }]}>
              <Pressable hitSlop={8} onPress={() => updateOrderLine(l.id, { include: !l.include })}>
                <Ionicons name={l.include ? 'checkbox' : 'square-outline'} size={24} color={l.include ? colors.brand : colors.textFaint} />
              </Pressable>
              <Pressable
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                onPress={() => setDraft({ id: l.id, name: p?.name ?? l.parsedName, qty: l.quantity, price: l.pricePaise ? String(l.pricePaise / 100) : '', category: cat, printedExpiry: l.printedExpiry, matchedProductId: l.matchedProductId })}
              >
                <Text style={{ fontSize: 22 }}>{l.isFood ? itemEmoji(p?.name ?? l.parsedName, cat) : '🧴'}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.lineName} numberOfLines={1}>{p?.name ?? l.parsedName}</Text>
                  <Muted style={{ fontSize: 12 }} >
                    {l.quantity > 1 ? `${l.quantity} × ` : ''}{l.parsedPackSize ?? ''}{l.pricePaise ? ` · ${formatRupees(l.pricePaise)}` : ''}{!l.isFood ? ' · not food' : ''}
                  </Muted>
                  {suggest?.kind === 'suggest' && suggest.product ? (
                    <Pressable onPress={() => updateOrderLine(l.id, { matchedProductId: suggest.product!.id, categoryGuess: suggest.product!.category })}>
                      <Text style={{ color: colors.brand, fontSize: 12, fontWeight: '700', marginTop: 2 }}>Did you mean {suggest.product.name}?</Text>
                    </Pressable>
                  ) : null}
                </View>
                {l.isFood ? (
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: d <= 1 ? colors.danger : d <= 5 ? colors.warn : colors.ok }}>{daysLeftLabel(d)}</Text>
                    <ConfidenceTag confidence={exp.confidence} small />
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}

        <Button title="Add an item" icon="add" variant="secondary" style={{ marginTop: space(2) }} onPress={() => setDraft({ name: '', qty: 1, price: '', category: 'other' })} />
      </Screen>

      <Sheet visible={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Edit item' : 'Add an item'}>
        {draft ? (
          <View style={{ gap: space(3) }}>
            <Field label="Item" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name, category: draft.id ? draft.category : guessCategory(name), matchedProductId: draft.id ? draft.matchedProductId : undefined })} placeholder="e.g. Amul Taaza Milk 500 ml" autoFocus={!draft.id} />
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
              <View>
                <Text style={styles.label}>Qty</Text>
                <Stepper value={draft.qty} min={1} max={20} onChange={(qty) => setDraft({ ...draft, qty })} />
              </View>
              <Field label="Price ₹ (optional)" value={draft.price} onChangeText={(price) => setDraft({ ...draft, price: price.replace(/[^\d.]/g, '') })} keyboardType="numeric" placeholder="e.g. 29" style={{ flex: 1 }} />
            </View>
            <View>
              <Text style={styles.label}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {PICK_CATS.map((c) => (
                  <Pressable key={c} onPress={() => setDraft({ ...draft, category: c, matchedProductId: undefined })} style={[styles.catChip, draft.category === c && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
                    <Text style={{ fontSize: 12, color: draft.category === c ? '#fff' : colors.text }}>{CATEGORY_EMOJI[c]} {SHELF_LIFE_RULES[c].label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <DateInput value={draft.printedExpiry} onChange={(printedExpiry) => setDraft({ ...draft, printedExpiry })} label="Expiry (optional — we estimate if blank)" category={draft.category} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setDraft(null)} />
              <Button title={draft.id ? 'Save' : 'Add item'} style={{ flex: 1.5 }} disabled={draft.name.trim().length < 2} onPress={saveDraft} />
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  shotHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  lineName: { fontSize: 15, fontWeight: '600', color: colors.text },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
});

