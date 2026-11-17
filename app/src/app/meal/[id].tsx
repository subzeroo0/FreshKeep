import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '../../components/Toast';
import { Button, Display, EmptyState, Eyebrow, Footer, IconButton, Muted, SectionTitle, TopBar } from '../../components/ui';
import { daysBetween, daysLeftLabel, today as todayISO } from '../../lib/dates';
import { formatRupees } from '../../lib/impact';
import { mealEmoji } from '../../lib/mealEmoji';
import { itemEmoji } from '../../lib/shelfLife';
import { getMeal } from '../../lib/useMeals';
import { useStore } from '../../store/useStore';
import { categoryColor, colors, font, radius, shadow, space } from '../../theme';

const EQUIP: Record<string, string> = { stove: 'Stove', pressure_cooker: 'Pressure cooker', microwave: 'Microwave', oven: 'Oven', air_fryer: 'Air fryer', mixer_grinder: 'Mixer' };
const SLOT_COLOR: Record<string, string> = { breakfast: colors.butter, lunch: colors.mint, dinner: colors.lilac };

// M19 — meal detail and "I cooked this" (auto-deducts what it used).
export default function MealDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const meal = getMeal(id);
  const items = useStore((s) => s.items);
  const status = useStore((s) => s.mealStatus[id]);
  const cookMeal = useStore((s) => s.cookMeal);
  const now = todayISO();

  if (!meal)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title="Meal" back />
        <View style={{ paddingHorizontal: space(5) }}>
          <EmptyState icon="🍽️" title="Ideas have refreshed" body="Open Meals to see today’s ideas." action={<Button title="Go to Meals" variant="dark" onPress={() => router.replace('/meals')} />} />
        </View>
      </View>
    );

  const cooked = status === 'cooked';
  const staples = meal.extraIngredients.filter((e) => e.endsWith('(staple)')).map((e) => e.replace(' (staple)', ''));
  const toBuy = meal.extraIngredients.filter((e) => !e.endsWith('(staple)'));
  const value = meal.usesItems.reduce((sum, u) => {
    const it = items.find((i) => i.id === u.itemId);
    return sum + (it?.pricePaise ?? 0) * u.fraction;
  }, 0);
  const color = SLOT_COLOR[meal.slot] ?? colors.mint;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8) }}>
        <View style={[styles.hero, { backgroundColor: color, paddingTop: insets.top + 8 }]}>
          <Text style={styles.watermark} numberOfLines={1}>{meal.slot}</Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: space(5) }}>
            <IconButton icon="chevron-back" tone="glass" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/meals'))} />
          </View>
          <View style={styles.plate}><Text style={{ fontSize: 92 }}>{mealEmoji(meal.title)}</Text></View>
        </View>

        <View style={styles.sheet}>
          <Eyebrow>{meal.slot} · serves {meal.servings}</Eyebrow>
          <Display size="h1" style={{ marginTop: 4 }}>{meal.title}</Display>
          <Muted style={{ marginTop: 8, fontSize: 15, lineHeight: 22 }}>{meal.description}</Muted>

          <View style={styles.tiles}>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{meal.cookTimeMin} min</Text>
              <Text style={styles.tileLabel}>Cooking time</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{meal.usesItems.length}</Text>
              <Text style={styles.tileLabel}>From your fridge</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{value ? formatRupees(value) : '—'}</Text>
              <Text style={styles.tileLabel}>Food rescued</Text>
            </View>
          </View>
          {meal.equipmentNeeded.length ? <Muted style={{ marginTop: space(3) }}>You’ll need: {meal.equipmentNeeded.map((e) => EQUIP[e] ?? e).join(', ')}</Muted> : null}

          <SectionTitle count={meal.usesItems.length}>From your fridge</SectionTitle>
          {meal.usesItems.map((u) => {
            const it = items.find((x) => x.id === u.itemId);
            const d = it ? daysBetween(now, it.effectiveExpiry) : undefined;
            return (
              <View key={u.itemId} style={styles.ing}>
                <View style={[styles.ingIcon, { backgroundColor: it ? categoryColor[it.category] : colors.sage }]}>
                  <Text style={{ fontSize: 22 }}>{it ? itemEmoji(it.displayName, it.category) : '🥄'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{u.name}</Text>
                  <Muted style={{ fontSize: 12 }}>{u.amount}{u.fraction < 1 ? ` · ${Math.round(u.fraction * 100)}% of the pack` : ' · all of it'}</Muted>
                </View>
                {d !== undefined && it?.status === 'active' ? (
                  <View style={[styles.days, { backgroundColor: d <= 1 ? colors.dangerSoft : d <= 5 ? colors.warnSoft : colors.okSoft }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: d <= 1 ? colors.danger : d <= 5 ? colors.warn : colors.ok }}>{daysLeftLabel(d)}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {toBuy.length || staples.length ? <SectionTitle>Also needed</SectionTitle> : null}
          {toBuy.length ? (
            <View style={styles.tagWrap}>
              {toBuy.map((t) => <View key={t} style={[styles.tag, { backgroundColor: colors.warnSoft }]}><Text style={styles.tagText}>🛒 {t}</Text></View>)}
            </View>
          ) : null}
          {staples.length ? (
            <View style={[styles.tagWrap, { marginTop: 8 }]}>
              {staples.map((t) => <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>)}
            </View>
          ) : null}

          <SectionTitle>Steps</SectionTitle>
          {meal.steps.map((s, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={{ flex: 1, color: colors.text, fontSize: 15, lineHeight: 22 }}>{s}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Footer>
        {cooked ? (
          <Button title="Cooked — back to meals" variant="dark" icon="checkmark" onPress={() => router.back()} />
        ) : (
          <Button
            title="I cooked this"
            icon="flame"
            trailing={`${meal.usesItems.length} item${meal.usesItems.length === 1 ? '' : 's'} off`}
            onPress={() => {
              cookMeal(meal);
              toast(`${meal.usesItems.length} item${meal.usesItems.length === 1 ? '' : 's'} updated in your fridge${value ? ` · ${formatRupees(value)} rescued` : ''}`, '🎉 Food rescued');
              router.back();
            }}
          />
        )}
      </Footer>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 320, overflow: 'hidden', alignItems: 'center' },
  watermark: { position: 'absolute', top: 90, left: -10, right: -10, fontFamily: font.display, fontSize: 120, lineHeight: 124, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  plate: { marginTop: space(3), width: 172, height: 172, borderRadius: 86, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: -36, backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space(5), paddingTop: space(6) },
  tiles: { flexDirection: 'row', gap: 8, marginTop: space(5) },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(4), ...(shadow as object) },
  tileValue: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  tileLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  ing: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 8, paddingRight: 12, marginBottom: 8 },
  ingIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  days: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  tagText: { fontSize: 13, fontWeight: '600', color: colors.text },
  step: { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'flex-start' },
  stepNum: { fontFamily: font.display, fontSize: 26, lineHeight: 28, color: colors.limeDeep, width: 34 },
});
