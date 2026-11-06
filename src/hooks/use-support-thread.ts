import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { toApiError } from '@/services/api/errors';
import { errorMessage } from '@/utils/error-messages';
import { getSupportThread, sendSupportMessage, type SupportImage } from '@/services/api/support';

const POLL_MS = 4000;

/** A message the customer just wrote that the server has not confirmed yet (or could not take). */
export type PendingMessage = {
  localId: string;
  body: string;
  image: SupportImage | null;
  failed: boolean;
  error: string | null;
};

let localCounter = 0;

/**
 * One support conversation: loads it, asks the server for newer messages every few seconds while
 * the screen is showing and the app is open, and sends the customer's messages. A message appears
 * at once as pending; a failed one stays in the list with the reason so it can be sent again.
 */
export function useSupportThread(requestId: number) {
  const [request, setRequest] = useState<Api.SupportRequest | null>(null);
  const [messages, setMessages] = useState<Api.SupportMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [offline, setOffline] = useState(false);
  const focused = useIsFocused();
  const lastId = useRef(0);
  const busy = useRef(false);

  const merge = useCallback((incoming: Api.SupportMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const known = new Set(current.map((m) => m.id));
      const added = incoming.filter((m) => !known.has(m.id));
      if (added.length === 0) return current;
      return [...current, ...added].sort((a, b) => a.id - b.id);
    });
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
  }, []);

  const fetchNew = useCallback(
    async (signal?: AbortSignal) => {
      if (busy.current) return;
      busy.current = true;
      try {
        const thread = await getSupportThread(requestId, lastId.current, signal);
        setRequest(thread.request);
        merge(thread.messages);
        setError(null);
        setOffline(false);
      } catch (e) {
        if (signal?.aborted) return;
        const apiError = toApiError(e);
        // The first load shows the error; later ones keep the conversation and try again.
        if (lastId.current === 0) setError(apiError);
        else setOffline(true);
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [requestId, merge],
  );

  useEffect(() => {
    if (!focused) return;
    const controller = new AbortController();
    void fetchNew(controller.signal);
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => void fetchNew(controller.signal), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void fetchNew(controller.signal);
        start();
      } else stop();
    });
    return () => {
      controller.abort();
      stop();
      sub.remove();
    };
  }, [focused, fetchNew]);

  const deliver = useCallback(
    async (item: PendingMessage) => {
      setPending((list) =>
        list.map((p) => (p.localId === item.localId ? { ...p, failed: false, error: null } : p)),
      );
      try {
        const sent = await sendSupportMessage(requestId, {
          body: item.body || undefined,
          image: item.image ?? undefined,
        });
        merge([sent]);
        setPending((list) => list.filter((p) => p.localId !== item.localId));
        void fetchNew();
      } catch (e) {
        const apiError = toApiError(e);
        setPending((list) =>
          list.map((p) =>
            p.localId === item.localId ? { ...p, failed: true, error: errorMessage(apiError) } : p,
          ),
        );
      }
    },
    [requestId, merge, fetchNew],
  );

  const send = useCallback(
    (body: string, image: SupportImage | null) => {
      const item: PendingMessage = {
        localId: `local-${(localCounter += 1)}`,
        body: body.trim(),
        image,
        failed: false,
        error: null,
      };
      setPending((list) => [...list, item]);
      void deliver(item);
    },
    [deliver],
  );

  const retry = useCallback(
    (localId: string) => {
      const item = pending.find((p) => p.localId === localId);
      if (item) void deliver(item);
    },
    [pending, deliver],
  );

  const discard = useCallback((localId: string) => {
    setPending((list) => list.filter((p) => p.localId !== localId));
  }, []);

  return {
    request,
    messages,
    pending,
    loading,
    error,
    offline,
    send,
    retry,
    discard,
    reload: fetchNew,
  };
}
