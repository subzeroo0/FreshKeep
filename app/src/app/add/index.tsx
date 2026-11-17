import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetAction } from '../../components/Sheet';
import { colors, font, radius } from '../../theme';

// M1 — the Add sheet: Scan item, Import order, Quick add.
export default function AddSheet() {
  const insets = useSafeAreaInsets();
  const go = (path: '/add/scan' | '/add/import' | '/add/quick') => {
    router.back();
    setTimeout(() => router.push(path), 10);
  };
  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} onPress={(e) => e.stopPropagation()}>
        <View style={styles.grab} />
        <Text style={[font.h2, { color: colors.text }]}>Add to your fridge</Text>
        <Text style={{ color: colors.textMuted, marginTop: 4, marginBottom: 12 }}>Every item gets a date — even if you don’t enter one.</Text>
        <SheetAction icon="receipt-outline" label="Import order" sub="Blinkit, Instamart or Zepto screenshot" onPress={() => go('/add/import')} />
        <SheetAction icon="barcode-outline" label="Scan item" sub="Barcode, then the expiry date" onPress={() => go('/add/scan')} />
        <SheetAction icon="flash-outline" label="Quick add" sub="Loose veg, fruit, batter or leftovers" onPress={() => go('/add/quick')} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,24,18,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 14 },
});
