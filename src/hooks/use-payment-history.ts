import { listPayments } from '@/services/api/payments';

import { usePagedList } from './use-paged-list';

const keyOf = (p: Api.PaymentHistoryItem) => p.id;

/**
 * The signed-in customer's payments, newest first, page by page. `reload()` refetches silently,
 * `refresh()` is for pull to refresh.
 */
export function usePaymentHistory() {
  return usePagedList(listPayments, { keyOf });
}
