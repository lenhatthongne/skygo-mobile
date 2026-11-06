import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { VoucherCard } from '@/components/voucher/voucher-card';
import { useNow } from '@/hooks/use-now';
import { useRemoteList } from '@/hooks/use-remote-list';
import { useTheme } from '@/hooks/use-theme';
import { listMyVouchers } from '@/services/api/vouchers';
import { errorMessage } from '@/utils/error-messages';
import { timeLeft } from '@/utils/vouchers';

const loadAll = (signal: AbortSignal) => listMyVouchers(true, signal);

type Tab = 'usable' | 'history';

export default function VouchersScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { items, loading, error, reload, refresh, refreshing } = useRemoteList(loadAll);
  const [tab, setTab] = useState<Tab>('usable');
  // Only vouchers that belong to the account: granted ones and the ones saved from Home.
  const mine = (items ?? []).filter((v) => v.saved);
  // A voucher held by an unpaid booking is still valid: it is spent when that booking is paid.
  const usable = mine.filter((v) => v.status === 'AVAILABLE' || v.status === 'HELD');
  const history = mine.filter((v) => v.status === 'USED' || v.status === 'EXPIRED');
  const now = useNow(
    usable.some((v) => v.expiresAt),
    1000,
  );
  const shown = tab === 'usable' ? usable : history;

  return (
    <Screen
      header={{ title: t('voucher.mine'), onBack: () => router.back() }}
      refresh={{ refreshing, onRefresh: refresh }}>
      <View style={styles.tabs}>
        <Chip
          tone="dark"
          label={`${t('voucher.tabUsable')}${items ? ` (${usable.length})` : ''}`}
          selected={tab === 'usable'}
          onPress={() => setTab('usable')}
        />
        <Chip
          tone="dark"
          label={`${t('voucher.tabHistory')}${items ? ` (${history.length})` : ''}`}
          selected={tab === 'history'}
          onPress={() => setTab('history')}
        />
      </View>

      {loading ? <ActivityIndicator style={styles.loader} color={theme.primary} /> : null}
      {error ? (
        <View style={styles.stack}>
          <Banner tone="error">{errorMessage(error)}</Banner>
          <Button label={t('common.retry')} variant="outline" onPress={reload} />
        </View>
      ) : null}

      {items ? (
        <View style={styles.stack}>
          {shown.map((v) => (
            <VoucherCard
              key={v.code}
              voucher={v}
              inactive={v.status === 'USED' || v.status === 'EXPIRED'}
              countdown={
                (v.status === 'AVAILABLE' || v.status === 'HELD') && v.expiresAt
                  ? timeLeft(v.expiresAt, now)
                  : null
              }
              note={v.status === 'HELD' ? t('voucher.held') : null}
              disabledReason={
                v.status === 'USED'
                  ? t('voucher.used')
                  : v.status === 'EXPIRED'
                    ? t('voucher.expired')
                    : null
              }
            />
          ))}
          {shown.length === 0 ? (
            <AppText tone="textSecondary" style={styles.empty}>
              {tab === 'usable' ? t('voucher.emptyUsable') : t('voucher.emptyHistory')}
            </AppText>
          ) : null}
          {tab === 'usable' && usable.length > 0 ? (
            <AppText variant="caption" tone="textMuted" style={styles.hint}>
              {t('voucher.hint')}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  loader: { marginTop: 32 },
  stack: { gap: 10, paddingTop: 16 },
  empty: { textAlign: 'center', paddingVertical: 32 },
  hint: { textAlign: 'center', paddingTop: 4 },
});
