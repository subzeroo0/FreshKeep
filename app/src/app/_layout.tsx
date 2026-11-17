import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '../components/Toast';
import { rescheduleNudges } from '../lib/notify';
import { useStore } from '../store/useStore';
import { colors } from '../theme';

function useNudgeScheduling() {
  const version = useStore((s) => s.inventoryVersion);
  const nudgeTime = useStore((s) => s.profile.nudgeTime);
  useEffect(() => {
    const t = setTimeout(() => {
      const { items, profile } = useStore.getState();
      rescheduleNudges(items, profile);
    }, 800);
    return () => clearTimeout(t);
  }, [version, nudgeTime]);

  // Tapping a nudge opens the relevant screen.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | undefined;
    import('expo-notifications').then((N) => {
      sub = N.addNotificationResponseReceivedListener((r) => {
        const url = r.notification.request.content.data?.url;
        if (typeof url === 'string') router.push(url as never);
      });
    });
    return () => sub?.remove();
  }, []);
}

export default function RootLayout() {
  const hydrated = useStore((s) => s.hydrated);
  useNudgeScheduling();
  useEffect(() => {
    // Safety net: never leave the spinner up if storage never answers.
    const t = setTimeout(() => useStore.setState({ hydrated: true }), 2000);
    return () => clearTimeout(t);
  }, []);

  const content = !hydrated ? (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.brand} />
    </View>
  ) : (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="add/index" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="item/[id]" />
      <Stack.Screen name="meal/[id]" />
    </Stack>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {Platform.OS === 'web' ? (
          <View style={web.page}>
            <View style={web.phone}>
              {content}
              <ToastHost />
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {content}
            <ToastHost />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// On the web prototype, render inside a phone-sized column so it reads as a mobile app.
const web = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#E9E6DC', alignItems: 'center', justifyContent: 'center' },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    maxHeight: 932,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 10px 40px rgba(24,36,27,0.18)' } as object) : {}),
  },
});
