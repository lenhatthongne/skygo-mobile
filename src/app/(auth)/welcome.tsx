import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackground, HERO_NAVY } from '@/components/auth/auth-background';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Provider = 'facebook' | 'google';

/**
 * First screen for a signed-out customer: pick how to sign in. Email is the only method the
 * backend supports today, so Facebook and Google only explain that they are not available yet
 * (they never pretend to sign anyone in).
 */
export default function WelcomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<Provider | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: HERO_NAVY }]}>
      <AuthBackground tone="dark" />
      <Screen
        transparent
        footer={
          <View style={styles.actions}>
            <View style={styles.divider}>
              <View style={styles.line} />
              <AppText variant="caption" style={styles.dividerText}>
                {t('welcome.signInWith')}
              </AppText>
              <View style={styles.line} />
            </View>

            <View style={styles.social}>
              <SocialButton
                label={t('welcome.facebook')}
                icon={<Ionicons name="logo-facebook" size={22} color="#5B9BFF" />}
                onPress={() => setNotice('facebook')}
              />
              <SocialButton
                label={t('welcome.google')}
                icon={
                  <Image
                    source={require('@/assets/gg.png')}
                    accessible={false}
                    contentFit="contain"
                    style={styles.googleLogo}
                  />
                }
                onPress={() => setNotice('google')}
              />
            </View>

            <Button label={t('welcome.email')} onPress={() => router.push('/login')} />

            <View style={styles.links}>
              <View style={styles.row}>
                <AppText variant="small" style={styles.linkText}>
                  {t('welcome.noAccount')}{' '}
                </AppText>
                <Pressable
                  accessibilityRole="link"
                  hitSlop={8}
                  onPress={() => router.push('/register')}>
                  <AppText variant="smallBold" style={styles.accent}>
                    {t('welcome.signUp')}
                  </AppText>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => router.push('/search')}
                style={styles.row}>
                <Ionicons name="search" size={16} color="rgba(255,255,255,0.8)" />
                <AppText variant="smallBold" style={styles.linkText}>
                  {' '}
                  {t('welcome.browse')}
                </AppText>
              </Pressable>
            </View>
          </View>
        }>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="airplane" size={26} color={theme.primary} />
          </View>
          <AppText variant="h2" style={styles.white}>
            SkyGo
          </AppText>
        </View>

        <View style={{ height: Math.round(height * 0.34) }} />

        <AppText variant="h1" style={[styles.greeting, styles.white]}>
          {t('welcome.greeting')}
        </AppText>
        <AppText variant="h1" style={[styles.name, styles.accent]}>
          SkyGo
        </AppText>
        <AppText style={styles.tagline}>{t('welcome.tagline')}</AppText>
      </Screen>

      {/* Floats over the photo, so showing it never moves the title or the buttons. */}
      {notice ? (
        <View style={[styles.notice, { top: insets.top + 84 }]} pointerEvents="none">
          <Banner tone="info">
            {t('welcome.socialSoon', { provider: t(`welcome.${notice}`) })}
          </Banner>
        </View>
      ) : null}
    </View>
  );
}

function SocialButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.socialButton, { opacity: pressed ? 0.85 : 1 }]}>
      {icon}
      <AppText variant="smallBold" style={styles.socialLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  white: { color: '#ffffff' },
  accent: { color: '#5BD0E3' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 32, lineHeight: 38 },
  name: { fontSize: 38, lineHeight: 44 },
  notice: { position: 'absolute', left: 20, right: 20 },
  tagline: { marginTop: 10, maxWidth: 320, color: 'rgba(255,255,255,0.78)' },
  // Generous gaps: each group (divider, social, email, links) stands on its own.
  actions: { gap: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  dividerText: { color: 'rgba(255,255,255,0.7)' },
  social: { flexDirection: 'row', gap: 14 },
  socialButton: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: Radius.pill,
    // Frosted glass: blends into the photo and leaves the email button as the main action.
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  googleLogo: { width: 22, height: 22 },
  socialLabel: { color: '#ffffff' },
  links: { gap: 14, paddingTop: 4 },
  linkText: { color: 'rgba(255,255,255,0.85)' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
