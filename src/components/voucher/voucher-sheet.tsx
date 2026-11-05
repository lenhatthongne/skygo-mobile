import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { useRemoteList } from '@/hooks/use-remote-list';
import { useTheme } from '@/hooks/use-theme';
import { listMyVouchers } from '@/services/api/vouchers';
import { errorMessage } from '@/utils/error-messages';
import { formatVnd } from '@/utils/money';
import { estimateDiscount } from '@/utils/vouchers';

import { VoucherCard } from './voucher-card';

type Props = {
  visible: boolean;
  /** Payable total before any voucher; decides which vouchers can be used. */
  subtotal: number;
  currentCode?: string | null;
  /** Applies the voucher; throws when the server refuses it. */
  onSelect: (code: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
};

const loadUsable = (signal: AbortSignal) => listMyVouchers(false, signal);

/** Bottom sheet to pick a voucher: tap one to apply it. Nothing to type. */
export function VoucherSheet(props: Props) {
  // Mounted only while open, so the list is fetched fresh each time.
  return props.visible ? <Sheet {...props} /> : null;
}

function Sheet({ subtotal, currentCode, onSelect, onRemove, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { items, loading, error, reload } = useRemoteList(loadUsable);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Usable ones first, the one saving the most marked as best.
  const rows = (items ?? []).map((v) => ({
    v,
    short: v.minOrder > subtotal ? v.minOrder - subtotal : 0,
    saving: estimateDiscount(v, subtotal),
  }));
  rows.sort((a, b) => Number(a.short > 0) - Number(b.short > 0) || b.saving - a.saving);
  const best = rows.find((r) => r.short === 0 && r.saving > 0)?.v.code;

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setFailure(null);
    try {
      await action();
      onClose();
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable accessibilityLabel={t('common.close')} style={styles.flex} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.grab, { backgroundColor: theme.border }]} />
          <View style={styles.head}>
            <AppText variant="h2">{t('voucher.pick')}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={12}
              onPress={onClose}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          {loading ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : null}
          {error ? (
            <View style={styles.gap}>
              <Banner tone="error">{errorMessage(error)}</Banner>
              <Button label={t('common.retry')} variant="outline" onPress={reload} />
            </View>
          ) : null}
          {items && items.length === 0 ? (
            <AppText tone="textSecondary" style={styles.empty}>
              {t('voucher.emptyUsable')}
            </AppText>
          ) : null}

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {rows.map(({ v, short, saving }) => (
              <View key={v.code} style={styles.item}>
                <VoucherCard
                  voucher={v}
                  selected={v.code === currentCode}
                  badge={v.code === best ? t('voucher.best') : undefined}
                  disabledReason={
                    short > 0 ? t('voucher.needMore', { amount: formatVnd(short) }) : null
                  }
                  onPress={() =>
                    v.code === currentCode ? onClose() : void run(v.code, () => onSelect(v.code))
                  }
                />
                {busy === v.code ? (
                  <ActivityIndicator color={theme.primary} style={styles.spin} />
                ) : null}
                {short === 0 && saving > 0 && v.code !== currentCode ? (
                  <AppText variant="caption" tone="success" style={styles.save}>
                    {t('voucher.saving', { amount: formatVnd(saving) })}
                  </AppText>
                ) : null}
              </View>
            ))}
          </ScrollView>

          {failure ? (
            <View style={styles.gap}>
              <Banner tone="error">{failure}</Banner>
            </View>
          ) : null}
          {currentCode ? (
            <Button
              label={t('voucher.remove')}
              variant="ghost"
              loading={busy === '__remove__'}
              onPress={() => void run('__remove__', onRemove)}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { flex: 1, backgroundColor: 'rgba(14,17,22,0.5)' },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 8,
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  loader: { marginVertical: 24 },
  empty: { textAlign: 'center', paddingVertical: 24 },
  gap: { gap: 8 },
  list: { flexGrow: 0 },
  listContent: { gap: 10, paddingBottom: 8 },
  item: { gap: 2 },
  spin: { position: 'absolute', right: 16, top: 22 },
  save: { paddingLeft: 68 },
});
