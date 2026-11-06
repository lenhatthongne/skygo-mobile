import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useRemoteList } from '@/hooks/use-remote-list';
import { useTheme } from '@/hooks/use-theme';
import { listMySupportRequests } from '@/services/api/support';
import i18n from '@/i18n';
import { formatDateTime } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';

// Read when the screen renders, so the labels follow the language chosen in Settings.
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

/** The backend has no "get one" endpoint, so the request is picked from the customer's own list. */
export default function SupportDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, loading, error, reload } = useRemoteList(loadMine);
  const request = items?.find((r) => String(r.id) === id);
  const header = { title: t('supportDetail.title'), onBack: () => router.back() };

  if (loading) {
    return (
      <Screen header={header}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </Screen>
    );
  }
  if (error || !request) {
    return (
      <Screen header={header}>
        <View style={styles.stack}>
          <Banner tone={error ? 'error' : 'info'}>
            {error ? errorMessage(error) : t('supportDetail.notFound')}
          </Banner>
          <Button label={t('support.retry')} variant="outline" onPress={reload} />
        </View>
      </Screen>
    );
  }

  const status = STATUS[request.status] ?? STATUS.OPEN;
  const color = theme[status.tone];
  const soft = {
    info: theme.infoSoft,
    success: theme.successSoft,
    textMuted: theme.backgroundElement,
  }[status.tone];

  return (
    <Screen
      header={header}
      footer={
        <Button
          label={t('supportDetail.create')}
          variant="outline"
          onPress={() => router.push('/account/support-new')}
        />
      }>
      <View style={styles.stack}>
        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.between}>
            <View style={[styles.pill, { backgroundColor: soft }]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <AppText variant="label" style={{ color }}>
                {status.label}
              </AppText>
            </View>
            <AppText variant="caption" tone="textMuted">
              {t('supportDetail.sent', { time: formatDateTime(request.createdAt) })}
            </AppText>
          </View>
          <AppText variant="h2" style={styles.subject}>
            {request.subject}
          </AppText>
        </View>

        <View
          style={[
            styles.bubble,
            styles.mine,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}>
          <AppText variant="smallBold">{t('supportDetail.you')}</AppText>
          <AppText>{request.content}</AppText>
        </View>

        {request.adminReply ? (
          <View
            style={[
              styles.bubble,
              styles.reply,
              { backgroundColor: theme.primarySoft, borderColor: theme.primary },
            ]}>
            <AppText variant="smallBold" tone="primaryDark">
              {t('support.reply')}
            </AppText>
            <AppText>{request.adminReply}</AppText>
            <AppText variant="caption" tone="textMuted">
              {formatDateTime(request.updatedAt)}
            </AppText>
          </View>
        ) : request.status === 'OPEN' ? (
          <Banner tone="info">{t('supportDetail.waiting')}</Banner>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 80 },
  stack: { gap: 14, paddingTop: 8 },
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 16, gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subject: { lineHeight: 28 },
  bubble: { borderRadius: 20, padding: 14, gap: 4 },
  mine: { borderWidth: 1, marginLeft: 36, borderBottomRightRadius: 6 },
  reply: { borderLeftWidth: 3, marginRight: 24, borderBottomLeftRadius: 6 },
});
