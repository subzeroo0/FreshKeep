import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Display, EmptyState, Eyebrow, IconButton, Muted, Pill } from '../../components/ui';
import { RECIPES } from '../../data/recipes';
import { daysBetween, formatDate } from '../../lib/dates';
import { mealEmoji } from '../../lib/mealEmoji';
import { quickestRescue } from '../../lib/meals';
import type { MealSuggestion, Slot } from '../../lib/types';
import { registerMeals, useMeals } from '../../lib/useMeals';
import { useStore } from '../../store/useStore';
import { colors, font, radius, space, TAB_BAR_SPACE } from '../../theme';

const SLOT_META: Record<Slot, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline', color: colors.butter },
  lunch: { label: 'Lunch', icon: 'partly-sunny-outline', color: colors.mint },
  dinner: { label: 'Dinner', icon: 'moon-outline', color: colors.lilac },
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
  return `Uses ${parts.join(', ')}${m.usesItems.length > 3 ? ` +${m.usesItems.length - 3}` : ''}${when ? ` · ${when}` : ''}`;
}

// M19 — today's breakfast, lunch and dinner.
export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const { plans, loading, error, refresh, source, date } = useMeals();
  const items = useStore((s) => s.items);
  const profile = useStore((s) => s.profile);
  const cookedMeals = useStore((s) => s.cookedMeals);
  const [idx, setIdx] = useState<Record<string, number>>({});
  const active = items.filter((i) => i.status === 'active');
  const quick = useMemo(() => quickestRescue(RECIPES, items, profile, date), [items, profile, date]);
  const weekday = new Date().toLocaleDateString('en-IN', { weekday: 'long' });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: space(5), paddingBottom: TAB_BAR_SPACE }}
        showsVerticalScrollIndicator={false}
        refreshControl={refresh ? <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brand} /> : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Eyebrow>{weekday} · {formatDate(date)}</Eyebrow>
            <Display size="h1">Today’s meals</Display>
          </View>
          {refresh ? <IconButton icon="refresh" label="New meal ideas" onPress={refresh} /> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: space(3), flexWrap: 'wrap' }}>
          <Pill label={DIET_LABEL[profile.dietType]} fg={colors.white} bg={colors.ink} icon="leaf" />
          {profile.goals.filter((g) => g !== 'balanced').slice(0, 2).map((g) => <Pill key={g} label={g.replace('_', '-')} fg={colors.inkSoft} bg={colors.surface} />)}
          {profile.allergies.length ? <Pill label={`No ${profile.allergies.join(', ')}`} fg={colors.danger} bg={colors.dangerSoft} /> : null}
          <Pill label={source === 'ai' ? 'Planned by AI' : 'Built-in recipes'} fg={colors.inkSoft} bg={colors.surface} icon={source === 'ai' ? 'sparkles' : 'book-outline'} />
        </View>

        {active.length === 0 ? (
          <EmptyState
            icon="🍳"
            color={colors.peach}
            title="Nothing to cook with yet"
            body="Add groceries and FreshKeep plans breakfast, lunch and dinner around what expires first."
            action={<Button title="Add groceries" variant="dark" icon="add" onPress={() => router.push('/add')} />}
          />
        ) : (
          <>
            {quick ? (
              <Pressable onPress={() => { registerMeals([quick]); router.push(`/meal/${quick.id}`); }} style={({ pressed }) => [styles.quick, pressed && { transform: [{ scale: 0.99 }] }]} accessibilityRole="button">
                <View style={{ flex: 1 }}>
                  <Eyebrow color={colors.lime}>What can I make now?</Eyebrow>
                  <Text style={styles.quickTitle} numberOfLines={1}>{quick.title}</Text>
                  <Text style={styles.quickSub}>{quick.cookTimeMin} min · {quick.usesItems.length} from your fridge</Text>
                </View>
                <View style={styles.quickBtn}><Ionicons name="flash" size={22} color={colors.ink} /></View>
              </Pressable>
            ) : null}

            {loading && !plans.some((p) => p.best) ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.brand} /> : null}
            {loading && plans.some((p) => p.best) ? <Muted style={{ marginTop: space(3) }}>Planning fresh ideas with AI…</Muted> : null}
            {error ? <Muted style={{ marginTop: space(3), color: colors.warn }}>AI planner unavailable ({error}) — showing built-in recipes.</Muted> : null}

            {plans.map((p) => {
              const cooked = cookedMeals.find((m) => m.date === date && m.slot === p.slot);
              const options = [p.best, ...p.alternatives].filter(Boolean) as MealSuggestion[];
              const i = Math.min(idx[p.slot] ?? 0, Math.max(options.length - 1, 0));
              const meal = cooked ?? options[i];
              const meta = SLOT_META[p.slot];
              if (!meal)
                return (
                  <View key={p.slot} style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Eyebrow>{meta.label}</Eyebrow>
                    <Muted style={{ marginTop: 6 }}>No {meta.label.toLowerCase()} idea fits your diet and fridge right now.</Muted>
                  </View>
                );
              return (
                <Pressable key={p.slot} onPress={() => router.push(`/meal/${meal.id}`)} style={({ pressed }) => [styles.card, { backgroundColor: meta.color }, pressed && { transform: [{ scale: 0.99 }] }]} accessibilityRole="button" accessibilityLabel={`${meta.label}: ${meal.title}`}>
                  <View style={styles.cardTop}>
                    <View style={styles.slotPill}>
                      <Ionicons name={meta.icon} size={14} color={colors.ink} />
                      <Text style={styles.slotText}>{meta.label}</Text>
                    </View>
                    {cooked ? (
                      <View style={[styles.slotPill, { backgroundColor: colors.ink }]}>
                        <Ionicons name="checkmark" size={14} color={colors.lime} />
                        <Text style={[styles.slotText, { color: colors.lime }]}>Cooked</Text>
                      </View>
                    ) : options.length > 1 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <IconButton icon="chevron-back" tone="glass" size={34} label="Previous idea" onPress={() => setIdx({ ...idx, [p.slot]: (i - 1 + options.length) % options.length })} />
                        <Text style={styles.counter}>{i + 1}/{options.length}</Text>
                        <IconButton icon="chevron-forward" tone="glass" size={34} label="Next idea" onPress={() => setIdx({ ...idx, [p.slot]: (i + 1) % options.length })} />
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: space(4) }}>
                    <Text style={[font.h1, { color: colors.ink, flex: 1, fontSize: 32, lineHeight: 35 }]} numberOfLines={3}>{meal.title}</Text>
                    <View style={styles.dish}><Text style={{ fontSize: 40 }}>{mealEmoji(meal.title)}</Text></View>
                  </View>
                  <Text style={styles.desc} numberOfLines={2}>{meal.description}</Text>
                  <View style={styles.glass}>
                    <Text style={styles.glassText} numberOfLines={2}>{usesLine(meal, items, date)}</Text>
                    <View style={styles.meta}>
                      <Ionicons name="time-outline" size={13} color={colors.ink} />
                      <Text style={styles.metaText}>{meal.cookTimeMin}m</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space(5), marginTop: space(5), borderRadius: radius.xl, backgroundColor: colors.ink },
  quickTitle: { color: colors.white, fontSize: 18, fontWeight: '800', marginTop: 4, letterSpacing: -0.2 },
  quickSub: { color: colors.textOnDarkMuted, fontSize: 13, marginTop: 2 },
  quickBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.xl, padding: space(5), marginTop: space(4) },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  slotText: { fontSize: 12, fontWeight: '800', color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.6 },
  counter: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, minWidth: 26, textAlign: 'center' },
  dish: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  desc: { color: colors.inkSoft, fontSize: 14, lineHeight: 20, marginTop: space(2) },
  glass: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space(4), backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14 },
  glassText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.white, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  metaText: { fontSize: 12, fontWeight: '800', color: colors.ink },
});
