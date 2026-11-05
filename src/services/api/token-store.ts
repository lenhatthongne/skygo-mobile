import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { clearDraft } from '@/services/booking-draft';
import { clearOfflineData } from '@/services/offline-store';

const ACCESS_KEY = 'skygo.access-token';
const REFRESH_KEY = 'skygo.refresh-token';
const USER_KEY = 'skygo.user';

// Tokens live in the OS keychain/keystore on native. The in-memory copy lets interceptors read
// them synchronously. Web has no secure storage, so tokens there are kept in memory only.
const persistent = Platform.OS !== 'web';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let loaded = false;

async function read(key: string) {
  return persistent ? SecureStore.getItemAsync(key) : null;
}
async function write(key: string, value: string | null) {
  if (!persistent) return;
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

export async function loadSession() {
  if (!loaded) {
    [accessToken, refreshToken] = await Promise.all([read(ACCESS_KEY), read(REFRESH_KEY)]);
    loaded = true;
  }
  const rawUser = await read(USER_KEY);
  let user: Api.User | null = null;
  try {
    user = rawUser ? (JSON.parse(rawUser) as Api.User) : null;
  } catch {
    user = null;
  }
  return { accessToken, refreshToken, user };
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export async function saveTokens(tokens: { accessToken: string; refreshToken: string | null }) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  loaded = true;
  await Promise.all([write(ACCESS_KEY, accessToken), write(REFRESH_KEY, refreshToken)]);
}

export async function saveUser(user: Api.User) {
  await write(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  loaded = true;
  await Promise.all([
    write(ACCESS_KEY, null),
    write(REFRESH_KEY, null),
    write(USER_KEY, null),
    // Saved trips and tickets belong to the account that just left.
    clearOfflineData(),
    Promise.resolve(clearDraft()),
  ]);
}
