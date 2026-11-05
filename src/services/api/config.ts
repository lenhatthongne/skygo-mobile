import { Platform } from 'react-native';

// EXPO_PUBLIC_* must be referenced statically so Expo can inline them. Never put secrets here.
const platformUrl = Platform.select({
  android: process.env.EXPO_PUBLIC_ANDROID_API_URL,
  ios: process.env.EXPO_PUBLIC_IOS_API_URL,
});

const defaultUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080/api' : 'http://localhost:8080/api';

export const API_BASE_URL = (platformUrl || process.env.EXPO_PUBLIC_API_URL || defaultUrl).replace(
  /\/+$/,
  '',
);

/**
 * Long enough for the demo backend on Render's free plan to wake from sleep (about 50 seconds for
 * the first request). A shorter limit made the first call after a quiet spell fail as "cannot
 * reach the server" although the server was only starting. See also `warmup.ts`.
 */
export const API_TIMEOUT_MS = 60000;
