declare namespace Api {
  type FareClassCode = 'ECO_SAVER' | 'ECO_FLEX' | 'BUSINESS';

  interface Airport {
    code: string;
    name: string;
    city: string;
    latitude: number;
    longitude: number;
    /** Photo of the city (https), or null when none is set. */
    imageUrl?: string | null;
    /** Credit the photo's license asks for; shown in Settings. */
    imageCredit?: string | null;
  }

  type PromotionTheme = 'TEAL' | 'ORANGE' | 'PURPLE';

  /** Home banner (`BANNER`) or voucher (`VOUCHER`, has `code`). Display only: the code is not applied to prices. */
  interface Promotion {
    id: number;
    kind: 'BANNER' | 'VOUCHER';
    title: string;
    subtitle: string | null;
    code: string | null;
    imageUrl: string | null;
    theme: PromotionTheme;
    /** IATA code to search when a banner is tapped, or null. */
    destinationCode: string | null;
    endsAt: string | null;
  }

  interface Airline {
    code: string;
    name: string;
    logoUrl: string | null;
  }

  interface FareClass {
    id: number;
    classCode: FareClassCode;
    baseFare: number;
    taxFee: number;
    childRatePct: number;
    infantRatePct: number;
    infantFee: number;
    cabinBaggageKg: number;
    checkedBaggageKg: number;
    refundable: boolean;
    cancelFee: number;
    totalSeats: number;
    seatsAvailable: number;
    /** Services included in the fare (WIFI, MEAL...); absent in old copies. Unknown codes are ignored. */
    amenities?: string[];
  }

  interface Flight {
    flightId: number;
    flightNumber: string;
    airline: Airline;
    origin: string;
    destination: string;
    /** ISO-8601 UTC */
    departureAt: string;
    /** ISO-8601 UTC */
    arrivalAt: string;
    durationMinutes: number;
    status: string;
    /** Base fare + tax of the cheapest fare class that still has seats; null when sold out. */
    lowestAdultFare: number | null;
    availableFareClasses: FareClassCode[];
    fareClasses: FareClass[];
  }

  interface FlightSearchParams {
    from: string;
    to: string;
    /** YYYY-MM-DD, Vietnam local date */
    date: string;
    adults: number;
    children: number;
    infants: number;
    minPrice?: number;
    maxPrice?: number;
    airlines?: string[];
    /** HH:mm, Vietnam local time */
    departFrom?: string;
    departTo?: string;
    sort?: 'price' | 'departure';
    page?: number;
    size?: number;
  }
}
