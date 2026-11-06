import { AppState, Platform } from 'react-native';

import { ensureChannel, hasPushDevice, Notifications } from '@/services/push/push-notifications';

const supported = Platform.OS === 'android' || Platform.OS === 'ios';

/**
 * The phone's own notification for a reply from SkyGo support, shown the same way as "Đặt vé thành
 * công" after paying (see `booking-notifications.ts`): scheduled on this phone with no trigger, so
 * it appears at once in the notification shade, only when the customer allowed notifications.
 * Tapping it opens the chat (`use-push-notifications.ts`). The reply is already listed on the
 * Notifications screen, so a refused permission loses nothing.
 *
 * When this phone is registered for server pushes and the app is not in front, the server sends
 * its own push for the reply, so nothing is made here: the customer is told once, not twice. (The
 * server skips its push while the app is open and connected, and this notification covers that
 * case.) Never throws.
 */
export async function showSupportReplyNotification(
  item: { id: string; title: string; body: string; requestId: number },
  userId: number,
) {
  if (!supported) return;
  try {
    if (AppState.currentState !== 'active' && (await hasPushDevice())) return;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      // One notification per conversation: a newer reply replaces the older one instead of piling up.
      identifier: `support-${item.requestId}`,
      content: {
        title: item.title,
        body: item.body,
        data: { type: 'SUPPORT_REPLY', requestId: item.requestId, userId },
      },
      trigger: null,
    });
  } catch {
    // A missing notification is not a problem: the reply is in the list.
  }
}

/**
 * The customer opened this conversation, so its notifications in the notification shade are stale:
 * the one made on this phone and any push from the server. Never throws.
 */
export async function dismissSupportNotifications(requestId: number) {
  if (!supported) return;
  try {
    const shown = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      shown
        .filter((n) => {
          const data = n.request.content.data as Record<string, unknown>;
          return data.type === 'SUPPORT_REPLY' && data.requestId === requestId;
        })
        .map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
    );
  } catch {
    // The notification stays until the customer swipes it: harmless.
  }
}
