import { addDays, daysBetween, isValidISO, today as todayISO } from './dates';

export interface ParsedDate {
  isoDate?: string;
  unsure: boolean;
  reason?: string;
  matchedText?: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

function expandYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function build(y: number, m: number, d: number): string | undefined {
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  return isValidISO(iso) ? iso : undefined;
}

/**
 * M9 — turn a raw printed date string into an ISO date without guessing silently.
 * Indian packs are day-first, so ambiguous numeric dates default to DD/MM.
 * Rejects dates > 3 years ahead or > 30 days in the past (marks unsure).
 */
export function parseDate(raw: string, opts: { today?: string; packedDate?: string } = {}): ParsedDate {
  const now = opts.today ?? todayISO();
  const text = raw.trim();
  const lower = text.toLowerCase();
  let iso: string | undefined;
  let matched: string | undefined;

  // "Best before 6 months from manufacture" (+ packed date)
  const rel = lower.match(/(\d{1,2})\s*(months?|days?)\s*(from|after)\s*(the\s*)?(date\s*of\s*)?(manufacture|mfg|packing|packaging|packed|pkd)/);
  if (rel) {
    const packed = opts.packedDate ?? findPackedDate(text, now);
    if (!packed) return { unsure: true, reason: 'Relative best-before needs a packed date', matchedText: rel[0] };
    const n = Number(rel[1]);
    iso = rel[2].startsWith('month') ? addMonths(packed, n) : addDays(packed, n);
    matched = rel[0];
  }

  if (!iso) {
    const r = parseAbsolute(text);
    iso = r?.iso;
    matched = r?.matched;
  }

  if (!iso) return { unsure: true, reason: 'No date found' };

  const diff = daysBetween(now, iso);
  if (diff > 365 * 3) return { isoDate: iso, unsure: true, reason: 'More than 3 years ahead', matchedText: matched };
  if (diff < -30) return { isoDate: iso, unsure: true, reason: 'More than 30 days in the past', matchedText: matched };
  return { isoDate: iso, unsure: false, matchedText: matched };
}

function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = m - 1 + n;
  const ny = y + Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(d, lastDayOfMonth(ny, nm));
  return `${ny}-${pad(nm)}-${pad(nd)}`;
}

function findPackedDate(text: string, now: string): string | undefined {
  const m = text.match(/(pkd|packed|mfg|mfd)[^0-9a-z]*([0-9]{1,2}[./-][0-9a-z]{1,3}[./-][0-9]{2,4})/i);
  if (!m) return undefined;
  const r = parseAbsolute(m[2]);
  return r?.iso && daysBetween(r.iso, now) >= 0 ? r.iso : undefined;
}

function parseAbsolute(text: string): { iso: string; matched: string } | undefined {
  let m: RegExpMatchArray | null;

  // YYYY-MM-DD
  m = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const iso = build(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) return { iso, matched: m[0] };
  }

  // DD-MMM-YY / DD MMM YYYY / DD.MMM.YY
  m = text.match(/\b(\d{1,2})[\s./-]*([A-Za-z]{3,4})[\s./,-]*(\d{2,4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const iso = build(expandYear(Number(m[3])), MONTHS[m[2].toLowerCase()], Number(m[1]));
    if (iso) return { iso, matched: m[0] };
  }

  // DD/MM/YYYY, DD/MM/YY, DD.MM.YY, DD-MM-YY (day-first)
  m = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (m) {
    const iso = build(expandYear(Number(m[3])), Number(m[2]), Number(m[1]));
    if (iso) return { iso, matched: m[0] };
  }

  // MMM YY / MMM YYYY → last day of month
  m = text.match(/\b([A-Za-z]{3,4})[\s./,-]*(\d{2,4})\b/);
  if (m && MONTHS[m[1].toLowerCase()]) {
    const y = expandYear(Number(m[2]));
    const mo = MONTHS[m[1].toLowerCase()];
    const iso = build(y, mo, lastDayOfMonth(y, mo));
    if (iso) return { iso, matched: m[0] };
  }

  // MM/YY or MM/YYYY → last day of month
  m = text.match(/\b(\d{1,2})[./-](\d{2}|\d{4})\b/);
  if (m) {
    const mo = Number(m[1]);
    const y = expandYear(Number(m[2]));
    if (mo >= 1 && mo <= 12) {
      const iso = build(y, mo, lastDayOfMonth(y, mo));
      if (iso) return { iso, matched: m[0] };
    }
  }

  return undefined;
}
