import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionCard } from '@/components/assistant/action-card';
import { AssistantIcon } from '@/components/assistant/assistant-icon';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';
import { askAssistant } from '@/services/api/assistant';
import { isApiError } from '@/services/api/errors';
import { type ChatMessage, clearChat, giveConsent, hasConsent, loadChat, saveChat } from '@/services/assistant-store';
import { errorMessage } from '@/utils/error-messages';
import { newIdempotencyKey } from '@/utils/idempotency';

const MAX_LEN = 300;
const HISTORY_TURNS = 10;
const WELCOME = 'Chào bạn, mình là Trợ lý SkyGo. Mình có thể giải đáp về hủy vé, hành lý, chọn ghế, vé QR và tra cứu các đơn của bạn.';
const STARTERS = ['Chuyến sắp tới của tôi?', 'Hủy vé thế nào?', 'Mua thêm hành lý', 'Giữ chỗ được bao lâu?'];

export default function AssistantScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const list = useRef<FlatList<ChatMessage>>(null);
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const now = useNow(blockedUntil > 0, 1000);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [saved, agreed] = await Promise.all([loadChat(), user ? hasConsent(user.id) : false]);
      if (!alive) return;
      setMessages(saved);
      setConsent(agreed);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const waitSeconds = Math.max(0, Math.ceil((blockedUntil - now) / 1000));
  const blocked = waitSeconds > 0;

  function commit(next: ChatMessage[]) {
    setMessages(next);
    void saveChat(next);
  }

  /** Sends `text`. `retryId` re-sends a message that failed before instead of adding a new one. */
  async function send(text: string, retryId?: string) {
    const clean = text.trim();
    if (!clean || sending || blocked) return;
    setNotice(null);
    setInput('');
    const base = retryId ? messages.map((m) => (m.id === retryId ? { ...m, failed: false } : m)) : [
      ...messages,
      { id: newIdempotencyKey(), role: 'user' as const, text: clean },
    ];
    const current = retryId ?? base[base.length - 1].id;
    commit(base);
    setSending(true);
    try {
      const turns = base
        .filter((m) => !m.failed)
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, text: m.text }));
      const reply = await askAssistant(turns);
      commit([
        ...base,
        {
          id: newIdempotencyKey(),
          role: 'assistant',
          text: reply.reply,
          actions: reply.actions,
          suggestions: reply.suggestions,
        },
      ]);
    } catch (e) {
      // Keep what the customer typed so it can be sent again.
      commit(base.map((m) => (m.id === current ? { ...m, failed: true } : m)));
      if (isApiError(e) && e.code === 'ASSISTANT_RATE_LIMITED' && e.retryAfterSeconds) {
        setBlockedUntil(clockMs() + e.retryAfterSeconds * 1000);
      }
      setNotice(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  function open(action: Api.AssistantAction) {
    switch (action.type) {
      case 'OPEN_SEARCH':
        router.push({
          pathname: '/search',
          params: {
            from: action.from ?? '',
            to: action.to ?? '',
            date: action.date ?? '',
            returnDate: action.returnDate ?? '',
            adults: String(action.adults ?? 1),
            children: String(action.children ?? 0),
            infants: String(action.infants ?? 0),
          },
        });
        break;
      case 'OPEN_BOOKING':
        if (action.bookingId) router.push({ pathname: '/trips/[id]', params: { id: action.bookingId } });
        break;
      case 'OPEN_TICKET':
        if (action.bookingId) router.push({ pathname: '/trips/[id]/ticket', params: { id: action.bookingId } });
        break;
      case 'OPEN_SUPPORT_NEW':
        router.push({
          pathname: '/account/support-new',
          params: { subject: action.subject ?? '', content: action.content ?? '' },
        });
        break;
      case 'OPEN_FAQ':
        router.push('/account/faq');
        break;
    }
  }

  async function agree() {
    if (user) await giveConsent(user.id);
    setConsent(true);
  }

  function restart() {
    setNotice(null);
    setMessages([]);
    void clearChat();
  }

  const last = messages[messages.length - 1];
  const chips = last?.role === 'assistant' && last.suggestions?.length ? last.suggestions : messages.length === 0 ? STARTERS : [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={8} onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <AssistantIcon size={26} />
          <AppText variant="bodyBold" style={styles.title}>
            Trợ lý SkyGo
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cuộc trò chuyện mới"
          hitSlop={8}
          disabled={messages.length === 0 || sending}
          onPress={restart}
          style={[styles.iconBtn, { opacity: messages.length === 0 ? 0.35 : 1 }]}>
          <Feather name="rotate-ccw" size={20} color={theme.text} />
        </Pressable>
      </View>

      {!ready ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : !consent ? (
        <View style={[styles.consent, styles.inner]}>
          <View style={[styles.consentIcon, { backgroundColor: theme.primarySoft }]}>
            <Feather name="shield" size={30} color={theme.primary} />
          </View>
          <AppText variant="h2" style={styles.center}>
            Trước khi bắt đầu
          </AppText>
          <AppText tone="textSecondary" style={styles.center}>
            Câu hỏi của bạn, cùng thông tin các đơn gần đây của bạn (mã, trạng thái, tuyến bay, số tiền), được gửi tới
            Google Gemini để soạn câu trả lời. SkyGo không lưu cuộc trò chuyện trên máy chủ.
          </AppText>
          <AppText tone="textSecondary" style={styles.center}>
            Đừng nhập mật khẩu, mã OTP hay số thẻ. Trợ lý không thể đặt, hủy hay hoàn tiền thay bạn.
          </AppText>
          <Button label="Đồng ý và bắt đầu" onPress={() => void agree()} />
          <Button label="Để sau" variant="ghost" onPress={() => router.back()} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <FlatList
            ref={list}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={[styles.list, styles.inner]}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
            ListHeaderComponent={
              <View style={styles.botLine}>
                <AssistantIcon size={24} />
                <View style={[styles.bubble, styles.bot, { backgroundColor: theme.backgroundElement }]}>
                  <AppText selectable>{WELCOME}</AppText>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={item.role === 'user' ? styles.userRow : styles.botRow}>
                <View style={item.role === 'assistant' ? styles.botLine : undefined}>
                  {item.role === 'assistant' ? <AssistantIcon size={24} /> : null}
                  <View
                    style={[
                      styles.bubble,
                      item.role === 'user'
                        ? [styles.mine, { backgroundColor: theme.primary }]
                        : [styles.bot, { backgroundColor: theme.backgroundElement }],
                    ]}>
                    <AppText selectable style={item.role === 'user' ? { color: theme.onPrimary } : undefined}>
                      {item.text}
                    </AppText>
                  </View>
                </View>
                {item.failed ? (
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void send(item.text, item.id)} style={styles.retry}>
                    <Feather name="alert-circle" size={15} color={theme.danger} />
                    <AppText variant="caption" tone="danger">
                      Chưa gửi được. Bấm để gửi lại
                    </AppText>
                  </Pressable>
                ) : null}
                {item.actions?.length ? (
                  <View style={styles.actions}>
                    {item.actions.map((a, i) => (
                      <ActionCard key={`${a.type}-${i}`} action={a} onPress={() => open(a)} />
                    ))}
                  </View>
                ) : null}
              </View>
            )}
            ListFooterComponent={
              <View style={styles.footerList}>
                {sending ? (
                  <View style={[styles.bubble, styles.bot, { backgroundColor: theme.backgroundElement }]}>
                    <AppText tone="textMuted">Đang soạn câu trả lời…</AppText>
                  </View>
                ) : null}
                {chips.length > 0 && !sending ? (
                  <View style={styles.chips}>
                    {chips.map((c) => (
                      <Chip key={c} label={c} onPress={() => void send(c)} />
                    ))}
                  </View>
                ) : null}
              </View>
            }
          />

          {notice ? (
            <View style={[styles.inner, styles.notice]}>
              <Banner tone={blocked ? 'warning' : 'error'}>{notice}</Banner>
              {!blocked && isUnavailable(notice) ? (
                <Button label="Gửi yêu cầu hỗ trợ" variant="outline" onPress={() => router.push('/account/support-new')} />
              ) : null}
            </View>
          ) : null}

          <View style={[styles.inputBar, { borderColor: theme.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.inner}>
              <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  accessibilityLabel="Nhập câu hỏi"
                  value={input}
                  onChangeText={setInput}
                  placeholder={blocked ? `Vui lòng chờ ${waitSeconds} giây…` : 'Nhập câu hỏi…'}
                  placeholderTextColor={theme.textMuted}
                  maxLength={MAX_LEN}
                  multiline
                  editable={!blocked}
                  style={[styles.input, { color: theme.text }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Gửi"
                  disabled={!input.trim() || sending || blocked}
                  onPress={() => void send(input)}
                  style={[styles.send, { backgroundColor: theme.primary, opacity: !input.trim() || sending || blocked ? 0.4 : 1 }]}>
                  {sending ? <ActivityIndicator color={theme.onPrimary} /> : <Feather name="send" size={18} color={theme.onPrimary} />}
                </Pressable>
              </View>
              {input.length > MAX_LEN - 60 ? (
                <AppText variant="caption" tone="textMuted" style={styles.count}>
                  {input.length}/{MAX_LEN}
                </AppText>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

/** Wall clock for event handlers (kept outside the component so render stays pure). */
const clockMs = () => Date.now();

const isUnavailable = (message: string) => message.includes('chưa sẵn sàng');

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 17 },
  botLine: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '100%' },
  loader: { marginTop: 60 },
  center: { textAlign: 'center' },
  consent: { gap: 14, padding: 24, paddingTop: 32 },
  consentIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  list: { padding: 16, gap: 12 },
  userRow: { alignItems: 'flex-end', gap: 6 },
  botRow: { alignItems: 'flex-start', gap: 8 },
  bubble: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { borderBottomRightRadius: 6 },
  bot: { borderBottomLeftRadius: 6, alignSelf: 'flex-start' },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  actions: { gap: 8, alignSelf: 'stretch', paddingRight: 24 },
  footerList: { gap: 12, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notice: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  inputBar: { borderTopWidth: 1, paddingTop: 10, paddingHorizontal: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderRadius: Radius.xl, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, maxHeight: 110, fontSize: 15, lineHeight: 21, paddingVertical: 8 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  count: { textAlign: 'right', marginTop: 4 },
});
