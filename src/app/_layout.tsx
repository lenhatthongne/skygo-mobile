import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { restoreLanguage } from '@/i18n';
import { SessionExpiredDialog } from '@/components/session/session-expired-dialog';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useTheme } from '@/hooks/use-theme';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { wakeServer } from '@/services/api/warmup';
import { applyThemePreference, loadThemePreference } from '@/services/settings-store';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Restore the light/dark choice saved in Settings.
  useEffect(() => {
    void loadThemePreference().then(applyThemePreference);
    void restoreLanguage();
  }, []);

  // Start waking the (possibly sleeping) backend as soon as the app opens or comes back.
  useEffect(() => {
    wakeServer();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') wakeServer();
    });
    return () => sub.remove();
  }, []);

  return (
    <KeyboardProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SessionProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </SessionProvider>
      </ThemeProvider>
    </KeyboardProvider>
  );
}

/** Mounted only once the navigator exists, so a tap that launched the app can navigate. */
function PushNotificationBridge() {
  usePushNotifications();
  return null;
}

function RootNavigator() {
  const { status } = useSession();
  const theme = useTheme();

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  // An expired session keeps the signed-in screens open under the "sign in again" dialog.
  const signedIn = status === 'signedIn' || status === 'expired';
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(search)" />
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ presentation: 'card' }} />
          <Stack.Screen name="(booking)" />
          <Stack.Screen name="assistant" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <PushNotificationBridge />
      <SessionExpiredDialog />
    </>
  );
}
