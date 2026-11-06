import { router } from 'expo-router';

import type { InboxItem } from '@/services/notification-inbox';

/** Opens what a notification is about: the booking, or the support conversation with the reply. */
export function openInboxItem(item: Pick<InboxItem, 'type' | 'bookingId'>) {
  if (item.type === 'SUPPORT_REPLY') {
    // Straight to the chat with the keyboard ready, so the customer can answer at once.
    router.push({
      pathname: '/account/support-detail',
      params: { id: item.bookingId, focus: '1' },
    });
  } else {
    router.push({ pathname: '/trips/[id]', params: { id: item.bookingId } });
  }
}
