import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, space } from '../theme';
import type { IconName } from './ui';

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grab} />
          {title ? <Text style={[font.h2, { color: colors.text, marginBottom: space(4) }]} numberOfLines={2}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SheetAction({ icon, label, sub, onPress, tone }: { icon: IconName; label: string; sub?: string; onPress: () => void; tone?: 'danger' }) {
  const fg = tone === 'danger' ? colors.danger : colors.ink;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.brandTint }]}>
      <View style={[styles.actionIcon, { backgroundColor: tone === 'danger' ? colors.dangerSoft : colors.limeSoft }]}>
        <Ionicons name={icon} size={22} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionLabel}>{label}</Text>
        {sub ? <Text style={styles.actionSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(19,34,26,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 12, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: 8 },
  actionIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  actionSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
