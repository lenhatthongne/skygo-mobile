import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField, type TextInputHandle } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import { register } from '@/services/api/auth';
import { errorMessage, fieldErrors } from '@/utils/error-messages';
import { toOtpParams } from '@/utils/otp-params';
import {
  isValidEmail,
  isValidNationalPhone,
  isValidPassword,
  passwordChecks,
  toApiPhone,
} from '@/utils/validators';

export default function RegisterScreen() {
  const theme = useTheme();
  const emailRef = useRef<TextInputHandle>(null);
  const phoneRef = useRef<TextInputHandle>(null);
  const passwordRef = useRef<TextInputHandle>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, phone: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const checks = passwordChecks(password);
  const nameOk = fullName.trim().length > 0 && fullName.trim().length <= 100;
  const emailOk = isValidEmail(email);
  const phoneOk = isValidNationalPhone(phone);
  const canSubmit = nameOk && emailOk && phoneOk && isValidPassword(password);

  const emailError =
    serverErrors.email ?? (touched.email && email.length > 0 && !emailOk ? 'Email chưa đúng định dạng' : null);
  const phoneError =
    serverErrors.phone ?? (touched.phone && phone.length > 0 && !phoneOk ? 'Số điện thoại cần 9–10 chữ số' : null);

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setServerErrors({});
    try {
      const challenge = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: toApiPhone(phone),
        password,
      });
      router.push({ pathname: '/otp', params: toOtpParams(challenge) });
    } catch (e) {
      const fields = fieldErrors(e);
      setServerErrors(fields);
      if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'EMAIL_EXISTS') {
        setServerErrors({ email: errorMessage(e) });
      } else if (Object.keys(fields).length === 0) {
        setError(errorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      header={{ title: 'Tạo tài khoản', onBack: () => router.back() }}
      footer={
        <>
          <Button label="Tạo tài khoản" onPress={submit} loading={submitting} disabled={!canSubmit} />
          <View style={styles.switchRow}>
            <AppText variant="small" tone="textSecondary">
              Đã có tài khoản?{' '}
            </AppText>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.back()}>
              <AppText variant="smallBold" tone="primary">
                Đăng nhập
              </AppText>
            </Pressable>
          </View>
        </>
      }>
      <AppText tone="textSecondary" style={styles.sub}>
        Chỉ mất khoảng 1 phút. Bạn sẽ xác thực email ở bước tiếp theo.
      </AppText>

      <TextField
        label="Họ và tên"
        leftIcon="user"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={100}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        error={serverErrors.fullName}
        placeholder="Nguyễn Văn An"
      />
      <TextField
        ref={emailRef}
        label="Email"
        leftIcon="mail"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setServerErrors((s) => ({ ...s, email: '' }));
        }}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        error={emailError}
        placeholder="ten@email.com"
        right={email.length > 0 && emailOk ? <Feather name="check-circle" size={19} color={theme.success} /> : null}
      />
      <TextField
        ref={phoneRef}
        label="Số điện thoại"
        prefix="+84"
        value={phone}
        onChangeText={setPhone}
        onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={phoneError}
        placeholder="912 345 678"
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
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={serverErrors.password}
        placeholder="Tạo mật khẩu"
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

      <View style={styles.rules}>
        <Rule ok={checks.length} text="Từ 8 đến 72 ký tự" />
        <Rule ok={checks.letter} text="Có ít nhất một chữ cái" />
        <Rule ok={checks.digit} text="Có ít nhất một chữ số" />
      </View>

      {error ? (
        <View style={styles.banner}>
          <Banner tone="error">{error}</Banner>
        </View>
      ) : null}
    </Screen>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.rule}>
      <Feather
        name={ok ? 'check-circle' : 'circle'}
        size={17}
        color={ok ? theme.success : theme.textMuted}
      />
      <AppText variant="small" tone={ok ? 'success' : 'textMuted'}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { marginBottom: 4 },
  rules: { gap: 6, marginTop: 14 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  banner: { marginTop: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
