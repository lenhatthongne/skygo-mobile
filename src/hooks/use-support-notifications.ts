import { useEffect } from 'react';
import { AppState } from 'react-native';

import i18n from '@/i18n';
import { toApiError } from '@/services/api/errors';
import { getSupportUnread, listMySupportRequests } from '@/services/api/support';
import { notifySupportReply } from '@/services/notification-inbox';
import { showSupportReplyNotification } from '@/services/support-notifications';
import { subscribeSupportEvents } from '@/services/support-socket';

// The live connection delivers replies at once; this polling is only the fallback when it is down.
const POLL_MS = 15_000;

/**
 * While the app is open and the customer is signed in, asks the server every few seconds whether
 * SkyGo support replied. A reply is listed in Notifications like any other (the bell counts it and
 * tapping it opens the chat); one that arrives while the app is open also shows the in-app strip,
 * and replies already waiting when the app opens are only listed. The list is fetched only when the
 * unread count grew, so an idle app makes one small request per round.
 */
export function useSupportNotifications(enabled: boolean, userId: number | undefined) {
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    // The newest message time already handled per conversation, so a reply is listed once.
    const known = new Map<number, string>();
    let first = true;
    let busy = false;
    let lastCount = 0;

    async function check() {
      // Also while the app is minimized, as long as the system keeps it alive.
      if (busy || AppState.currentState === 'inactive') return;
      busy = true;
      try {
        const count = await getSupportUnread(controller.signal);
        const grew = count > lastCount;
        lastCount = count;
        if (!first && !grew) return;
        const { content } = await listMySupportRequests(controller.signal);
        for (const r of content) {
          if (!r.lastMessageAt) continue;
          const seen = known.get(r.id);
          known.set(r.id, r.lastMessageAt);
          if (seen === r.lastMessageAt || r.unread <= 0 || r.lastSender !== 'ADMIN') continue;
          const item = {
            id: `support-${r.id}-${r.lastMessageAt}`,
            type: 'SUPPORT_REPLY' as const,
            bookingId: String(r.id),
            title: i18n.t('supportChat.replyTitle'),
            body:
              r.lastMessage && r.lastMessage !== '[Ảnh]'
                ? r.lastMessage
                : i18n.t('supportChat.photoPreview'),
            at: r.lastMessageAt,
          };
          // A new reply also shows on the phone itself, like "Đặt vé thành công" after paying.
          if (notifySupportReply(item) && !first && userId !== undefined) {
            void showSupportReplyNotification({ ...item, requestId: r.id }, userId);
          }
        }
        first = false;
      } catch (e) {
        // Offline or the server is asleep: the next round tries again.
        if (toApiError(e).kind === 'canceled') return;
      } finally {
        busy = false;
      }
    }

    // A hint from the server means a conversation changed: look right away.
    const off = subscribeSupportEvents(() => void check());
    const start = setTimeout(() => void check(), 2000);
    const timer = setInterval(() => void check(), POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      controller.abort();
      clearTimeout(start);
      clearInterval(timer);
      sub.remove();
      off();
    };
  }, [enabled, userId]);
}
