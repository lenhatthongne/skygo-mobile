import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useRemoteList } from '@/hooks/use-remote-list';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useTheme } from '@/hooks/use-theme';
import { listMySupportRequests } from '@/services/api/support';
import i18n from '@/i18n';
import { formatDayMonth, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';

// Read when the list renders, so the labels follow the language chosen in Settings.
const STATUS = {
  OPEN: {
    get label() {
      return i18n.t('support.status.OPEN');
    },
    tone: 'info',
  },
  ANSWERED: {
    get label() {
      return i18n.t('support.status.ANSWERED');
    },
    tone: 'success',
  },
  CLOSED: {
    get label() {
      return i18n.t('support.status.CLOSED');
    },
    tone: 'textMuted',
  },
} as const;

const loadMine = async (signal: AbortSignal) => (await listMySupportRequests(signal)).content;

export default function SupportRequestsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { items, loading, error, reload, refresh, refreshing } = useRemoteList(loadMine);

  // A new request is created in a modal: refresh when coming back.
  useRefreshOnFocus(reload);

  const create = () => router.push('/account/support-new');

  return (
    <Screen
      header={{ title: t('support.title'), onBack: () => router.back() }}
      refresh={{ refreshing, onRefresh: refresh }}
      footer={items ? <Button label={t('support.create')} onPress={create} /> : undefined}>
      <View style={styles.stack}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.primary} />
        ) : error ? (
          <View style={styles.stack}>
            <Banner tone="error">{errorMessage(error)}</Banner>
            <Button label={t('support.retry')} onPress={reload} />
          </View>
        ) : items && items.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
              <Feather name="message-square" size={28} color={theme.primary} />
            </View>
            <AppText variant="h2" style={styles.center}>
              {t('support.emptyTitle')}
            </AppText>
            <AppText tone="textSecondary" style={styles.center}>
              {t('support.emptyText')}
            </AppText>
          </View>
        ) : (
          items?.map((r) => {
            const status = STATUS[r.status] ?? STATUS.OPEN;
            const color = theme[status.tone];
            const soft = {
              info: theme.infoSoft,
              success: theme.successSoft,
              textMuted: theme.backgroundElement,
            }[status.tone];
            const closed = r.status === 'CLOSED';
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={t('support.view', { subject: r.subject })}
                onPress={() =>
                  router.push({ pathname: '/account/support-detail', params: { id: String(r.id) } })
                }
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    opacity: closed ? 0.8 : 1,
                  },
                ]}>
                <View style={styles.top}>
                  <View style={[styles.pill, { backgroundColor: soft }]}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <AppText variant="label" style={{ color }}>
                      {status.label}
                    </AppText>
                  </View>
                  <AppText variant="small" tone="textMuted">
                    {formatDayMonth(vnDateOf(r.lastMessageAt ?? r.createdAt))}
                  </AppText>
                </View>
                <AppText variant="bodyBold" style={styles.subject}>
                  {r.subject}
                </AppText>
                <View style={styles.previewRow}>
                  <AppText
                    tone={r.unread > 0 ? 'text' : 'textSecondary'}
                    numberOfLines={2}
                    style={styles.preview}>
                    {r.lastSender === 'CUSTOMER' ? `${t('supportDetail.you')}: ` : ''}
                    {r.lastMessage === '[Ảnh]'
                      ? t('supportChat.photoPreview')
                      : (r.lastMessage ?? r.content)}
                  </AppText>
                  {r.unread > 0 ? (
                    <View style={[styles.unread, { backgroundColor: theme.danger }]}>
                      <AppText variant="caption" style={{ color: '#fff' }}>
                        {r.unread > 9 ? '9+' : r.unread}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14, paddingTop: 8 },
  loader: { marginTop: 60 },
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 16, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subject: { fontSize: 17, lineHeight: 24 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  preview: { flex: 1 },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', gap: 10, paddingTop: 48, paddingHorizontal: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
