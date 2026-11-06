import { useIsFocused, useNavigation } from 'expo-router';
import { type RefObject, useEffect, useRef } from 'react';

/**
 * Pressing a tab, or coming back to it from another tab, should land on that tab's first screen
 * at the top of the page with fresh data, not wherever the customer left it. The tab roots send
 * the signal and every screen that scrolls or loads data listens for it.
 */
const listeners = new Set<() => void>();

function emitTabReset() {
  for (const listener of listeners) listener();
}

/** Runs `handler` when the tab this screen belongs to is reset, while the screen is showing. */
export function useOnTabReset(handler: () => void) {
  const focused = useIsFocused();
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    if (!focused) return;
    const listener = () => latest.current();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [focused]);
}

type Scrollable = {
  scrollTo?: (options: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
};

/** Scrolls a ScrollView or FlatList back to the top on a tab reset. */
export function useScrollToTopOnTabReset(ref: RefObject<Scrollable | null>) {
  useOnTabReset(() => {
    ref.current?.scrollTo?.({ y: 0, animated: true });
    ref.current?.scrollToOffset?.({ offset: 0, animated: true });
  });
}

/** Reloads the data of a tab root on a tab reset (silently: what is on screen stays put). */
export function useReloadOnTabReset(reload: () => void) {
  useOnTabReset(reload);
}

type TabNavigation = {
  addListener: (event: string, callback: () => void) => () => void;
  getState: () => { index: number; routes: { name: string; state?: { key?: string } }[] };
  dispatch: (action: { type: 'POP_TO_TOP'; target: string }) => void;
};

/**
 * Put in the root of each tab (`name` is the tab's route name). Pressing the tab, or returning to
 * it from another tab, resets it; a tab with a stack of its own is also popped back to its list.
 * Returning from a screen opened above the tabs (paying, seats) is not a reset: the customer
 * lands where they were.
 */
export function useTabResetSource(name: string, hasStack = false) {
  const navigation = useNavigation() as unknown as TabNavigation;
  useEffect(() => {
    let left = false;
    const popStack = () => {
      if (!hasStack) return;
      const key = navigation.getState().routes.find((r) => r.name === name)?.state?.key;
      if (key) navigation.dispatch({ type: 'POP_TO_TOP', target: key });
    };
    const offBlur = navigation.addListener('blur', () => {
      const tabs = navigation.getState();
      if (tabs.routes[tabs.index]?.name === name) return;
      left = true;
      popStack();
    });
    const offFocus = navigation.addListener('focus', () => {
      if (!left) return;
      left = false;
      emitTabReset();
    });
    const offPress = navigation.addListener('tabPress', () => {
      popStack();
      emitTabReset();
    });
    return () => {
      offBlur();
      offFocus();
      offPress();
    };
  }, [navigation, name, hasStack]);
}
