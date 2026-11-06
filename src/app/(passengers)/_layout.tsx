import { Stack } from 'expo-router';

// Saved passengers open from Home and from Account, so they live above the tabs instead of inside
// the Account tab's stack, where they would keep covering the tab.
export default function PassengersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="account/passenger" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
