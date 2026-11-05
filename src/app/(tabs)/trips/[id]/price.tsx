import { router, useLocalSearchParams } from 'expo-router';
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

const TYPE_LABEL: Record<Api.PassengerType, string> = {
  ADT: 'Người lớn',
  CHD: 'Trẻ em',
  INF: 'Em bé',
};

/** Price breakdown exactly as the server stored it at booking time (`priceSnapshot`). */
export default function PriceDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { booking, loading, error, reload } = useBooking(id);
  const header = { title: 'Chi tiết giá', onBack: () => router.back() };

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
          <Button label="Thử lại" onPress={reload} />
        </View>
      </Screen>
    );
  }

  const { flight, priceSnapshot: p } = booking;
  const status = BOOKING_STATUS[booking.status];
  const date = formatDate(vnDateOf(flight.departureAt));

  async function share() {
    if (!booking) return;
    const code = booking.bookingCode ?? 'chưa có mã';
    try {
      await Share.share({
        message: `SkyGo - Mã đặt chỗ ${code}: ${flight.origin} → ${flight.destination}, ${date} ${formatTime(flight.departureAt)}, ${flight.flightNumber}.`,
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
          <Button label="Chia sẻ mã đặt chỗ" onPress={() => void share()} />
        ) : undefined
      }>
      <View style={styles.stack}>
        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.between}>
            <View style={styles.flex}>
              <AppText variant="caption" tone="textMuted">
                Mã đặt chỗ
              </AppText>
              <AppText style={styles.code}>{booking.bookingCode ?? 'Chưa có mã'}</AppText>
            </View>
            <AppText variant="label" tone={status.tone}>
              {status.label}
            </AppText>
          </View>
          <AppText variant="caption" tone="textMuted" style={styles.route}>
            {flight.origin} → {flight.destination} · {date} · {formatTime(flight.departureAt)} ·{' '}
            {booking.seatCount} khách
          </AppText>
        </View>

        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          {p.lines.map((line) => (
            <View key={line.type} style={styles.line}>
              <View style={styles.flex}>
                <AppText>
                  {TYPE_LABEL[line.type]} × {line.count}
                </AppText>
                {line.type === 'CHD' ? (
                  <AppText variant="caption" tone="textMuted">
                    {p.childRatePct}% giá người lớn
                  </AppText>
                ) : null}
                {line.type === 'INF' ? (
                  <AppText variant="caption" tone="textMuted">
                    Em bé ngồi cùng người lớn
                  </AppText>
                ) : null}
              </View>
              <AppText variant="bodyBold">{formatVnd(line.fare)}</AppText>
            </View>
          ))}
          <View style={styles.line}>
            <AppText tone="textSecondary" style={styles.flex}>
              Thuế và phí
            </AppText>
            <AppText tone="textSecondary">{formatVnd(p.totalTax)}</AppText>
          </View>
          {p.baggageTotal ? (
            <View style={styles.line}>
              <View style={styles.flex}>
                <AppText>Hành lý mua thêm</AppText>
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
                <AppText>Phí chọn ghế</AppText>
                {booking.passengers
                  .filter((x) => x.seatCode)
                  .map((x) => (
                    <AppText key={x.id} variant="caption" tone="textMuted">
                      {x.fullName}: ghế {x.seatCode}
                    </AppText>
                  ))}
              </View>
              <AppText variant="bodyBold">{formatVnd(p.seatTotal)}</AppText>
            </View>
          ) : null}
          {booking.discountAmount ? (
            <View style={styles.line}>
              <AppText tone="success" style={styles.flex}>
                Giảm giá{booking.voucherCode ? ` (${booking.voucherCode})` : ''}
              </AppText>
              <AppText variant="bodyBold" tone="success">
                −{formatVnd(booking.discountAmount)}
              </AppText>
            </View>
          ) : null}
          <View style={[styles.rule, { backgroundColor: theme.border }]} />
          <View style={styles.line}>
            <AppText variant="bodyBold" style={styles.flex}>
              Tổng thanh toán
            </AppText>
            <AppText style={styles.total}>{formatVnd(booking.totalAmount)}</AppText>
          </View>
        </View>

        <Banner tone="warning">
          {p.refundable
            ? `Điều kiện hủy: hủy trước giờ bay ít nhất 24 giờ, phí ${formatVnd(p.cancelFee)}/khách.`
            : 'Hạng vé này không được hủy hoặc hoàn tiền.'}
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
