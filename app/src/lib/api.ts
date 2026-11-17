import { useStore } from '../store/useStore';
import type { Category, MealSuggestion, Platform, Product, Slot, UserProfile } from './types';

// Thin client for the /server proxy. The Anthropic key never lives in the app.
// When no API URL is configured (offline mode), every call throws ApiOffline
// and the caller falls back to local logic.

export class ApiOffline extends Error {
  constructor() {
    super('No server configured');
  }
}

async function call<T>(path: string, init?: RequestInit, timeoutMs = 40000): Promise<T> {
  const base = useStore.getState().apiUrl;
  if (!base) throw new ApiOffline();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
    return body as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('The server took too long to answer');
    if (e instanceof TypeError) throw new Error('Can’t reach the FreshKeep server — check the connection');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export const api = {
  health: () => call<{ ok: boolean; ai: boolean }>('/health', undefined, 5000),

  product: (barcode: string) =>
    call<{ found: boolean; product?: Omit<Product, 'id' | 'source'> & { source?: Product['source'] } }>(`/products/${encodeURIComponent(barcode)}`),

  identifyProduct: (image: string) =>
    call<{ name: string; brand?: string; packSize?: string; category: Category; vegMark?: 'veg' | 'non_veg'; confidence: number }>(
      '/ai/identify-product', { method: 'POST', body: JSON.stringify({ image }) }),

  readDate: (image: string, productCategory: Category) =>
    call<{ rawText: string; dateType: string; isoDate?: string; bestBeforeMonths?: number; packedDate?: string; unsure: boolean }>(
      '/ai/read-date', { method: 'POST', body: JSON.stringify({ image, productCategory }) }),

  parseOrder: (images: string[]) =>
    call<{
      platform: Platform;
      orderedAt?: string;
      lines: { rawText: string; name: string; packSize?: string; quantity: number; pricePaise?: number; categoryGuess: Category; isFood: boolean }[];
    }>('/ai/parse-order', { method: 'POST', body: JSON.stringify({ images }) }, 90000),

  suggestMeals: (profile: Omit<UserProfile, 'name' | 'city' | 'id'>, items: { id: string; name: string; quantity: string; daysLeft: number }[], date: string, slots: Slot[]) =>
    call<{ meals: (Omit<MealSuggestion, 'id' | 'date' | 'rescueScore' | 'status' | 'usesItems'> & { usesItems: { itemId: string; amount: string; fraction: number }[] })[] }>(
      '/ai/suggest-meals', { method: 'POST', body: JSON.stringify({ profile, items, date, slots }) }, 90000),
};
