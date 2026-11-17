import { addDays, daysBetween, minISO, today as todayISO } from './dates';
import type { ExpiryConfidence, InventoryItem, LearnedShelfLife, Platform, ShelfLifeRule, Category } from './types';

export interface ExpiryInput {
  category: Category;
  productId?: string;
  purchasedAt: string;
  printedExpiry?: string;
  openedAt?: string;
  location: InventoryItem['location'];
  platform?: Platform;
}

export interface ExpiryResult {
  effectiveExpiry: string;
  estimatedExpiry: string;
  confidence: ExpiryConfidence;
  needsDateCheck: boolean;
}

export const MIN_LEARNED_SAMPLES = 5;

/**
 * M14 — pure expiry estimator.
 * Order of sources (first match wins): confirmed printed date → learned → category estimate.
 * Then overrides: freezer rule, opened = min(base, openedAt + openedDays).
 */
export function computeExpiry(
  item: ExpiryInput,
  rules: Record<Category, ShelfLifeRule>,
  learned: LearnedShelfLife[] = [],
  city?: string,
): ExpiryResult {
  const rule = rules[item.category] ?? rules.other;
  const estimatedExpiry = addDays(item.purchasedAt, rule.unopenedDays);

  let base: string;
  let confidence: ExpiryConfidence;

  const learnedRow =
    item.productId && item.platform
      ? learned.find(
          (l) =>
            l.productId === item.productId &&
            l.platform === item.platform &&
            (!city || l.city.toLowerCase() === city.toLowerCase()) &&
            l.sampleSize >= MIN_LEARNED_SAMPLES,
        )
      : undefined;

  if (item.printedExpiry) {
    base = item.printedExpiry;
    confidence = 'confirmed';
  } else if (learnedRow) {
    base = addDays(item.purchasedAt, learnedRow.medianDaysLeftAtDelivery);
    confidence = 'learned';
  } else {
    base = estimatedExpiry;
    confidence = 'estimated';
  }

  // Freezer: use the freezer row for that category instead (from the day it went in).
  if (item.location === 'freezer' && rule.freezerDays != null) {
    base = addDays(item.purchasedAt, rule.freezerDays);
  }

  let effective = base;
  if (item.openedAt && rule.openedDays != null && item.location !== 'freezer') {
    effective = minISO(base, addDays(item.openedAt, rule.openedDays));
  }

  const needsDateCheck = rule.perishable && confidence === 'estimated' && rule.unopenedDays <= 10;

  return { effectiveExpiry: effective, estimatedExpiry, confidence, needsDateCheck };
}

export type Urgency = 'today' | 'week' | 'fine' | 'expired';

export function daysLeft(effectiveExpiry: string, now: string = todayISO()): number {
  return daysBetween(now, effectiveExpiry);
}

/** Use today: ≤1 day. This week: 2–5. Fine: >5. Expired: <0. */
export function urgencyOf(days: number): Urgency {
  if (days < 0) return 'expired';
  if (days <= 1) return 'today';
  if (days <= 5) return 'week';
  return 'fine';
}

export function confidenceExplanation(item: Pick<InventoryItem, 'confidence' | 'category' | 'source' | 'openedAt'>, rule: ShelfLifeRule): string {
  const from = item.source === 'order_import' ? 'from delivery' : 'from purchase';
  if (item.confidence === 'confirmed') return 'Confirmed: from the date printed on the pack.';
  if (item.confidence === 'learned') return `Learned: how fresh this product usually arrives on this platform in your city.`;
  return `Estimated: ${rule.label.toLowerCase()} lasts about ${rule.unopenedDays} day${rule.unopenedDays === 1 ? '' : 's'} ${from}. Check the pack before eating.`;
}
