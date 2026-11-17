import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadowStrong } from '../theme';

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { on: 'snow', off: 'snow-outline', label: 'Fridge' },
  meals: { on: 'restaurant', off: 'restaurant-outline', label: 'Meals' },
  impact: { on: 'leaf', off: 'leaf-outline', label: 'Impact' },
  profile: { on: 'person', off: 'person-outline', label: 'Profile' },
};

/** Floating dark pill tab bar. The active tab expands into a lime pill with its label; the centre button opens Add. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={[styles.bar, shadowStrong]}>
        {state.routes.map((route, index) => {
          if (route.name === 'new') {
            return (
              <Pressable key={route.key} accessibilityRole="button" accessibilityLabel="Add items" onPress={() => router.push('/add')} style={({ pressed }) => [styles.add, pressed && { transform: [{ scale: 0.94 }] }]}>
                <Ionicons name="add" size={30} color={colors.ink} />
              </Pressable>
            );
          }
          const meta = ICONS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={() => {
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              }}
              style={[styles.tab, focused && styles.tabOn]}
            >
              <Ionicons name={focused ? meta.on : meta.off} size={21} color={focused ? colors.ink : colors.textOnDarkMuted} />
              {focused ? <Text style={styles.label}>{meta.label}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    borderRadius: 999,
    padding: 7,
    width: '100%',
    maxWidth: 420,
    gap: 4,
  },
  tab: { height: 50, minWidth: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  tabOn: { backgroundColor: colors.lime, paddingHorizontal: 16 },
  label: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  add: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
