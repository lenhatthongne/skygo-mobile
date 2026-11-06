import { api } from './client';

/** The customer's vouchers; `all` also returns used and expired ones (see `status`). */
export async function listMyVouchers(all = false, signal?: AbortSignal) {
  const { data } = await api.get<Api.Voucher[]>('/me/vouchers', { params: { all }, signal });
  return data;
}

/** Saves a public voucher to the account; it then has a deadline. Saving again changes nothing. */
export async function saveVoucher(code: string) {
  const { data } = await api.post<Api.Voucher>(`/me/vouchers/${encodeURIComponent(code)}/save`);
  return data;
}
