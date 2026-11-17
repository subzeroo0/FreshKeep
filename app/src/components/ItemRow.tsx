import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { daysLeftLabel } from '../lib/dates';
import { daysLeft as calcDaysLeft, urgencyOf } from '../lib/expiry';
import { itemEmoji } from '../lib/shelfLife';
import type { InventoryItem } from '../lib/types';
import { categoryColor, colors, confidenceColors, radius, urgencyColors } from '../theme';

const THRESHOLD = 90;

export function formatQty(item: Pick<InventoryItem, 'quantity' | 'unit' | 'remainingFraction'>): string {
  const u = item.unit === 'pcs' ? (item.quantity === 1 ? 'pc' : 'pcs') : item.unit;
  const base = `${item.quantity} ${u}`;
  return item.remainingFraction < 1 ? `${base} · ${Math.round(item.remainingFraction * 100)}% left` : base;
}

/** Fridge row: colour tile with the item's emoji, name, quantity, days-left pill. Swipe right = used up, left = thrown out. */
export function ItemRow({ item, onPress, onLongPress, onSwipeRight, onSwipeLeft, now }: {
  item: InventoryItem;
  onPress: () => void;
  onLongPress?: () => void;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  now: string;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const d = calcDaysLeft(item.effectiveExpiry, now);
  const u = urgencyColors[urgencyOf(d)];
  const swipeEnabled = item.status === 'active' && (onSwipeLeft || onSwipeRight);
  const native = Platform.OS !== 'web';

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !!swipeEnabled && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => x.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx > THRESHOLD && onSwipeRight) {
          Animated.timing(x, { toValue: 500, duration: 160, useNativeDriver: native }).start(() => {
            onSwipeRight();
            x.setValue(0);
          });
          if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else if (g.dx < -THRESHOLD && onSwipeLeft) {
          Animated.timing(x, { toValue: -500, duration: 160, useNativeDriver: native }).start(() => {
            onSwipeLeft();
            x.setValue(0);
          });
          if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: native }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: native }).start(),
    }),
  ).current;

  const leftOpacity = x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const rightOpacity = x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const conf = confidenceColors[item.confidence];

  return (
    <View style={styles.wrap}>
      {swipeEnabled ? (
        <>
          <Animated.View style={[styles.under, { backgroundColor: colors.lime, opacity: leftOpacity }]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.ink} />
            <Text style={[styles.underText, { color: colors.ink }]}>Used up</Text>
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
          accessibilityRole="button"
          accessibilityLabel={`${item.displayName}, ${daysLeftLabel(d)}`}
          accessibilityHint="Swipe right when used up, left when thrown out, long-press for more"
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
        >
          <View style={[styles.icon, { backgroundColor: categoryColor[item.category] }]}>
            <Text style={{ fontSize: 26 }}>{itemEmoji(item.displayName, item.category)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
            <View style={styles.meta}>
              <Text style={styles.qty} numberOfLines={1}>
                {formatQty(item)}
                {item.location === 'freezer' ? ' · ❄️ Freezer' : item.location === 'pantry' ? ' · Pantry' : ''}
                {item.openedAt ? ' · Opened' : ''}
              </Text>
            </View>
            <View style={styles.confRow}>
              <View style={[styles.confDot, { backgroundColor: conf.fg }]} />
              <Text style={[styles.confText, { color: conf.fg }]}>{conf.label}</Text>
            </View>
          </View>
          <View style={[styles.days, { backgroundColor: u.bg }]}>
            <Text style={[styles.daysText, { color: u.fg }]}>{daysLeftLabel(d)}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: 10 },
  under: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 8 },
  underText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, paddingRight: 14, backgroundColor: colors.surface, borderRadius: radius.lg },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  meta: { flexDirection: 'row', marginTop: 2 },
  qty: { fontSize: 13, color: colors.textMuted },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  confDot: { width: 6, height: 6, borderRadius: 3 },
  confText: { fontSize: 11, fontWeight: '700' },
  days: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  daysText: { fontSize: 12, fontWeight: '800' },
});
