import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

import i18n from '@/i18n';
import { getReminderConfig } from '@/services/api/reminders';
import { ensureChannel, Notifications } from '@/services/push/push-notifications';
import { formatDayMonth, formatTime, vnDateOf } from '@/utils/datetime';

/**
 * Local reminders before departure, scheduled on this phone (no server push, so they also work
 * offline). Each paid, upcoming booking gets one reminder a day before and one three hours before.
 */
const supported = Platform.OS === 'android' || Platform.OS === 'ios';
const KEY = 'skygo.settings.flight-reminders';
const PREFIX = 'skygo.reminder.';

const KINDS = [
  { id: '24h', leadMs: 24 * 3600_000, title: 'reminder.dayTitle', lead: 'reminder.dayLead' },
  { id: '3h', leadMs: 3 * 3600_000, title: 'reminder.hoursTitle', lead: 'reminder.hoursLead' },
] as const;

const SERVER_CHECK_TTL_MS = 60_000;
let serverCheck: { at: number; on: boolean } | null = null;

/**
 * True while the server sends flight reminders by push (an admin switch). The phone then drops
 * its own so a trip is not reminded twice. An unreachable server means "no": local reminders are
 * the safe fallback. The answer is reused for a minute.
 */
export async function serverRemindersOn(now = Date.now()) {
  if (serverCheck && now - serverCheck.at < SERVER_CHECK_TTL_MS) return serverCheck.on;
  try {
    const on = (await getReminderConfig()).serverReminders;
    serverCheck = { at: now, on };
    return on;
  } catch {
    return false;
  }
}

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

/** Reminders are on unless the customer turned them off in Settings. */
export async function loadRemindersEnabled() {
  try {
    return (await AsyncStorage.getItem(KEY)) !== 'off';
  } catch {
    return true;
  }
}

async function saveRemindersEnabled(enabled: boolean) {
  try {
    await AsyncStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch {
    // The choice still applies for this run.
  }
}

export async function reminderPermission(): Promise<{
  status: ReminderPermission;
  canAskAgain: boolean;
}> {
  if (!supported) return { status: 'denied', canAskAgain: false };
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return { status: 'granted', canAskAgain: true };
  return { status: p.canAskAgain ? 'undetermined' : 'denied', canAskAgain: p.canAskAgain };
}

/** Removes every reminder this app scheduled (sign-out, or the customer turned them off). */
export async function cancelFlightReminders() {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Makes the scheduled reminders match `bookings`: adds the missing ones, drops those of bookings
 * that were cancelled or already flew. Does nothing when reminders are off or not permitted; it
 * never asks for permission itself.
 */
export async function syncFlightReminders(bookings: Api.Booking[], now = Date.now()) {
  if (!supported) return;
  try {
    if (!(await loadRemindersEnabled())) return;
    if ((await reminderPermission()).status !== 'granted') return;
    if (await serverRemindersOn(now)) {
      await cancelFlightReminders();
      return;
    }
    await ensureChannel();

    const wanted = new Map<
      string,
      { at: number; booking: Api.Booking; kind: (typeof KINDS)[number] }
    >();
    for (const booking of bookings) {
      if (booking.status !== 'CONFIRMED') continue;
      const departure = Date.parse(booking.flight.departureAt);
      for (const kind of KINDS) {
        const at = departure - kind.leadMs;
        if (at > now + 60_000)
          wanted.set(`${PREFIX}${booking.id}.${kind.id}`, { at, booking, kind });
      }
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(PREFIX) && !wanted.has(n.identifier))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );

    for (const [identifier, { at, booking, kind }] of wanted) {
      const f = booking.flight;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: i18n.t(kind.title),
          body: i18n.t('reminder.body', {
            from: f.origin,
            to: f.destination,
            time: formatTime(f.departureAt),
            date: formatDayMonth(vnDateOf(f.departureAt)),
            code: booking.bookingCode ?? '',
            lead: i18n.t(kind.lead),
          }),
          data: { type: 'FLIGHT_REMINDER', bookingId: booking.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at),
          channelId: 'default',
        },
      });
    }
  } catch {
    // Reminders are a convenience: a failure must never break the screen that triggered the sync.
  }
}

/**
 * Turns reminders on: asks for permission if the system still allows it, otherwise sends the
 * customer to the phone's settings. Returns whether reminders are now on.
 */
export async function enableFlightReminders() {
  if (!supported) return false;
  let permission = await reminderPermission();
  if (permission.status !== 'granted' && permission.canAskAgain) {
    const asked = await Notifications.requestPermissionsAsync();
    permission = asked.granted
      ? { status: 'granted', canAskAgain: true }
      : await reminderPermission();
  }
  if (permission.status !== 'granted') {
    await Linking.openSettings().catch(() => undefined);
    return false;
  }
  await saveRemindersEnabled(true);
  return true;
}

export async function disableFlightReminders() {
  await saveRemindersEnabled(false);
  await cancelFlightReminders();
}
