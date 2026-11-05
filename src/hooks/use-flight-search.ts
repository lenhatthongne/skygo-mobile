import { useEffect, useState } from 'react';

import { searchFlights } from '@/services/api/flights';
import { type ApiError, toApiError } from '@/services/api/errors';

const PAGE_SIZE = 20;

type Loaded = { key: string; items: Api.Flight[]; page: number; total: number };
type Failed = { key: string; error: ApiError };

/**
 * Loads flight search results page by page. The state is tagged with the query key, so a result
 * from an older query is never shown for a newer one and no state is set synchronously in effects.
 */
export function useFlightSearch(params: Api.FlightSearchParams | null) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const key = params ? `${attempt}:${JSON.stringify(params)}` : '';

  useEffect(() => {
    if (!params) return;
    const controller = new AbortController();
    searchFlights({ ...params, page: 0, size: PAGE_SIZE }, controller.signal)
      .then((page) => {
        setFailed(null);
        setLoaded({ key, items: page.content, page: 0, total: page.totalElements });
      })
      .catch((e: unknown) => {
        const error = toApiError(e);
        if (error.kind !== 'canceled') setFailed({ key, error });
      });
    return () => controller.abort();
    // `key` encodes every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = loaded?.key === key ? loaded : null;
  const error = failed?.key === key ? failed.error : null;
  const loading = !!params && !current && !error;

  async function loadMore() {
    if (!params || !current || loadingMore || current.items.length >= current.total) return;
    setLoadingMore(true);
    try {
      const next = await searchFlights({ ...params, page: current.page + 1, size: PAGE_SIZE });
      setLoaded((prev) =>
        prev && prev.key === key
          ? { ...prev, items: [...prev.items, ...next.content], page: next.page, total: next.totalElements }
          : prev,
      );
    } catch {
      // Keep what is already shown; the user can scroll again to retry.
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    items: current?.items ?? [],
    total: current?.total ?? 0,
    loading,
    loadingMore,
    error,
    hasMore: !!current && current.items.length < current.total,
    loadMore,
    retry: () => setAttempt((n) => n + 1),
  };
}
