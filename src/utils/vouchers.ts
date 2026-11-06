import i18n from '@/i18n';

import { formatDate, vnDateOf } from './datetime';
import { formatVnd } from './money';

/** "Giảm 10%, tối đa 200.000 ₫" / "10% off, up to 200.000 ₫". */
export function voucherSummary(v: Api.Voucher) {
  const value = v.percentOff ? `${v.percentOff}%` : formatVnd(v.amountOff ?? 0);
  const cap =
    v.percentOff && v.maxDiscount
      ? i18n.t('voucher.cap', { amount: formatVnd(v.maxDiscount) })
      : '';
  return `${i18n.t('voucher.off', { value })}${cap}`;
}

/** "Đơn từ 1.500.000 ₫ · Hạn 05/12/2026" (parts that do not apply are left out). */
export function voucherConditions(v: Api.Voucher) {
  return [
    v.minOrder > 0 ? i18n.t('voucher.minOrder', { amount: formatVnd(v.minOrder) }) : null,
    v.expiresAt ? i18n.t('voucher.expiresOn', { date: formatDate(vnDateOf(v.expiresAt)) }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** What the voucher would take off `subtotal`. Only for ranking; the server decides the real amount. */
export function estimateDiscount(v: Api.Voucher, subtotal: number) {
  const raw = v.percentOff ? Math.floor((subtotal * v.percentOff) / 100) : (v.amountOff ?? 0);
  const capped = v.maxDiscount ? Math.min(raw, v.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
}

/**
 * Time left until `expiresAt`, counting down: "6 ngày 23:59:10", or "05:12:09" under a day;
 * null once it has passed. Pass the current time so a screen can tick it.
 */
export function timeLeft(expiresAt: string, now: number) {
  const ms = Date.parse(expiresAt) - now;
  if (!(ms > 0)) return null;
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(Math.floor((total % 86400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  return days > 0 ? `${i18n.t('voucher.days', { count: days })} ${clock}` : clock;
}
