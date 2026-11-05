import { Stack } from 'expo-router';

import { SearchProvider } from '@/providers/search-provider';

export default function SearchLayout() {
  return (
    <SearchProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="search/airport" options={{ presentation: 'modal' }} />
        <Stack.Screen name="search/date" options={{ presentation: 'modal' }} />
        <Stack.Screen name="search/travellers" options={{ presentation: 'modal' }} />
        <Stack.Screen name="search/filters" options={{ presentation: 'modal' }} />
      </Stack>
    </SearchProvider>
  );
}
