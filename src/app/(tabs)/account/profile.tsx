import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AvatarSheet } from '@/components/profile/avatar-sheet';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ListSection } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { TextField, type TextInputHandle } from '@/components/ui/text-field';
import { COUNTRIES, GENDERS, PROFILE_TITLES } from '@/constants/profile';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';
import { removeAvatar, updateProfile, uploadAvatar } from '@/services/api/auth';
import { formatDobInput, isoToDob, parseDob } from '@/utils/age';
import { todayVn } from '@/utils/datetime';
import { errorMessage, fieldErrors } from '@/utils/error-messages';
import { orUndefined, profileCompletion } from '@/utils/profile';
import { isValidNationalPhone, prefillNationalPhone, toApiPhone } from '@/utils/validators';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};
const LOYALTY_NUMBER = /^[A-Za-z0-9 -]+$/;
const TAX_CODE = /^(\d{10}|\d{13})$/;

/** iOS cannot present the picker while the sheet is still sliding away. */
const afterSheetCloses = () => new Promise((resolve) => setTimeout(resolve, 400));

type Form = {
  title: Api.ProfileTitle | null;
  name: string;
  dob: string;
  gender: Api.Gender | null;
  nationality: string | null;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  loyaltyProgram: string;
  loyaltyNumber: string;
  address: string;
  invoiceCompany: string;
  invoiceTaxCode: string;
  invoiceAddress: string;
};

function formFromUser(user: Api.User | null): Form {
  return {
    title: user?.title ?? null,
    name: user?.fullName ?? '',
    dob: user?.dateOfBirth ? isoToDob(user.dateOfBirth) : '',
    gender: user?.gender ?? null,
    nationality: user?.nationality ?? null,
    phone: user ? prefillNationalPhone(user.phone) : '',
    emergencyName: user?.emergencyName ?? '',
    emergencyPhone: user?.emergencyPhone ? prefillNationalPhone(user.emergencyPhone) : '',
    loyaltyProgram: user?.loyaltyProgram ?? '',
    loyaltyNumber: user?.loyaltyNumber ?? '',
    address: user?.address ?? '',
    invoiceCompany: user?.invoiceCompany ?? '',
    invoiceTaxCode: user?.invoiceTaxCode ?? '',
    invoiceAddress: user?.invoiceAddress ?? '',
  };
}

