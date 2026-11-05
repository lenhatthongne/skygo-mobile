import { api } from './client';

/** The customer's payment attempts, newest first. */
export async function listPayments(page: number, size: number, signal?: AbortSignal) {
  const { data } = await api.get<Api.PageResponse<Api.PaymentHistoryItem>>('/me/payments', {
    params: { page, size },
    signal,
  });
  return data;
}
