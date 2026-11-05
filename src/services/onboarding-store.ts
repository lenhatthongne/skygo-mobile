import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'skygo.onboarding.seen';

/** Whether this phone already showed the first-launch introduction. Unreadable storage counts as seen. */
export async function hasSeenOnboarding() {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return true;
  }
}

export async function markOnboardingSeen() {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // Worst case the introduction shows once more.
  }
}

/** `null` until the saved flag is read. */
export function useOnboardingSeen() {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void hasSeenOnboarding().then((value) => alive && setSeen(value));
    return () => {
      alive = false;
    };
  }, []);
  return seen;
}
