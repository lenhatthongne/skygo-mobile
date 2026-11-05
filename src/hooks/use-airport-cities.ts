import { useEffect, useState } from 'react';

import { getAirports } from '@/services/api/catalog';

/** Maps an airport code to its city name; falls back to the code until (or unless) it loads. */
export function useAirportCities() {
  const [cities, setCities] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    getAirports()
      .then((list) => {
        if (alive) setCities(Object.fromEntries(list.map((a) => [a.code, a.city])));
      })
      .catch(() => {
        // Offline or failed: the airport codes are shown instead.
      });
    return () => {
      alive = false;
    };
  }, []);

  return (code: string) => cities[code] ?? code;
}
