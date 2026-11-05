import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { forgotPassword } from '@/services/api/auth';
import { errorMessage } from '@/utils/error-messages';
import { toOtpParams } from '@/utils/otp-params';
import { isValidEmail } from '@/utils/validators';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = isValidEmail(email);

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const challenge = await forgotPassword(email.trim());
      router.push({ pathname: '/reset-password', params: toOtpParams(challenge) });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      header={{ onBack: () => router.back() }}
      footer={<Button label="Gửi mã xác nhận" onPress={() => void submit()} loading={submitting} disabled={!canSubmit} />}>
      <AppText variant="h1" style={styles.title}>
        Quên mật khẩu?
      </AppText>
      <AppText tone="textSecondary" style={styles.sub}>
        Nhập email đã đăng ký. Chúng tôi sẽ gửi mã 6 số để bạn đặt mật khẩu mới.
      </AppText>
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
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        placeholder="ten@email.com"
      />
      {error ? (
        <View style={styles.banner}>
          <Banner tone="error">{error}</Banner>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 12 },
  sub: { marginTop: 8, marginBottom: 8 },
  banner: { marginTop: 16 },
});
