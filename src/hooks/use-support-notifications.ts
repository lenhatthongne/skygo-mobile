import { useEffect } from 'react';
import { AppState } from 'react-native';

import i18n from '@/i18n';
import { toApiError } from '@/services/api/errors';
import { getSupportUnread, listMySupportRequests } from '@/services/api/support';
import { addNotification, announceNotification } from '@/services/notification-inbox';

const POLL_MS = 15_000;

/**
 * While the app is open and the customer is signed in, asks the server every few seconds whether
 * SkyGo replied to a support conversation. A new reply is listed in Notifications and shows the
 * in-app strip; replies already waiting when the app opens are only listed. The chat screen reads
 * its own conversation faster, and opening it marks the replies as read on the server.
 */
export function useSupportNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let first = true;
    let busy = false;

    async function check() {
      if (busy || AppState.currentState !== 'active') return;
      busy = true;
      try {
        if ((await getSupportUnread(controller.signal)) === 0) return;
        const { content } = await listMySupportRequests(controller.signal);
        for (const r of content) {
          if (r.unread <= 0 || r.lastSender !== 'ADMIN' || !r.lastMessageAt) continue;
          const item = {
            id: `support-${r.id}-${r.lastMessageAt}`,
            type: 'SUPPORT_REPLY' as const,
            bookingId: String(r.id),
            title: i18n.t('supportChat.replyTitle'),
            body:
              r.lastMessage && r.lastMessage !== '[Ảnh]'
                ? r.lastMessage
                : r.lastMessage
                  ? i18n.t('supportChat.photoPreview')
                  : i18n.t('supportChat.replyBody'),
            at: r.lastMessageAt,
          };
          if (first) addNotification(item);
          else announceNotification(item);
        }
        first = false;
      } catch (e) {
        // Offline or the server is asleep: the next round tries again.
        if (toApiError(e).kind === 'canceled') return;
      } finally {
        busy = false;
      }
    }

    const start = setTimeout(() => void check(), 3000);
    const timer = setInterval(() => void check(), POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      controller.abort();
      clearTimeout(start);
      clearInterval(timer);
      sub.remove();
    };
  }, [enabled]);
}
