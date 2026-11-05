import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './en';
import { vi } from './vi';

export type Language = 'vi' | 'en';
export type LanguagePreference = 'system' | Language;

const KEY = 'skygo.settings.language';

/**
 * Vietnamese until the customer chooses otherwise: the app is Vietnamese first, and a phone set
 * to English should not turn half the screens English. "Automatic" in Settings follows the phone.
 */
const DEFAULT_PREFERENCE: LanguagePreference = 'vi';

function isPreference(value: unknown): value is LanguagePreference {
  return value === 'system' || value === 'vi' || value === 'en';
}

/**
 * The phone's language: Vietnamese phones get Vietnamese, everything else English. Read from
 * `Intl` (no native module, so no rebuild is needed).
 */
export function deviceLanguage(): Language {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.toLowerCase().startsWith('vi') ? 'vi' : 'en';
  } catch {
    return 'vi';
  }
}

const resolve = (preference: LanguagePreference): Language =>
  preference === 'system' ? deviceLanguage() : preference;

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: 'vi',
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export async function loadLanguagePreference(): Promise<LanguagePreference> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return isPreference(raw) ? raw : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/** Switches the language now and remembers the choice. */
export async function saveLanguagePreference(preference: LanguagePreference) {
  await i18n.changeLanguage(resolve(preference));
  try {
    await AsyncStorage.setItem(KEY, preference);
  } catch {
    // The choice still applies for this run.
  }
}

/**
 * Applies the language at app start. Only Vietnamese for now: most screens are not translated yet,
 * so an English choice left the app half English. A saved English choice is ignored and the picker
 * is hidden in Settings; `en.ts` stays for when every screen uses `t()`.
 */
export const LANGUAGE_CHOICE_ENABLED = false;

export async function restoreLanguage() {
  const preference = LANGUAGE_CHOICE_ENABLED ? await loadLanguagePreference() : 'vi';
  await i18n.changeLanguage(resolve(preference));
}

export default i18n;
