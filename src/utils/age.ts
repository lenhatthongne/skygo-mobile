import { addDays, parseIsoDate, toIsoDate } from './datetime';

export type AgeClass = 'ADT' | 'CHD' | 'INF' | 'TOO_YOUNG';

export const AGE_LABEL: Record<AgeClass, string> = {
  ADT: 'Người lớn',
  CHD: 'Trẻ em',
  INF: 'Em bé',
  TOO_YOUNG: 'Dưới 14 ngày tuổi',
};

function addYears(isoDate: string, years: number) {
  const { y, m, d } = parseIsoDate(isoDate);
  const date = new Date(Date.UTC(y + years, m - 1, d));
  // Feb 29 + n years lands on Mar 1 in JS; the backend (java.time) clamps to Feb 28.
  if (date.getUTCMonth() !== m - 1) return toIsoDate(y + years, m, 28);
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Mirrors the backend PassengerTypeResolver, evaluated on the departure date (Vietnam time). */
export function ageClassOn(birthDate: string, departureDate: string): AgeClass {
  if (addDays(birthDate, 14) > departureDate) return 'TOO_YOUNG';
  if (addYears(birthDate, 2) > departureDate) return 'INF';
  if (addYears(birthDate, 12) > departureDate) return 'CHD';
  return 'ADT';
}

/** "20/11/2026" → "2026-11-20", or null when it is not a real date. */
export function parseDob(text: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return toIsoDate(y, m, d);
}

/** Keeps digits and inserts the slashes while typing: "2011" → "20/11". */
export function formatDobInput(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "1990-01-01" → "01/01/1990" */
export function isoToDob(isoDate: string) {
  const { y, m, d } = parseIsoDate(isoDate);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}
