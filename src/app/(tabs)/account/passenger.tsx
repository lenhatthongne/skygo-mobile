import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createSavedPassenger,
  deleteSavedPassenger,
  updateSavedPassenger,
} from '@/services/api/passengers';
import { AGE_LABEL, ageClassOn, formatDobInput, isoToDob, parseDob } from '@/utils/age';
import { todayVn } from '@/utils/datetime';
import { errorMessage, fieldErrors } from '@/utils/error-messages';
import { isValidApiName, toApiName } from '@/utils/names';

const TITLE_VALUES: Api.PassengerTitle[] = ['MR', 'MRS', 'MS', 'MSTR', 'MISS'];

/** Add (no params) or edit (id + current values) a saved passenger. Presented as a modal. */
export default function PassengerFormScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    fullName?: string;
    dateOfBirth?: string;
  }>();
  const editingId = params.id ? Number(params.id) : null;

  const [title, setTitle] = useState<Api.PassengerTitle | null>(
    (params.title as Api.PassengerTitle) ?? null,
  );
  const [name, setName] = useState(params.fullName ?? '');
  const [dob, setDob] = useState(params.dateOfBirth ? isoToDob(params.dateOfBirth) : '');
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const apiName = toApiName(name);
  const isoDob = parseDob(dob);
  const today = todayVn();

  const errors = {
    title: title ? undefined : t('passengerForm.pickTitle'),
    name: isValidApiName(apiName) ? undefined : t('passengerForm.nameError'),
    dob: !isoDob
      ? t('passengerForm.dobFormat')
      : isoDob > today
        ? t('passengerForm.dobFuture')
        : undefined,
  };
  const valid = !errors.title && !errors.name && !errors.dob;
  const show = attempted ? errors : { title: undefined, name: undefined, dob: undefined };
  const ageClass = isoDob && isoDob <= today ? ageClassOn(isoDob, today) : null;

  async function save() {
    setAttempted(true);
    if (!valid || !title || !isoDob) return;
    setSaving(true);
    setMessage(null);
    setServerErrors({});
    const body: Api.SavedPassengerRequest = { title, fullName: apiName, dateOfBirth: isoDob };
    try {
      if (editingId) await updateSavedPassenger(editingId, body);
      else await createSavedPassenger(body);
      router.back();
    } catch (e) {
      // Everything the user typed stays in the form.
      const remote = fieldErrors(e);
      setServerErrors(remote);
      setMessage(Object.keys(remote).length > 0 ? t('passengerForm.checkFields') : errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    setSaving(true);
    try {
      await deleteSavedPassenger(editingId);
      setConfirmDelete(false);
      router.back();
    } catch (e) {
      setConfirmDelete(false);
      setMessage(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Screen
        header={{
          title: editingId ? t('passengerForm.edit') : t('passengerForm.add'),
          onBack: () => router.back(),
          close: true,
        }}
        footer={
          <Button
            label={t('passengerForm.save')}
            loading={saving}
            disabled={attempted && !valid}
            onPress={() => void save()}
          />
        }>
        <View style={styles.stack}>
          {message ? <Banner tone="error">{message}</Banner> : null}

          <View style={styles.group}>
            <AppText variant="label">{t('passengerForm.titleLabel')}</AppText>
            <View style={styles.chips}>
              {TITLE_VALUES.map((value) => (
                <Chip
                  key={value}
                  label={t(`passengerForm.titles.${value}`)}
                  selected={title === value}
                  onPress={() => setTitle(value)}
                />
              ))}
            </View>
            {show.title ? (
              <AppText variant="caption" tone="danger">
                {show.title}
              </AppText>
            ) : null}
          </View>

          <TextField
            label={t('passengerForm.fullName')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={50}
            placeholder={t('passengerForm.namePlaceholder')}
            error={show.name ?? serverErrors.fullName}
            hint={
              apiName && apiName !== name
                ? t('passengerForm.ticketName', { name: apiName })
                : undefined
            }
          />

          <View>
            <TextField
              label={t('passengerForm.dob')}
              leftIcon="calendar"
              value={dob}
              onChangeText={(v) => setDob(formatDobInput(v))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="01/01/1990"
              error={show.dob ?? serverErrors.dateOfBirth}
            />
            {ageClass ? (
              <AppText variant="caption" tone="textMuted" style={styles.age}>
                {AGE_LABEL[ageClass]}
                {ageClass !== 'TOO_YOUNG' ? ` (${t(`passengerForm.age.${ageClass}`)})` : ''}
              </AppText>
            ) : null}
          </View>

          <View style={[styles.privacy, { backgroundColor: theme.backgroundElement }]}>
            <Feather name="shield" size={20} color={theme.textSecondary} />
            <AppText variant="small" tone="textSecondary" style={styles.flex}>
              {t('passengerForm.privacy')}
            </AppText>
          </View>

          {editingId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmDelete(true)}
              style={styles.delete}>
              <AppText variant="bodyBold" tone="danger">
                {t('passengerForm.delete')}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </Screen>

      <ConfirmDialog
        visible={confirmDelete}
        destructive
        loading={saving}
        title={t('passengerForm.deleteTitle')}
        message={t('passengerForm.deleteMessage', { name: `${title ?? ''} ${apiName}` })}
        confirmLabel={t('passengerForm.deleteConfirm')}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 18, paddingTop: 12 },
  group: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  age: { marginTop: 6, marginLeft: 4 },
  privacy: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
