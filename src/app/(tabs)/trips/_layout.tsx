import { Stack } from 'expo-router';

import { useTabResetSource } from '@/hooks/use-tab-reset';

// The list is always the bottom of this stack. Without it, opening a booking or a ticket from outside
// the tab made that screen the only one in the stack, so the "Chuyến đi" tab showed a booking
// instead of the list and the list was never loaded.
export const unstable_settings = { anchor: 'index' };

export default function TripsLayout() {
  // Leaving the tab sends its stack back to the list; pressing it scrolls to the top and reloads.
  useTabResetSource('trips', true);
  return <Stack screenOptions={{ headerShown: false }} />;
}
