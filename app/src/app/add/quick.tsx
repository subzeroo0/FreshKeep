import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import { toast } from '../../components/Toast';
import { Button, Card, Chip, DateInput, Field, Muted, Screen, SectionTitle, Stepper, TopBar } from '../../components/ui';
import { QUICK_ADD_CHIPS } from '../../data/catalogue';
import { addDays, formatDate, today as todayISO } from '../../lib/dates';
import { guessCategory } from '../../lib/match';
import { CATEGORY_EMOJI, SHELF_LIFE_RULES } from '../../lib/shelfLife';
import type { Category, Location, Unit } from '../../lib/types';
import { useStore } from '../../store/useStore';
import { colors, font, radius, space } from '../../theme';

const UNITS: Unit[] = ['pcs', 'bunch', 'g', 'kg', 'ml', 'l', 'pack'];

// M10 — manual and quick add: "spinach, 1 bunch" in 3 taps.
export default function QuickAdd() {
  const addItem = useStore((s) => s.addItem);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<(typeof QUICK_ADD_CHIPS)[number] | null>(null);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<Unit>('pcs');
  const [location, setLocation] = useState<Location>('fridge');
  const [leftover, setLeftover] = useState(false);
  const [dish, setDish] = useState('');
  const [expiry, setExpiry] = useState<string | undefined>();
  const [showDate, setShowDate] = useState(false);
  const [added, setAdded] = useState<string[]>([]);

  const chips = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? QUICK_ADD_CHIPS.filter((c) => c.name.toLowerCase().includes(q)) : QUICK_ADD_CHIPS;
  }, [query]);

  const name = leftover ? (dish.trim() ? `${dish.trim()} (leftover)` : '') : selected?.name ?? query.trim();
  const category: Category = leftover ? 'leftovers' : selected?.category ?? guessCategory(query);
  const rule = SHELF_LIFE_RULES[category];
  const estimate = addDays(todayISO(), location === 'freezer' && rule.freezerDays ? rule.freezerDays : rule.unopenedDays);

  const pick = (c: (typeof QUICK_ADD_CHIPS)[number]) => {
    setSelected(c);
    setQuery(c.name);
    setUnit(c.unit);
    setQty(c.qty);
    setLeftover(false);
  };

  const step = unit === 'g' || unit === 'ml' ? 50 : 1;

  const save = (another: boolean) => {
    if (!name) return;
    addItem({
      displayName: name,
      category,
      quantity: leftover ? 1 : qty,
      unit: leftover ? 'pcs' : unit,
      location,
      printedExpiry: expiry,
      source: leftover ? 'leftover' : 'quick_add',
      pricePaise: selected?.pricePaise ? (unit === selected.unit ? Math.round((selected.pricePaise * qty) / selected.qty) : selected.pricePaise) : undefined,
    });
    if (another) {
      setAdded((a) => [name, ...a]);
      setSelected(null);
      setQuery('');
      setDish('');
      setExpiry(undefined);
      setShowDate(false);
      setLeftover(false);
      toast(`${name} added`);
    } else {
      toast(added.length ? `${added.length + 1} items added` : `${name} added · ${expiry ? 'Confirmed' : 'Estimated'} date`);
      router.dismissTo('/');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Quick add" subtitle={added.length ? `${added.length} added so far` : 'Loose veg, fruit, batter and leftovers'} back />
      <Screen
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Add another" variant="outline" disabled={!name} style={{ flex: 1 }} onPress={() => save(true)} />
            <Button title="Add to fridge" icon="checkmark" disabled={!name} style={{ flex: 1.3 }} onPress={() => save(false)} />
          </View>
        }
      >
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <Text style={{ fontSize: 22 }}>🍲</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Leftover</Text>
            <Muted>Cooked food gets a 2-day fridge life</Muted>
          </View>
          <Switch value={leftover} onValueChange={setLeftover} trackColor={{ true: colors.brand, false: colors.border }} thumbColor="#fff" />
        </Card>

        {leftover ? (
          <Field label="What dish?" value={dish} onChangeText={setDish} placeholder="e.g. Rajma, sambar, biryani" style={{ marginTop: space(4) }} autoFocus />
        ) : (
          <>
            <TextInput
              value={query}
              onChangeText={(s) => {
                setQuery(s);
                if (selected && s !== selected.name) setSelected(null);
              }}
              placeholder="Search or type an item…"
              placeholderTextColor={colors.textFaint}
              style={{
                marginTop: space(4),
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 16,
                color: colors.text,
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space(3) }}>
              {chips.map((c) => (
                <Chip key={c.name} icon={CATEGORY_EMOJI[c.category]} label={c.name} selected={selected?.name === c.name} onPress={() => pick(c)} />
              ))}
            </View>
            {query && !selected ? (
              <Muted style={{ marginTop: 8 }}>
                Category: {CATEGORY_EMOJI[category]} {rule.label}
              </Muted>
            ) : null}
          </>
        )}

        {name ? (
          <>
            {!leftover ? (
              <>
                <SectionTitle>Quantity</SectionTitle>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Stepper value={qty} min={step === 50 ? 50 : 1} max={5000} step={step} onChange={setQty} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                    {UNITS.map((u) => (
                      <Pressable key={u} onPress={() => { setUnit(u); setQty(u === 'g' || u === 'ml' ? 250 : 1); }}
                        style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: unit === u ? colors.brand : colors.card, borderWidth: 1, borderColor: unit === u ? colors.brand : colors.border }}>
                        <Text style={{ color: unit === u ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{u}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            <SectionTitle>Where?</SectionTitle>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['fridge', 'freezer', 'pantry'] as Location[]).map((l) => (
                <Chip key={l} label={l === 'fridge' ? '🧊 Fridge' : l === 'freezer' ? '❄️ Freezer' : '🗄️ Pantry'} selected={location === l} onPress={() => setLocation(l)} />
              ))}
            </View>

            <Card style={{ marginTop: space(5) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[font.small, { color: colors.textMuted }]}>{expiry ? 'Your date' : 'Estimated use-by'}</Text>
                  <Text style={[font.h3, { color: colors.text, marginTop: 2 }]}>{formatDate(expiry ?? estimate)}</Text>
                </View>
                <Button title={showDate ? 'Hide' : 'Set date'} small variant="secondary" onPress={() => setShowDate((v) => !v)} />
              </View>
              {showDate ? <View style={{ marginTop: space(4) }}><DateInput value={expiry} onChange={setExpiry} label="Date (optional)" category={category} /></View> : null}
            </Card>
          </>
        ) : null}
      </Screen>
    </View>
  );
}
