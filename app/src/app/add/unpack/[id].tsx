import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { toast } from '../../../components/Toast';
import { Button, Card, ConfidenceTag, DateInput, Muted, Screen, TopBar } from '../../../components/ui';
import { formatDate } from '../../../lib/dates';
import { itemEmoji } from '../../../lib/shelfLife';
import { useStore } from '../../../store/useStore';
import { colors, space } from '../../../theme';

// M15 screen 2 — unpack checklist: only perishable items with an estimated date.
export default function Unpack() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allItems = useStore((s) => s.items);
  const items = useMemo(() => allItems.filter((i) => i.orderImportId === id && i.status === 'active' && i.needsDateCheck), [allItems, id]);
  const [initialCount] = useState(items.length);
  const { setPrintedDate, updateItem } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [date, setDate] = useState<string | undefined>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title={items.length ? `${items.length} worth checking` : 'All set'}
        subtitle="When you unpack — the rest keep their estimates"
      />
      <Screen footer={<Button title={items.length ? 'Done for now' : 'Go to my fridge'} onPress={() => router.dismissTo('/')} />}>
        {items.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: space(8) }}>
            <Text style={{ fontSize: 44 }}>✅</Text>
            <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text, marginTop: 8 }}>Everything is dated</Text>
            <Muted style={{ textAlign: 'center', marginTop: 4 }}>{initialCount ? `${initialCount} dates checked.` : ''} Your fridge is sorted by what to eat first.</Muted>
          </Card>
        ) : (
          <Muted style={{ marginBottom: space(4) }}>These spoil fastest, so a printed date helps most. Long-life items keep their estimate without asking.</Muted>
        )}
        {items.map((i) => (
          <Card key={i.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 26 }}>{itemEmoji(i.displayName, i.category)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{i.displayName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <ConfidenceTag confidence={i.confidence} small />
                  <Muted style={{ fontSize: 12 }}>{formatDate(i.effectiveExpiry)}</Muted>
                </View>
              </View>
            </View>
            {open === i.id ? (
              <View style={{ marginTop: space(4) }}>
                <DateInput value={date} onChange={setDate} category={i.category} />
                <Button title="Save date" disabled={!date} style={{ marginTop: space(3) }} onPress={() => {
                  setPrintedDate(i.id, date);
                  setOpen(null);
                  setDate(undefined);
                  toast(`${i.displayName} → Confirmed`);
                }} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: space(3) }}>
                <Button small title="Enter date" icon="calendar-outline" style={{ flex: 1 }} onPress={() => { setOpen(i.id); setDate(undefined); }} />
                <Button small title="Looks fine" variant="outline" style={{ flex: 1 }} onPress={() => updateItem(i.id, { needsDateCheck: false })} />
              </View>
            )}
          </Card>
        ))}
      </Screen>
    </View>
  );
}
