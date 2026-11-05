import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createSupportRequest } from '@/services/api/support';
import { errorMessage, fieldErrors } from '@/utils/error-messages';

const SUBJECT_MAX = 150;
const CONTENT_MAX = 5000;

export default function NewSupportRequestScreen() {
  const theme = useTheme();
  // The assistant can hand over a draft; the customer still reviews and sends it.
  const draft = useLocalSearchParams<{ subject?: string; content?: string }>();
  const [subject, setSubject] = useState(() => (draft.subject ?? '').slice(0, 150));
  const [content, setContent] = useState(() => (draft.content ?? '').slice(0, 5000));
  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const errors = {
    subject: subject.trim() ? undefined : 'Nhập tiêu đề',
    content: content.trim() ? undefined : 'Nhập nội dung cần hỗ trợ',
  };
  const valid = !errors.subject && !errors.content;

  async function send() {
    setAttempted(true);
    if (!valid) return;
    setSending(true);
    setMessage(null);
    setServerErrors({});
    try {
      await createSupportRequest({ subject: subject.trim(), content: content.trim() });
      router.back();
    } catch (e) {
      // The text stays in the form so nothing has to be typed again.
      setServerErrors(fieldErrors(e));
      setMessage(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen
      header={{ title: 'Yêu cầu mới', onBack: () => router.back(), close: true }}
      footer={<Button label="Gửi yêu cầu" loading={sending} onPress={() => void send()} />}>
      <View style={styles.stack}>
        {message ? <Banner tone="error">{message}</Banner> : null}

        <View>
          <TextField
            label="Tiêu đề"
            value={subject}
            onChangeText={setSubject}
            maxLength={SUBJECT_MAX}
            placeholder="Ví dụ: Chưa nhận email xác nhận"
            error={(attempted && errors.subject) || serverErrors.subject}
          />
          <AppText variant="caption" tone="textMuted" style={styles.count}>
            {subject.length}/{SUBJECT_MAX}
          </AppText>
        </View>

        <View style={styles.group}>
          <AppText variant="label">Nội dung</AppText>
          <TextInput
            accessibilityLabel="Nội dung"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={CONTENT_MAX}
            placeholder="Mô tả vấn đề của bạn. Nếu liên quan đến một đơn, hãy ghi mã đặt chỗ."
            placeholderTextColor={theme.textMuted}
            style={[
              styles.area,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: (attempted && errors.content) || serverErrors.content ? theme.danger : theme.border,
              },
            ]}
          />
          {(attempted && errors.content) || serverErrors.content ? (
            <AppText variant="caption" tone="danger">
              {errors.content ?? serverErrors.content}
            </AppText>
          ) : null}
          <AppText variant="caption" tone="textMuted" style={styles.count}>
            {content.length}/{CONTENT_MAX}
          </AppText>
        </View>

        <View style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
          <Feather name="clock" size={20} color={theme.textSecondary} />
          <AppText variant="small" tone="textSecondary" style={styles.flex}>
            Phản hồi sẽ hiện trong ứng dụng, ở mục Yêu cầu hỗ trợ.
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 16, paddingTop: 12 },
  group: { gap: 8 },
  area: { minHeight: 180, borderWidth: 1.5, borderRadius: Radius.lg, padding: 14, fontSize: 15, textAlignVertical: 'top' },
  count: { textAlign: 'right', marginTop: 4 },
  note: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: Radius.md, alignItems: 'center' },
});
