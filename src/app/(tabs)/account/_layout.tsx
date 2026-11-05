import { Stack } from 'expo-router';

export default function AccountLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="passenger" options={{ presentation: 'modal' }} />
      <Stack.Screen name="support-new" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
