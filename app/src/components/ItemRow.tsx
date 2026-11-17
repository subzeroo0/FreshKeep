import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { daysLeftLabel } from '../lib/dates';
import { daysLeft as calcDaysLeft, urgencyOf } from '../lib/expiry';
import { itemEmoji } from '../lib/shelfLife';
import type { InventoryItem } from '../lib/types';
import { colors, radius, urgencyColors } from '../theme';
import { ConfidenceTag } from './ui';

const THRESHOLD = 90;

export function formatQty(item: Pick<InventoryItem, 'quantity' | 'unit' | 'remainingFraction'>): string {
  const u = item.unit === 'pcs' ? (item.quantity === 1 ? 'pc' : 'pcs') : item.unit;
  const base = `${item.quantity} ${u}`;
  return item.remainingFraction < 1 ? `${base} · ${Math.round(item.remainingFraction * 100)}% left` : base;
}

export function ItemRow({ item, onPress, onLongPress, onSwipeRight, onSwipeLeft, now }: {
  item: InventoryItem;
  onPress: () => void;
  onLongPress?: () => void;
  onSwipeRight?: () => void; // used up
  onSwipeLeft?: () => void; // thrown out
  now: string;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const d = calcDaysLeft(item.effectiveExpiry, now);
  const u = urgencyColors[urgencyOf(d)];
  const swipeEnabled = item.status === 'active' && (onSwipeLeft || onSwipeRight);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !!swipeEnabled && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => x.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx > THRESHOLD && onSwipeRight) {
          Animated.timing(x, { toValue: 500, duration: 160, useNativeDriver: Platform.OS !== 'web' }).start(() => {
            onSwipeRight();
            x.setValue(0);
          });
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else if (g.dx < -THRESHOLD && onSwipeLeft) {
          Animated.timing(x, { toValue: -500, duration: 160, useNativeDriver: Platform.OS !== 'web' }).start(() => {
            onSwipeLeft();
            x.setValue(0);
          });
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start(),
    }),
  ).current;

  const leftOpacity = x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const rightOpacity = x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.wrap}>
      {swipeEnabled ? (
        <>
          <Animated.View style={[styles.under, { backgroundColor: colors.ok, opacity: leftOpacity }]}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.underText}>Used up</Text>
          </Animated.View>
          <Animated.View style={[styles.under, { backgroundColor: colors.danger, justifyContent: 'flex-end', opacity: rightOpacity }]}>
            <Text style={styles.underText}>Thrown out</Text>
            <Ionicons name="trash" size={20} color="#fff" />
          </Animated.View>
        </>
      ) : null}
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#FBFAF6' }]}
        >
          <View style={[styles.icon, { backgroundColor: u.bg }]}>
            <Text style={{ fontSize: 22 }}>{itemEmoji(item.displayName, item.category)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
            <View style={styles.meta}>
              <Text style={styles.qty} numberOfLines={1}>{formatQty(item)}</Text>
              {item.location !== 'fridge' ? <Text style={styles.qty}>· {item.location === 'freezer' ? '❄️ Freezer' : 'Pantry'}</Text> : null}
              {item.openedAt ? <Text style={styles.qty}>· Opened</Text> : null}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={[styles.days, { color: u.fg }]}>{daysLeftLabel(d)}</Text>
            <ConfidenceTag confidence={item.confidence} small />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: 'hidden', marginBottom: 8 },
  under: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  underText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { flexDirection: 'row', gap: 4, marginTop: 2 },
  qty: { fontSize: 13, color: colors.textMuted },
  days: { fontSize: 13, fontWeight: '700' },
});
