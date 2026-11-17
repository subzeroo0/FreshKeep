import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../components/TabBar';
import { useStore } from '../../store/useStore';
import { colors } from '../../theme';

export default function TabsLayout() {
  const onboarded = useStore((s) => !!s.profile.onboardedAt);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Fridge' }} />
      <Tabs.Screen name="meals" options={{ title: 'Meals' }} />
      <Tabs.Screen name="new" options={{ title: 'Add' }} listeners={{ tabPress: (e) => e.preventDefault() }} />
      <Tabs.Screen name="impact" options={{ title: 'Impact' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
