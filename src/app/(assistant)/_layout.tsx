import { Stack } from 'expo-router';

// The AI assistant, shown as a modal over whatever the customer is doing.
export default function AssistantLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
