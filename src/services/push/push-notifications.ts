import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { registerPushDevice, unregisterPushDevice } from '@/services/api/push';

// Remote push needs a native build (not Expo Go on Android) and does not exist on web.
const supported = Platform.OS === 'android' || Platform.OS === 'ios';

const CHANNEL_ID = 'default'; // Must match `channelId` sent by the backend.
const TOKEN_KEY = 'skygo.push-token';

// Show pushes that arrive while the app is open (banner + notification list), without sound.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type PushSetup =
  | 'registered'
  | 'denied' // The user refused (or has not been asked and `ask` was false).
  | 'unavailable' // Web, no project id, or the token could not be fetched yet.
  | 'error'; // The backend call failed; safe to retry later.

let current: Promise<PushSetup> | null = null;

export async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  // Android 13+ shows the permission prompt only once a channel exists.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Thông báo đặt vé',
    // The lint resolver misses this re-exported enum; tsc resolves it.
    // eslint-disable-next-line import/namespace
    importance: Notifications.AndroidImportance.MAX,
  });
}

async function hasPermission(ask: boolean) {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!ask || !existing.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function doRegister(ask: boolean): Promise<PushSetup> {
  if (!supported) return 'unavailable';
  await ensureChannel();
  if (!(await hasPermission(ask))) return 'denied';

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return 'unavailable';

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    // Offline, simulator without push support, or Google Play services missing.
    return 'unavailable';
  }

  try {
    await registerPushDevice({
      expoToken: token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
  } catch {
    return 'error';
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
  return 'registered';
}

/**
 * Registers this device's push token for the signed-in account. Calls made while one is running
 * share it. `ask` shows the system permission prompt if the user has not decided yet.
 */
export function registerForPush(options: { ask: boolean }) {
  current ??= doRegister(options.ask)
    .catch((): PushSetup => 'error')
    .finally(() => {
      current = null;
    });
  return current;
}

/** True when this phone has a push token registered, i.e. the server's own push will reach it. */
export async function hasPushDevice() {
  try {
    return (await SecureStore.getItemAsync(TOKEN_KEY)) !== null;
  } catch {
    return false;
  }
}

/** Tells the server this phone no longer belongs to the signed-in account. Call BEFORE logout. */
export async function unregisterFromPush() {
  if (!supported) return;
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await unregisterPushDevice({ expoToken: token });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Best effort: signing in as someone else re-registers the token under that account.
  }
}

/** `userId` is null for a local flight reminder (scheduled on this phone, cleared at sign-out). */
export type BookingPushData = { bookingId: string; userId: number | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates a notification payload about a booking: `BOOKING_CONFIRMED`, `FLIGHT_REMINDER` and the
 * local payment notices (`PAYMENT_FAILED`, `PAYMENT_PENDING`), each with a UUID booking.
 */
export function parseBookingPush(data: unknown): BookingPushData | null {
  if (!data || typeof data !== 'object') return null;
  const { type, bookingId, userId } = data as Record<string, unknown>;
  const local =
    type === 'FLIGHT_REMINDER' || type === 'PAYMENT_FAILED' || type === 'PAYMENT_PENDING';
  if (type !== 'BOOKING_CONFIRMED' && !local) return null;
  if (typeof bookingId !== 'string' || !UUID.test(bookingId)) return null;
  if (local) return { bookingId, userId: null };
  if (typeof userId !== 'number') return null;
  return { bookingId, userId };
}

export { Notifications };
