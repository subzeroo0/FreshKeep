import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatTime, STEP_META, StepId } from '../../components/ProfileSteps';
import { toast } from '../../components/Toast';
import { Button, Card, Muted, SectionTitle } from '../../components/ui';
import { api } from '../../lib/api';
import { sendTestNudge } from '../../lib/notify';
import { useStore } from '../../store/useStore';
import { colors, font, radius, space } from '../../theme';

const confirm = (title: string, msg: string, onYes: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) onYes();
  } else {
    Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', style: 'destructive', onPress: onYes }]);
  }
};

// M5 profile + M20/M22 developer tools.
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useStore((s) => s.profile);
  const items = useStore((s) => s.items);
  const apiUrl = useStore((s) => s.apiUrl);
  const { updateProfile, loadDemo, resetApp, setApiUrl } = useStore();
  const [url, setUrl] = useState(apiUrl);
  const [checking, setChecking] = useState(false);
  const [name, setName] = useState(profile.name ?? '');
  const [status, setStatus] = useState<'checking' | 'ai' | 'nokey' | 'down' | undefined>();
  useEffect(() => {
    if (!apiUrl) return setStatus(undefined);
    setStatus('checking');
    api.health().then((h) => setStatus(h.ai ? 'ai' : 'nokey')).catch(() => setStatus('down'));
  }, [apiUrl]);

  const summary: Record<StepId, string> = {
    household: `${profile.householdSize} ${profile.householdSize === 1 ? 'person' : 'people'} · ${(['breakfast', 'lunch', 'dinner'] as const).filter((m) => profile.mealsAtHome[m]).join(', ') || 'no meals'}`,
    diet: profile.dietType.replace('_', '-').replace(/^\w/, (c) => c.toUpperCase()),
    goals: profile.goals.map((g) => g.replace('_', ' ')).join(', ') || 'None',
    allergies: [...profile.allergies, ...profile.dislikes.map((d) => `no ${d}`)].join(', ') || 'None',
    cuisines: profile.cuisines.map((c) => c.replace('_', ' ')).join(', ') || 'Any',
    kitchen: `${profile.cookTimeWeekdayMin} / ${profile.cookTimeWeekendMin} min · ${profile.equipment.length} appliances`,
    nudges: formatTime(profile.nudgeTime),
  };

  const checkServer = async () => {
    setApiUrl(url);
    if (!url.trim()) return toast('Server removed — using offline mode');
    setChecking(true);
    try {
      const h = await api.health();
      setStatus(h.ai ? 'ai' : 'nokey');
      toast(h.ai ? 'Connected — AI features on ✨' : 'Connected, but the server has no API key yet');
    } catch (e) {
      setStatus('down');
      toast(`Couldn’t reach the server: ${e instanceof Error ? e.message : 'error'}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(4), paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Text style={[font.h1, { color: colors.text }]}>Profile</Text>

        <Card style={{ marginTop: space(4), flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.avatar}><Text style={{ fontSize: 22 }}>🧑‍🍳</Text></View>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => updateProfile({ name: name.trim() || undefined })}
            placeholder="Your name (stays on this phone)"
            placeholderTextColor={colors.textFaint}
            style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text, paddingVertical: 6 }}
          />
        </Card>

        <SectionTitle>Food preferences</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>
          {(Object.keys(STEP_META) as StepId[]).map((k, i) => (
            <Pressable key={k} onPress={() => router.push(`/profile/${k}`)} style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && { opacity: 0.7 }]}>
              <Text style={{ fontSize: 20 }}>{STEP_META[k].icon}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>{STEP_META[k].title}</Text>
                <Muted style={{ fontSize: 12 }}>{summary[k]}</Muted>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ))}
        </Card>
        <Muted style={{ marginTop: 6, fontSize: 12 }}>Changing your diet, allergies or goals refreshes today’s meal ideas.</Muted>

        <SectionTitle>Developer · demo</SectionTitle>
        <Card style={{ gap: 10 }}>
          <Button title="Load demo fridge" icon="sparkles" variant="secondary" onPress={() => { loadDemo(); toast('Demo fridge loaded — 18 items and a month of history'); router.navigate('/'); }} />
          <Button title="Send test nudge" icon="notifications-outline" variant="outline" onPress={() => sendTestNudge(items, profile)} />
          <Button title="Reset app" icon="refresh" variant="danger" onPress={() => confirm('Reset FreshKeep?', 'This clears your fridge, history and profile on this device.', () => { resetApp(); router.replace('/onboarding'); })} />
        </Card>

        <SectionTitle>AI server</SectionTitle>
        <Card>
          <Muted>Connect the FreshKeep server to read order screenshots, printed dates and plan meals with Claude. Without it, the app runs fully offline.</Muted>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://your-freshkeep-server.example"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Button title={apiUrl ? 'Save & test' : 'Connect'} small loading={checking} onPress={checkServer} style={{ marginTop: 10 }} />
          <Text style={{ marginTop: 10, fontSize: 12, fontWeight: '600', color: status === 'ai' ? colors.ok : status === 'down' ? colors.danger : status === 'nokey' ? colors.warn : colors.textMuted }}>
            {!apiUrl
              ? '○ Offline mode — demo recipes and manual entry'
              : status === 'ai'
                ? `● Connected · AI on · ${apiUrl}`
                : status === 'nokey'
                  ? `● Connected, but the server has no ANTHROPIC_API_KEY`
                  : status === 'down'
                    ? `● Can’t reach ${apiUrl} (a free server may take ~50 s to wake up — tap Save & test again)`
                    : `○ Checking ${apiUrl}…`}
          </Text>
        </Card>

        <Muted style={{ textAlign: 'center', marginTop: space(8), fontSize: 12 }}>FreshKeep MVP · dates are guidance, always check before eating</Muted>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  input: { marginTop: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text },
});
