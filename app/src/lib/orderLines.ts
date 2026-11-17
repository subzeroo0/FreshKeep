import { guessCategory, isLikelyFood, matchProduct } from './match';
import type { Category, OrderImportLine, Product } from './types';

export interface RawLine {
  rawText: string;
  name: string;
  packSize?: string;
  quantity: number;
  pricePaise?: number;
  categoryGuess?: Category;
  isFood?: boolean;
}

/** M12 + M13 — merge duplicate lines across screenshots and match each to the catalogue. */
export function buildOrderLines(raw: RawLine[], products: Product[]): Omit<OrderImportLine, 'id' | 'orderImportId'>[] {
  const merged: RawLine[] = [];
  for (const r of raw) {
    const dup = merged.find((m) => m.name.toLowerCase() === r.name.toLowerCase() && (m.packSize ?? '') === (r.packSize ?? ''));
    if (dup) continue; // same line seen on two overlapping screenshots
    merged.push(r);
  }
  return merged.map((r) => {
    const m = matchProduct(`${r.name} ${r.packSize ?? ''}`, products);
    const isFood = r.isFood ?? isLikelyFood(r.name);
    const product = m.kind !== 'new' ? m.product : undefined;
    return {
      rawText: r.rawText,
      parsedName: r.name,
      parsedPackSize: r.packSize,
      quantity: r.quantity || 1,
      pricePaise: r.pricePaise,
      matchedProductId: product?.id,
      matchScore: Math.round(m.score * 100) / 100,
      include: isFood,
      categoryGuess: product?.category ?? r.categoryGuess ?? guessCategory(r.name),
      isFood,
    };
  });
}
