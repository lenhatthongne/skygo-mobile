import { useEffect, useState } from 'react';

import { type ApiError, toApiError } from '@/services/api/errors';
import { quoteFare } from '@/services/api/fares';

type State = { key: string; quotes: Record<number, Api.PriceQuote>; error?: ApiError };

/** Server quotes for several fare classes at once, so the user can compare real totals. */
export function useFareQuotes(
  fares: Api.FareClass[],
  party: Api.QuoteRequest,
  /** Keep showing the last totals while a new quote loads (extras changed), instead of nothing. */
  keepPrevious = false,
) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);
  const ids = fares.map((f) => f.id);
  const bags = (party.baggageWeightsKg ?? []).join('+');
  const seats = (party.seatCodes ?? []).join('+');
  const key = `${attempt}:${ids.join(',')}:${party.adults}/${party.children}/${party.infants}:${bags}:${seats}`;

  useEffect(() => {
    if (ids.length === 0) return;
    const controller = new AbortController();
    Promise.all(ids.map((id) => quoteFare(id, party, controller.signal)))
      .then((list) => {
        const quotes: Record<number, Api.PriceQuote> = {};
        ids.forEach((id, i) => (quotes[id] = list[i]));
        setState({ key, quotes });
      })
      .catch((e: unknown) => {
        const error = toApiError(e);
        if (error.kind !== 'canceled') setState({ key, quotes: {}, error });
      });
    return () => controller.abort();
    // `key` encodes the fare ids, the party and the baggage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state?.key === key ? state : null;
  // While a new quote loads (baggage or seats changed) keep showing the previous totals of the
  // same fare classes, so the price and the lines under it do not vanish and come back.
  const previous: Record<number, Api.PriceQuote> = {};
  if (keepPrevious && !current && state && !state.error) {
    for (const id of ids) if (state.quotes[id]) previous[id] = state.quotes[id];
  }
  return {
    quotes: current?.quotes ?? previous,
    error: current?.error ?? null,
    loading: ids.length > 0 && !current,
    retry: () => setAttempt((n) => n + 1),
  };
}
