import i18n from '@/i18n';

// Vietnam has a fixed UTC+7 offset (no DST), so local parts are computed from UTC with +7h.
const VN_OFFSET_MS = 7 * 3600 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function vnParts(iso: string | number) {
  const d = new Date(new Date(iso).getTime() + VN_OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    min: d.getUTCMinutes(),
  };
}

export function toIsoDate(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseIsoDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return { y, m, d };
}

/** Today's date in Vietnam as YYYY-MM-DD. */
export function todayVn() {
  const p = vnParts(Date.now());
  return toIsoDate(p.y, p.m, p.d);
}

export function addDays(isoDate: string, days: number) {
  const { y, m, d } = parseIsoDate(isoDate);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function weekdayIndex(isoDate: string) {
  const { y, m, d } = parseIsoDate(isoDate);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** In the language currently chosen (Vietnamese or English). */
export const weekdayName = (isoDate: string) =>
  i18n.t(`date.weekday.${WEEKDAY_KEYS[weekdayIndex(isoDate)]}`);
export const weekdayShort = (isoDate: string) =>
  i18n.t(`date.weekdayShort.${WEEKDAY_KEYS[weekdayIndex(isoDate)]}`);

/** 20/11/2026 */
export function formatDate(isoDate: string) {
  const { y, m, d } = parseIsoDate(isoDate);
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** 20/11 */
export function formatDayMonth(isoDate: string) {
  const { m, d } = parseIsoDate(isoDate);
  return `${pad(d)}/${pad(m)}`;
}

/** Thứ Sáu, 20/11/2026 */
export function formatLongDate(isoDate: string) {
  return `${weekdayName(isoDate)}, ${formatDate(isoDate)}`;
}

/** 06:30 in Vietnam time, from an ISO-8601 UTC instant. */
export function formatTime(iso: string) {
  const p = vnParts(iso);
  return `${pad(p.h)}:${pad(p.min)}`;
}

/** Vietnam-local YYYY-MM-DD of an ISO-8601 UTC instant. */
export function vnDateOf(iso: string) {
  const p = vnParts(iso);
  return toIsoDate(p.y, p.m, p.d);
}

/** 2g 10p */
export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}p`;
  return m === 0 ? `${h}g` : `${h}g ${pad(m)}p`;
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 09:15, 04/11/2026 in Vietnam time, from an ISO-8601 UTC instant. */
export function formatDateTime(iso: string) {
  return `${formatTime(iso)}, ${formatDate(vnDateOf(iso))}`;
}
