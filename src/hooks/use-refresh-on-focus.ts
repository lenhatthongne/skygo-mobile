import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Calls `reload` each time the screen comes back into view (after paying, editing in a modal,
 * returning from another tab). The first focus is skipped: the initial load already covers it.
 * Pass a silent reload so the data already on screen stays put while it refetches.
 */
export function useRefreshOnFocus(reload: () => void) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload]),
  );
}
