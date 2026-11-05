import { api } from './client';

/** The customer's vouchers; `all` also returns used and expired ones (see `status`). */
export async function listMyVouchers(all = false, signal?: AbortSignal) {
  const { data } = await api.get<Api.Voucher[]>('/me/vouchers', { params: { all }, signal });
  return data;
}
