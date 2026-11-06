import { Platform } from 'react-native';

import i18n from '@/i18n';
import { addNotification } from '@/services/notification-inbox';
import { ensureChannel, Notifications } from '@/services/push/push-notifications';
import { formatTime } from '@/utils/datetime';

/**
 * Notices about a booking that is not paid yet, made on this phone like "Đặt vé thành công"
 * (`booking-notifications.ts`): a failed payment, and a reminder shortly before the held seats are
 * released. Both are listed on the Notifications screen and shown by the phone when it is allowed.
 * They never throw: a payment must not depend on a notification.
 */
const supported = Platform.OS === 'android' || Platform.OS === 'ios';
const HOLD_PREFIX = 'skygo.payhold.';
/** The reminder comes this long before the hold runs out. */
const WARN_BEFORE_MS = 3 * 60_000;

const payable = (b: Api.Booking) => b.status === 'PENDING_PAYMENT' || b.status === 'PAYMENT_FAILED';

async function allowed() {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return false;
  await ensureChannel();
  return true;
}

/** The payment was refused: tell the customer the seats are still held and until when. */
export async function notifyPaymentFailed(booking: Api.Booking) {
  if (!supported) return;
  try {
    const f = booking.flight;
    const identifier = `skygo.payfailed.${booking.id}`;
    const title = i18n.t('paymentNotice.failedTitle');
    const body = i18n.t('paymentNotice.failedBody', {
      from: f.origin,
      to: f.destination,
      time: formatTime(booking.holdExpiresAt),
    });
    // One entry per booking: trying again and failing again does not stack another.
    addNotification({
      id: identifier,
      type: 'PAYMENT_FAILED',
      bookingId: booking.id,
      title,
      body,
      at: new Date().toISOString(),
    });
    if (!(await allowed())) return;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body, data: { type: 'PAYMENT_FAILED', bookingId: booking.id } },
      trigger: null,
    });
  } catch {
    // A missing notification is not a payment problem.
  }
}

/** Drops the "hold is running out" reminder (the booking was paid, cancelled or expired). */
export async function cancelPaymentReminder(bookingId: string) {
  if (!supported) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`${HOLD_PREFIX}${bookingId}`);
  } catch {
    // Nothing was scheduled.
  }
}

/** Drops every reminder of this kind (sign-out). */
export async function cancelPaymentReminders() {
  if (!supported) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(HOLD_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // Best effort.
  }
}

async function scheduleHold(identifier: string, at: number, booking: Api.Booking) {
  const f = booking.flight;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: i18n.t('paymentNotice.holdTitle'),
      body: i18n.t('paymentNotice.holdBody', {
        from: f.origin,
        to: f.destination,
        time: formatTime(booking.holdExpiresAt),
      }),
      data: { type: 'PAYMENT_PENDING', bookingId: booking.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(at),
      channelId: 'default',
    },
  });
}

/** A booking was just made and is waiting for payment: remind the customer before the hold ends. */
export async function schedulePaymentReminder(booking: Api.Booking, now = Date.now()) {
  if (!supported || !payable(booking)) return;
  try {
    const at = Date.parse(booking.holdExpiresAt) - WARN_BEFORE_MS;
    if (at <= now + 30_000 || !(await allowed())) return;
    await scheduleHold(`${HOLD_PREFIX}${booking.id}`, at, booking);
  } catch {
    // A missing reminder is not a booking problem.
  }
}

/**
 * Makes the scheduled reminders match `bookings`: one for each unpaid booking whose hold is still
 * open (a few minutes before it ends), none for the rest. Never asks for permission; does nothing
 * when notifications are not allowed.
 */
export async function syncPaymentReminders(bookings: Api.Booking[], now = Date.now()) {
  if (!supported) return;
  try {
    if (!(await allowed())) return;
    const wanted = new Map<string, { at: number; booking: Api.Booking }>();
    for (const booking of bookings) {
      if (!payable(booking)) continue;
      const at = Date.parse(booking.holdExpiresAt) - WARN_BEFORE_MS;
      if (at > now + 30_000) wanted.set(`${HOLD_PREFIX}${booking.id}`, { at, booking });
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const have = new Set(scheduled.map((n) => n.identifier));
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(HOLD_PREFIX) && !wanted.has(n.identifier))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    for (const [identifier, { at, booking }] of wanted) {
      if (!have.has(identifier)) await scheduleHold(identifier, at, booking);
    }
  } catch {
    // Reminders are a convenience: a failure must never break the screen that triggered the sync.
  }
}
