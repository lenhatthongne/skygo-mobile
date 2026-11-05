import { useCallback, useEffect, useState } from 'react';

import { type ApiError, toApiError } from '@/services/api/errors';
import { sameData } from '@/utils/same-data';

type Request = { n: number; pull: boolean };

/**
 * Loads a list once, then on `reload()` (silent: focus, after an edit) or `refresh()` (pull to
 * refresh: `refreshing` turns on). The old list stays visible while refetching, a failed refetch
 * never replaces data already shown, and an identical result keeps the old array so nothing
 * re-renders.
 */
export function useRemoteList<T>(load: (signal: AbortSignal) => Promise<T[]>) {
  const [request, setRequest] = useState<Request>({ n: 0, pull: false });
  const [doneN, setDoneN] = useState(-1);
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((list) => {
        setError(null);
        setItems((prev) => (prev && sameData(prev, list) ? prev : list));
        setDoneN(request.n);
      })
      .catch((e: unknown) => {
        const failure = toApiError(e);
        if (failure.kind === 'canceled') return;
        setError(failure);
        setDoneN(request.n);
      });
    return () => controller.abort();
    // `load` is a module-level function in every caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const reload = useCallback(() => setRequest((r) => ({ n: r.n + 1, pull: false })), []);
  const refresh = useCallback(() => setRequest((r) => ({ n: r.n + 1, pull: true })), []);

  const pending = doneN !== request.n;
  return {
    items,
    /** Nothing to show yet: first load, or a retry after an error. */
    loading: !items && (pending || !error),
    /** Only for a pull to refresh; silent reloads never move the list. */
    refreshing: request.pull && pending,
    /** The load failed and there is nothing to show. */
    error: items || pending ? null : error,
    reload,
    refresh,
  };
}
