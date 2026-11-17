import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemRow } from '../../components/ItemRow';
import { Sheet, SheetAction } from '../../components/Sheet';
import { toast } from '../../components/Toast';
import { Button, Chip, EmptyState, Muted } from '../../components/ui';
import { today as todayISO } from '../../lib/dates';
import { daysLeft, urgencyOf, Urgency } from '../../lib/expiry';
import type { Category, InventoryItem, Location } from '../../lib/types';
import { useStore } from '../../store/useStore';
import { colors, font, radius, space, urgencyColors } from '../../theme';

const FILTERS: { key: string; label: string; cats?: Category[]; loc?: Location }[] = [
  { key: 'all', label: 'All' },
  { key: 'dairy', label: '🥛 Dairy', cats: ['milk', 'uht_milk', 'curd_yogurt', 'paneer', 'cheese', 'butter_ghee', 'cream'] },
  { key: 'veg', label: '🥬 Veg & fruit', cats: ['leafy_veg', 'vegetables', 'fruits'] },
  { key: 'bakery', label: '🍞 Bread & batter', cats: ['bread', 'batter'] },
  { key: 'protein', label: '🥚 Eggs & meat', cats: ['eggs', 'meat', 'fish', 'tofu'] },
  { key: 'leftovers', label: '🍲 Leftovers', cats: ['leftovers', 'ready_to_eat'] },
  { key: 'freezer', label: '❄️ Freezer', loc: 'freezer' },
];

const SECTIONS: { key: Urgency; title: string; hint: string }[] = [
  { key: 'today', title: 'Use today', hint: '≤ 1 day' },
  { key: 'week', title: 'This week', hint: '2–5 days' },
  { key: 'fine', title: 'Fine', hint: '> 5 days' },
  { key: 'expired', title: 'Expired', hint: 'check before eating' },
];

