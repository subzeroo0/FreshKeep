import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STEP_META, StepBody, StepId } from '../components/ProfileSteps';
import { Button, Footer, Muted } from '../components/ui';
import { requestNotificationPermission } from '../lib/notify';
import { DEFAULT_PROFILE, useStore } from '../store/useStore';
import { colors, font, radius, space } from '../theme';

const STEPS: StepId[] = ['household', 'diet', 'goals', 'allergies', 'cuisines', 'kitchen', 'nudges'];

// M4 — about 2 minutes, every step skippable; the profile saves after each step.
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const profile = useStore((s) => s.profile);
  const { updateProfile, completeOnboarding } = useStore();
  const [i, setI] = useState(-1); // -1 welcome, STEPS.length = first items

  const finish = (then?: () => void) => {
    completeOnboarding();
    router.replace('/');
    if (then) setTimeout(then, 50);
  };

  if (i === -1)
    return (
      <View style={[styles.welcome, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 18) + 6 }]}>
        <Image source={require('../../assets/logo.png')} style={styles.welcomeLogo} contentFit="contain" tintColor={colors.lime} />
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Text style={styles.welcomeBrand}>FreshKeep</Text>
          <Text style={styles.welcomeHero}>Eat what{'\n'}you buy{'\n'}<Text style={{ color: colors.lime }}>before it{'\n'}expires</Text></Text>
          <View style={styles.featureRow}>
            {['🧾 Import orders', '⏳ Track expiry', '🍛 Cook it up'].map((f) => (
              <View key={f} style={styles.feature}><Text style={styles.featureText}>{f}</Text></View>
            ))}
          </View>
        </View>
        <Button title="Get started" icon="arrow-forward" onPress={() => setI(0)} style={{ marginTop: space(6) }} />
      </View>
    );

  if (i >= STEPS.length)
    return (
      <View style={[styles.page, { paddingTop: insets.top + 24 }]}>
        <ScrollView contentContainerStyle={{ padding: space(5) }}>
          <Text style={{ fontSize: 40 }}>🧊</Text>
          <Text style={[font.h1, { color: colors.text, marginTop: space(3) }]}>Let’s fill your fridge</Text>
          <Muted style={{ marginTop: 8, fontSize: 15 }}>The fastest start is your last grocery order — every item gets a date automatically.</Muted>
          <View style={{ gap: 10, marginTop: space(6) }}>
            <BigOption icon="🧾" title="Import your last grocery order" sub="Blinkit, Instamart or Zepto screenshot" onPress={() => finish(() => router.push('/add/import'))} />
            <BigOption icon="📦" title="Scan something from your fridge" sub="Barcode + the date on the pack" onPress={() => finish(() => router.push('/add/scan'))} />
            <BigOption icon="📷" title="Photograph a product" sub="No barcode? Snap the pack" onPress={() => finish(() => router.push('/add/product?photo=1'))} />
            <BigOption icon="🥬" title="Quick add loose items" sub="Veg, fruit, batter, leftovers" onPress={() => finish(() => router.push('/add/quick'))} />
          </View>
        </ScrollView>
        <Footer>
          <Button title="Skip for now" variant="ghost" onPress={() => finish()} />
        </Footer>
      </View>
    );

  const step = STEPS[i];
  const meta = STEP_META[step];
  const next = async () => {
    if (step === 'nudges') await requestNotificationPermission().catch(() => false);
    setI(i + 1);
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
      <View style={styles.progressRow}>
        <Pressable hitSlop={10} onPress={() => setI(i - 1)}>
          <Text style={{ color: colors.brand, fontWeight: '700' }}>Back</Text>
        </Pressable>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((i + 1) / STEPS.length) * 100}%` }]} />
        </View>
        <Pressable
          hitSlop={10}
          onPress={() => {
            // skipping sets sensible defaults for that step
            const d = DEFAULT_PROFILE;
            const defaults: Record<StepId, Partial<typeof d>> = {
              household: { householdSize: d.householdSize, mealsAtHome: d.mealsAtHome },
              diet: { dietType: d.dietType },
              goals: { goals: d.goals },
              allergies: {},
              cuisines: {},
              kitchen: { cookTimeWeekdayMin: d.cookTimeWeekdayMin, cookTimeWeekendMin: d.cookTimeWeekendMin, equipment: d.equipment },
              nudges: { nudgeTime: d.nudgeTime },
            };
            updateProfile(defaults[step]);
            setI(i + 1);
          }}
        >
          <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Skip</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 36 }}>{meta.icon}</Text>
        <Text style={[font.h1, { color: colors.text, marginTop: space(2) }]}>{meta.title}</Text>
        <Muted style={{ marginTop: 6, marginBottom: space(6), fontSize: 15 }}>{meta.subtitle}</Muted>
        <StepBody step={step} profile={profile} update={updateProfile} />
      </ScrollView>
      <Footer>
        <Button title={step === 'nudges' ? 'Turn on nudges' : 'Continue'} onPress={next} />
      </Footer>
    </View>
  );
}

function BigOption({ icon, title, sub, onPress }: { icon: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.big, pressed && { backgroundColor: colors.brandTint }]}>
      <Text style={{ fontSize: 28 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{title}</Text>
        <Muted>{sub}</Muted>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  welcome: { flex: 1, backgroundColor: colors.brandDark, paddingHorizontal: space(6) },
  welcomeLogo: { width: 120, height: 88 },
  welcomeBrand: { color: colors.textOnDarkMuted, fontSize: 14, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  welcomeHero: { fontFamily: font.display, fontSize: 64, lineHeight: 66, color: colors.white, textTransform: 'uppercase', marginTop: space(2) },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space(6) },
  feature: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  featureText: { color: colors.textOnDark, fontWeight: '600', fontSize: 13 },
  page: { flex: 1, backgroundColor: colors.bg },
  brand: { fontSize: 34, fontWeight: '800', color: colors.brand, letterSpacing: -0.8, marginTop: space(4) },
  tagline: { fontSize: 19, fontWeight: '600', color: colors.text, marginTop: 6, textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space(5), paddingVertical: 8 },
  progress: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.brandSoft, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.limeDeep, borderRadius: 4 },
  big: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: space(4), borderRadius: radius.lg, backgroundColor: colors.surface },
});
