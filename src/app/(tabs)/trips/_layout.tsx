import { Stack, useNavigation } from 'expo-router';
import { useEffect } from 'react';

// The list is always the bottom of this stack. Without it, opening a booking or a ticket from outside
// the tab (after paying, from a notification) made that screen the only one in the stack, so the
// "Chuyến đi" tab showed a booking instead of the list and the list was never loaded.
export const unstable_settings = { anchor: 'index' };

export default function TripsLayout() {
  const navigation = useNavigation();

  // Leaving the tab sends its stack back to the list, so tapping "Chuyến đi" again always opens
  // the list instead of whichever booking was open last. Opening a screen outside the tabs (pay,
  // seats) does not leave the tab, so coming back from there still lands on the same trip.
  useEffect(() => {
    return navigation.addListener('blur', () => {
      const tabs = navigation.getState();
      if (!tabs || tabs.routes[tabs.index]?.name === 'trips') return;
      const stackKey = tabs.routes.find((r) => r.name === 'trips')?.state?.key;
      if (stackKey) navigation.dispatch({ type: 'POP_TO_TOP', target: stackKey });
    });
  }, [navigation]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
