import { api } from './client';

/** At least this long between two wake-up calls. */
const MIN_INTERVAL_MS = 5 * 60_000;
let lastAt = 0;

/**
 * The demo backend runs on Render's free plan, which sleeps after 15 minutes without traffic and
 * then needs about a minute for its first answer. A cheap public call when the app opens (or
 * comes back to the foreground) starts it waking while the customer is still on the first
 * screen, so their first real request does not wait for the cold start. Failures are ignored.
 */
export function wakeServer(now = Date.now()) {
  if (now - lastAt < MIN_INTERVAL_MS) return;
  lastAt = now;
  void api.get('/airlines', { skipAuth: true, timeout: 90_000 }).catch(() => undefined);
}
