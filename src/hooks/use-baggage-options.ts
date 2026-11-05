import { useEffect, useState } from 'react';

import { getBaggageOptions } from '@/services/api/fares';

type State = { fareClassId: number; options: Api.BaggageOption[] };

/**
 * The extra baggage packs of a fare class. They are optional: if the request fails the list is
 * empty and the booking simply goes ahead without the baggage section.
 */
export function useBaggageOptions(fareClassId: number, enabled = true) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    getBaggageOptions(fareClassId, controller.signal)
      .then((options) => setState({ fareClassId, options }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ fareClassId, options: [] });
      });
    return () => controller.abort();
  }, [fareClassId, enabled]);

  return enabled && state?.fareClassId === fareClassId ? state.options : [];
}
