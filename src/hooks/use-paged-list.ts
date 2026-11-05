import { useCallback, useEffect, useRef, useState } from 'react';

import { type ApiError, toApiError } from '@/services/api/errors';
import { sameData } from '@/utils/same-data';

/** The server caps `size` at 100 (`docs/API.md`). */
const MAX_SIZE = 100;

type Loaded<T> = { items: T[]; pages: number; total: number };
type Request = { n: number; pull: boolean };

type Options<T> = {
  pageSize?: number;
  /** Stable id, used to drop duplicates when a new item shifts the pages between two loads. */
  keyOf: (item: T) => string | number;
  /** Runs after each successful load of fresh data (cache it, schedule reminders...). */
  onFresh?: (items: T[]) => void;
  /** A saved copy to show when the server cannot be reached. */
  offline?: () => Promise<{ items: T[]; syncedAt: string } | null>;
};

/**
 * A server list read page by page, newest first.
 * - `reload()` is silent (screen focus, after an action); `refresh()` is a pull to refresh and
 *   is the only one that turns `refreshing` on, so the list does not jump on every focus.
 * - A refetch reloads every page already shown in one request, so the list does not shrink
 *   back to the first page and the scroll position holds.
 * - An identical result keeps the old array, so nothing re-renders.
 * - A `loadMore` that finishes after a reload started is dropped instead of appending stale rows.
 */
export function usePagedList<T>(
  load: (page: number, size: number, signal?: AbortSignal) => Promise<Api.PageResponse<T>>,
  { pageSize = 20, keyOf, onFresh, offline }: Options<T>,
) {
  const [request, setRequest] = useState<Request>({ n: 0, pull: false });
  const [doneN, setDoneN] = useState(-1);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  /** Set while the list shown is a saved copy because the server could not be reached. */
  const [offlineAt, setOfflineAt] = useState<string | null>(null);

  /** Bumped by every (re)load; a `loadMore` started under an older value is stale. */
  const generation = useRef(0);
  const pagesShown = useRef(1);
  useEffect(() => {
    pagesShown.current = loaded?.pages ?? 1;
  }, [loaded]);

  useEffect(() => {
    generation.current += 1;
    const controller = new AbortController();
    const pages = Math.max(1, Math.min(pagesShown.current, Math.floor(MAX_SIZE / pageSize)));

    load(0, pages * pageSize, controller.signal)
      .then((page) => {
        setError(null);
        setOfflineAt(null);
        setLoaded((prev) =>
          prev && prev.total === page.totalElements && sameData(prev.items, page.content)
            ? prev
            : { items: page.content, pages, total: page.totalElements },
        );
        setDoneN(request.n);
        onFresh?.(page.content);
      })
      .catch(async (e: unknown) => {
        const failure = toApiError(e);
        if (failure.kind === 'canceled') return;
        const unreachable = failure.kind === 'network' || failure.kind === 'timeout';
        const saved = unreachable && offline ? await offline() : null;
        if (controller.signal.aborted) return;
        if (saved) {
          setError(null);
          setOfflineAt(saved.syncedAt);
          setLoaded((prev) =>
            prev && sameData(prev.items, saved.items)
              ? { ...prev, total: saved.items.length }
              : { items: saved.items, pages: 1, total: saved.items.length },
          );
        } else {
          setError(failure);
        }
        setDoneN(request.n);
      });
    return () => controller.abort();
    // `load` and the options come from module-level functions in every caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const reload = useCallback(() => setRequest((r) => ({ n: r.n + 1, pull: false })), []);
  const refresh = useCallback(() => setRequest((r) => ({ n: r.n + 1, pull: true })), []);

  async function loadMore() {
    if (!loaded || loadingMore || loaded.items.length >= loaded.total) return;
    const started = generation.current;
    setLoadingMore(true);
    try {
      const next = await load(loaded.pages, pageSize);
      if (started !== generation.current) return;
      setLoaded((prev) => {
        if (!prev) return prev;
        const seen = new Set(prev.items.map(keyOf));
        return {
          items: [...prev.items, ...next.content.filter((item) => !seen.has(keyOf(item)))],
          pages: prev.pages + 1,
          total: next.totalElements,
        };
      });
    } catch {
      // Keep what is shown; reaching the end again retries.
    } finally {
      setLoadingMore(false);
    }
  }

  const pending = doneN !== request.n;
  return {
    items: loaded?.items ?? [],
    /** Nothing to show yet: first load, or a retry after an error. */
    loading: !loaded && (pending || !error),
    /** Only for a pull to refresh; silent reloads never move the list. */
    refreshing: request.pull && pending,
    /** The load failed and there is nothing to show. */
    error: loaded || pending ? null : error,
    offlineAt,
    hasMore: !!loaded && loaded.items.length < loaded.total,
    loadingMore,
    loadMore,
    reload,
    refresh,
  };
}
