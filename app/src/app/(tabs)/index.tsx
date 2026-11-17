import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemRow } from '../../components/ItemRow';
import { Sheet, SheetAction } from '../../components/Sheet';
import { toast } from '../../components/Toast';
import { Button, Chip, Display, EmptyState, Eyebrow, IconButton, SectionTitle } from '../../components/ui';
import { today as todayISO } from '../../lib/dates';
import { daysLeft, urgencyOf, Urgency } from '../../lib/expiry';
import { itemEmoji } from '../../lib/shelfLife';
import type { Category, InventoryItem, Location } from '../../lib/types';
import { useStore } from '../../store/useStore';
import { colors, radius, space, TAB_BAR_SPACE, urgencyColors } from '../../theme';

const FILTERS: { key: string; label: string; icon?: string; bg?: string; cats?: Category[]; loc?: Location }[] = [
  { key: 'all', label: 'All' },
  { key: 'dairy', label: 'Dairy', icon: '🥛', bg: colors.sky, cats: ['milk', 'uht_milk', 'curd_yogurt', 'paneer', 'cheese', 'butter_ghee', 'cream'] },
  { key: 'veg', label: 'Veg & fruit', icon: '🥬', bg: colors.mint, cats: ['leafy_veg', 'vegetables', 'fruits'] },
  { key: 'bakery', label: 'Bread & batter', icon: '🍞', bg: colors.peach, cats: ['bread', 'batter'] },
  { key: 'protein', label: 'Eggs & meat', icon: '🥚', bg: colors.butter, cats: ['eggs', 'meat', 'fish', 'tofu'] },
  { key: 'leftovers', label: 'Leftovers', icon: '🍲', bg: colors.lilac, cats: ['leftovers', 'ready_to_eat'] },
  { key: 'freezer', label: 'Freezer', icon: '❄️', bg: colors.sky, loc: 'freezer' },
];

const SECTIONS: { key: Urgency; title: string; hint: string }[] = [
  { key: 'today', title: 'Use today', hint: 'Today or tomorrow' },
  { key: 'week', title: 'This week', hint: '2–5 days' },
  { key: 'fine', title: 'Fine', hint: 'More than 5 days' },
  { key: 'expired', title: 'Expired', hint: 'Check before eating' },
];

const short = (name: string) => name.replace(/\(.*?\)/g, '').trim();

