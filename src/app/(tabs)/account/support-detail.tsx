import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SupportImage } from '@/components/support/support-image';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { type PendingMessage, useSupportThread } from '@/hooks/use-support-thread';
import { useTheme } from '@/hooks/use-theme';
import type { SupportImage as PickedImage } from '@/services/api/support';
import { formatTime } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_LEN = 2000;
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.5,
};

type Row =
  | { kind: 'message'; key: string; message: Api.SupportMessage }
  | { kind: 'pending'; key: string; pending: PendingMessage };

/** iOS cannot present the picker while another sheet is still closing. */
const afterAlertCloses = () => new Promise((resolve) => setTimeout(resolve, 350));

/** One support conversation as a chat: the customer writes as many messages and photos as needed. */
export default function SupportChatScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);
  const thread = useSupportThread(requestId);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const closed = thread.request?.status === 'CLOSED';
  const canSend = (text.trim().length > 0 || photo !== null) && !thread.loading;

  function submit() {
    if (!canSend) return;
    thread.send(text, photo);
    setText('');
    setPhoto(null);
    setNotice(null);
  }

  function take(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
      setNotice(t('supportChat.tooLarge'));
      return;
    }
    setNotice(null);
    setPhoto({ uri: asset.uri, mimeType: asset.mimeType });
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      // Asked and refused before: only the phone's settings can turn the camera on now.
      if (!permission.canAskAgain) {
        Alert.alert(t('supportChat.camera'), t('supportChat.cameraDenied'), [
          { text: t('supportChat.close'), style: 'cancel' },
          { text: t('inbox.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
      } else {
        setNotice(t('supportChat.cameraDenied'));
      }
      return;
    }
    take(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  }

  async function openLibrary() {
    await afterAlertCloses();
    take(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  }

  // Newest first: the list is inverted so the conversation opens at its latest message.
  const rows: Row[] = [
    ...thread.pending.map((p): Row => ({ kind: 'pending', key: p.localId, pending: p })),
    ...thread.messages.map((m): Row => ({ kind: 'message', key: `m${m.id}`, message: m })),
  ].reverse();
  // Pending ones go below the confirmed ones, in the order they were written.
  rows.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'pending' ? -1 : 1));

  const lastMessage = thread.messages[thread.messages.length - 1];
  const waiting = lastMessage?.sender === 'CUSTOMER' && thread.pending.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.titleBox}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {thread.request?.subject ?? t('supportDetail.title')}
          </AppText>
          {thread.request ? (
            <AppText variant="caption" tone="textMuted">
              {t(`support.status.${thread.request.status}`)}
              {thread.offline ? ` · ${t('supportChat.loadError')}` : ''}
            </AppText>
          ) : null}
        </View>
        <View style={styles.iconBtn} />
      </View>

      {thread.loading && !thread.request ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : thread.error ? (
        <View style={styles.errorBox}>
          <Banner tone="error">{errorMessage(thread.error)}</Banner>
          <Button
            label={t('support.retry')}
            variant="outline"
            onPress={() => void thread.reload()}
          />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <FlatList
            data={rows}
            inverted
            keyExtractor={(r) => r.key}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              waiting || closed ? (
                <AppText variant="small" tone="textMuted" style={styles.note}>
                  {closed ? t('supportChat.closed') : t('supportChat.waiting')}
                </AppText>
              ) : undefined
            }
            renderItem={({ item }) =>
              item.kind === 'message' ? (
                <Bubble
                  mine={item.message.sender === 'CUSTOMER'}
                  body={item.message.body}
                  imagePath={item.message.imageUrl}
                  time={formatTime(item.message.createdAt)}
                />
              ) : (
                <Bubble
                  mine
                  body={item.pending.body}
                  localImage={item.pending.image?.uri ?? null}
                  state={item.pending.failed ? 'failed' : 'sending'}
                  error={item.pending.error}
                  onRetry={() => thread.retry(item.pending.localId)}
                  onDiscard={() => thread.discard(item.pending.localId)}
                />
              )
            }
          />

          {notice ? (
            <View style={styles.noticeBox}>
              <Banner tone="warning">{notice}</Banner>
            </View>
          ) : null}

          <View
            style={[
              styles.composer,
              { borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 10) },
            ]}>
            {photo ? (
              <View style={styles.preview}>
                <Image source={{ uri: photo.uri }} style={styles.previewImage} contentFit="cover" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('supportChat.removePhoto')}
                  hitSlop={8}
                  onPress={() => setPhoto(null)}
                  style={[styles.previewClose, { backgroundColor: theme.text }]}>
                  <Feather name="x" size={14} color={theme.background} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.inputLine}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('supportChat.camera')}
                onPress={() => void openCamera()}
                style={styles.iconBtn}>
                <Feather name="camera" size={22} color={theme.primaryDark} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('supportChat.gallery')}
                onPress={() => void openLibrary()}
                style={styles.iconBtn}>
                <Feather name="image" size={22} color={theme.primaryDark} />
              </Pressable>
              <View style={[styles.inputBox, { backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  accessibilityLabel={t('supportChat.placeholder')}
                  value={text}
                  onChangeText={setText}
                  placeholder={t('supportChat.placeholder')}
                  placeholderTextColor={theme.textMuted}
                  maxLength={MAX_LEN}
                  multiline
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('supportChat.send')}
                disabled={!canSend}
                onPress={submit}
                style={[
                  styles.send,
                  { backgroundColor: theme.primary, opacity: canSend ? 1 : 0.4 },
                ]}>
                <Feather name="send" size={18} color={theme.onPrimary} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function Bubble({
  mine,
  body,
  imagePath,
  localImage,
  time,
  state,
  error,
  onRetry,
  onDiscard,
}: {
  mine: boolean;
  body: string | null;
  imagePath?: string | null;
  localImage?: string | null;
  time?: string;
  state?: 'sending' | 'failed';
  error?: string | null;
  onRetry?: () => void;
  onDiscard?: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      {!mine ? (
        <AppText variant="caption" tone="textMuted" style={styles.sender}>
          {t('supportChat.team')}
        </AppText>
      ) : null}
      {imagePath ? <SupportImage path={imagePath} mine={mine} /> : null}
      {localImage ? (
        <Image
          source={{ uri: localImage }}
          style={[styles.localImage, state === 'sending' && { opacity: 0.6 }]}
          contentFit="cover"
        />
      ) : null}
      {body ? (
        <View
          style={[
            styles.bubble,
            mine
              ? [styles.mine, { backgroundColor: theme.primary }]
              : [styles.theirs, { backgroundColor: theme.backgroundElement }],
            state === 'sending' && { opacity: 0.7 },
          ]}>
          <AppText selectable style={mine ? { color: theme.onPrimary } : undefined}>
            {body}
          </AppText>
        </View>
      ) : null}
      {state === 'failed' ? (
        <View style={styles.failed}>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onRetry} style={styles.retry}>
            <Feather name="alert-circle" size={15} color={theme.danger} />
            <AppText variant="caption" tone="danger">
              {error ?? t('supportChat.sendFailed')}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('supportChat.removePhoto')}
            hitSlop={8}
            onPress={onDiscard}>
            <Feather name="x" size={16} color={theme.textMuted} />
          </Pressable>
        </View>
      ) : (
        <AppText variant="caption" tone="textMuted">
          {state === 'sending' ? t('supportChat.sending') : time}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBox: { flex: 1, alignItems: 'center' },
  loader: { marginTop: 60 },
  errorBox: { padding: 16, gap: 12 },
  list: { padding: 16, gap: 10 },
  note: { textAlign: 'center', paddingVertical: 12, paddingHorizontal: 24 },
  noticeBox: { paddingHorizontal: 16, paddingBottom: 6 },
  bubbleRow: { maxWidth: '82%', gap: 3 },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { marginLeft: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  mine: { borderBottomRightRadius: 5 },
  theirs: { borderBottomLeftRadius: 5 },
  localImage: { width: 220, height: 160, borderRadius: 14 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, flexShrink: 1 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingHorizontal: 8 },
  preview: { alignSelf: 'flex-start', marginLeft: 10, marginBottom: 8 },
  previewImage: { width: 72, height: 72, borderRadius: Radius.md },
  previewClose: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLine: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  inputBox: { flex: 1, borderRadius: 22, paddingHorizontal: 14, marginHorizontal: 4 },
  input: { maxHeight: 110, fontSize: 15, lineHeight: 21, paddingVertical: 10 },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
