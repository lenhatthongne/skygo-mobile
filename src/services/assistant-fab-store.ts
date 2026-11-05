import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * Whether the customer closed the floating assistant button. It is shared by every screen that
 * shows the button and remembered on the device; Settings and the Account tab can bring it back.
 */
const KEY = 'skygo.assistant.fab-hidden';
const listeners = new Set<() => void>();
let hidden = false;
let loading: Promise<void> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function load() {
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      hidden = raw === '1';
      emit();
    })
    .catch(() => undefined);
  return loading;
}

export async function setAssistantFabHidden(value: boolean) {
  hidden = value;
  emit();
  try {
    await AsyncStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    // The choice still holds until the app restarts.
  }
}

export function useAssistantFabHidden() {
  useEffect(() => {
    void load();
  }, []);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => hidden,
    () => false,
  );
}
