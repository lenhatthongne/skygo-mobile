import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Radius, type ThemeColor } from '@/constants/theme';
import { usePaymentHistory } from '@/hooks/use-payment-history';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { formatVnd } from '@/utils/money';

type Filter = 'ALL' | 'SUCCESS' | 'FAILED';

const RESULT_TONE: Record<Api.SimulatedResult, { bg: ThemeColor; fg: ThemeColor }> = {
  SUCCESS: { bg: 'successSoft', fg: 'success' },
  FAILED: { bg: 'dangerSoft', fg: 'danger' },
  CANCELLED: { bg: 'backgroundElement', fg: 'textSecondary' },
};

const METHOD_ICON: Record<Api.PaymentMethod, React.ComponentProps<typeof Feather>['name']> = {
  SIMULATED_CARD: 'credit-card',
  SIMULATED_BANK: 'briefcase',
  SIMULATED_WALLET: 'smartphone',
};

export default function PaymentHistoryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const history = usePaymentHistory();
  const [filter, setFilter] = useState<Filter>('ALL');

  const filters: { value: Filter; label: string }[] = [
    { value: 'ALL', label: t('payments.filterAll') },
    { value: 'SUCCESS', label: t('payments.filterSuccess') },
    { value: 'FAILED', label: t('payments.filterFailed') },
  ];
  const items = history.items.filter((p) => filter === 'ALL' || p.result === filter);

  const resultLabel = (r: Api.SimulatedResult) =>
    t(`payments.result${r === 'SUCCESS' ? 'Success' : r === 'FAILED' ? 'Failed' : 'Cancelled'}`);
  const methodLabel = (m: Api.PaymentMethod) =>
    t(
      `payments.method${m === 'SIMULATED_CARD' ? 'Card' : m === 'SIMULATED_BANK' ? 'Bank' : 'Wallet'}`,
    );

  return (
    <Screen
      header={{ title: t('payments.title'), onBack: () => router.back() }}
      refresh={{ refreshing: history.refreshing, onRefresh: history.refresh }}>
      <View style={styles.chips}>
        {filters.map((f) => (
          <Chip
            key={f.value}
            tone="dark"
            label={f.label}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </View>

      {history.loading ? <ActivityIndicator style={styles.loader} color={theme.primary} /> : null}
      {history.error ? (
        <View style={styles.stack}>
          <Banner tone="error">{errorMessage(history.error)}</Banner>
          <Button label={t('common.retry')} variant="outline" onPress={history.reload} />
        </View>
      ) : null}

      {!history.loading && !history.error ? (
        <FlatList
          scrollEnabled={false}
          data={items}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <AppText tone="textSecondary" style={styles.empty}>
              {history.items.length === 0 ? t('payments.empty') : t('payments.emptyFiltered')}
            </AppText>
          }
          renderItem={({ item: p }) => {
            const tone = RESULT_TONE[p.result];
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${p.originCode} → ${p.destinationCode}, ${resultLabel(p.result)}, ${formatVnd(p.amount)}`}
                onPress={() =>
                  router.push({ pathname: '/trips/[id]', params: { id: p.bookingId } })
                }
                style={({ pressed }) => [
                  styles.card,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <View style={styles.top}>
                  <AppText variant="bodyBold">
                    {p.originCode} → {p.destinationCode}
                  </AppText>
                  <View style={[styles.pill, { backgroundColor: theme[tone.bg] }]}>
                    <AppText variant="caption" style={[styles.pillText, { color: theme[tone.fg] }]}>
                      {resultLabel(p.result)}
                    </AppText>
                  </View>
                </View>
                <AppText variant="caption" tone="textMuted">
                  {[
                    p.bookingCode ? t('payments.code', { code: p.bookingCode }) : null,
                    formatDateTime(p.createdAt),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
                <View style={styles.bottom}>
                  <View style={styles.method}>
                    <Feather name={METHOD_ICON[p.method]} size={16} color={theme.textSecondary} />
                    <AppText variant="small" tone="textSecondary">
                      {methodLabel(p.method)}
                    </AppText>
                  </View>
                  <AppText variant="bodyBold">{formatVnd(p.amount)}</AppText>
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <View style={styles.footer}>
              {history.hasMore ? (
                <Button
                  label={t('payments.loadMore')}
                  variant="outline"
                  loading={history.loadingMore}
                  onPress={() => void history.loadMore()}
                />
              ) : null}
              {items.length > 0 ? (
                <AppText variant="caption" tone="textMuted" style={styles.hint}>
                  {t('payments.hint')}
                </AppText>
              ) : null}
            </View>
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  loader: { marginTop: 32 },
  stack: { gap: 10, paddingTop: 16 },
  list: { gap: 10, paddingTop: 14 },
  empty: { textAlign: 'center', paddingVertical: 32 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  pillText: { fontWeight: '700' },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  method: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: { gap: 10, paddingTop: 4 },
  hint: { textAlign: 'center' },
});
