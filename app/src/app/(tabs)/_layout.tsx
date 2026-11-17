import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../../store/useStore';
import { colors, shadow } from '../../theme';

export default function TabsLayout() {
  const onboarded = useStore((s) => !!s.profile.onboardedAt);
  const insets = useSafeAreaInsets();
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Fridge', tabBarIcon: ({ color, size }) => <Ionicons name="snow-outline" size={size} color={color as string} /> }}
      />
      <Tabs.Screen
        name="meals"
        options={{ title: 'Meals', tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color as string} /> }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Add items',
          tabBarButton: () => (
            <View style={styles.addWrap}>
              <Pressable
                accessibilityLabel="Add items"
                onPress={() => router.push('/add')}
                style={({ pressed }) => [styles.addBtn, shadow, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                <Ionicons name="add" size={32} color={colors.white} />
              </Pressable>
            </View>
          ),
        }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tabs.Screen
        name="impact"
        options={{ title: 'Impact', tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color as string} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color as string} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  addBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    borderWidth: 4,
    borderColor: colors.bg,
  },
});
