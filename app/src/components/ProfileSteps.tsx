import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { DietType, Equipment, Goal, UserProfile } from '../lib/types';
import { colors, font, radius, space } from '../theme';
import { Chip, Muted, Stepper, styles as ui } from './ui';

// Step components shared by onboarding (M4) and profile editing (M5).

export type StepId = 'household' | 'diet' | 'goals' | 'allergies' | 'cuisines' | 'kitchen' | 'nudges';

export const STEP_META: Record<StepId, { title: string; subtitle: string; icon: string }> = {
  household: { title: 'Who eats at home?', subtitle: 'So portions and meal ideas fit your household.', icon: '🏠' },
  diet: { title: 'How do you eat?', subtitle: 'We never suggest anything outside your diet.', icon: '🥗' },
  goals: { title: 'Any goals?', subtitle: 'Pick as many as you like.', icon: '🎯' },
  allergies: { title: 'Allergies and dislikes', subtitle: 'Allergens are filtered out in code, not just asked politely.', icon: '🚫' },
  cuisines: { title: 'Cuisines you cook', subtitle: 'We’ll lean towards these.', icon: '🍛' },
  kitchen: { title: 'Time and kitchen', subtitle: 'How long you can cook, and what you cook with.', icon: '⏱️' },
  nudges: { title: 'Morning nudge', subtitle: 'One short reminder about what to eat first. No spam.', icon: '🔔' },
};

