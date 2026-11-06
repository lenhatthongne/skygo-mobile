import { router } from 'expo-router';

import type { InboxItem } from '@/services/notification-inbox';

/** Opens what a notification is about: the booking, or the support conversation with the reply. */
export function openInboxItem(item: Pick<InboxItem, 'type' | 'bookingId'>) {
  if (item.type === 'SUPPORT_REPLY') {
    router.push({ pathname: '/account/support-detail', params: { id: item.bookingId } });
  } else {
    router.push({ pathname: '/trips/[id]', params: { id: item.bookingId } });
  }
}
