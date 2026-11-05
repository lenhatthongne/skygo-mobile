declare namespace Api {
  type PassengerType = 'ADT' | 'CHD' | 'INF';

  interface PriceLine {
    type: PassengerType;
    count: number;
    /** Fare for the whole line (all passengers of this type), integer VND. */
    fare: number;
    tax: number;
  }

  interface PriceQuote {
    lines: PriceLine[];
    totalFare: number;
    totalTax: number;
    /** Extra baggage, included in `total` but not in `totalFare`/`totalTax`. Absent in old copies. */
    baggageTotal?: number;
    /** Seat fees, included in `total`. Absent in old copies. */
    seatTotal?: number;
    total: number;
  }

  interface QuoteRequest {
    adults: number;
    children: number;
    infants: number;
    /** One entry per extra bag bought (the weight of the pack). The server prices them. */
    baggageWeightsKg?: number[];
    /** One entry per seat chosen, e.g. "12A". The server prices them; it does not check they are free. */
    seatCodes?: string[];
  }

  /** An extra checked-baggage pack for a fare class: `weightKg` more kilograms for `price` VND. */
  interface BaggageOption {
    weightKg: number;
    price: number;
  }
}
