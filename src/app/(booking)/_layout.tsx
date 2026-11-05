import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Payment outcomes must not be swiped away back into a finished flow. */}
      <Stack.Screen name="booking/result" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
