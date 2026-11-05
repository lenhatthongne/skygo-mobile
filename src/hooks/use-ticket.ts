import { useEffect, useState } from 'react';

import { getTicket } from '@/services/api/bookings';
import { type ApiError, toApiError } from '@/services/api/errors';
import { loadTicket, saveTicket } from '@/services/offline-store';

type Shown = Omit<Api.Ticket, 'qrToken'>;
type State = { id: string; ticket?: Shown; offline?: boolean; error?: ApiError };

/**
 * The e-ticket of a booking. The saved copy opens at once; the server copy then replaces it and
 * is saved again. If the server cannot be reached the saved copy stays and `offline` is true.
 * A ticket is never invented: with no saved copy and no network, `error` is set instead.
 */
export function useTicket(id: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let fresh = false;

    void loadTicket(id).then((saved) => {
      if (saved && !fresh && !controller.signal.aborted) {
        setState((prev) => (prev?.id === id && prev.ticket ? prev : { id, ticket: saved }));
      }
    });

    getTicket(id, controller.signal)
      .then((ticket) => {
        fresh = true;
        setState({ id, ticket });
        void saveTicket(ticket);
      })
      .catch(async (e: unknown) => {
        const error = toApiError(e);
        if (error.kind === 'canceled') return;
        fresh = true;
        const unreachable = error.kind === 'network' || error.kind === 'timeout';
        const saved = unreachable ? await loadTicket(id) : null;
        if (controller.signal.aborted) return;
        setState(saved ? { id, ticket: saved, offline: true } : { id, error });
      });

    return () => controller.abort();
  }, [id, attempt]);

  const current = state?.id === id ? state : null;
  return {
    ticket: current?.ticket,
    offline: !!current?.offline,
    error: current?.ticket ? null : (current?.error ?? null),
    loading: !current,
    reload: () => setAttempt((n) => n + 1),
  };
}
