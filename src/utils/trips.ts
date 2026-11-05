export type TripTab = 'upcoming' | 'past' | 'cancelled';

export const TRIP_TABS: { key: TripTab; label: string }[] = [
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'past', label: 'Đã bay' },
  { key: 'cancelled', label: 'Đã hủy' },
];

/**
 * Which tab a booking belongs to. The server only pages bookings and has no status filter, so
 * the grouping is done on the device from the status, the payment deadline and the departure.
 */
export function tripTab(booking: Api.Booking, now: number): TripTab {
  const departed = Date.parse(booking.flight.departureAt) <= now;
  switch (booking.status) {
    case 'CANCELLED':
    case 'EXPIRED':
      return 'cancelled';
    case 'PENDING_PAYMENT':
    case 'PAYMENT_FAILED':
      // An unpaid booking whose hold ran out is as good as cancelled.
      return Date.parse(booking.holdExpiresAt) > now ? 'upcoming' : 'cancelled';
    case 'CONFIRMED':
    case 'CANCEL_REQUESTED':
      return departed ? 'past' : 'upcoming';
  }
}

/** Upcoming trips by departure (soonest first); the other tabs keep the server order (newest). */
export function tripsForTab(items: Api.Booking[], tab: TripTab, now: number) {
  const list = items.filter((b) => tripTab(b, now) === tab);
  if (tab === 'upcoming') {
    list.sort((a, b) => Date.parse(a.flight.departureAt) - Date.parse(b.flight.departureAt));
  }
  return list;
}

type StatusTone = 'warning' | 'danger' | 'success' | 'purple' | 'textMuted';

export const BOOKING_STATUS: Record<Api.BookingStatus, { label: string; tone: StatusTone }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', tone: 'warning' },
  PAYMENT_FAILED: { label: 'Thanh toán thất bại', tone: 'danger' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'success' },
  CANCEL_REQUESTED: { label: 'Đang chờ duyệt hủy', tone: 'purple' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
  EXPIRED: { label: 'Hết hạn giữ chỗ', tone: 'textMuted' },
};

/** mm:ss */
export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** What the Trips list shows: a single booking, or the two linked legs of a round trip. */
export type TripEntry =
  | { kind: 'single'; key: string; booking: Api.Booking }
  | { kind: 'group'; key: string; legs: Api.Booking[] };

/**
 * Joins the legs of a round trip (same `tripGroupId`, from the backend) into one entry at the
 * position of the first leg met. A leg whose partner is on another page is shown alone as a
 * group until that page loads. Legs are ordered outbound first.
 */
export function groupTrips(bookings: Api.Booking[]): TripEntry[] {
  const entries: TripEntry[] = [];
  const groups = new Map<string, Extract<TripEntry, { kind: 'group' }>>();
  for (const booking of bookings) {
    if (!booking.tripGroupId) {
      entries.push({ kind: 'single', key: booking.id, booking });
      continue;
    }
    let group = groups.get(booking.tripGroupId);
    if (!group) {
      group = { kind: 'group', key: booking.tripGroupId, legs: [] };
      groups.set(booking.tripGroupId, group);
      entries.push(group);
    }
    group.legs.push(booking);
  }
  for (const group of groups.values()) {
    group.legs.sort((a, b) => (a.leg === 'OUTBOUND' ? -1 : 0) - (b.leg === 'OUTBOUND' ? -1 : 0));
  }
  return entries;
}

/** A round trip is upcoming while any leg is; past when none is but a leg has flown. */
export function entryTab(entry: TripEntry, now: number): TripTab {
  if (entry.kind === 'single') return tripTab(entry.booking, now);
  const tabs = entry.legs.map((l) => tripTab(l, now));
  if (tabs.includes('upcoming')) return 'upcoming';
  return tabs.includes('past') ? 'past' : 'cancelled';
}

const entryDeparture = (entry: TripEntry) =>
  Math.min(
    ...(entry.kind === 'single' ? [entry.booking] : entry.legs).map((b) =>
      Date.parse(b.flight.departureAt),
    ),
  );

/** Entries of one tab; upcoming ones by their earliest departure, the rest in server order. */
export function entriesForTab(items: Api.Booking[], tab: TripTab, now: number) {
  const list = groupTrips(items).filter((e) => entryTab(e, now) === tab);
  if (tab === 'upcoming') list.sort((a, b) => entryDeparture(a) - entryDeparture(b));
  return list;
}

/** A leg that can still be paid: unpaid, hold open. */
export const isPayable = (booking: Api.Booking, now: number) =>
  (booking.status === 'PENDING_PAYMENT' || booking.status === 'PAYMENT_FAILED') &&
  Date.parse(booking.holdExpiresAt) > now;
