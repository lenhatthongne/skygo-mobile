import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  use,
  useCallback,
  useState,
} from 'react';

import { addDays, todayVn } from '@/utils/datetime';

export type DepartWindow = { id: string; label: string; from?: string; to?: string };

/** Single-choice departure windows (the API accepts one HH:mm range). */
export const DEPART_WINDOWS: DepartWindow[] = [
  { id: 'any', label: 'Mọi giờ' },
  { id: 'night', label: 'Rạng sáng', from: '00:00', to: '05:59' },
  { id: 'morning', label: 'Buổi sáng', from: '06:00', to: '11:59' },
  { id: 'afternoon', label: 'Buổi chiều', from: '12:00', to: '17:59' },
  { id: 'evening', label: 'Buổi tối', from: '18:00', to: '23:59' },
];

export type PriceRange = { id: string; label: string; minPrice?: number; maxPrice?: number };

export const PRICE_RANGES: PriceRange[] = [
  { id: 'any', label: 'Mọi mức giá' },
  { id: 'lt1', label: 'Dưới 1 triệu', maxPrice: 999_999 },
  { id: '1to2', label: '1 – 2 triệu', minPrice: 1_000_000, maxPrice: 2_000_000 },
  { id: '2to3', label: '2 – 3 triệu', minPrice: 2_000_000, maxPrice: 3_000_000 },
  { id: 'gt3', label: 'Trên 3 triệu', minPrice: 3_000_000 },
];

export type TripType = 'ONE_WAY' | 'ROUND_TRIP';

/** The outbound flight and fare picked first on a round trip; the return leg is chosen next. */
export type OutboundChoice = { flightId: string; fareClassId: number };

export type SearchCriteria = {
  from: Api.Airport | null;
  to: Api.Airport | null;
  /** YYYY-MM-DD, Vietnam local date */
  date: string;
  adults: number;
  children: number;
  infants: number;
  tripType: TripType;
  /** YYYY-MM-DD, Vietnam local date of the return flight (round trip only). */
  returnDate: string;
};

export type SearchFilters = {
  sort: 'price' | 'departure';
  priceId: string;
  windowId: string;
  airlines: string[];
};

export const DEFAULT_FILTERS: SearchFilters = {
  sort: 'price',
  priceId: 'any',
  windowId: 'any',
  airlines: [],
};

type SearchContextValue = {
  /**
   * What the screens search for NOW. While the return leg is being chosen (`outbound` is set) the
   * route is reversed and `date` is the return date, so results, flight and fare screens work
   * unchanged for both legs.
   */
  criteria: SearchCriteria;
  /** Edits the underlying form values (always the outbound ones). */
  setCriteria: Dispatch<SetStateAction<SearchCriteria>>;
  /** Changes the date of the leg being searched (the return date once the outbound is chosen). */
  setDate: (date: string) => void;
  outbound: OutboundChoice | null;
  setOutbound: Dispatch<SetStateAction<OutboundChoice | null>>;
  filters: SearchFilters;
  setFilters: Dispatch<SetStateAction<SearchFilters>>;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [base, setCriteria] = useState<SearchCriteria>(() => ({
    from: null,
    to: null,
    date: addDays(todayVn(), 1),
    adults: 1,
    children: 0,
    infants: 0,
    tripType: 'ONE_WAY',
    returnDate: addDays(todayVn(), 4),
  }));
  const [outbound, setOutbound] = useState<OutboundChoice | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);

  const criteria: SearchCriteria =
    outbound && base.tripType === 'ROUND_TRIP'
      ? { ...base, from: base.to, to: base.from, date: base.returnDate }
      : base;

  const setDate = useCallback(
    (date: string) =>
      setCriteria((c) =>
        outbound && c.tripType === 'ROUND_TRIP'
          ? { ...c, returnDate: date }
          : { ...c, date, returnDate: c.returnDate < date ? date : c.returnDate },
      ),
    [outbound],
  );

  return (
    <SearchContext value={{ criteria, setCriteria, setDate, outbound, setOutbound, filters, setFilters }}>
      {children}
    </SearchContext>
  );
}

export function useSearch() {
  const value = use(SearchContext);
  if (!value) throw new Error('useSearch must be used within a SearchProvider');
  return value;
}

/** Number of active (non-default) filters, for the badge on the filter button. */
export function activeFilterCount(filters: SearchFilters) {
  return (
    (filters.priceId !== 'any' ? 1 : 0) +
    (filters.windowId !== 'any' ? 1 : 0) +
    (filters.airlines.length > 0 ? 1 : 0)
  );
}

export function toSearchParams(
  criteria: SearchCriteria,
  filters: SearchFilters,
): Api.FlightSearchParams | null {
  if (!criteria.from || !criteria.to) return null;
  const price = PRICE_RANGES.find((p) => p.id === filters.priceId);
  const window = DEPART_WINDOWS.find((w) => w.id === filters.windowId);
  return {
    from: criteria.from.code,
    to: criteria.to.code,
    date: criteria.date,
    adults: criteria.adults,
    children: criteria.children,
    infants: criteria.infants,
    minPrice: price?.minPrice,
    maxPrice: price?.maxPrice,
    departFrom: window?.from,
    departTo: window?.to,
    airlines: filters.airlines,
    sort: filters.sort,
  };
}
