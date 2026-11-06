declare namespace Api {
  type SeatKind = 'BUSINESS' | 'FRONT' | 'EXIT' | 'STANDARD';

  interface Seat {
    /** e.g. "12A" */
    code: string;
    column: string;
    kind: SeatKind;
    /** Seat fee in VND. */
    price: number;
    available: boolean;
    /** Taken only by an unpaid booking whose hold is still open (up to 15 minutes); `available` is false too. */
    held?: boolean;
  }

  interface SeatRow {
    row: number;
    seats: Seat[];
  }

  interface SeatCabin {
    cabin: 'BUSINESS' | 'ECONOMY';
    columns: string[];
    rows: SeatRow[];
  }

  interface SeatMap {
    flightId: number;
    cabins: SeatCabin[];
  }

  interface ChangeSeatsRequest {
    seats: { passengerId: number; seatCode: string }[];
  }
}
