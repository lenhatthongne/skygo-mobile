import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/providers/session-provider';
import { openInboxItem } from '@/utils/notification-target';
import {
  addNotification,
  announceNotification,
  bindInboxUser,
  markRead,
} from '@/services/notification-inbox';
import {
  Notifications,
  parseBookingPush,
  registerForPush,
} from '@/services/push/push-notifications';

/**
 * Keeps this phone's push token registered to the signed-in account and opens the booking when a
 * notification is tapped, including when the tap launched the app from a closed state.
 */
export function usePushNotifications() {
  const { status, user } = useSession();
  const userId = user?.id;
  // `undefined` until the last response is known, `null` when the app was not opened by a push.
  const response = Notifications.useLastNotificationResponse();

  // Signing in (also as a different user on the same phone) re-registers the token to that user.
  useEffect(() => {
    if (status !== 'signedIn' || userId === undefined) return;
    void registerForPush({ ask: false });
    const sub = Notifications.addPushTokenListener(() => void registerForPush({ ask: false }));
    return () => sub.remove();
  }, [status, userId]);

  // Unread count (icon number and tab badge): follows the signed-in account, counts every booking
  // notification that arrived or is still in the tray, and drops a booking only once it is opened.
  useEffect(() => {
    if (status !== 'signedIn' || userId === undefined) {
      if (status === 'signedOut') void bindInboxUser(null);
      return;
    }
    let active = true;
    const count = (request: Notifications.NotificationRequest, date: number, announce = false) => {
      const push = parseBookingPush(request.content.data);
      if (!push || (push.userId !== null && push.userId !== userId)) return;
      const type = (request.content.data as { type?: unknown }).type;
      if (type !== 'BOOKING_CONFIRMED' && type !== 'FLIGHT_REMINDER') return;
      (announce ? announceNotification : addNotification)({
        id: request.identifier,
        type,
        bookingId: push.bookingId,
        title: request.content.title ?? '',
        body: request.content.body ?? '',
        at: new Date(date).toISOString(),
      });
    };
    const syncTray = async () => {
      try {
        const shown = await Notifications.getPresentedNotificationsAsync();
        if (active) shown.forEach((n) => count(n.request, n.date));
      } catch {
        // The tray is only a second source: received notifications are counted below.
      }
    };
    void bindInboxUser(userId).then(syncTray);
    const received = Notifications.addNotificationReceivedListener((n) =>
      count(n.request, n.date, true),
    );
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') void syncTray();
    });
    return () => {
      active = false;
      received.remove();
      appState.remove();
    };
  }, [status, userId]);

  useEffect(() => {
    if (!response || status === 'loading' || status === 'expired') return;
    const clear = () => void Notifications.clearLastNotificationResponseAsync();
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return clear();

    // A reply from SkyGo support: open the chat, ready to write back.
    const data = response.notification.request.content.data as Record<string, unknown>;
    if (data.type === 'SUPPORT_REPLY') {
      clear();
      if (status !== 'signedIn' || data.userId !== userId || typeof data.requestId !== 'number') {
        return;
      }
      markRead(response.notification.request.identifier);
      openInboxItem({ type: 'SUPPORT_REPLY', bookingId: String(data.requestId) });
      return;
    }

    const push = parseBookingPush(response.notification.request.content.data);
    // A tap meant for another account (or while signed out) must not open this one's bookings.
    if (!push || status !== 'signedIn' || (push.userId !== null && push.userId !== userId))
      return clear();

    clear();
    markRead(response.notification.request.identifier);
    router.push({ pathname: '/trips/[id]', params: { id: push.bookingId } });
  }, [response, status, userId]);
}
