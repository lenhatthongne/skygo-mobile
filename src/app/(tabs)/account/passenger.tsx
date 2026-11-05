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

const TITLES: { value: Api.PassengerTitle; label: string }[] = [
  { value: 'MR', label: 'Ông · MR' },
  { value: 'MRS', label: 'Bà · MRS' },
  { value: 'MS', label: 'Cô · MS' },
  { value: 'MSTR', label: 'Bé trai · MSTR' },
  { value: 'MISS', label: 'Bé gái · MISS' },
];

const AGE_HINT = { ADT: 'từ 12 tuổi', CHD: 'từ 2 đến dưới 12 tuổi', INF: 'dưới 2 tuổi', TOO_YOUNG: '' } as const;

/** Add (no params) or edit (id + current values) a saved passenger. Presented as a modal. */
export default function PassengerFormScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    fullName?: string;
    dateOfBirth?: string;
  }>();
  const editingId = params.id ? Number(params.id) : null;

  const [title, setTitle] = useState<Api.PassengerTitle | null>((params.title as Api.PassengerTitle) ?? null);
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
    title: title ? undefined : 'Chọn danh xưng',
    name: isValidApiName(apiName) ? undefined : 'Nhập họ và tên (ít nhất 2 chữ cái, tối đa 50)',
    dob: !isoDob
      ? 'Nhập ngày sinh dạng ngày/tháng/năm'
      : isoDob > today
        ? 'Ngày sinh không thể ở tương lai'
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
      setMessage(Object.keys(remote).length > 0 ? 'Vui lòng kiểm tra lại các ô được báo lỗi.' : errorMessage(e));
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
        header={{ title: editingId ? 'Sửa hành khách' : 'Thêm hành khách', onBack: () => router.back(), close: true }}
        footer={<Button label="Lưu hành khách" loading={saving} disabled={attempted && !valid} onPress={() => void save()} />}>
        <View style={styles.stack}>
          {message ? <Banner tone="error">{message}</Banner> : null}

          <View style={styles.group}>
            <AppText variant="label">Danh xưng</AppText>
            <View style={styles.chips}>
              {TITLES.map((t) => (
                <Chip key={t.value} label={t.label} selected={title === t.value} onPress={() => setTitle(t.value)} />
              ))}
            </View>
            {show.title ? (
              <AppText variant="caption" tone="danger">
                {show.title}
              </AppText>
            ) : null}
          </View>

          <TextField
            label="Họ và tên"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={50}
            placeholder="Nguyễn Văn An"
            error={show.name ?? serverErrors.fullName}
            hint={apiName && apiName !== name ? `Tên trên vé: ${apiName}` : undefined}
          />

          <View>
            <TextField
              label="Ngày sinh"
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
                {AGE_HINT[ageClass] ? ` (${AGE_HINT[ageClass]})` : ''}
              </AppText>
            ) : null}
          </View>

          <View style={[styles.privacy, { backgroundColor: theme.backgroundElement }]}>
            <Feather name="shield" size={20} color={theme.textSecondary} />
            <AppText variant="small" tone="textSecondary" style={styles.flex}>
              Thông tin chỉ dùng để điền vé cho bạn và không được chia sẻ.
            </AppText>
          </View>

          {editingId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmDelete(true)}
              style={styles.delete}>
              <AppText variant="bodyBold" tone="danger">
                Xóa hành khách
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </Screen>

      <ConfirmDialog
        visible={confirmDelete}
        destructive
        loading={saving}
        title="Xóa hành khách?"
        message={`${title ?? ''} ${apiName} sẽ bị xóa khỏi danh sách đã lưu. Các đơn đã đặt không bị ảnh hưởng.`}
        confirmLabel="Xóa"
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
  privacy: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: Radius.md, alignItems: 'center' },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
