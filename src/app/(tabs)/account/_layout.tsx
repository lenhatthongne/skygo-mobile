import { Stack } from 'expo-router';

import { useTabResetSource } from '@/hooks/use-tab-reset';

export default function AccountLayout() {
  // Leaving the tab sends its stack back to Account; pressing it scrolls to the top and reloads.
  useTabResetSource('account', true);
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
