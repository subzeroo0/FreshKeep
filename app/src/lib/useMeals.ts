import { useCallback, useEffect, useMemo, useState } from 'react';

import { RECIPES } from '../data/recipes';
import { useStore } from '../store/useStore';
import { api } from './api';
import { today as todayISO } from './dates';
import { checkHardRules, daysLeftMap, rescueScore, selectMeals, SlotPlan, suggestLocal } from './meals';
import type { MealSuggestion, Slot } from './types';

// Every meal shown anywhere is registered so the detail screen can open it by id.
const registry = new Map<string, MealSuggestion>();
export const registerMeals = (ms: (MealSuggestion | undefined)[]) => ms.forEach((m) => m && registry.set(m.id, m));
export const getMeal = (id: string) => registry.get(id) ?? useStore.getState().cookedMeals.find((m) => m.id === id);

/**
 * M18 — today's B/L/D. Uses the AI server when configured (cached per day, regenerated when
 * inventory changes by more than 3 items or on pull-to-refresh); otherwise the offline library.
 * Hard rules and the rescue score are always applied in code.
 */
export function useMeals() {
  const items = useStore((s) => s.items);
  const profile = useStore((s) => s.profile);
  const apiUrl = useStore((s) => s.apiUrl);
  const version = useStore((s) => s.inventoryVersion);
  const cache = useStore((s) => s.mealCache);
  const setMealCache = useStore((s) => s.setMealCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const date = todayISO();
  const slots = (['breakfast', 'lunch', 'dinner'] as Slot[]).filter((s) => profile.mealsAtHome[s]);

  const fetchAI = useCallback(async () => {
    if (!apiUrl) return;
    setLoading(true);
    setError(undefined);
    try {
      const active = items.filter((i) => i.status === 'active');
      const dl = daysLeftMap(active, date);
      const ranked = active.filter((i) => dl[i.id] >= 0).sort((a, b) => dl[a.id] - dl[b.id]).slice(0, 25);
      const { name: _n, city: _c, id: _id, ...safeProfile } = profile; // never send name or city
      const res = await api.suggestMeals(
        safeProfile,
        ranked.map((i) => ({ id: i.id, name: i.displayName, quantity: `${i.quantity} ${i.unit}`, daysLeft: dl[i.id] })),
        date,
        slots,
      );
      const meals: MealSuggestion[] = res.meals.map((m, idx) => {
        const usesItems = m.usesItems
          .filter((u) => active.some((i) => i.id === u.itemId))
          .map((u) => ({ ...u, name: active.find((i) => i.id === u.itemId)!.displayName, fraction: Math.min(1, Math.max(0, u.fraction)) }));
        return {
          ...m,
          id: `${date}-${m.slot}-ai-${idx}`,
          date,
          usesItems,
          rescueScore: rescueScore(usesItems, dl, m.extraIngredients.length),
          status: 'suggested',
        };
      });
      setMealCache({ date, source: 'ai', meals, inventoryVersion: version });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the meal planner');
      setMealCache(undefined);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, items, profile, date, slots.join(','), version, setMealCache]); // eslint-disable-line react-hooks/exhaustive-deps

  const stale = !cache || cache.date !== date || version - cache.inventoryVersion > 3;
  useEffect(() => {
    if (apiUrl && stale && !loading && !error) fetchAI();
  }, [apiUrl, stale]); // eslint-disable-line react-hooks/exhaustive-deps

  const plans: SlotPlan[] = useMemo(() => {
    if (apiUrl && cache && cache.source === 'ai' && cache.date === date) {
      // re-check fridge items still exist; drop meals that break a hard rule
      const dl = daysLeftMap(items, date);
      const fresh = cache.meals
        .map((m) => ({ ...m, usesItems: m.usesItems.filter((u) => items.some((i) => i.id === u.itemId && i.status === 'active')) }))
        .map((m) => ({ ...m, rescueScore: rescueScore(m.usesItems, dl, m.extraIngredients.length) }))
        .filter((m) => checkHardRules(m, profile, date).length === 0);
      const sel = selectMeals(fresh, profile, date, slots);
      if (sel.some((p) => p.best)) return sel;
    }
    return suggestLocal(RECIPES, items, profile, date);
  }, [apiUrl, cache, items, profile, date]); // eslint-disable-line react-hooks/exhaustive-deps

  registerMeals(plans.flatMap((p) => [p.best, ...p.alternatives]));

  return { plans, loading, error, refresh: apiUrl ? fetchAI : undefined, source: apiUrl && cache?.source === 'ai' ? 'ai' : 'local', date };
}
