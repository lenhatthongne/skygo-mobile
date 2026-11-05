import { useEffect, useState } from 'react';

import { getAirports } from '@/services/api/catalog';
import { type ApiError, toApiError } from '@/services/api/errors';
import { getFlight } from '@/services/api/flights';

type State = { key: string; flight?: Api.Flight; airports: Api.Airport[]; error?: ApiError };

/** Loads one flight plus the airport list (for names). State is tagged with its request key. */
export function useFlight(id: string, enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);
  const key = `${id}:${attempt}`;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    Promise.all([getFlight(id, controller.signal), getAirports().catch(() => [] as Api.Airport[])])
      .then(([flight, airports]) => setState({ key, flight, airports }))
      .catch((e: unknown) => {
        const error = toApiError(e);
        if (error.kind !== 'canceled') setState({ key, airports: [], error });
      });
    return () => controller.abort();
  }, [id, key, enabled]);

  const current = state?.key === key ? state : null;
  return {
    flight: current?.flight,
    airports: current?.airports ?? [],
    error: current?.error ?? null,
    loading: enabled && !current,
    retry: () => setAttempt((n) => n + 1),
  };
}
