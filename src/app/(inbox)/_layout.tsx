import { Stack } from 'expo-router';

// Notifications and Messages (the customer's inbox), opened from Home, Account and notifications.
export default function InboxLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
