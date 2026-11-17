import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { colors, radius, shadow } from '../theme';

interface ToastState {
  message?: string;
  title?: string;
  action?: { label: string; onPress: () => void };
  key: number;
  show: (t: { message: string; title?: string; action?: { label: string; onPress: () => void } }) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  key: 0,
  show: (t) => set((s) => ({ ...t, action: t.action, key: s.key + 1 })),
  hide: () => set({ message: undefined, title: undefined, action: undefined }),
}));

export const toast = (message: string, title?: string, action?: { label: string; onPress: () => void }) =>
  useToast.getState().show({ message, title, action });

/** In-app banner — used for "undo" after swipes and to show nudges on web where OS notifications are unavailable. */
export function ToastHost() {
  const { message, title, action, key, hide } = useToast();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, title ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [key, message, title, hide]);
  if (!message) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable onPress={hide} style={[styles.toast, shadow]}>
        <View style={{ flex: 1 }}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={styles.msg}>{message}</Text>
        </View>
        {action ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              action.onPress();
              hide();
            }}
          >
            <Text style={styles.action}>{action.label}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 1000, alignItems: 'center' },
  toast: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: colors.lime, fontWeight: '700', fontSize: 13, marginBottom: 2 },
  msg: { color: colors.white, fontSize: 14, lineHeight: 19 },
  action: { color: colors.ink, fontWeight: '800', fontSize: 13, backgroundColor: colors.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: 'hidden' },
});
