import { listBookings } from '@/services/api/bookings';
import { syncFlightReminders } from '@/services/flight-reminders';
import { loadTrips, saveTrips } from '@/services/offline-store';
import { syncPaymentReminders } from '@/services/payment-notifications';

import { usePagedList } from './use-paged-list';

const keyOf = (b: Api.Booking) => b.id;

function onFresh(items: Api.Booking[]) {
  void saveTrips(items);
  void syncFlightReminders(items);
  void syncPaymentReminders(items);
}

async function offline() {
  const saved = await loadTrips();
  return saved ? { items: saved.items, syncedAt: saved.syncedAt } : null;
}

/**
 * The signed-in customer's bookings, newest first, page by page, with the saved copy shown when
 * offline. `reload()` refetches silently, `refresh()` is for pull to refresh.
 */
export function useBookings() {
  return usePagedList(listBookings, { keyOf, onFresh, offline });
}
