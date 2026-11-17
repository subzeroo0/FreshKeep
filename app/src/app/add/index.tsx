import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Display, IconButton } from '../../components/ui';
import { colors, radius, space } from '../../theme';

type Path = '/add/scan' | '/add/import' | '/add/quick' | '/add/product?photo=1';

const OPTIONS: { path: Path; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; color: string; hero?: boolean }[] = [
  { path: '/add/import', title: 'Import order', sub: 'Blinkit, Instamart or Zepto screenshots', icon: 'receipt-outline', color: colors.butter, hero: true },
  { path: '/add/scan', title: 'Scan barcode', sub: 'Then the date', icon: 'barcode-outline', color: colors.sky },
  { path: '/add/product?photo=1', title: 'Photo of a pack', sub: 'No barcode? Snap it', icon: 'camera-outline', color: colors.lilac },
  { path: '/add/quick', title: 'Quick add', sub: 'Veg, batter, leftovers', icon: 'flash-outline', color: colors.mint },
];

// M1 — the Add sheet.
export default function AddSheet() {
  const insets = useSafeAreaInsets();
  const go = (path: Path) => {
    router.back();
    setTimeout(() => router.push(path), 10);
  };
  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]} onPress={(e) => e.stopPropagation()}>
        <View style={styles.grab} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: space(4) }}>
          <View style={{ flex: 1 }}>
            <Display size="h1">Add food</Display>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>Every item gets a use-by date, even if you don’t type one.</Text>
          </View>
          <IconButton icon="close" label="Close" onPress={() => router.back()} />
        </View>
        <View style={styles.grid}>
          {OPTIONS.map((o) => (
            <Pressable
              key={o.path}
              onPress={() => go(o.path)}
              accessibilityRole="button"
              accessibilityLabel={`${o.title}. ${o.sub}`}
              style={({ pressed }) => [styles.tile, o.hero && styles.tileHero, { backgroundColor: o.color }, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <View style={styles.icon}><Ionicons name={o.icon} size={24} color={colors.ink} /></View>
              <View style={{ flex: o.hero ? 1 : undefined }}>
                <Text style={styles.title}>{o.title}</Text>
                <Text style={styles.sub}>{o.sub}</Text>
              </View>
              {o.hero ? <View style={styles.go}><Ionicons name="arrow-forward" size={20} color={colors.white} /></View> : null}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(19,34,26,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space(5), paddingTop: 10 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '30%', minHeight: 156, borderRadius: radius.lg, padding: space(4), justifyContent: 'space-between', gap: 10 },
  tileHero: { flexBasis: '100%', minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  sub: { fontSize: 12, color: colors.inkSoft, marginTop: 2, lineHeight: 16 },
  go: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
