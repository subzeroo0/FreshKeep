import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, Muted, Pill } from '../../components/ui';
import { RECIPES } from '../../data/recipes';
import { daysBetween } from '../../lib/dates';
import { quickestRescue } from '../../lib/meals';
import type { MealSuggestion, Slot } from '../../lib/types';
import { registerMeals, useMeals } from '../../lib/useMeals';
import { useStore } from '../../store/useStore';
import { colors, font, radius, space } from '../../theme';

const SLOT_META: Record<Slot, { label: string; icon: string }> = {
  breakfast: { label: 'Breakfast', icon: '🌅' },
  lunch: { label: 'Lunch', icon: '☀️' },
  dinner: { label: 'Dinner', icon: '🌙' },
};

const DIET_LABEL: Record<string, string> = {
  vegetarian: 'Vegetarian', eggetarian: 'Eggetarian', jain: 'Jain', vegan: 'Vegan', non_vegetarian: 'Non-veg', pescatarian: 'Pescatarian',
};

export function usesLine(m: MealSuggestion, items: { id: string; effectiveExpiry: string }[], date: string): string {
  const parts = m.usesItems.slice(0, 3).map((u) => u.name.replace(/\(.*?\)/g, '').replace(/^(Amul|Mother Dairy|Milky Mist|Britannia|Modern|Nandini|iD|Farm Fresh)\s+/i, '').trim().toLowerCase());
  const soonest = Math.min(...m.usesItems.map((u) => {
    const it = items.find((i) => i.id === u.itemId);
    return it ? daysBetween(date, it.effectiveExpiry) : 99;
  }));
  const when = soonest <= 0 ? 'expire today' : soonest === 1 ? 'expire tomorrow' : soonest <= 5 ? `expire in ${soonest} days` : '';
  return `Uses: ${parts.join(', ')}${m.usesItems.length > 3 ? ` +${m.usesItems.length - 3}` : ''}${when ? ` (${when})` : ''}`;
}

