import { Stack } from 'expo-router';

// Help screens (new request, conversation, FAQ) live above the tabs, like the booking flow. They are
// opened from Home, Notifications and the assistant as well as from Account; inside the Account
// tab's own stack they kept covering the tab after the customer left.
export default function SupportLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="account/support-new" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
