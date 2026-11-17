import { api } from './api';
import { parseDate } from './dateParser';
import type { Photo } from './photos';
import type { Category } from './types';

export interface DateRead {
  rawText: string;
  isoDate?: string;
  unsure: boolean;
  reason?: string;
}

/** M8 + M9 — send a date photo to /ai/read-date, then normalise and range-check it locally. */
export async function readDateFromPhoto(photo: Photo, category?: Category): Promise<DateRead> {
  const r = await api.readDate(photo.base64, category ?? 'other');
  // "Best before N months from packing" → compute from the packed date.
  if (!r.isoDate && r.bestBeforeMonths && r.packedDate) {
    const p = parseDate(`Best before ${r.bestBeforeMonths} months from packing`, { packedDate: r.packedDate });
    return { rawText: r.rawText, isoDate: p.isoDate, unsure: r.unsure || p.unsure, reason: p.reason };
  }
  if (!r.isoDate) {
    // fall back to our own parser on the text the model read
    const p = parseDate(r.rawText);
    return { rawText: r.rawText, isoDate: p.isoDate, unsure: true, reason: p.isoDate ? 'Read from text — please check' : 'Couldn’t find a date' };
  }
  const check = parseDate(r.isoDate); // applies the 3-years-ahead / 30-days-past rules
  return { rawText: r.rawText, isoDate: r.isoDate, unsure: r.unsure || check.unsure, reason: check.reason ?? (r.unsure ? 'Some digits were unclear' : undefined) };
}
