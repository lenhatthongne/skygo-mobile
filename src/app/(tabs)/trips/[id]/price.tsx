import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useBooking } from '@/hooks/use-booking';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatTime, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { formatVnd } from '@/utils/money';
import { BOOKING_STATUS } from '@/utils/trips';

/** Price breakdown exactly as the server stored it at booking time (`priceSnapshot`). */
export default function PriceDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { booking, loading, error, reload } = useBooking(id);
  const header = { title: t('priceDetail.title'), onBack: () => router.back() };

  if (loading) {
    return (
      <Screen header={header}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </Screen>
    );
  }
  if (error || !booking) {
    return (
      <Screen header={header}>
        <View style={styles.stack}>
          <Banner tone="error">{errorMessage(error)}</Banner>
          <Button label={t('priceDetail.retry')} onPress={reload} />
        </View>
      </Screen>
    );
  }

  const { flight, priceSnapshot: p } = booking;
  const status = BOOKING_STATUS[booking.status];
  const date = formatDate(vnDateOf(flight.departureAt));

  async function share() {
    if (!booking) return;
    const code = booking.bookingCode ?? t('priceDetail.noCode');
    try {
      await Share.share({
        message: t('priceDetail.share', {
          code,
          from: flight.origin,
          to: flight.destination,
          date,
          time: formatTime(flight.departureAt),
          flight: flight.flightNumber,
        }),
      });
    } catch {
      // The user closed the share sheet or sharing is unavailable.
    }
  }

  return (
    <Screen
      header={header}
      footer={
        booking.bookingCode ? (
          <Button label={t('priceDetail.shareButton')} onPress={() => void share()} />
        ) : undefined
      }>
      <View style={styles.stack}>
        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.between}>
            <View style={styles.flex}>
              <AppText variant="caption" tone="textMuted">
                {t('priceDetail.bookingCode')}
              </AppText>
              <AppText style={styles.code}>
                {booking.bookingCode ?? t('priceDetail.noCodeCap')}
              </AppText>
            </View>
            <AppText variant="label" tone={status.tone}>
              {status.label}
            </AppText>
          </View>
          <AppText variant="caption" tone="textMuted" style={styles.route}>
            {flight.origin} → {flight.destination} · {date} · {formatTime(flight.departureAt)} ·{' '}
            {t('common.guests', { count: booking.seatCount })}
          </AppText>
        </View>

        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          {p.lines.map((line) => (
            <View key={line.type} style={styles.line}>
              <View style={styles.flex}>
                <AppText>
                  {t(`passengerType.${line.type}`)} × {line.count}
                </AppText>
                {line.type === 'CHD' ? (
                  <AppText variant="caption" tone="textMuted">
                    {t('priceDetail.childRate', { pct: p.childRatePct })}
                  </AppText>
                ) : null}
                {line.type === 'INF' ? (
                  <AppText variant="caption" tone="textMuted">
                    {t('priceDetail.infantNote')}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="bodyBold">{formatVnd(line.fare)}</AppText>
            </View>
          ))}
          <View style={styles.line}>
            <AppText tone="textSecondary" style={styles.flex}>
              {t('priceDetail.taxes')}
            </AppText>
            <AppText tone="textSecondary">{formatVnd(p.totalTax)}</AppText>
          </View>
          {p.baggageTotal ? (
            <View style={styles.line}>
              <View style={styles.flex}>
                <AppText>{t('priceDetail.baggage')}</AppText>
                {booking.passengers
                  .filter((x) => x.baggageKg)
                  .map((x) => (
                    <AppText key={x.id} variant="caption" tone="textMuted">
                      {x.fullName}: +{x.baggageKg} kg
                    </AppText>
                  ))}
              </View>
              <AppText variant="bodyBold">{formatVnd(p.baggageTotal)}</AppText>
            </View>
          ) : null}
          {p.seatTotal ? (
            <View style={styles.line}>
              <View style={styles.flex}>
                <AppText>{t('priceDetail.seatFee')}</AppText>
                {booking.passengers
                  .filter((x) => x.seatCode)
                  .map((x) => (
                    <AppText key={x.id} variant="caption" tone="textMuted">
                      {t('priceDetail.seatLine', { name: x.fullName, code: x.seatCode })}
                    </AppText>
                  ))}
              </View>
              <AppText variant="bodyBold">{formatVnd(p.seatTotal)}</AppText>
            </View>
          ) : null}
          {booking.discountAmount ? (
            <View style={styles.line}>
              <AppText tone="success" style={styles.flex}>
                {t('priceDetail.discount')}
                {booking.voucherCode ? ` (${booking.voucherCode})` : ''}
              </AppText>
              <AppText variant="bodyBold" tone="success">
                −{formatVnd(booking.discountAmount)}
              </AppText>
            </View>
          ) : null}
          <View style={[styles.rule, { backgroundColor: theme.border }]} />
          <View style={styles.line}>
            <AppText variant="bodyBold" style={styles.flex}>
              {t('priceDetail.totalPaid')}
            </AppText>
            <AppText style={styles.total}>{formatVnd(booking.totalAmount)}</AppText>
          </View>
        </View>

        <Banner tone="warning">
          {p.refundable
            ? t('priceDetail.cancelTerms', { fee: formatVnd(p.cancelFee) })
            : t('priceDetail.notRefundable')}
        </Banner>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 80 },
  stack: { gap: 14, paddingTop: 8 },
  card: { borderWidth: 1, borderRadius: Radius.xl, paddingHorizontal: 16, paddingVertical: 10 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  code: { fontSize: 26, lineHeight: 34, fontWeight: '800', letterSpacing: 0.5 },
  route: { paddingTop: 6, paddingBottom: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rule: { height: 1, marginVertical: 4 },
  total: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
});