export default function FridgeScreen() {
  const insets = useSafeAreaInsets();
  const allItems = useStore((s) => s.items);
  const profile = useStore((s) => s.profile);
  const { useUp, discard, markOpened, useSome } = useStore();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
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

  const urgent = useMemo(
    () => active.filter((i) => urgencyOf(daysLeft(i.effectiveExpiry, now)) === 'today').sort((a, b) => a.effectiveExpiry.localeCompare(b.effectiveExpiry)),
    [active, now],
  );
  const weekCount = useMemo(() => active.filter((i) => urgencyOf(daysLeft(i.effectiveExpiry, now)) === 'week').length, [active, now]);
  const nextUp = useMemo(() => [...active].filter((i) => daysLeft(i.effectiveExpiry, now) >= 0).sort((a, b) => a.effectiveExpiry.localeCompare(b.effectiveExpiry))[0], [active, now]);

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
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: space(5), paddingBottom: TAB_BAR_SPACE }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image source={require('../../../assets/logo.png')} style={{ width: 34, height: 26 }} contentFit="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow>{greeting}{profile.name ? `, ${profile.name}` : ''}</Eyebrow>
            <Display size="h2">My fridge</Display>
          </View>
          {active.length ? <IconButton icon={searching ? 'close' : 'search'} label="Search the fridge" onPress={() => { setSearching((v) => !v); setQuery(''); }} /> : null}
        </View>

        {active.length === 0 ? (
          <EmptyState
            icon="🧊"
            color={colors.butter}
            title="Your fridge is empty"
            body="Import your last grocery order, scan or photograph a pack, or quick-add loose veg. Every item gets a use-by date."
            action={
              <View style={{ gap: 10 }}>
                <Button title="Import a grocery order" variant="dark" icon="receipt-outline" onPress={() => router.push('/add/import')} />
                <Button title="Add something else" variant="outline" icon="add" onPress={() => router.push('/add')} />
              </View>
            }
          />
        ) : (
          <>
            {/* Hero */}
            {urgent.length ? (
              <View style={[styles.hero, { backgroundColor: colors.butter }]}>
                <Eyebrow color={colors.inkSoft}>Use these first</Eyebrow>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Display size="hero" color={colors.ink} style={{ flex: 1 }}>
                    {urgent.length} to use{'\n'}today
                  </Display>
                  <View style={styles.emojiStack}>
                    {urgent.slice(0, 3).map((i, n) => (
                      <View key={i.id} style={[styles.emojiBubble, { marginLeft: n ? -16 : 0, zIndex: 3 - n }]}>
                        <Text style={{ fontSize: 30 }}>{itemEmoji(i.displayName, i.category)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Pressable onPress={() => router.navigate('/meals')} style={styles.glassPill} accessibilityRole="button" accessibilityLabel="See meals that use these">
                  <View style={{ flex: 1 }}>
                    <Text style={styles.glassTitle} numberOfLines={1}>{urgent.slice(0, 3).map((i) => short(i.displayName)).join(', ')}</Text>
                    <Text style={styles.glassSub}>Cook with these · {weekCount} more this week</Text>
                  </View>
                  <View style={styles.glassBtn}><Ionicons name="arrow-forward" size={20} color={colors.white} /></View>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.hero, { backgroundColor: colors.mint }]}>
                <Eyebrow color={colors.inkSoft}>Nothing expires today</Eyebrow>
                <Display size="hero" color={colors.ink}>All{'\n'}fresh</Display>
                <View style={styles.glassPill}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.glassTitle} numberOfLines={1}>{active.length} items in the fridge</Text>
                    <Text style={styles.glassSub} numberOfLines={1}>{nextUp ? `Next up: ${short(nextUp.displayName)} in ${daysLeft(nextUp.effectiveExpiry, now)} days` : 'Check the expired ones below'}</Text>
                  </View>
                </View>
              </View>
            )}

            {searching ? (
              <View style={styles.search}>
                <Ionicons name="search" size={18} color={colors.textFaint} />
                <TextInput value={query} onChangeText={setQuery} autoFocus placeholder="Search your fridge" placeholderTextColor={colors.textFaint} style={styles.searchInput} />
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(5), marginTop: space(5) }} contentContainerStyle={{ gap: 8, paddingHorizontal: space(5) }}>
              {FILTERS.map((f) => (
                <Chip key={f.key} label={f.label} icon={f.icon} iconBg={f.bg} selected={filter === f.key} onPress={() => setFilter(f.key)} />
              ))}
            </ScrollView>

            {filtered.length === 0 ? (
              <EmptyState icon="🔍" color={colors.surface} title="Nothing matches" body="Try another filter or search." />
            ) : null}

            {SECTIONS.map((sec) => {
              const list = grouped[sec.key];
              if (!list.length) return null;
              const u = urgencyColors[sec.key];
              const collapsed = sec.key === 'expired' && !showExpired;
              return (
                <View key={sec.key}>
                  <SectionTitle
                    count={list.length}
                    right={
                      sec.key === 'expired' ? (
                        <Pressable onPress={() => setShowExpired((v) => !v)} hitSlop={10} style={styles.toggle}>
                          <Text style={styles.toggleText}>{collapsed ? 'Show' : 'Hide'}</Text>
                        </Pressable>
                      ) : (
                        <View style={[styles.hint, { backgroundColor: u.bg }]}><Text style={[styles.hintText, { color: u.fg }]}>{sec.hint}</Text></View>
                      )
                    }
                  >
                    {sec.title}
                  </SectionTitle>
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
            <Text style={styles.gestureHint}>Swipe right when used up · left when thrown out · hold for more</Text>
          </>
        )}
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space(5) },
  logoWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: radius.xl, padding: space(5), paddingTop: space(6), gap: space(3) },
  emojiStack: { flexDirection: 'row', marginBottom: 6 },
  emojiBubble: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.butter },
  glassPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: radius.pill, paddingVertical: 8, paddingLeft: 18, paddingRight: 8, minHeight: 60, marginTop: space(2) },
  glassTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  glassSub: { fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 18, marginTop: space(4) },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text, ...((Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object) },
  hint: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  hintText: { fontSize: 11, fontWeight: '700' },
  toggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface },
  toggleText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  gestureHint: { textAlign: 'center', color: colors.textFaint, fontSize: 12, marginTop: space(5) },
});
