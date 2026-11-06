import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { saveVoucher } from '@/services/api/vouchers';
import { formatDate, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { timeLeft } from '@/utils/vouchers';

import { PROMO_TONES } from './promo-theme';

type Props = {
  items: Api.Promotion[];
  /** The customer's own vouchers: tells which offers are already saved and until when. */
  wallet: Api.Voucher[];
  /** A voucher was just saved: Home puts it in its copy of the wallet. */
  onSaved: (voucher: Api.Voucher) => void;
  /** The Offers screen has its own header, so it hides the list's title and top margin. */
  bare?: boolean;
};

/**
 * Offers with a code. Tapping "Lưu" saves the voucher to the account, which gives it a deadline
 * that counts down here and in Account → My vouchers. A saved offer says "Đã lưu" and opens the
 * Voucher screen.
 */
export function VoucherList({ items, wallet, onSaved, bare = false }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [saving, setSaving] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, string>>({});
  // One tick per second only while some saved voucher has a deadline to count down.
  const counting = wallet.some(
    (w) => w.saved && (w.status === 'AVAILABLE' || w.status === 'HELD') && w.expiresAt,
  );
  const now = useNow(counting, 1000);

  if (items.length === 0) return null;

  async function save(code: string) {
    setSaving(code);
    setFailed((f) => ({ ...f, [code]: '' }));
    try {
      onSaved(await saveVoucher(code));
    } catch (e) {
      setFailed((f) => ({ ...f, [code]: errorMessage(e) }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <View style={[styles.wrap, bare && styles.bare]}>
      {bare ? null : (
        <AppText variant="bodyBold" style={styles.title}>
          {t('home.offersTitle')}
        </AppText>
      )}
      {items.map((v) => {
        const tone = PROMO_TONES[v.theme];
        const mine = v.code ? wallet.find((w) => w.code === v.code) : undefined;
        const saved = !!mine?.saved;
        const status = mine?.status;
        const lapsed = saved && (status === 'USED' || status === 'EXPIRED');
        const left = saved && !lapsed && mine?.expiresAt ? timeLeft(mine.expiresAt, now) : null;
        const busy = saving === v.code;
        // What the button says: Lưu, then a grey state that tells the truth about the voucher.
        const label = busy
          ? t('voucher.saving2')
          : status === 'USED' && saved
            ? t('voucher.usedShort')
            : status === 'EXPIRED' && saved
              ? t('voucher.expiredShort')
              : saved
                ? t('voucher.saved')
                : t('voucher.save');
        return (
          <View key={v.id} style={styles.item}>
            <View style={[styles.card, { borderColor: saved ? theme.border : theme.primary }]}>
              <View style={[styles.icon, { backgroundColor: theme[tone.bg] }]}>
                <Feather name="tag" size={20} color={theme[tone.fg]} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyBold" numberOfLines={2}>
                  {v.title}
                </AppText>
                <AppText variant="caption" tone="textMuted" numberOfLines={2}>
                  {[
                    v.subtitle,
                    !saved && v.endsAt
                      ? t('home.expires', { date: formatDate(vnDateOf(v.endsAt)) })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
                {saved && status === 'HELD' ? (
                  <AppText variant="caption" tone="warning">
                    {t('voucher.held')}
                  </AppText>
                ) : null}
                {saved && !lapsed ? (
                  <AppText variant="caption" tone={left || !mine?.expiresAt ? 'success' : 'danger'}>
                    {left ? t('voucher.timeLeft', { time: left }) : t('voucher.saved')}
                  </AppText>
                ) : null}
              </View>
              {v.code ? (
                <Button
                  size="sm"
                  variant="primary"
                  // Grey once it is in the account: saved, used or expired.
                  disabled={saved}
                  icon={saved ? 'check' : 'bookmark-plus-outline'}
                  label={label}
                  loading={busy}
                  onPress={() => void save(v.code ?? '')}
                  style={styles.button}
                />
              ) : null}
            </View>
            {v.code && failed[v.code] ? (
              <AppText variant="caption" tone="danger" style={styles.error}>
                {failed[v.code]}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { marginTop: 28, gap: 10 },
  bare: { marginTop: 8 },
  title: { fontSize: 17 },
  item: { gap: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // One width for every button, so they line up whatever the label.
  button: { width: 112 },
  error: { paddingHorizontal: 4 },
});
