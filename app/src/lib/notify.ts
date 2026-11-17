import { Platform } from 'react-native';

import { toast } from '../components/Toast';
import { RECIPES } from '../data/recipes';
import { addDays, daysBetween, today as todayISO } from './dates';
import { quickestRescue, suggestLocal } from './meals';
import type { InventoryItem, UserProfile } from './types';

// M20 — local scheduled nudges. Expo Go supports local notifications; web shows an in-app banner.

type NotificationsModule = typeof import('expo-notifications');
let N: NotificationsModule | null = null;
async function mod(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (!N) {
    N = await import('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
  }
  return N;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const n = await mod();
  if (!n) return true;
  const cur = await n.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await n.requestPermissionsAsync();
  return req.granted;
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

const short = (name: string) => name.replace(/\(.*?\)/g, '').replace(/^(amul|mother dairy|milky mist|britannia|modern|nandini|id|farm fresh)\s+/i, '').trim();

/** Morning nudge text: up to 3 items expiring within 1 day + the meal that uses them. */
export function buildMorningNudge(items: InventoryItem[], profile: UserProfile, date: string): { title: string; body: string } | null {
  const urgent = items
    .filter((i) => i.status === 'active')
    .map((i) => ({ i, d: daysBetween(date, i.effectiveExpiry) }))
    .filter((x) => x.d >= 0 && x.d <= 1)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  if (!urgent.length) return null;
  const names = urgent.map((u) => short(u.i.displayName));
  const when = urgent.every((u) => u.d === 0) ? 'expire today' : 'expire soon';
  const plans = suggestLocal(RECIPES, items, profile, date);
  const meal = plans.find((p) => p.best && p.best.usesItems.some((u) => urgent.some((x) => x.i.id === u.itemId)));
  const verb = names.length === 1 ? (when === 'expire today' ? 'expires today' : 'expires soon') : when;
  const body = meal?.best ? `${joinNames(names)} ${verb}. ${meal.best.title} for ${meal.slot}?` : `${joinNames(names)} ${verb}. Use them first today.`;
  return { title: 'FreshKeep', body };
}

export function buildEveningAlert(items: InventoryItem[], date: string): { title: string; body: string } | null {
  const today = items.filter((i) => i.status === 'active' && daysBetween(date, i.effectiveExpiry) === 0);
  if (!today.length) return null;
  const names = today.slice(0, 3).map((i) => short(i.displayName));
  return { title: 'Expires today', body: `${joinNames(names)}${today.length > 3 ? ` and ${today.length - 3} more` : ''} — still in the fridge. Check before eating.` };
}

function at(dateISO: string, hhmm: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi, 0);
}

/** Reschedule after every inventory change: next morning nudge and today's 6 PM alert. */
export async function rescheduleNudges(items: InventoryItem[], profile: UserProfile): Promise<void> {
  const n = await mod();
  if (!n) return;
  try {
    const perm = await n.getPermissionsAsync();
    if (!perm.granted) return;
    await n.cancelAllScheduledNotificationsAsync();
    const now = new Date();
    const today = todayISO(now);
    let morningDate = today;
    if (at(today, profile.nudgeTime) <= now) morningDate = addDays(today, 1);
    const morning = buildMorningNudge(items, profile, morningDate);
    if (morning) {
      await n.scheduleNotificationAsync({
        content: { ...morning, data: { url: '/meals' } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: at(morningDate, profile.nudgeTime) },
      });
    }
    const evening = buildEveningAlert(items, today);
    if (evening && at(today, '18:00') > now) {
      await n.scheduleNotificationAsync({
        content: { ...evening, data: { url: '/' } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: at(today, '18:00') },
      });
    }
  } catch {
    // notifications are best-effort
  }
}

/** Profile → Developer → "Send test nudge". */
export async function sendTestNudge(items: InventoryItem[], profile: UserProfile): Promise<void> {
  const date = todayISO();
  const msg = buildMorningNudge(items, profile, date) ?? {
    title: 'FreshKeep',
    body: (() => {
      const q = quickestRescue(RECIPES, items, profile, date);
      return q ? `Nothing urgent today. Fancy ${q.title.toLowerCase()}?` : 'Nothing expiring today — nice work.';
    })(),
  };
  const n = await mod();
  if (!n) {
    toast(msg.body, '🔔 ' + msg.title);
    return;
  }
  const ok = await requestNotificationPermission();
  if (!ok) {
    toast(msg.body, '🔔 ' + msg.title + ' (notifications are off)');
    return;
  }
  await n.scheduleNotificationAsync({
    content: { ...msg, data: { url: '/meals' } },
    trigger: { type: n.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
  });
  toast('Test nudge arrives in 3 seconds. Lock the phone to see it on the lock screen.');
}
