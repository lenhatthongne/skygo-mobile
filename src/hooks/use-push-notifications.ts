import { router } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/providers/session-provider';
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

  useEffect(() => {
    if (!response || status === 'loading' || status === 'expired') return;
    const clear = () => void Notifications.clearLastNotificationResponseAsync();
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return clear();

    const push = parseBookingPush(response.notification.request.content.data);
    // A tap meant for another account (or while signed out) must not open this one's bookings.
    if (!push || status !== 'signedIn' || (push.userId !== null && push.userId !== userId)) return clear();

    clear();
    router.push({ pathname: '/trips/[id]', params: { id: push.bookingId } });
  }, [response, status, userId]);
}
