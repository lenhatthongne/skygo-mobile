import { Platform } from 'react-native';

import { ensureChannel, Notifications } from '@/services/push/push-notifications';

const supported = Platform.OS === 'android' || Platform.OS === 'ios';

/**
 * The phone's own notification for a reply from SkyGo support, shown the same way as "Đặt vé thành
 * công" after paying (see `booking-notifications.ts`): scheduled on this phone with no trigger, so
 * it appears at once in the notification shade, only when the customer allowed notifications.
 * Tapping it opens the chat (`use-push-notifications.ts`). The reply is already listed on the
 * Notifications screen, so a refused permission loses nothing. Never throws.
 */
export async function showSupportReplyNotification(
  item: { id: string; title: string; body: string; requestId: number },
  userId: number,
) {
  if (!supported) return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      // Same identifier as the entry in the list, so tapping either reads it.
      identifier: item.id,
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