export default function FridgeScreen() {
  const insets = useSafeAreaInsets();
  const allItems = useStore((s) => s.items);
  const profile = useStore((s) => s.profile);
  const { useUp, discard, markOpened, useSome, loadDemo } = useStore();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showExpired, setShowExpired] = useState(false);
  const [menuItem, setMenuItem] = useState<InventoryItem | null>(null);
  const now = todayISO();

  const active = useMemo(() => allItems.filter((i) => i.status === 'active'), [allItems]);
  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const q = query.trim().toLowerCase();
    return active
      .filter((i) => (!f.cats || f.cats.includes(i.category)) && (!f.loc || i.location === f.loc))
      .filter((i) => !q || i.displayName.toLowerCase().includes(q))
      .sort((a, b) => a.effectiveExpiry.localeCompare(b.effectiveExpiry) || a.displayName.localeCompare(b.displayName));
  }, [active, filter, query]);

  const grouped = useMemo(() => {
    const g: Record<Urgency, InventoryItem[]> = { today: [], week: [], fine: [], expired: [] };
    for (const i of filtered) g[urgencyOf(daysLeft(i.effectiveExpiry, now))].push(i);
    return g;
  }, [filtered, now]);

  const counts = useMemo(() => {
    let today = 0, week = 0;
    for (const i of active) {
      const d = daysLeft(i.effectiveExpiry, now);
      if (d >= 0 && d <= 1) today++;
      else if (d >= 2 && d <= 5) week++;
    }
    return { today, week };
  }, [active, now]);

  const withUndo = (fn: () => void, msg: string) => {
    const snap = { items: useStore.getState().items, events: useStore.getState().events };
    fn();
    toast(msg, undefined, {
      label: 'Undo',
      onPress: () => useStore.setState((s) => ({ ...snap, inventoryVersion: s.inventoryVersion + 1 })),
    });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: space(4), paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>FreshKeep</Text>
            <Muted>{greeting}{profile.name ? `, ${profile.name}` : ''}</Muted>
          </View>
          <Pressable onPress={() => router.push('/add')} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="add" size={24} color={colors.brand} />
          </Pressable>
        </View>

        {active.length > 0 ? (
          <View style={styles.summary}>
            <SummaryStat n={counts.today} label="expire today" color={colors.danger} />
            <View style={styles.summaryDiv} />
            <SummaryStat n={counts.week} label="this week" color={colors.warn} />
            <View style={styles.summaryDiv} />
            <SummaryStat n={active.length} label="in the fridge" color={colors.brand} />
          </View>
        ) : null}

        {active.length > 0 ? (
          <>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textFaint} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search your fridge"
                placeholderTextColor={colors.textFaint}
                style={styles.searchInput}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(4) }} contentContainerStyle={{ gap: 8, paddingHorizontal: space(4), paddingVertical: 4 }}>
              {FILTERS.map((f) => (
                <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
              ))}
            </ScrollView>
            <Muted style={{ marginTop: 10, textAlign: 'center', fontSize: 12 }}>Swipe right = used up · swipe left = thrown out · long-press for more</Muted>
          </>
        ) : null}

        {active.length === 0 ? (
          <EmptyState
            icon="🧊"
            title="Your fridge is empty"
            body="Import your last grocery order, scan a pack, or quick-add loose veg. Or load the demo fridge to see FreshKeep in action."
            action={
              <View style={{ gap: 10 }}>
                <Button title="Add groceries" icon="add-circle" onPress={() => router.push('/add')} />
                <Button title="Load demo fridge" variant="secondary" icon="sparkles" onPress={loadDemo} />
              </View>
            }
          />
        ) : null}

        {active.length > 0 && filtered.length === 0 ? <EmptyState icon="🔍" title="Nothing matches" body="Try another filter or search." /> : null}

        {SECTIONS.map((sec) => {
          const list = grouped[sec.key];
          if (!list.length) return null;
          const u = urgencyColors[sec.key];
          const collapsed = sec.key === 'expired' && !showExpired;
          return (
            <View key={sec.key} style={{ marginTop: space(5) }}>
              <Pressable
                disabled={sec.key !== 'expired'}
                onPress={() => setShowExpired((v) => !v)}
                style={styles.sectionHead}
              >
                <View style={[styles.dot, { backgroundColor: u.fg }]} />
                <Text style={[font.h3, { color: colors.text }]}>{sec.title}</Text>
                <Text style={styles.count}>{list.length}</Text>
                <Text style={[font.small, { color: colors.textFaint, flex: 1 }]}>{sec.hint}</Text>
                {sec.key === 'expired' ? <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.textFaint} /> : null}
              </Pressable>
              {!collapsed &&
                list.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    now={now}
                    onPress={() => router.push(`/item/${item.id}`)}
                    onLongPress={() => setMenuItem(item)}
                    onSwipeRight={() => withUndo(() => useUp(item.id), `${item.displayName} marked used up 🎉`)}
                    onSwipeLeft={() => withUndo(() => discard(item.id), `${item.displayName} thrown out`)}
                  />
                ))}
            </View>
          );
        })}
      </ScrollView>

      <Sheet visible={!!menuItem} onClose={() => setMenuItem(null)} title={menuItem?.displayName}>
        {menuItem ? (
          <>
            {!menuItem.openedAt ? (
              <SheetAction icon="lock-open-outline" label="Opened" sub="Moves the date up for opened packs" onPress={() => {
                markOpened(menuItem.id);
                const after = useStore.getState().items.find((i) => i.id === menuItem.id);
                toast(after ? `Opened — now ${daysLeft(after.effectiveExpiry, now)} day(s) left` : 'Marked opened');
                setMenuItem(null);
              }} />
            ) : null}
            <SheetAction icon="pie-chart-outline" label="Used some" sub="Mark half of what is left as used" onPress={() => {
              withUndo(() => useSome(menuItem.id, menuItem.remainingFraction / 2), `Used half of ${menuItem.displayName}`);
              setMenuItem(null);
            }} />
            <SheetAction icon="checkmark-done-outline" label="Used up" onPress={() => {
              withUndo(() => useUp(menuItem.id), `${menuItem.displayName} marked used up 🎉`);
              setMenuItem(null);
            }} />
            <SheetAction icon="create-outline" label="Edit" sub="Dates, quantity, location" onPress={() => {
              setMenuItem(null);
              router.push(`/item/${menuItem.id}`);
            }} />
            <SheetAction icon="trash-outline" label="Thrown out" tone="danger" onPress={() => {
              withUndo(() => discard(menuItem.id), `${menuItem.displayName} thrown out`);
              setMenuItem(null);
            }} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

function SummaryStat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color }}>{n}</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space(4) },
  logo: { width: 52, height: 38 },
  brand: { fontSize: 22, fontWeight: '800', color: colors.brand, letterSpacing: -0.4 },
  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: space(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryDiv: { width: 1, backgroundColor: colors.border },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    marginTop: space(4),
    marginBottom: space(2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: colors.text },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  count: { fontSize: 13, fontWeight: '700', color: colors.textMuted, backgroundColor: colors.border, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10, overflow: 'hidden' },
});
