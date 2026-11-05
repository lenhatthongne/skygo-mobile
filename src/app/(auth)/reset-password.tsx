import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { PasswordField, PasswordRules } from '@/components/ui/password-field';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useNow } from '@/hooks/use-now';
import { resendOtp, resetPassword } from '@/services/api/auth';
import { isApiError } from '@/services/api/errors';
import { errorMessage } from '@/utils/error-messages';
import type { OtpParams } from '@/utils/otp-params';
import { isValidPassword, passwordChecks } from '@/utils/validators';

const CODE_LENGTH = 6;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<Partial<OtpParams>>();
  if (!params.challengeId || !params.email || !params.expiresAt) return <Redirect href="/login" />;
  return (
    <ResetForm
      initial={{
        challengeId: params.challengeId,
        email: params.email,
        purpose: 'PASSWORD_RESET',
        expiresAt: params.expiresAt,
        resendAfterSeconds: Number(params.resendAfter) || 60,
      }}
    />
  );
}

function ResetForm({ initial }: { initial: Api.OtpChallenge }) {
  const [challenge, setChallenge] = useState(initial);
  const [issuedAt, setIssuedAt] = useState(() => Date.now());
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const now = useNow();

  const remaining = Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000));
  const resendAt = Math.max(issuedAt + challenge.resendAfterSeconds * 1000, blockedUntil);
  const resendWait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const checks = passwordChecks(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    code.length === CODE_LENGTH && isValidPassword(password) && confirm === password && remaining > 0;

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword({ challengeId: challenge.challengeId, code, newPassword: password });
      router.dismissTo({ pathname: '/login', params: { reset: '1', email: challenge.email } });
    } catch (e) {
      // The typed password stays; only the code is cleared when it was wrong.
      if (isApiError(e) && (e.code === 'OTP_INVALID' || e.code === 'OTP_EXPIRED')) setCode('');
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (resendWait > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const next = await resendOtp(challenge.challengeId);
      setChallenge(next);
      setIssuedAt(Date.now());
      setBlockedUntil(0);
      setCode('');
      setNotice('Đã gửi mã mới tới email của bạn.');
    } catch (e) {
      if (isApiError(e) && e.code === 'OTP_RATE_LIMITED' && e.retryAfterSeconds) {
        setBlockedUntil(Date.now() + e.retryAfterSeconds * 1000);
      }
      setError(errorMessage(e));
    } finally {
      setResending(false);
    }
  }

  return (
    <Screen
      header={{ onBack: () => router.back() }}
      footer={<Button label="Đặt lại mật khẩu" onPress={() => void submit()} loading={submitting} disabled={!canSubmit} />}>
      <AppText variant="h1" style={styles.title}>
        Đặt mật khẩu mới
      </AppText>
      <AppText tone="textSecondary" style={styles.sub}>
        Nhập mã 6 số đã gửi tới <AppText variant="bodyBold">{challenge.email}</AppText> nếu email này có tài khoản.
      </AppText>

      <TextField
        label="Mã xác nhận"
        leftIcon="hash"
        value={code}
        onChangeText={(v) => {
          setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH));
          setError(null);
        }}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        placeholder="000000"
        hint={remaining > 0 ? `Mã hết hạn sau ${clock(remaining)}` : 'Mã đã hết hạn, hãy gửi lại mã'}
      />
      <View style={styles.resend}>
        {resendWait > 0 ? (
          <AppText variant="small" tone="textMuted">
            Gửi lại mã sau {clock(resendWait)}
          </AppText>
        ) : (
          <Pressable accessibilityRole="button" hitSlop={8} disabled={resending} onPress={() => void resend()}>
            <AppText variant="smallBold" tone="primary">
              {resending ? 'Đang gửi…' : 'Gửi lại mã'}
            </AppText>
          </Pressable>
        )}
      </View>

      <PasswordField label="Mật khẩu mới" value={password} onChangeText={setPassword} autoComplete="new-password" returnKeyType="next" />
      <PasswordRules checks={checks} />
      <PasswordField
        label="Nhập lại mật khẩu mới"
        value={confirm}
        onChangeText={setConfirm}
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        error={mismatch ? 'Mật khẩu nhập lại chưa khớp' : null}
      />

      {notice && !error ? (
        <View style={styles.banner}>
          <Banner tone="success">{notice}</Banner>
        </View>
      ) : null}
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
  resend: { alignItems: 'flex-end', marginTop: 4, marginBottom: 8, minHeight: 24 },
  banner: { marginTop: 16 },
});
