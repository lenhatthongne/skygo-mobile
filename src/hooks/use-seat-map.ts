import { useEffect, useState } from 'react';

import { type ApiError, toApiError } from '@/services/api/errors';
import { getSeatMap } from '@/services/api/flights';

type State = { key: string; map?: Api.SeatMap; error?: ApiError };

/**
 * The seat map of a flight, fetched when `enabled` turns true and refetched on `retry()`. It is
 * refetched every time the picker opens so seats taken by others in the meantime show up.
 */
export function useSeatMap(flightId: number, enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);
  const key = `${flightId}:${attempt}:${enabled ? 'on' : 'off'}`;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    getSeatMap(flightId, controller.signal)
      .then((map) => setState({ key, map }))
      .catch((e: unknown) => {
        const error = toApiError(e);
        if (error.kind !== 'canceled') setState({ key, error });
      });
    return () => controller.abort();
    // `key` encodes the flight, the attempt and whether the picker is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = enabled && state?.key === key ? state : null;
  return {
    map: current?.map,
    error: current?.error ?? null,
    loading: enabled && !current,
    retry: () => setAttempt((n) => n + 1),
  };
}
