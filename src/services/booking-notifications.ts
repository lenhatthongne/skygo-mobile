import { Platform } from 'react-native';

import i18n from '@/i18n';
import { announceNotification } from '@/services/notification-inbox';
import { ensureChannel, hasPushDevice, Notifications } from '@/services/push/push-notifications';
import { formatDayMonth, formatTime, vnDateOf } from '@/utils/datetime';

const supported = Platform.OS === 'android' || Platform.OS === 'ios';

/**
 * "Booking confirmed" notice after a successful payment, shown even when the server cannot push (no
 * Firebase, push not registered). It is always listed on the Notifications screen, so it is not
 * lost when the phone's notifications for SkyGo are switched off; the banner on the phone is shown
 * on top of that only when the system allows it. When this phone has a push token the server sends
 * its own `BOOKING_CONFIRMED`, so nothing is added here and the customer is not told twice.
 * Never throws: payment must not depend on a notification.
 */
export async function notifyBookingConfirmed(booking: Api.Booking, userId: number) {
  if (!supported) return;
  try {
    if (await hasPushDevice()) return;
    const f = booking.flight;
    const identifier = `skygo.confirmed.${booking.id}`;
    const title = i18n.t('bookingPush.title');
    const body = i18n.t('bookingPush.body', {
      from: f.origin,
      to: f.destination,
      time: formatTime(f.departureAt),
      date: formatDayMonth(vnDateOf(f.departureAt)),
      code: booking.bookingCode ?? '',
    });

    // Same identifier as the phone banner, so the banner arriving later is not listed twice.
    announceNotification({
      id: identifier,
      type: 'BOOKING_CONFIRMED',
      bookingId: booking.id,
      title,
      body,
      at: new Date().toISOString(),
    });

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body, data: { type: 'BOOKING_CONFIRMED', bookingId: booking.id, userId } },
      trigger: null,
    });
  } catch {
    // A missing notification is not a payment problem.
  }
}
