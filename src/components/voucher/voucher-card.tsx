import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { voucherConditions, voucherSummary } from '@/utils/vouchers';

type Props = {
  voucher: Api.Voucher;
  /** Selected in a picker: green outline and a tick. */
  selected?: boolean;
  /** Not usable now; `reason` says why (shown in orange). */
  disabledReason?: string | null;
  /** Small badge next to the title, e.g. "Tốt nhất". */
  badge?: string;
  /** Greyed out (used or expired). */
  inactive?: boolean;
  onPress?: () => void;
};

/** One voucher, shared by the payment picker and the Voucher screen. */
export function VoucherCard({
  voucher,
  selected = false,
  disabledReason,
  badge,
  inactive = false,
  onPress,
}: Props) {
  const theme = useTheme();
  const muted = inactive || !!disabledReason;
  const border = selected ? theme.success : muted ? theme.border : theme.primary;
  const tint = voucher.percentOff ? 'percent' : 'tag';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: muted || !onPress }}
      accessibilityLabel={`${voucher.title}. ${voucherSummary(voucher)}`}
      disabled={muted || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: border,
          backgroundColor: selected ? theme.successSoft : theme.background,
          opacity: muted ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}>
      <View
        style={[
          styles.icon,
          { backgroundColor: muted ? theme.backgroundElement : theme.primarySoft },
        ]}>
        <Feather name={tint} size={20} color={muted ? theme.textMuted : theme.primaryDark} />
      </View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <AppText variant="bodyBold" numberOfLines={1} style={styles.flex}>
            {voucher.title}
          </AppText>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: theme.warningSoft }]}>
              <AppText variant="caption" tone="warning" style={styles.badgeText}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="caption" tone="textMuted">
          {voucherConditions(voucher) || voucherSummary(voucher)}
        </AppText>
        {disabledReason ? (
          <AppText variant="caption" tone="warning">
            {disabledReason}
          </AppText>
        ) : null}
      </View>
      {selected ? <Feather name="check-circle" size={22} color={theme.success} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: 12,
    minHeight: 64,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  badgeText: { fontWeight: '700' },
});
