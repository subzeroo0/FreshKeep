import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { toast } from '../../components/Toast';
import { Button, Card, EmptyState, Muted, Pill, Screen, SectionTitle, TopBar } from '../../components/ui';
import { daysBetween, daysLeftLabel, today as todayISO } from '../../lib/dates';
import { formatRupees } from '../../lib/impact';
import { itemEmoji } from '../../lib/shelfLife';
import { getMeal } from '../../lib/useMeals';
import { useStore } from '../../store/useStore';
import { colors, font, radius, space } from '../../theme';

const EQUIP: Record<string, string> = { stove: 'Stove', pressure_cooker: 'Pressure cooker', microwave: 'Microwave', oven: 'Oven', air_fryer: 'Air fryer', mixer_grinder: 'Mixer' };

// M19 — meal detail and "I cooked this" (auto-deducts what it used).
export default function MealDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meal = getMeal(id);
  const items = useStore((s) => s.items);
  const status = useStore((s) => s.mealStatus[id]);
  const cookMeal = useStore((s) => s.cookMeal);
  const now = todayISO();

  if (!meal)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title="Meal" back />
        <EmptyState icon="🍽️" title="This suggestion has refreshed" body="Open Meals to see today’s ideas." action={<Button title="Go to Meals" onPress={() => router.replace('/meals')} />} />
      </View>
    );

  const cooked = status === 'cooked';
  const staples = meal.extraIngredients.filter((e) => e.endsWith('(staple)')).map((e) => e.replace(' (staple)', ''));
  const toBuy = meal.extraIngredients.filter((e) => !e.endsWith('(staple)'));
  const value = meal.usesItems.reduce((sum, u) => {
    const it = items.find((i) => i.id === u.itemId);
    return sum + (it?.pricePaise ?? 0) * u.fraction;
  }, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="" back />
      <Screen
        footer={
          cooked ? (
            <Button title="Cooked ✓ — back to meals" variant="secondary" onPress={() => router.back()} />
          ) : (
            <Button
              title="I cooked this"
              icon="flame"
              onPress={() => {
                cookMeal(meal);
                toast(`Nice! ${meal.usesItems.length} item${meal.usesItems.length === 1 ? '' : 's'} updated in your fridge${value ? ` · ${formatRupees(value)} rescued` : ''}`, '🎉 Food rescued');
                router.back();
              }}
            />
          )
        }
      >
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Pill label={meal.slot[0].toUpperCase() + meal.slot.slice(1)} fg={colors.brand} bg={colors.brandSoft} />
          <Pill label={`⏱ ${meal.cookTimeMin} min`} fg={colors.textMuted} bg={colors.expiredSoft} />
          <Pill label={`🍽 Serves ${meal.servings}`} fg={colors.textMuted} bg={colors.expiredSoft} />
          {meal.equipmentNeeded.map((e) => <Pill key={e} label={EQUIP[e] ?? e} fg={colors.textMuted} bg={colors.expiredSoft} />)}
        </View>
        <Text style={[font.h1, { color: colors.text, marginTop: space(3) }]}>{meal.title}</Text>
        <Muted style={{ marginTop: 6, fontSize: 15 }}>{meal.description}</Muted>

        <SectionTitle>From your fridge</SectionTitle>
        <Card style={{ paddingVertical: 6 }}>
          {meal.usesItems.map((u, i) => {
            const it = items.find((x) => x.id === u.itemId);
            const d = it ? daysBetween(now, it.effectiveExpiry) : undefined;
            return (
              <View key={u.itemId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <Text style={{ fontSize: 22 }}>{it ? itemEmoji(it.displayName, it.category) : '🥄'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>{u.name}</Text>
                  <Muted style={{ fontSize: 12 }}>{u.amount}{u.fraction < 1 ? ` · ${Math.round(u.fraction * 100)}% of the pack` : ' · all of it'}</Muted>
                </View>
                {d !== undefined && it?.status === 'active' ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: d <= 1 ? colors.danger : d <= 5 ? colors.warn : colors.ok }}>{daysLeftLabel(d)}</Text>
                ) : null}
              </View>
            );
          })}
        </Card>

        {toBuy.length ? (
          <>
            <SectionTitle>You may need</SectionTitle>
            <Muted>{toBuy.join(' · ')}</Muted>
          </>
        ) : null}
        {staples.length ? (
          <>
            <SectionTitle>Pantry staples</SectionTitle>
            <Muted>{staples.join(' · ')}</Muted>
          </>
        ) : null}

        <SectionTitle>Steps</SectionTitle>
        {meal.steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, color: colors.text, fontSize: 15, lineHeight: 22 }}>{s}</Text>
          </View>
        ))}
      </Screen>
    </View>
  );
}
