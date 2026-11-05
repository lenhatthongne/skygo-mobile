import { DEPART_WINDOWS, type SearchCriteria, type SearchFilters } from '@/providers/search-provider';
import { addDays, todayVn } from '@/utils/datetime';
import { MAX_SEATS } from '@/utils/passengers';

type FlightIntent = {
  criteria: SearchCriteria;
  filters: Pick<SearchFilters, 'sort' | 'windowId'>;
};

export function parseFlightIntent(data: unknown, airports: Api.Airport[]): FlightIntent | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  if (value.needsClarification !== false || typeof value.roundTrip !== 'boolean') return null;
  const from = airports.find((airport) => airport.code === value.from);
  const to = airports.find((airport) => airport.code === value.to);
  if (!from || !to || from.code === to.code) return null;

  const today = todayVn();
  const last = addDays(today, 180);
  function validDate(date: unknown): date is string {
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      date >= today && date <= last && addDays(date, 0) === date;
  }

  const { date, returnDate, adults, children, infants, windowId, sort } = value;
  if (!validDate(date)) return null;
  if (value.roundTrip && (!validDate(returnDate) || returnDate < date)) return null;
  if (!isCount(adults) || !isCount(children) || !isCount(infants)) return null;
  if (adults < 1 || adults + children > MAX_SEATS || infants > adults) return null;
  if (typeof windowId !== 'string' || !DEPART_WINDOWS.some((window) => window.id === windowId)) return null;
  if (sort !== 'price' && sort !== 'departure') return null;

  return {
    criteria: {
      from, to, date, adults, children, infants,
      tripType: value.roundTrip ? 'ROUND_TRIP' : 'ONE_WAY',
      returnDate: value.roundTrip && typeof returnDate === 'string' ? returnDate : date,
    },
    filters: { sort, windowId },
  };
}

function isCount(count: unknown): count is number {
  return typeof count === 'number' && Number.isInteger(count) && count >= 0;
}
