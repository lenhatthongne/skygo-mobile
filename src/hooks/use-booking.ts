import { useCallback, useEffect, useState } from 'react';

import { type ApiError, toApiError } from '@/services/api/errors';
import { getBooking } from '@/services/api/bookings';
import { sameData } from '@/utils/same-data';

type State = { id: string; n: number; booking?: Api.Booking; error?: ApiError };
type Request = { n: number; pull: boolean };

/**
 * Loads a booking. `reload()` refetches silently while the previous data stays on screen, so a
 * status check does not blank the page; `refresh()` is the same for pull to refresh and turns
 * `refreshing` on. An unchanged booking keeps the old object, so nothing re-renders.
 */
export function useBooking(id: string) {
  const [request, setRequest] = useState<Request>({ n: 0, pull: false });
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getBooking(id, controller.signal)
      .then((booking) =>
        setState((prev) =>
          prev?.id === id && prev.booking && sameData(prev.booking, booking)
            ? { ...prev, n: request.n, error: undefined }
            : { id, n: request.n, booking },
        ),
      )
      .catch((e: unknown) => {
        const error = toApiError(e);
        if (error.kind === 'canceled') return;
        // Keep showing an already loaded booking if only the refresh failed.
        setState((prev) =>
          prev?.id === id && prev.booking ? { ...prev, n: request.n } : { id, n: request.n, error },
        );
      });
    return () => controller.abort();
  }, [id, request]);

  const reload = useCallback(() => setRequest((r) => ({ n: r.n + 1, pull: false })), []);
  const refresh = useCallback(() => setRequest((r) => ({ n: r.n + 1, pull: true })), []);

  const current = state?.id === id ? state : null;
  const pending = current?.n !== request.n;
  return {
    booking: current?.booking,
    error: current?.booking || pending ? null : (current?.error ?? null),
    /** Nothing to show yet: first load, or a retry after an error. */
    loading: !current?.booking && pending,
    /** Only for a pull to refresh. */
    refreshing: request.pull && pending,
    reload,
    refresh,
  };
}
