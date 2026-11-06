import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { PasswordField, PasswordRules } from '@/components/ui/password-field';
import { Screen } from '@/components/ui/screen';
import type { TextInputHandle } from '@/components/ui/text-field';
import { useSession } from '@/providers/session-provider';
import { changePassword } from '@/services/api/auth';
import { errorMessage } from '@/utils/error-messages';
import { isValidPassword, passwordChecks } from '@/utils/validators';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const { signIn } = useSession();
  const newRef = useRef<TextInputHandle>(null);
  const confirmRef = useRef<TextInputHandle>(null);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = passwordChecks(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const same = password.length > 0 && password === current;
  const canSave = current.length > 0 && isValidPassword(password) && confirm === password && !same;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      // The server revokes the old tokens and answers with a fresh session: store it, or the
      // very next request would be rejected.
      const session = await changePassword({ currentPassword: current, newPassword: password });
      await signIn(session);
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Screen
        header={{ title: t('changePassword.title'), onBack: () => router.back() }}
        footer={<Button label={t('changePassword.done')} onPress={() => router.back()} />}>
        <View style={styles.stack}>
          <Banner tone="success">{t('changePassword.changed')}</Banner>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={{ title: t('changePassword.title'), onBack: () => router.back() }}
      footer={
        <Button
          label={t('changePassword.title')}
          onPress={() => void save()}
          loading={saving}
          disabled={!canSave}
        />
      }>
      <View style={styles.stack}>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <PasswordField
          label={t('changePassword.current')}
          value={current}
          onChangeText={(v) => {
            setCurrent(v);
            setError(null);
          }}
          returnKeyType="next"
          onSubmitEditing={() => newRef.current?.focus()}
        />
        <PasswordField
          ref={newRef}
          label={t('changePassword.new')}
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          error={same ? t('changePassword.same') : null}
        />
        <PasswordRules checks={checks} />
        <PasswordField
          ref={confirmRef}
          label={t('changePassword.confirm')}
          value={confirm}
          onChangeText={setConfirm}
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={() => void save()}
          error={mismatch ? t('changePassword.mismatch') : null}
        />
        <AppText variant="caption" tone="textMuted">
          {t('changePassword.note')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8, paddingTop: 12 },
});
