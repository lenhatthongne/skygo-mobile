import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AuthBackground } from '@/components/auth/auth-background';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField, type TextInputHandle } from '@/components/ui/text-field';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { login } from '@/services/api/auth';
import { errorMessage } from '@/utils/error-messages';
import { toOtpParams } from '@/utils/otp-params';
import { isValidEmail } from '@/utils/validators';

export default function LoginScreen() {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  // Re-renders when the answer changes, so the back button is right after mount too.
  const canGoBack = useCanGoBack();
  const params = useLocalSearchParams<{ verified?: string; reset?: string; email?: string }>();
  const passwordRef = useRef<TextInputHandle>(null);
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isValidEmail(email) && password.length > 0;

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const challenge = await login({ email: email.trim(), password });
      router.push({ pathname: '/otp', params: toOtpParams(challenge) });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <AuthBackground />
      <Screen
        transparent
        footer={
          <>
            <Button label="Tiếp tục" onPress={submit} loading={submitting} disabled={!canSubmit} />
            <View style={styles.switchRow}>
              <AppText variant="small" tone="textSecondary">
                Chưa có tài khoản?{' '}
              </AppText>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => router.push('/register')}>
                <AppText variant="smallBold" tone="primary">
                  Đăng ký ngay
                </AppText>
              </Pressable>
            </View>
          </>
        }>
        <View style={styles.brand}>
          {canGoBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              hitSlop={8}
              onPress={() => router.back()}
              style={styles.back}>
              <Feather name="arrow-left" size={22} color="#ffffff" />
            </Pressable>
          ) : null}
          <View style={[styles.logo, { backgroundColor: '#ffffff' }]}>
            <MaterialCommunityIcons name="airplane" size={26} color={theme.primary} />
          </View>
          <View>
            <AppText variant="h2" style={styles.onPhoto}>
              SkyGo
            </AppText>
            <AppText variant="caption" style={styles.onPhoto}>
              Đặt vé máy bay dễ dàng
            </AppText>
          </View>
        </View>

        {/* The photo shows above the form; the form starts where the photo has faded out. */}
        <View style={{ height: Math.round(height * 0.22) }} />

        <AppText variant="h1" style={styles.title}>
          Chào mừng trở lại
        </AppText>
        <AppText tone="textSecondary" style={styles.sub}>
          Đăng nhập để quản lý đặt chỗ và vé điện tử của bạn.
        </AppText>

        {params.reset === '1' ? (
          <View style={styles.banner}>
            <Banner tone="success">
              Mật khẩu đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.
            </Banner>
          </View>
        ) : null}

        {params.verified === '1' ? (
          <View style={styles.banner}>
            <Banner tone="success">Email đã được xác thực. Hãy đăng nhập để tiếp tục.</Banner>
          </View>
        ) : null}

        <TextField
          label="Email"
          leftIcon="mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="ten@email.com"
        />
        <TextField
          ref={passwordRef}
          label="Mật khẩu"
          leftIcon="lock"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          placeholder="Nhập mật khẩu"
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              hitSlop={10}
              onPress={() => setShowPassword((v) => !v)}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={19} color={theme.textMuted} />
            </Pressable>
          }
        />

        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}
          style={styles.forgot}>
          <AppText variant="smallBold" tone="primary">
            Quên mật khẩu?
          </AppText>
        </Pressable>

        {error ? (
          <View style={styles.banner}>
            <Banner tone="error">{error}</Banner>
          </View>
        ) : (
          <View style={styles.banner}>
            <Banner tone="primary">
              Sau bước này, chúng tôi gửi mã xác thực 6 số tới email của bạn.
            </Banner>
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  onPhoto: { color: '#ffffff' },
  forgot: { alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 8 },
  sub: { marginTop: 8, marginBottom: 12 },
  banner: { marginTop: 20 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
