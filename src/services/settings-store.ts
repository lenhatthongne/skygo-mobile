import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'skygo.settings.theme';

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return isPreference(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

/** `system` hands control back to the device setting. */
export function applyThemePreference(preference: ThemePreference) {
  // react-native-web has no setColorScheme: there the device setting always applies.
  if (typeof Appearance.setColorScheme !== 'function') return;
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

export async function saveThemePreference(preference: ThemePreference) {
  applyThemePreference(preference);
  try {
    await AsyncStorage.setItem(KEY, preference);
  } catch {
    // The choice still applies for this run.
  }
}
