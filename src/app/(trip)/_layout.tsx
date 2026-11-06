import { Stack } from 'expo-router';

// Booking details, price, seats, ticket and cancellation live above the tabs, like the booking
// flow, so the "Chuyến đi" tab only ever holds the list. Opened from a notification, from Home or
// after paying, they used to sit inside the tab's own stack and cover the list until the app was
// restarted; now going back (or leaving) simply returns to where the customer came from.
export default function TripLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