const DIETS: { key: DietType; label: string; sub: string }[] = [
  { key: 'vegetarian', label: 'Vegetarian', sub: 'No meat, fish or egg' },
  { key: 'eggetarian', label: 'Eggetarian', sub: 'Vegetarian + eggs' },
  { key: 'jain', label: 'Jain', sub: 'No onion, garlic or root vegetables' },
  { key: 'vegan', label: 'Vegan', sub: 'No dairy, egg or honey' },
  { key: 'non_vegetarian', label: 'Non-vegetarian', sub: 'Everything' },
  { key: 'pescatarian', label: 'Pescatarian', sub: 'Vegetarian + fish' },
];
const GOALS: { key: Goal; label: string }[] = [
  { key: 'balanced', label: '⚖️ Balanced' }, { key: 'high_protein', label: '💪 High protein' }, { key: 'low_carb', label: '🥦 Low carb' },
  { key: 'keto', label: '🥑 Keto' }, { key: 'weight_loss', label: '🏃 Weight loss' }, { key: 'diabetic_friendly', label: '🩺 Diabetic-friendly' },
];
const ALLERGIES = ['peanut', 'lactose', 'gluten', 'soy', 'shellfish', 'egg', 'tree_nuts'];
const CUISINES = [
  { key: 'south_indian', label: 'South Indian' }, { key: 'north_indian', label: 'North Indian' }, { key: 'gujarati', label: 'Gujarati' },
  { key: 'bengali', label: 'Bengali' }, { key: 'maharashtrian', label: 'Maharashtrian' }, { key: 'continental', label: 'Continental' }, { key: 'asian', label: 'Asian' },
];
const EQUIPMENT: { key: Equipment; label: string }[] = [
  { key: 'stove', label: '🔥 Stove' }, { key: 'pressure_cooker', label: '♨️ Pressure cooker' }, { key: 'microwave', label: '📻 Microwave' },
  { key: 'oven', label: '🍞 Oven' }, { key: 'air_fryer', label: '🌀 Air fryer' }, { key: 'mixer_grinder', label: '🌪️ Mixer grinder' },
];
const TIMES = [10, 20, 30, 45, 60];
const NUDGE_TIMES = ['07:00', '07:30', '08:00', '08:30', '09:00', '10:00'];

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function StepBody({ step, profile, update }: { step: StepId; profile: UserProfile; update: (p: Partial<UserProfile>) => void }) {
  switch (step) {
    case 'household':
      return (
        <View>
          <Row title="People">
            <Stepper value={profile.householdSize} min={1} max={8} onChange={(householdSize) => update({ householdSize })} />
          </Row>
          <Text style={[ui.label, { marginTop: space(6) }]}>Meals eaten at home</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
              <Chip key={m} label={label(m)} selected={profile.mealsAtHome[m]} onPress={() => update({ mealsAtHome: { ...profile.mealsAtHome, [m]: !profile.mealsAtHome[m] } })} />
            ))}
          </View>
          <View style={{ marginTop: space(6) }}>
            <Text style={ui.label}>City (for freshness data — never sent to AI)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune'].map((c) => (
                <Chip key={c} label={c} selected={profile.city === c} onPress={() => update({ city: c })} />
              ))}
            </View>
          </View>
        </View>
      );
    case 'diet':
      return (
        <View style={{ gap: 8 }}>
          {DIETS.map((d) => {
            const sel = profile.dietType === d.key;
            return (
              <Pressable key={d.key} onPress={() => update({ dietType: d.key })} style={[optionStyle, sel && { borderColor: colors.brand, backgroundColor: colors.brandTint }]}>
                <View style={[radioStyle, sel && { borderColor: colors.brand }]}>{sel ? <View style={radioDot} /> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>{d.label}</Text>
                  <Muted>{d.sub}</Muted>
                </View>
              </Pressable>
            );
          })}
        </View>
      );
    case 'goals':
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GOALS.map((g) => (
            <Chip key={g.key} label={g.label} selected={profile.goals.includes(g.key)} onPress={() => update({ goals: toggle(profile.goals, g.key) })} />
          ))}
        </View>
      );
    case 'allergies':
      return <AllergyStep profile={profile} update={update} />;
    case 'cuisines':
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CUISINES.map((c) => (
            <Chip key={c.key} label={c.label} selected={profile.cuisines.includes(c.key)} onPress={() => update({ cuisines: toggle(profile.cuisines, c.key) })} />
          ))}
        </View>
      );
    case 'kitchen':
      return (
        <View>
          <Text style={ui.label}>Weekday cooking time</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIMES.map((t) => <Chip key={t} label={`${t} min`} selected={profile.cookTimeWeekdayMin === t} onPress={() => update({ cookTimeWeekdayMin: t })} />)}
          </View>
          <Text style={[ui.label, { marginTop: space(5) }]}>Weekend cooking time</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIMES.map((t) => <Chip key={t} label={`${t} min`} selected={profile.cookTimeWeekendMin === t} onPress={() => update({ cookTimeWeekendMin: t })} />)}
          </View>
          <Text style={[ui.label, { marginTop: space(5) }]}>Equipment</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {EQUIPMENT.map((e) => <Chip key={e.key} label={e.label} selected={profile.equipment.includes(e.key)} onPress={() => update({ equipment: toggle(profile.equipment, e.key) })} />)}
          </View>
        </View>
      );
    case 'nudges':
      return (
        <View>
          <Text style={ui.label}>Send my nudge at</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {NUDGE_TIMES.map((t) => <Chip key={t} label={formatTime(t)} selected={profile.nudgeTime === t} onPress={() => update({ nudgeTime: t })} />)}
          </View>
          <View style={{ marginTop: space(5), padding: space(4), backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
            <Text style={[font.small, { color: colors.textMuted }]}>Example</Text>
            <Text style={{ color: colors.text, marginTop: 4, fontWeight: '600' }}>“Curd and spinach expire tomorrow. Palak raita for lunch?”</Text>
          </View>
        </View>
      );
  }
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function AllergyStep({ profile, update }: { profile: UserProfile; update: (p: Partial<UserProfile>) => void }) {
  const [text, setText] = useState('');
  const custom = profile.allergies.filter((a) => !ALLERGIES.includes(a));
  return (
    <View>
      <Text style={ui.label}>Allergies</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[...ALLERGIES, ...custom].map((a) => (
          <Chip key={a} label={label(a)} tone="danger" selected={profile.allergies.includes(a)} onPress={() => update({ allergies: toggle(profile.allergies, a) })} />
        ))}
      </View>
      <Text style={[ui.label, { marginTop: space(6) }]}>Dislikes (comma separated)</Text>
      <TextInput
        value={text || profile.dislikes.join(', ')}
        onChangeText={(s) => {
          setText(s);
          update({ dislikes: s.split(',').map((x) => x.trim()).filter(Boolean) });
        }}
        placeholder="e.g. brinjal, mushroom, karela"
        placeholderTextColor={colors.textFaint}
        style={[ui.inputWrap, ui.inputText, { borderRadius: 16 }]}
      />
    </View>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[font.h3, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const optionStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card };
const radioStyle = { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textFaint, alignItems: 'center' as const, justifyContent: 'center' as const };
const radioDot = { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.brand };
