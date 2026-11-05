import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import type { TextInputHandle } from '@/components/ui/text-field';
import { Radius } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { NotCustomerError, useSession } from '@/providers/session-provider';
import { resendOtp, verifyLogin, verifyRegistration } from '@/services/api/auth';
import { isApiError } from '@/services/api/errors';
import { errorMessage } from '@/utils/error-messages';
import type { OtpParams } from '@/utils/otp-params';

const CODE_LENGTH = 6;

function clock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function OtpScreen() {
  const params = useLocalSearchParams<Partial<OtpParams>>();
  if (!params.challengeId || !params.email || !params.purpose || !params.expiresAt) {
    return <Redirect href="/login" />;
  }
  return (
    <OtpForm
      initial={{
        challengeId: params.challengeId,
        email: params.email,
        purpose: params.purpose,
        expiresAt: params.expiresAt,
        resendAfterSeconds: Number(params.resendAfter) || 60,
      }}
    />
  );
}

function OtpForm({ initial }: { initial: Api.OtpChallenge }) {
  const theme = useTheme();
  const { signIn } = useSession();
  const inputRef = useRef<TextInputHandle>(null);
  const [challenge, setChallenge] = useState(initial);
  const [issuedAt, setIssuedAt] = useState(() => Date.now());
  const [resendBlockedUntil, setResendBlockedUntil] = useState(0);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();

  const remaining = Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000));
  const resendAt = Math.max(issuedAt + challenge.resendAfterSeconds * 1000, resendBlockedUntil);
  const resendWait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  async function verify(value: string) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = { challengeId: challenge.challengeId, code: value };
      if (challenge.purpose === 'LOGIN') {
        // On success the session guard moves the app to the signed-in area.
        await signIn(await verifyLogin(body));
      } else {
        await verifyRegistration(body);
        router.dismissTo({ pathname: '/login', params: { verified: '1', email: challenge.email } });
      }
    } catch (e) {
      setError(
        e instanceof NotCustomerError
          ? 'Tài khoản quản trị không dùng được trên ứng dụng này. Vui lòng dùng trang quản trị.'
          : errorMessage(e),
      );
      setCode('');
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function onChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) void verify(digits);
  }

  async function resend() {
    if (resendWait > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const next = await resendOtp(challenge.challengeId);
      setChallenge(next);
      setIssuedAt(Date.now());
      setResendBlockedUntil(0);
      setCode('');
      inputRef.current?.focus();
    } catch (e) {
      if (isApiError(e) && e.code === 'OTP_RATE_LIMITED' && e.retryAfterSeconds) {
        setResendBlockedUntil(Date.now() + e.retryAfterSeconds * 1000);
      }
      setError(errorMessage(e));
    } finally {
      setResending(false);
    }
  }

  return (
    <Screen
      header={{ onBack: () => router.back() }}
      footer={
        <Button
          label="Xác nhận"
          onPress={() => void verify(code)}
          loading={submitting}
          disabled={code.length !== CODE_LENGTH}
        />
      }>
      <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
        <Feather name="mail" size={32} color={theme.primary} />
      </View>
      <AppText variant="h1" style={styles.title}>
        Kiểm tra email
      </AppText>
      <AppText tone="textSecondary" style={styles.sub}>
        Nhập mã 6 số đã gửi tới{'\n'}
        <AppText variant="bodyBold">{challenge.email}</AppText>
        {' · '}
        <AppText variant="bodyBold" tone="primary" onPress={() => router.back()}>
          Đổi email
        </AppText>
      </AppText>

      <Pressable
        accessibilityLabel="Ô nhập mã xác thực"
        onPress={() => inputRef.current?.focus()}
        style={styles.codeArea}>
        <View style={styles.boxes}>
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const active = focused && i === Math.min(code.length, CODE_LENGTH - 1) && !submitting;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  {
                    borderColor: error ? theme.danger : active ? theme.primary : theme.border,
                    backgroundColor: theme.background,
                  },
                ]}>
                <AppText style={styles.digit}>{code[i] ?? ''}</AppText>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoFocus
          caretHidden
          editable={!submitting}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          style={styles.hiddenInput}
        />
      </Pressable>

      <View style={styles.status}>
        <Feather name="clock" size={16} color={theme.textSecondary} />
        <AppText variant="small" tone="textSecondary">
          {remaining > 0 ? `Mã hết hạn sau ${clock(remaining)}` : 'Mã đã hết hạn'}
        </AppText>
      </View>

      <View style={styles.resendRow}>
        {resendWait > 0 ? (
          <AppText variant="small" tone="textMuted">
            Chưa nhận được mã? Gửi lại sau {clock(resendWait)}
          </AppText>
        ) : (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={resend} disabled={resending}>
            <AppText variant="smallBold" tone="primary">
              {resending ? 'Đang gửi…' : 'Gửi lại mã'}
            </AppText>
          </Pressable>
        )}
      </View>

      {error ? (
        <View style={styles.banner}>
          <Banner tone="error">{error}</Banner>
        </View>
      ) : (
        <View style={styles.banner}>
          <Banner tone="info">
            Không thấy email? Hãy kiểm tra thư mục Spam hoặc Quảng cáo.
          </Banner>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  title: { marginTop: 24 },
  sub: { marginTop: 8 },
  codeArea: { marginTop: 28 },
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  box: {
    width: 48,
    height: 58,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02 },
  status: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendRow: { alignItems: 'center', marginTop: 12, minHeight: 24 },
  banner: { marginTop: 24 },
});
