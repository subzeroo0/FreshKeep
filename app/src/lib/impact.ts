import type { Category, ConsumptionEvent } from './types';

export interface ImpactStats {
  rescued: number;
  wasted: number;
  rescuedRate: number; // 0..1
  savedPaise: number;
  wastedPaise: number;
  mostWasted?: { category: Category; count: number };
  weekly: { label: string; rescued: number; wasted: number }[];
}

/** Items closed this month: used_up before expiry = rescued, discarded = wasted. */
export function computeImpact(events: ConsumptionEvent[], monthPrefix: string): ImpactStats {
  const inMonth = events.filter((e) => e.at.startsWith(monthPrefix));
  let rescued = 0;
  let wasted = 0;
  let savedPaise = 0;
  let wastedPaise = 0;
  const wasteByCat = new Map<Category, number>();
  const weekly = [1, 2, 3, 4, 5].map((w) => ({ label: `W${w}`, rescued: 0, wasted: 0 }));

  for (const e of inMonth) {
    const day = Number(e.at.slice(8, 10));
    const wk = weekly[Math.min(4, Math.floor((day - 1) / 7))];
    if (e.type === 'used_up' || e.type === 'used_partly') {
      const value = Math.round((e.valuePaise ?? 0) * (e.fraction ?? 1));
      if (e.beforeExpiry !== false) savedPaise += value;
      if (e.type === 'used_up' && e.beforeExpiry !== false) {
        rescued++;
        wk.rescued++;
      }
    } else if (e.type === 'discarded') {
      wasted++;
      wk.wasted++;
      wastedPaise += Math.round((e.valuePaise ?? 0) * (e.fraction ?? 1));
      if (e.category) wasteByCat.set(e.category, (wasteByCat.get(e.category) ?? 0) + 1);
    }
  }

  let mostWasted: ImpactStats['mostWasted'];
  wasteByCat.forEach((count, category) => {
    if (!mostWasted || count > mostWasted.count) mostWasted = { category, count };
  });

  const closed = rescued + wasted;
  return {
    rescued,
    wasted,
    rescuedRate: closed ? rescued / closed : 0,
    savedPaise,
    wastedPaise,
    mostWasted,
    weekly: weekly.filter((w, i) => i < 4 || w.rescued + w.wasted > 0),
  };
}

export const WASTE_TIPS: Partial<Record<Category, string>> = {
  milk: 'Buy the 500 ml pouch instead of 1 L, or freeze a pouch the day it arrives.',
  leafy_veg: 'Wrap greens in a dry cloth and use them in the first 2 days — palak dal is a quick fix.',
  bread: 'Freeze half the loaf on day one and toast slices straight from frozen.',
  paneer: 'Keep paneer in water in a closed box and change the water daily.',
  curd_yogurt: 'Turn curd that is close to expiry into kadhi or raita.',
  fruits: 'Ripe fruit goes into a smoothie or chaat before it turns.',
  vegetables: 'Put the oldest vegetables at the front of the drawer.',
  batter: 'Make uttapam with batter that is turning sour.',
};

export function formatRupees(paise: number): string {
  const r = Math.round(paise / 100);
  return '₹' + r.toLocaleString('en-IN');
}
