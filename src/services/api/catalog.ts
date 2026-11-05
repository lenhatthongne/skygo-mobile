import { api } from './client';

const TTL_MS = 10 * 60 * 1000;
const publicCall = { skipAuth: true } as const;

type Cached<T> = { at: number; promise: Promise<T> };

/** Caches rarely-changing catalog data and shares one in-flight request between callers. */
function cached<T>(load: () => Promise<T>) {
  let entry: Cached<T> | null = null;
  return () => {
    if (entry && Date.now() - entry.at < TTL_MS) return entry.promise;
    const promise = load();
    const current: Cached<T> = { at: Date.now(), promise };
    entry = current;
    promise.catch(() => {
      if (entry === current) entry = null;
    });
    return promise;
  };
}

export const getAirports = cached(async () => {
  const { data } = await api.get<Api.Airport[]>('/airports', publicCall);
  return data;
});

export const getAirlines = cached(async () => {
  const { data } = await api.get<Api.Airline[]>('/airlines', publicCall);
  return data;
});

/** Active banners and vouchers. Not cached: campaigns change and expire. */
export async function getPromotions(signal?: AbortSignal) {
  const { data } = await api.get<Api.Promotion[]>('/promotions', { ...publicCall, signal });
  return data;
}
