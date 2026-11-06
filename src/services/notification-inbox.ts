import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { Notifications } from '@/services/push/push-notifications';

/**
 * The notifications this phone received for the signed-in account (the Notifications screen).
 *
 * They are kept on the device, newest first, so a customer who swiped one away from the tray can
 * still find it. A notification counts as read only when the customer taps that notification (or
 * marks all read): opening the app or the booking some other way does not. The unread count drives the number on
 * the app icon, the "Chuyến đi" tab and the bell on Home.
 */
const supported = Platform.OS === 'android' || Platform.OS === 'ios';
const MAX_ITEMS = 50;
const keyOf = (userId: number) => `skygo.notifications.${userId}`;

export type InboxItem = {
  /** The notification's own identifier: the same notification is never listed twice. */
  id: string;
  type: 'BOOKING_CONFIRMED' | 'FLIGHT_REMINDER';
  bookingId: string;
  title: string;
  body: string;
  /** ISO time it arrived. */
  at: string;
  read: boolean;
};

const listeners = new Set<() => void>();
let userId: number | null = null;
let items: InboxItem[] = [];
let unreadCount = 0;

function publish() {
  unreadCount = items.filter((i) => !i.read).length;
  listeners.forEach((l) => l());
  if (supported) void Notifications.setBadgeCountAsync(unreadCount).catch(() => undefined);
}

function persist() {
  if (userId === null) return;
  void AsyncStorage.setItem(keyOf(userId), JSON.stringify(items)).catch(() => undefined);
}

const isItem = (x: unknown): x is InboxItem => {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    (o.type === 'BOOKING_CONFIRMED' || o.type === 'FLIGHT_REMINDER') &&
    typeof o.bookingId === 'string' &&
    typeof o.title === 'string' &&
    typeof o.body === 'string' &&
    typeof o.at === 'string' &&
    typeof o.read === 'boolean'
  );
};

/** Switches to the signed-in account (null on sign-out, which also clears the icon number). */
export async function bindInboxUser(id: number | null) {
  userId = id;
  items = [];
  publish();
  if (id === null) return;
  try {
    const raw = await AsyncStorage.getItem(keyOf(id));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (userId === id && Array.isArray(parsed)) {
      // Anything added while loading is kept on top of the saved list.
      const known = new Set(items.map((i) => i.id));
      items = [...items, ...parsed.filter(isItem).filter((i) => !known.has(i.id))]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, MAX_ITEMS);
      publish();
    }
  } catch {
    // Start empty: the next notification adds to it.
  }
}

/** Lists a notification that arrived (a new one is unread; one already listed is left alone). */
export function addNotification(item: Omit<InboxItem, 'read'>) {
  if (userId === null || items.some((i) => i.id === item.id)) return false;
  items = [{ ...item, read: false }, ...items]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_ITEMS);
  persist();
  publish();
  return true;
}

const announceListeners = new Set<(item: InboxItem) => void>();

/**
 * Lists a notification that has just arrived while the app is open and tells the in-app banner
 * about it. A notification that was already listed (or one only found in the tray) is not announced.
 */
export function announceNotification(item: Omit<InboxItem, 'read'>) {
  if (addNotification(item)) announceListeners.forEach((l) => l({ ...item, read: false }));
}

export function onNotificationAnnounced(listener: (item: InboxItem) => void) {
  announceListeners.add(listener);
  return () => {
    announceListeners.delete(listener);
  };
}

/**
 * The customer tapped this notification (on the Notifications screen, on the in-app strip or in the
 * phone's tray): only that one is read. Opening a booking by another way does not read anything.
 */
export function markRead(notificationId: string) {
  if (supported) {
    void Notifications.dismissNotificationAsync(notificationId).catch(() => undefined);
  }
  if (!items.some((i) => i.id === notificationId && !i.read)) return;
  items = items.map((i) => (i.id === notificationId ? { ...i, read: true } : i));
  persist();
  publish();
}

export function markAllRead() {
  if (supported) void Notifications.dismissAllNotificationsAsync().catch(() => undefined);
  if (unreadCount === 0) return;
  items = items.map((i) => (i.read ? i : { ...i, read: true }));
  persist();
  publish();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUnreadCount() {
  return useSyncExternalStore(
    subscribe,
    () => unreadCount,
    () => 0,
  );
}

export function useInboxItems() {
  return useSyncExternalStore(
    subscribe,
    () => items,
    () => items,
  );
}
