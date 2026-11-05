import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '@/providers/session-provider';
import { useOnboardingSeen } from '@/services/onboarding-store';

// "/" only decides where to go: signed-in users land on the home tab; a signed-out customer sees
// the introduction on the first launch and the welcome screen afterwards.
export default function Index() {
  const { status } = useSession();
  const seen = useOnboardingSeen();

  if (status === 'signedIn') return <Redirect href="/home" />;
  // The saved flag is still being read: show nothing rather than flash the wrong screen.
  if (seen === null) return <View style={{ flex: 1 }} />;
  return <Redirect href={seen ? '/welcome' : '/onboarding'} />;
}
