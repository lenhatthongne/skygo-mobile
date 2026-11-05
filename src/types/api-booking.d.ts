declare namespace Api {
  type BookingStatus =
    | 'PENDING_PAYMENT'
    | 'PAYMENT_FAILED'
    | 'CONFIRMED'
    | 'CANCEL_REQUESTED'
    | 'CANCELLED'
    | 'EXPIRED';

  type PassengerTitle = 'MR' | 'MRS' | 'MS' | 'MSTR' | 'MISS';

  interface Contact {
    email: string;
    phone: string;
  }

  interface PassengerRequest {
    /** Client-side reference, unique within the booking. */
    ref: string;
    type: PassengerType;
    title: PassengerTitle;
    /** UPPERCASE, no accents, letters and spaces only. */
    fullName: string;
    /** YYYY-MM-DD */
    dateOfBirth: string;
    /** Infants only: the ref of the adult they travel with. */
    accompanyingRef?: string | null;
    /** Extra checked baggage for this passenger: one pack, in kg. Not for infants. */
    baggageKg?: number | null;
    /** Seat code such as "12A". Not for infants. */
    seatCode?: string | null;
  }

  interface CreateBookingRequest {
    fareClassId: number;
    /** The total from the latest server quote. */
    expectedTotal: number;
    contact: Contact;
    passengers: PassengerRequest[];
    /** Optional voucher code; `expectedTotal` is then the amount AFTER the discount. */
    voucherCode?: string;
  }

  interface PriceSnapshot {
    baseFare: number;
    taxFee: number;
    childRatePct: number;
    infantRatePct: number;
    infantFee: number;
    lines: PriceLine[];
    totalFare: number;
    totalTax: number;
    baggageTotal?: number;
    seatTotal?: number;
    total: number;
    refundable: boolean;
    cancelFee: number;
  }

  interface BookingPassenger {
    id: number;
    type: PassengerType;
    title: PassengerTitle;
    fullName: string;
    dateOfBirth: string;
    accompanyingAdultId: number | null;
    fareAmount: number;
    taxAmount: number;
    /** Absent in copies saved before extra baggage existed. */
    baggageKg?: number | null;
    baggageAmount?: number;
    seatCode?: string | null;
    seatAmount?: number;
  }

  /** One payment attempt in the customer's history. */
  interface PaymentHistoryItem {
    id: number;
    bookingId: string;
    bookingCode: string | null;
    originCode: string;
    destinationCode: string;
    departureAt: string;
    method: PaymentMethod;
    result: SimulatedResult;
    /** What was charged (after any voucher). */
    amount: number;
    createdAt: string;
  }

  interface Booking {
    id: string;
    /** Assigned by the backend; may be null until the booking is confirmed. */
    bookingCode: string | null;
    status: BookingStatus;
    seatCount: number;
    totalAmount: number;
    /** ISO-8601 UTC deadline to pay. */
    holdExpiresAt: string;
    createdAt: string;
    confirmedAt: string | null;
    contact: Contact;
    flight: Flight;
    fareClass: FareClass;
    priceSnapshot: PriceSnapshot;
    passengers: BookingPassenger[];
    /** Shared by the two bookings of a round trip; null for a one-way booking. */
    tripGroupId?: string | null;
    leg?: TripLeg | null;
    /** Voucher used on this booking, with the amount it took off `totalAmount`. */
    voucherCode?: string | null;
    discountAmount?: number;
  }

  interface Ticket {
    booking: Booking;
    qrToken: string;
    /** `SKYGO:<token>`: the exact text encoded in the QR code. */
    qrContent: string;
    /** false once the booking is cancelled: the ticket is revoked. */
    valid: boolean;
    /** ISO-8601 UTC time of the server state this copy reflects. */
    syncedAt: string;
  }

  interface CancellationQuote {
    cancelFeeTotal: number;
    refundAmount: number;
  }

  interface CancellationRequestResult {
    id: number;
    bookingId: string;
    reason: string | null;
    cancelFeeTotal: number;
    refundAmount: number;
    status: string;
    createdAt: string;
  }

  interface SavedPassengerRequest {
    title: PassengerTitle;
    /** UPPERCASE, no accents: [A-Z][A-Z ]{0,48}[A-Z] */
    fullName: string;
    /** YYYY-MM-DD */
    dateOfBirth: string;
  }

  type TripLeg = 'OUTBOUND' | 'RETURN';

  interface RoundTripRequest {
    outbound: CreateBookingRequest;
    inbound: CreateBookingRequest;
  }

  /** Two linked bookings: each is paid, ticketed and cancelled on its own. */
  interface RoundTripResult {
    tripGroupId: string;
    outbound: Booking;
    inbound: Booking;
  }

  type PaymentMethod = 'SIMULATED_CARD' | 'SIMULATED_BANK' | 'SIMULATED_WALLET';
  type SimulatedResult = 'SUCCESS' | 'FAILED' | 'CANCELLED';

  interface PaymentRequest {
    method: PaymentMethod;
    simulatedResult: SimulatedResult;
  }

  interface PaymentResponse {
    paymentResult: SimulatedResult;
    bookingStatus: BookingStatus;
    bookingCode: string | null;
  }

  interface SavedPassenger {
    id: number;
    title: PassengerTitle;
    fullName: string;
    dateOfBirth: string;
  }
}
