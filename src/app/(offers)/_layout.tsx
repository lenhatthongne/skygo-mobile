import { Stack } from 'expo-router';

// The Offers screen (vouchers to save), opened from the Home shortcut.
export default function OffersLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
