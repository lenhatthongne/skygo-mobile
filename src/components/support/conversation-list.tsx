import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { CountBadge } from '@/components/ui/count-badge';
import { useTheme } from '@/hooks/use-theme';
import { formatDayMonth, formatTime, todayVn, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import type { ApiError } from '@/services/api/errors';

/** Today shows the time, anything older the day and month, like a chat app. */
function stamp(iso: string) {
  const day = vnDateOf(iso);
  return day === todayVn() ? formatTime(iso) : formatDayMonth(day);
}

/** The conversations with SkyGo support, newest first, in the style of a messaging app. */
export function ConversationList({
  items,
  loading,
  error,
  onRetry,
  onNew,
}: {
  items: Api.SupportRequest[] | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  onNew: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (error) {
    return (
      <View style={styles.stack}>
        <Banner tone="error">{errorMessage(error)}</Banner>
        <Button label={t('support.retry')} variant="outline" onPress={onRetry} />
      </View>
    );
  }
  if (loading || !items) {
    return (
      <View style={styles.skeletons} accessibilityElementsHidden>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]} />
            <View style={styles.flex}>
              <View
                style={[styles.line, { width: '55%', backgroundColor: theme.backgroundElement }]}
              />
              <View
                style={[styles.line, { width: '85%', backgroundColor: theme.backgroundElement }]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
          <Feather name="message-circle" size={32} color={theme.primary} />
        </View>
        <AppText variant="h2" style={styles.center}>
          {t('inbox.messagesEmptyTitle')}
        </AppText>
        <AppText tone="textSecondary" style={styles.center}>
          {t('inbox.messagesEmptyText')}
        </AppText>
        <Button label={t('inbox.newMessage')} icon="message-plus-outline" onPress={onNew} />
      </View>
    );
  }
  return (
    <View>
      {items.map((r) => {
        const closed = r.status === 'CLOSED';
        const unread = r.unread > 0;
        const preview =
          r.lastMessage === '[Ảnh]' ? t('supportChat.photoPreview') : (r.lastMessage ?? r.content);
        return (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`${unread ? `${t('inbox.unread')}. ` : ''}${t('inbox.openConversation', { subject: r.subject })}. ${preview}`}
            onPress={() =>
              router.push({ pathname: '/account/support-detail', params: { id: String(r.id) } })
            }
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomColor: theme.border,
                backgroundColor: pressed ? theme.backgroundElement : 'transparent',
              },
            ]}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: closed ? theme.backgroundElement : theme.primary },
              ]}>
              <Feather
                name="headphones"
                size={22}
                color={closed ? theme.textMuted : theme.onPrimary}
              />
            </View>
            <View style={styles.flex}>
              <View style={styles.top}>
                <AppText
                  variant={unread ? 'bodyBold' : 'body'}
                  numberOfLines={1}
                  style={styles.flex}>
                  {r.subject}
                </AppText>
                <AppText variant="caption" tone={unread ? 'primaryDark' : 'textMuted'}>
                  {stamp(r.lastMessageAt ?? r.createdAt)}
                </AppText>
              </View>
              <View style={styles.top}>
                <AppText
                  variant="small"
                  tone={unread ? 'text' : 'textSecondary'}
                  numberOfLines={1}
                  style={[styles.flex, unread && styles.strong]}>
                  {r.lastSender === 'CUSTOMER' ? t('inbox.youPrefix') : ''}
                  {preview}
                </AppText>
                {unread ? (
                  <CountBadge count={r.unread} />
                ) : closed ? (
                  <AppText variant="caption" tone="textMuted">
                    {t('inbox.conversationClosed')}
                  </AppText>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 12, paddingTop: 12 },
  center: { textAlign: 'center' },
  skeletons: { paddingTop: 4 },
  line: { height: 12, borderRadius: 6, marginVertical: 5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strong: { fontWeight: '600' },
  empty: { alignItems: 'center', gap: 12, paddingTop: 64, paddingHorizontal: 20 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
