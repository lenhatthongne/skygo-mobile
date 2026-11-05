import { api } from './client';

/** Extra checked-baggage packs for a fare class, priced by the server. */
export async function getBaggageOptions(fareClassId: number, signal?: AbortSignal) {
  const { data } = await api.get<Api.BaggageOption[]>(`/fare-classes/${fareClassId}/baggage-options`, {
    skipAuth: true,
    signal,
  });
  return data;
}

/** Server-side price for a fare class and party. The booking must use this exact total. */
export async function quoteFare(fareClassId: number, party: Api.QuoteRequest, signal?: AbortSignal) {
  const { data } = await api.post<Api.PriceQuote>(`/fare-classes/${fareClassId}/quote`, party, {
    skipAuth: true,
    signal,
  });
  return data;
}
