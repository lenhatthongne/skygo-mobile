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
import { formatDayMonth, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';

const STATUS = {
  OPEN: { label: 'Đang xử lý', tone: 'info' },
  ANSWERED: { label: 'Đã trả lời', tone: 'success' },
  CLOSED: { label: 'Đã đóng', tone: 'textMuted' },
} as const;

const loadMine = async (signal: AbortSignal) => (await listMySupportRequests(signal)).content;

export default function SupportRequestsScreen() {
  const theme = useTheme();
  const { items, loading, error, reload, refresh, refreshing } = useRemoteList(loadMine);

  // A new request is created in a modal: refresh when coming back.
  useRefreshOnFocus(reload);

  const create = () => router.push('/account/support-new');

  return (
    <Screen
      header={{ title: 'Yêu cầu hỗ trợ', onBack: () => router.back() }}
      refresh={{ refreshing, onRefresh: refresh }}
      footer={items ? <Button label="+ Tạo yêu cầu mới" onPress={create} /> : undefined}>
      <View style={styles.stack}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.primary} />
        ) : error ? (
          <View style={styles.stack}>
            <Banner tone="error">{errorMessage(error)}</Banner>
            <Button label="Thử lại" onPress={reload} />
          </View>
        ) : items && items.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
              <Feather name="message-square" size={28} color={theme.primary} />
            </View>
            <AppText variant="h2" style={styles.center}>
              Chưa có yêu cầu nào
            </AppText>
            <AppText tone="textSecondary" style={styles.center}>
              Cần giúp đỡ? Gửi yêu cầu và SkyGo sẽ phản hồi ngay trong ứng dụng.
            </AppText>
          </View>
        ) : (
          items?.map((r) => {
            const status = STATUS[r.status] ?? STATUS.OPEN;
            const color = theme[status.tone];
            const soft = { info: theme.infoSoft, success: theme.successSoft, textMuted: theme.backgroundElement }[status.tone];
            const closed = r.status === 'CLOSED';
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`Xem yêu cầu ${r.subject}`}
                onPress={() => router.push({ pathname: '/account/support-detail', params: { id: String(r.id) } })}
                style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border, opacity: closed ? 0.8 : 1 }]}>
                <View style={styles.top}>
                  <View style={[styles.pill, { backgroundColor: soft }]}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <AppText variant="label" style={{ color }}>
                      {status.label}
                    </AppText>
                  </View>
                  <AppText variant="small" tone="textMuted">
                    {formatDayMonth(vnDateOf(r.createdAt))}
                  </AppText>
                </View>
                <AppText variant="bodyBold" style={styles.subject}>
                  {r.subject}
                </AppText>
                <AppText tone="textSecondary" numberOfLines={closed ? 2 : 4}>
                  {r.content}
                </AppText>
                {r.adminReply ? (
                  <View style={[styles.reply, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
                    <AppText variant="smallBold" tone="primaryDark">
                      SkyGo phản hồi
                    </AppText>
                    <AppText>{r.adminReply}</AppText>
                  </View>
                ) : null}
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
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subject: { fontSize: 17, lineHeight: 24 },
  reply: { borderLeftWidth: 3, borderRadius: Radius.sm, padding: 12, gap: 4, marginTop: 4 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 48, paddingHorizontal: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
