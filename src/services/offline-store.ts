import AsyncStorage from '@react-native-async-storage/async-storage';

import { ASSISTANT_HISTORY_KEY } from '@/services/assistant-store';

/**
 * Copies of the customer's trips and tickets so they can be shown without a network. They hold
 * no password or token, and are removed on sign-out (`clearOfflineData`). Every copy keeps the
 * server time it reflects (`syncedAt`) so the UI can say how fresh it is.
 */
const TRIPS_KEY = 'skygo.offline.trips';
const TICKETS_KEY = 'skygo.offline.tickets';
const MAX_TICKETS = 20;

type TripsCache = { syncedAt: string; items: Api.Booking[] };
/** The QR text is kept in `qrContent`; the duplicate raw token is not stored. */
type StoredTicket = Omit<Api.Ticket, 'qrToken'>;

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function write(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Offline copies are a convenience; losing one must never break the screen.
  }
}

export const saveTrips = (items: Api.Booking[]) =>
  write(TRIPS_KEY, { syncedAt: new Date().toISOString(), items } satisfies TripsCache);

export const loadTrips = () => read<TripsCache>(TRIPS_KEY);

export async function saveTicket(ticket: Api.Ticket) {
  const { qrToken: _qrToken, ...stored } = ticket;
  const all = (await read<Record<string, StoredTicket>>(TICKETS_KEY)) ?? {};
  all[ticket.booking.id] = stored;
  const newest = Object.entries(all)
    .sort(([, a], [, b]) => Date.parse(b.syncedAt) - Date.parse(a.syncedAt))
    .slice(0, MAX_TICKETS);
  await write(TICKETS_KEY, Object.fromEntries(newest));
}

export async function loadTicket(bookingId: string) {
  const all = await read<Record<string, StoredTicket>>(TICKETS_KEY);
  return all?.[bookingId] ?? null;
}

/** How many tickets are saved, and when the newest one was synced. */
export async function ticketSummary() {
  const all = await read<Record<string, StoredTicket>>(TICKETS_KEY);
  const list = Object.values(all ?? {});
  const newest = list.reduce<string | null>((a, t) => (!a || t.syncedAt > a ? t.syncedAt : a), null);
  return { count: list.length, syncedAt: newest };
}

export async function clearOfflineData() {
  try {
    await AsyncStorage.multiRemove([TRIPS_KEY, TICKETS_KEY, ASSISTANT_HISTORY_KEY]);
  } catch {
    // ignore
  }
}
