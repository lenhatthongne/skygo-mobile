import axios, { isAxiosError } from 'axios';

import { API_BASE_URL, API_TIMEOUT_MS } from './config';
import { isApiError, toApiError } from './errors';
import { getAccessToken, getRefreshToken, saveTokens } from './token-store';

/** The only axios instance in the app. Screens never call axios directly. */
// eslint-disable-next-line import/no-named-as-default-member
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

// --- Session expiry -------------------------------------------------------------------------
// The session layer registers a handler so this module does not import it (no import cycle).
let unauthorizedHandler: (() => void) | null = null;
let unauthorizedFired = false;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/** Call after a successful sign-in so a later expiry can notify again. */
export function armUnauthorizedHandler() {
  unauthorizedFired = false;
}

function notifyUnauthorized() {
  if (unauthorizedFired) return;
  unauthorizedFired = true;
  unauthorizedHandler?.();
}

// --- Token refresh (single-flight) ----------------------------------------------------------
let refreshing: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const token = getRefreshToken();
  if (!token) throw toApiError(new Error('No refresh token'));
  try {
    const { data } = await api.post<Api.AuthSession>(
      '/auth/refresh',
      { refreshToken: token } satisfies Api.RefreshRequest,
      { skipAuth: true },
    );
    // The old refresh token is now revoked server-side, so persist the new pair immediately.
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch (e) {
    const error = toApiError(e);
    // Only a server rejection ends the session; a network error or timeout must not.
    if (error.status === 401) notifyUnauthorized();
    throw error;
  }
}

function refreshAccessToken() {
  refreshing ??= performRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// --- Interceptors ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  if (!config.skipAuth) {
    const token = getAccessToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const apiError = toApiError(error);
    const original = isAxiosError(error) ? error.config : undefined;

    if (apiError.status === 401 && original && !original.skipAuth) {
      if (!original._retry && getRefreshToken()) {
        original._retry = true;
        try {
          const token = await refreshAccessToken();
          original.headers.set('Authorization', `Bearer ${token}`);
          return await api.request(original);
        } catch (e) {
          throw isApiError(e) ? e : toApiError(e);
        }
      }
      notifyUnauthorized();
    }
    throw apiError;
  },
);
