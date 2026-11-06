import { createContext, type ReactNode, use, useEffect, useState } from 'react';

import * as authApi from '@/services/api/auth';
import { armUnauthorizedHandler, setUnauthorizedHandler } from '@/services/api/client';
import { isApiError } from '@/services/api/errors';
import { clearSession, loadSession, saveTokens, saveUser } from '@/services/api/token-store';
import { cancelFlightReminders } from '@/services/flight-reminders';
import { cancelPaymentReminders } from '@/services/payment-notifications';
import { unregisterFromPush } from '@/services/push/push-notifications';

/** `expired`: the server rejected the session. Screens stay open while the user is asked to sign in again. */
type SessionStatus = 'loading' | 'signedOut' | 'signedIn' | 'expired';

type SessionContextValue = {
  status: SessionStatus;
  user: Api.User | null;
  /** Stores a verified login session. Throws if the account is not a CUSTOMER. */
  signIn: (session: Api.AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  /** Keeps the signed-in user in sync after the profile changes. */
  updateUser: (user: Api.User) => Promise<void>;
  /** True while the "session expired" dialog should be shown. */
  expiredPrompt: boolean;
  /** Leave the expired session and go to the sign-in screen. */
  reauthenticate: () => Promise<void>;
  /** Close the dialog and stay on the current screen. */
  dismissExpiredPrompt: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export class NotCustomerError extends Error {
  constructor() {
    super('Only CUSTOMER accounts can use the mobile app');
    this.name = 'NotCustomerError';
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<Api.User | null>(null);
  const [expiredPrompt, setExpiredPrompt] = useState(false);

  useEffect(() => {
    // Dead session (refresh rejected / no way to refresh). Keep the screens open and ask the user
    // to sign in again, instead of throwing them out of what they were doing.
    setUnauthorizedHandler(() => {
      setStatus((s) => (s === 'signedIn' ? 'expired' : s));
      setExpiredPrompt(true);
    });

    let cancelled = false;
    (async () => {
      const stored = await loadSession();
      if (cancelled) return;
      if (!stored.accessToken) {
        setStatus('signedOut');
        return;
      }
      armUnauthorizedHandler();
      if (stored.user) {
        // Open immediately from the cached profile; verify in the background.
        setUser(stored.user);
        setStatus('signedIn');
      }
      try {
        const fresh = await authApi.me();
        if (cancelled) return;
        setUser(fresh);
        setStatus('signedIn');
        void saveUser(fresh);
      } catch (e) {
        // A 401 is handled by the interceptor. Offline or timeout keeps the cached session.
        if (!cancelled && !stored.user && isApiError(e) && e.kind !== 'http')
          setStatus('signedOut');
      }
    })();

    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, []);

  async function signIn(session: Api.AuthSession) {
    if (session.role !== 'CUSTOMER') throw new NotCustomerError();
    await saveTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    await saveUser(session.user);
    armUnauthorizedHandler();
    setUser(session.user);
    setExpiredPrompt(false);
    setStatus('signedIn');
  }

  async function updateUser(next: Api.User) {
    setUser(next);
    await saveUser(next);
  }

  async function reauthenticate() {
    await clearSession();
    setUser(null);
    setExpiredPrompt(false);
    setStatus('signedOut');
  }

  async function signOut() {
    // Needs the still-valid session, so it goes before logout: this phone stops getting pushes
    // for the account that is leaving.
    await unregisterFromPush();
    // Reminders on this phone belong to the account that is leaving.
    await cancelFlightReminders().catch(() => undefined);
    await cancelPaymentReminders().catch(() => undefined);
    try {
      await authApi.logout();
    } catch {
      // Best effort: the local session is cleared either way.
    }
    await clearSession();
    setUser(null);
    setExpiredPrompt(false);
    setStatus('signedOut');
  }

  return (
    <SessionContext
      value={{
        status,
        user,
        signIn,
        signOut,
        updateUser,
        expiredPrompt,
        reauthenticate,
        dismissExpiredPrompt: () => setExpiredPrompt(false),
      }}>
      {children}
    </SessionContext>
  );
}

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used within a SessionProvider');
  return value;
}