/** The whole profile as the server stores it: a field left empty is sent as missing. */
function toRequest(f: Form): Api.UpdateProfileRequest {
  return {
    fullName: f.name.trim(),
    phone: toApiPhone(f.phone),
    title: f.title ?? undefined,
    dateOfBirth: parseDob(f.dob) ?? undefined,
    gender: f.gender ?? undefined,
    nationality: f.nationality ?? undefined,
    emergencyName: orUndefined(f.emergencyName),
    emergencyPhone: f.emergencyPhone.trim() ? toApiPhone(f.emergencyPhone) : undefined,
    loyaltyProgram: orUndefined(f.loyaltyProgram),
    loyaltyNumber: orUndefined(f.loyaltyNumber),
    address: orUndefined(f.address),
    invoiceCompany: orUndefined(f.invoiceCompany),
    invoiceTaxCode: orUndefined(f.invoiceTaxCode),
    invoiceAddress: orUndefined(f.invoiceAddress),
  };
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useSession();
  const phoneRef = useRef<TextInputHandle>(null);
  // What the server has now; `changed` compares the form with it.
  const [baseline, setBaseline] = useState(() => formFromUser(user));
  const [form, setForm] = useState<Form>(baseline);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  const dobIso = parseDob(form.dob);
  const errors = {
    name: form.name.trim().length === 0 || form.name.trim().length > 100,
    phone: !isValidNationalPhone(form.phone),
    dob: form.dob.length > 0 && (!dobIso || dobIso >= todayVn()),
    emergencyPhone: form.emergencyPhone.length > 0 && !isValidNationalPhone(form.emergencyPhone),
    loyaltyNumber:
      form.loyaltyNumber.trim().length > 0 && !LOYALTY_NUMBER.test(form.loyaltyNumber.trim()),
    tax: form.invoiceTaxCode.trim().length > 0 && !TAX_CODE.test(form.invoiceTaxCode.trim()),
  };
  const valid = !Object.values(errors).some(Boolean);
  const changed = JSON.stringify(toRequest(form)) !== JSON.stringify(toRequest(baseline));
  const completion = profileCompletion(user);
  const language = i18n.language === 'en' ? 'en' : 'vi';

  async function save() {
    if (!valid || !changed || saving) return;
    setSaving(true);
    setSaved(false);
    setMessage(null);
    setServerErrors({});
    try {
      const next = await updateProfile(toRequest(form));
      await updateUser(next);
      setBaseline(form);
      setSaved(true);
    } catch (e) {
      // What the user typed stays in the form.
      const remote = fieldErrors(e);
      setServerErrors(remote);
      setMessage(Object.keys(remote).length > 0 ? t('profile.fixErrors') : errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function changePhoto(task: () => Promise<Api.User | null>, done: string) {
    setPhotoBusy(true);
    setPhotoNote(null);
    try {
      const next = await task();
      if (next) {
        await updateUser(next);
        setPhotoNote({ tone: 'success', text: done });
      }
    } catch (e) {
      setPhotoNote({ tone: 'error', text: errorMessage(e) });
    } finally {
      setPhotoBusy(false);
    }
  }

  /** Uploads what the picker returned; null when the customer cancelled. */
  async function upload(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
      setPhotoNote({ tone: 'error', text: t('profile.photoTooLarge') });
      return null;
    }
    return uploadAvatar({ uri: asset.uri, mimeType: asset.mimeType });
  }

  async function fromLibrary() {
    setSheetOpen(false);
    await afterSheetCloses();
    await changePhoto(
      async () => upload(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)),
      t('profile.photoUpdated'),
    );
  }

  async function fromCamera() {
    setSheetOpen(false);
    await afterSheetCloses();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoNote({ tone: 'error', text: t('profile.cameraDenied') });
      return;
    }
    await changePhoto(
      async () => upload(await ImagePicker.launchCameraAsync(PICKER_OPTIONS)),
      t('profile.photoUpdated'),
    );
  }

  async function removePhoto() {
    setSheetOpen(false);
    await changePhoto(() => removeAvatar(), t('profile.photoRemoved'));
  }

  const titleLabel = (value: Api.ProfileTitle) =>
    t(`profile.${value.toLowerCase() as 'mr' | 'mrs' | 'ms'}`);
  const genderLabel = (value: Api.Gender) =>
    t(`profile.${value === 'MALE' ? 'male' : value === 'FEMALE' ? 'female' : 'otherGender'}`);

  return (
    <Screen
      header={{ title: t('profile.title'), onBack: () => router.back() }}
      footer={
        <Button
          label={t('profile.save')}
          onPress={() => void save()}
          loading={saving}
          disabled={!valid || !changed}
        />
      }>
      <View style={styles.stack}>
        <View style={styles.photo}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.photoChange')}
            disabled={photoBusy}
            onPress={() => setSheetOpen(true)}>
            <Avatar user={user} size={96} />
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.primary, borderColor: theme.background },
              ]}>
              {photoBusy ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <Feather name="camera" size={15} color={theme.onPrimary} />
              )}
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={photoBusy}
            onPress={() => setSheetOpen(true)}>
            <AppText variant="smallBold" tone="primary">
              {user?.avatarUrl ? t('profile.photoChange') : t('profile.photoAdd')}
            </AppText>
          </Pressable>
          <AppText variant="caption" tone="textMuted">
            {t('profile.photoHint')}
          </AppText>
        </View>

        <View style={[styles.progress, { backgroundColor: theme.backgroundElement }]}>
          <AppText variant="caption" tone="textSecondary">
            {completion >= 100
              ? t('profile.completionDone')
              : t('profile.completion', { percent: completion })}
          </AppText>
          <View style={[styles.track, { backgroundColor: theme.border }]}>
            <View
              style={[styles.fill, { backgroundColor: theme.primary, width: `${completion}%` }]}
            />
          </View>
        </View>

        {photoNote ? <Banner tone={photoNote.tone}>{photoNote.text}</Banner> : null}
        {saved ? <Banner tone="success">{t('profile.saved')}</Banner> : null}
        {message ? <Banner tone="error">{message}</Banner> : null}

        <ListSection title={t('profile.sectionPersonal')} />
        <AppText variant="caption" tone="textMuted" style={styles.label}>
          {t('profile.salutation')}
        </AppText>
        <View style={styles.chips}>
          {PROFILE_TITLES.map((value) => (
            <Chip
              key={value}
              label={titleLabel(value)}
              selected={form.title === value}
              onPress={() => set('title', form.title === value ? null : value)}
            />
          ))}
        </View>
        <View>
          <TextField
            label={t('profile.displayName')}
            leftIcon="user"
            value={form.name}
            onChangeText={(v) => set('name', v)}
            autoCapitalize="words"
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            error={serverErrors.fullName}
          />
          <AppText variant="caption" tone="textMuted" style={styles.hint}>
            {t('profile.displayNameHint')}
          </AppText>
        </View>
        <TextField
          label={t('profile.dob')}
          leftIcon="calendar"
          value={form.dob}
          onChangeText={(v) => set('dob', formatDobInput(v))}
          placeholder={t('profile.dobPlaceholder')}
          keyboardType="number-pad"
          maxLength={10}
          error={serverErrors.dateOfBirth ?? (errors.dob ? t('profile.dobInvalid') : null)}
        />
        <AppText variant="caption" tone="textMuted" style={styles.label}>
          {t('profile.gender')}
        </AppText>
        <View style={styles.chips}>
          {GENDERS.map((value) => (
            <Chip
              key={value}
              label={genderLabel(value)}
              selected={form.gender === value}
              onPress={() => set('gender', form.gender === value ? null : value)}
            />
          ))}
        </View>
        <AppText variant="caption" tone="textMuted" style={styles.label}>
          {t('profile.nationality')}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipScroll}>
          {COUNTRIES.map((c) => (
            <Chip
              key={c.code}
              label={c[language]}
              selected={form.nationality === c.code}
              onPress={() => set('nationality', form.nationality === c.code ? null : c.code)}
            />
          ))}
        </ScrollView>

        <ListSection title={t('profile.sectionContact')} />
        <TextField
          ref={phoneRef}
          label={t('profile.phone')}
          leftIcon="phone"
          prefix="+84"
          value={form.phone}
          onChangeText={(v) => set('phone', v)}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          error={
            serverErrors.phone ??
            (form.phone.length > 0 && errors.phone ? t('profile.phoneInvalid') : null)
          }
        />
        <View>
          <TextField
            label={t('profile.email')}
            leftIcon="lock"
            value={user?.email ?? ''}
            editable={false}
          />
          <AppText variant="caption" tone="textMuted" style={styles.hint}>
            {t('profile.emailHint')}
          </AppText>
        </View>
        <TextField
          label={t('profile.emergencyName')}
          leftIcon="user-plus"
          value={form.emergencyName}
          onChangeText={(v) => set('emergencyName', v)}
          autoCapitalize="words"
          maxLength={100}
          error={serverErrors.emergencyName}
        />
        <TextField
          label={t('profile.emergencyPhone')}
          leftIcon="phone-call"
          prefix="+84"
          value={form.emergencyPhone}
          onChangeText={(v) => set('emergencyPhone', v)}
          keyboardType="phone-pad"
          error={
            serverErrors.emergencyPhone ??
            (errors.emergencyPhone ? t('profile.phoneInvalid') : null)
          }
        />

        <ListSection title={t('profile.sectionLoyalty')} />
        <TextField
          label={t('profile.loyaltyProgram')}
          leftIcon="award"
          value={form.loyaltyProgram}
          onChangeText={(v) => set('loyaltyProgram', v)}
          maxLength={40}
          error={serverErrors.loyaltyProgram}
        />
        <TextField
          label={t('profile.loyaltyNumber')}
          leftIcon="credit-card"
          value={form.loyaltyNumber}
          onChangeText={(v) => set('loyaltyNumber', v)}
          autoCapitalize="characters"
          maxLength={30}
          error={
            serverErrors.loyaltyNumber ??
            (errors.loyaltyNumber ? t('profile.loyaltyInvalid') : null)
          }
        />

        <ListSection title={t('profile.sectionInvoice')} />
        <TextField
          label={t('profile.address')}
          leftIcon="map-pin"
          value={form.address}
          onChangeText={(v) => set('address', v)}
          maxLength={200}
          error={serverErrors.address}
        />
        <AppText variant="caption" tone="textMuted" style={styles.hint}>
          {t('profile.invoiceHint')}
        </AppText>
        <TextField
          label={t('profile.invoiceCompany')}
          leftIcon="briefcase"
          value={form.invoiceCompany}
          onChangeText={(v) => set('invoiceCompany', v)}
          maxLength={150}
          error={serverErrors.invoiceCompany}
        />
        <TextField
          label={t('profile.invoiceTaxCode')}
          leftIcon="hash"
          value={form.invoiceTaxCode}
          onChangeText={(v) => set('invoiceTaxCode', v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={13}
          error={serverErrors.invoiceTaxCode ?? (errors.tax ? t('profile.taxInvalid') : null)}
        />
        <TextField
          label={t('profile.invoiceAddress')}
          leftIcon="map"
          value={form.invoiceAddress}
          onChangeText={(v) => set('invoiceAddress', v)}
          maxLength={200}
          error={serverErrors.invoiceAddress}
        />

        <AppText variant="caption" tone="textMuted" style={styles.privacy}>
          {t('profile.privacy')}
        </AppText>
      </View>

      <AvatarSheet
        visible={sheetOpen}
        hasPhoto={!!user?.avatarUrl}
        onLibrary={() => void fromLibrary()}
        onCamera={() => void fromCamera()}
        onRemove={() => void removePhoto()}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8, paddingTop: 12, paddingBottom: 16 },
  hint: { marginTop: 4, marginLeft: 4 },
  label: { marginLeft: 4, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipScroll: { flexGrow: 0 },
  privacy: { textAlign: 'center', paddingTop: 12 },
  photo: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { borderRadius: Radius.lg, padding: 12, gap: 6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
