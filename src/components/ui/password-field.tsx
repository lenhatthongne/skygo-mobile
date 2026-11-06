import { Feather } from '@expo/vector-icons';
import { type Ref, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';
import { TextField, type TextInputHandle } from './text-field';

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | null;
  /** `new-password` for creating one, `current-password` for entering the existing one. */
  autoComplete?: 'new-password' | 'current-password';
  placeholder?: string;
  returnKeyType?: 'next' | 'go' | 'done';
  onSubmitEditing?: () => void;
  ref?: Ref<TextInputHandle>;
};

/** A password input with a show/hide toggle. */
export function PasswordField({ autoComplete = 'current-password', ...props }: PasswordFieldProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [shown, setShown] = useState(false);
  return (
    <TextField
      {...props}
      leftIcon="lock"
      secureTextEntry={!shown}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      textContentType={autoComplete === 'new-password' ? 'newPassword' : 'password'}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shown ? t('password.hide') : t('password.show')}
          hitSlop={10}
          onPress={() => setShown((v) => !v)}>
          <Feather name={shown ? 'eye-off' : 'eye'} size={19} color={theme.textMuted} />
        </Pressable>
      }
    />
  );
}

/** Live checklist of the backend password rules. */
export function PasswordRules({
  checks,
}: {
  checks: { length: boolean; letter: boolean; digit: boolean };
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.rules}>
      <Rule ok={checks.length} text={t('password.ruleLength')} />
      <Rule ok={checks.letter} text={t('password.ruleLetter')} />
      <Rule ok={checks.digit} text={t('password.ruleDigit')} />
    </View>
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
  rules: { gap: 6, marginTop: 4 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