export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const { plans, loading, error, refresh, source, date } = useMeals();
  const items = useStore((s) => s.items);
  const profile = useStore((s) => s.profile);
  const cookedMeals = useStore((s) => s.cookedMeals);
  const [idx, setIdx] = useState<Record<string, number>>({});
  const active = items.filter((i) => i.status === 'active');

  const quick = useMemo(() => quickestRescue(RECIPES, items, profile, date), [items, profile, date]);

  const urgentCount = active.filter((i) => {
    const d = daysBetween(date, i.effectiveExpiry);
    return d >= 0 && d <= 1;
  }).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(4), paddingBottom: 40 }}
        refreshControl={refresh ? <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brand} /> : undefined}
      >
        <Text style={[font.h1, { color: colors.text }]}>Today’s meals</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <Pill label={DIET_LABEL[profile.dietType]} fg={colors.brand} bg={colors.brandSoft} />
          {profile.goals.filter((g) => g !== 'balanced').slice(0, 2).map((g) => <Pill key={g} label={g.replace('_', '-')} fg={colors.textMuted} bg={colors.expiredSoft} />)}
          {profile.allergies.length ? <Pill label={`No ${profile.allergies.join(', ')}`} fg={colors.danger} bg={colors.dangerSoft} /> : null}
          <Pill label={source === 'ai' ? '✨ AI planner' : 'Offline recipes'} fg={colors.textMuted} bg={colors.expiredSoft} />
        </View>
        <Muted style={{ marginTop: 10 }}>
          {urgentCount ? `Built around the ${urgentCount} item${urgentCount > 1 ? 's' : ''} that need using today or tomorrow.` : 'Nothing urgent — here’s what fits your fridge.'}
        </Muted>

        {quick ? (
          <Pressable onPress={() => { registerMeals([quick]); router.push(`/meal/${quick.id}`); }} style={({ pressed }) => [styles.quick, pressed && { opacity: 0.9 }]}>
            <Ionicons name="flash" size={20} color={colors.brandDark} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: colors.brandDark }}>What can I make now?</Text>
              <Text style={{ color: colors.brandDark, opacity: 0.85, fontSize: 13 }} numberOfLines={1}>{quick.title} · {quick.cookTimeMin} min</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.brandDark} />
          </Pressable>
        ) : null}

        {loading && !plans.some((p) => p.best) ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.brand} /> : null}
        {error ? <Muted style={{ marginTop: 10, color: colors.warn }}>AI planner unavailable ({error}) — showing offline recipes.</Muted> : null}

        {active.length === 0 ? (
          <EmptyState icon="🍳" title="Nothing to cook with yet" body="Add groceries and FreshKeep will plan breakfast, lunch and dinner around what expires first." action={<Button title="Add groceries" icon="add" onPress={() => router.push('/add')} />} />
        ) : (
          plans.map((p) => {
            const cooked = cookedMeals.find((m) => m.date === date && m.slot === p.slot);
            const options = [p.best, ...p.alternatives].filter(Boolean) as MealSuggestion[];
            const i = Math.min(idx[p.slot] ?? 0, Math.max(options.length - 1, 0));
            const meal = cooked ?? options[i];
            return (
              <View key={p.slot} style={{ marginTop: space(5) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>{SLOT_META[p.slot].icon}</Text>
                  <Text style={[font.h3, { color: colors.text, flex: 1 }]}>{SLOT_META[p.slot].label}</Text>
                  {!cooked && options.length > 1 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Pressable hitSlop={8} disabled={i === 0} onPress={() => setIdx({ ...idx, [p.slot]: i - 1 })} style={[styles.navBtn, i === 0 && { opacity: 0.3 }]}>
                        <Ionicons name="chevron-back" size={16} color={colors.brand} />
                      </Pressable>
                      <Text style={{ fontSize: 12, color: colors.textMuted, minWidth: 30, textAlign: 'center' }}>{i + 1}/{options.length}</Text>
                      <Pressable hitSlop={8} disabled={i >= options.length - 1} onPress={() => setIdx({ ...idx, [p.slot]: i + 1 })} style={[styles.navBtn, i >= options.length - 1 && { opacity: 0.3 }]}>
                        <Ionicons name="chevron-forward" size={16} color={colors.brand} />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
                {meal ? (
                  <MealCard meal={meal} cooked={!!cooked} usesText={usesLine(meal, items, date)} best={i === 0 && !cooked} />
                ) : (
                  <Card><Muted>No {SLOT_META[p.slot].label.toLowerCase()} idea fits your diet and fridge right now.</Muted></Card>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function MealCard({ meal, cooked, usesText, best }: { meal: MealSuggestion; cooked: boolean; usesText: string; best: boolean }) {
  const rescued = meal.usesItems.length;
  return (
    <Card onPress={() => router.push(`/meal/${meal.id}`)} style={cooked ? { opacity: 0.75 } : undefined}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        {cooked ? (
          <Pill label="✓ Cooked" fg={colors.ok} bg={colors.okSoft} />
        ) : (
          <Pill label={`🌱 Rescues ${rescued} item${rescued === 1 ? '' : 's'}`} fg={colors.brand} bg={colors.brandSoft} />
        )}
        {best && !cooked && meal.rescueScore >= 0.5 ? <Pill label="Best pick" fg="#7A5B12" bg={colors.warnSoft} /> : null}
        <View style={{ flex: 1 }} />
        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
        <Text style={{ fontSize: 13, color: colors.textMuted }}>{meal.cookTimeMin} min</Text>
      </View>
      <Text style={[font.h3, { color: colors.text, fontSize: 18 }]}>{meal.title}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 4, lineHeight: 19 }}>{meal.description}</Text>
      <View style={styles.uses}>
        <Text style={{ color: colors.brandDark, fontWeight: '600', fontSize: 13 }}>{usesText}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginTop: space(4),
    borderRadius: radius.lg,
    backgroundColor: colors.lime,
  },
  navBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  uses: { marginTop: 10, backgroundColor: colors.brandTint, padding: 10, borderRadius: radius.sm },
});
