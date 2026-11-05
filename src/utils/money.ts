/** Integer VND with dot separators: 1700000 → "1.700.000 ₫". */
export function formatVnd(amount: number) {
  const sign = amount < 0 ? '-' : '';
  const digits = String(Math.abs(Math.round(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${digits} ₫`;
}
