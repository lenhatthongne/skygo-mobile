import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { VoucherList } from '@/components/home/voucher-list';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useRemoteList } from '@/hooks/use-remote-list';
import { useTheme } from '@/hooks/use-theme';
import { getPromotions } from '@/services/api/catalog';
import { listMyVouchers } from '@/services/api/vouchers';
import { errorMessage } from '@/utils/error-messages';

type Row = { promotion?: Api.Promotion; voucher?: Api.Voucher };

/** One list for both kinds, so a single request state covers the screen. */
const load = async (signal: AbortSignal): Promise<Row[]> => {
  const [promotions, wallet] = await Promise.all([
    getPromotions(signal),
    listMyVouchers(true, signal),
  ]);
  return [
    ...promotions.filter((p) => p.kind === 'VOUCHER').map((promotion) => ({ promotion })),
    ...wallet.map((voucher) => ({ voucher })),
  ];
};

/**
 * Offers: the public vouchers to save to the account (each gets a deadline that counts down) and the
 * vouchers the account already has. Saved ones are also listed in Account → My vouchers.
 */
export default function OffersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { items, loading, error, reload, refresh, refreshing } = useRemoteList(load);
  const [justSaved, setJustSaved] = useState<Api.Voucher[]>([]);

  const promotions = (items ?? []).flatMap((r) => (r.promotion ? [r.promotion] : []));
  const base = (items ?? []).flatMap((r) => (r.voucher ? [r.voucher] : []));
  const wallet = [...base.filter((w) => !justSaved.some((s) => s.code === w.code)), ...justSaved];

  // A voucher granted to the account that is not on the public list (the welcome voucher).
  const personal: Api.Promotion[] = wallet
    .filter((v) => !promotions.some((p) => p.code === v.code))
    .map((v) => ({
      id: -v.code.length * 1000 - v.code.charCodeAt(0),
      kind: 'VOUCHER',
      title: v.title,
      subtitle: v.expiresAt ? t('home.personalOfferOnce') : t('home.personalOffer'),
      code: v.code,
      imageUrl: null,
      theme: 'TEAL',
      destinationCode: null,
      endsAt: v.expiresAt,
    }));
  const offers = [...personal, ...promotions];

  return (
    <Screen
      header={{ title: t('offers.title'), onBack: () => router.back() }}
      refresh={{ refreshing, onRefresh: refresh }}>
      <AppText tone="textSecondary" style={styles.intro}>
        {t('offers.intro')}
      </AppText>
      {loading ? <ActivityIndicator style={styles.loader} color={theme.primary} /> : null}
      {error && !items ? (
        <View style={styles.stack}>
          <Banner tone="error">{errorMessage(error)}</Banner>
          <Button label={t('common.retry')} variant="outline" onPress={reload} />
        </View>
      ) : null}
      {items ? (
        offers.length === 0 ? (
          <AppText tone="textSecondary" style={styles.empty}>
            {t('offers.empty')}
          </AppText>
        ) : (
          <VoucherList
            bare
            items={offers}
            wallet={wallet}
            onSaved={(saved) =>
              setJustSaved((list) => [...list.filter((s) => s.code !== saved.code), saved])
            }
          />
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { paddingTop: 4 },
  loader: { marginTop: 32 },
  stack: { gap: 10, paddingTop: 16 },
  empty: { textAlign: 'center', paddingVertical: 32 },
});
