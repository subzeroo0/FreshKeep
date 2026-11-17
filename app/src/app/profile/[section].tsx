import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { STEP_META, StepBody, StepId } from '../../components/ProfileSteps';
import { Button, Muted, Screen, TopBar } from '../../components/ui';
import { requestNotificationPermission } from '../../lib/notify';
import { useStore } from '../../store/useStore';
import { colors, space } from '../../theme';

// M5 — edit any onboarding answer using the same step components.
export default function EditSection() {
  const { section } = useLocalSearchParams<{ section: StepId }>();
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const meta = STEP_META[section] ?? STEP_META.diet;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={meta.title} back />
      <Screen footer={<Button title="Done" onPress={async () => {
        if (section === 'nudges') await requestNotificationPermission().catch(() => false);
        router.back();
      }} />}>
        <Muted style={{ marginBottom: space(5) }}>{meta.subtitle} Changes save as you tap.</Muted>
        <StepBody step={section} profile={profile} update={updateProfile} />
      </Screen>
    </View>
  );
}
