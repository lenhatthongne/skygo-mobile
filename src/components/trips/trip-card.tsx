import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AirlineBadge } from '@/components/flight/airline-badge';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayMonth, formatTime, vnDateOf, weekdayName } from '@/utils/datetime';
import { formatVnd } from '@/utils/money';
import { BOOKING_STATUS, clock } from '@/utils/trips';

type TripCardProps = {
  booking: Api.Booking;
  now: number;
  onOpen: () => void;
  onPay: () => void;
  onTicket: () => void;
  /** The list is a saved copy: payment needs the network, a saved ticket does not. */
  offline?: boolean;
};

export function TripCard({
  booking,
  now,
  onOpen,
  onPay,
  onTicket,
  offline = false,
}: TripCardProps) {
  const theme = useTheme();
  const { flight } = booking;
  const status = BOOKING_STATUS[booking.status];
  const toneColor = theme[status.tone];
  const toneSoft = {
    warning: theme.warningSoft,
    danger: theme.dangerSoft,
    success: theme.successSoft,
    purple: theme.purpleSoft,
    textMuted: theme.backgroundElement,
  }[status.tone];

  const date = vnDateOf(flight.departureAt);
  const when = `${weekdayName(date)}, ${formatDayMonth(date)} · ${formatTime(flight.departureAt)}`;
  const guests = `${booking.seatCount} khách`;

  const unpaid = booking.status === 'PENDING_PAYMENT' || booking.status === 'PAYMENT_FAILED';
  const remaining = Math.max(0, Math.ceil((Date.parse(booking.holdExpiresAt) - now) / 1000));
  const upcoming = Date.parse(flight.departureAt) > now;

  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${flight.origin} đến ${flight.destination}, ${when}, ${status.label}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.info, { opacity: pressed ? 0.85 : 1 }]}>
        <View style={styles.top}>
          <View style={[styles.pill, { backgroundColor: toneSoft }]}>
            <View style={[styles.dot, { backgroundColor: toneColor }]} />
            <AppText variant="label" style={{ color: toneColor }}>
              {status.label}
            </AppText>
          </View>
          {booking.bookingCode ? (
            <AppText variant="small" tone="textMuted">
              {booking.bookingCode}
            </AppText>
          ) : null}
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText style={styles.route}>
              {flight.origin} → {flight.destination}
            </AppText>
            {booking.leg ? (
              <AppText variant="caption" tone="primaryDark" style={styles.leg}>
                Khứ hồi · {booking.leg === 'OUTBOUND' ? 'Chặng đi' : 'Chặng về'}
              </AppText>
            ) : null}
            <AppText variant="small" tone="textMuted">
              {when} · {guests}
            </AppText>
          </View>
          {unpaid ? (
            <AppText style={styles.price}>{formatVnd(booking.totalAmount)}</AppText>
          ) : (
            <AirlineBadge airline={flight.airline} size={44} />
          )}
        </View>
      </Pressable>

      {unpaid && offline ? (
        <AppText variant="small" tone="textMuted" style={styles.note}>
          Cần kết nối mạng để thanh toán.
        </AppText>
      ) : unpaid && remaining > 0 ? (
        <View style={[styles.footer, { borderColor: theme.border }]}>
          <View style={styles.hint}>
            <Feather name="clock" size={18} color={theme.warning} />
            <AppText variant="smallBold" tone="warning" style={styles.hintText}>
              Còn {clock(remaining)} để thanh toán
            </AppText>
          </View>
          <Button
            label={booking.status === 'PAYMENT_FAILED' ? 'Thanh toán lại' : 'Thanh toán'}
            onPress={onPay}
            style={styles.action}
          />
        </View>
      ) : booking.status === 'CONFIRMED' && upcoming ? (
        <View style={[styles.footer, { borderColor: theme.border }]}>
          <View style={styles.hint}>
            <Feather name="check-circle" size={18} color={theme.success} />
            <AppText variant="small" tone="textSecondary" style={styles.hintText}>
              {offline ? 'Xem được khi ngoại tuyến' : 'Vé điện tử đã sẵn sàng'}
            </AppText>
          </View>
          <Button
            label={offline ? 'Mở vé QR' : 'Xem vé'}
            variant={offline ? 'primary' : 'outline'}
            onPress={onTicket}
            style={styles.action}
          />
        </View>
      ) : booking.status === 'CANCEL_REQUESTED' ? (
        <AppText variant="small" tone="textSecondary" style={styles.note}>
          Vé vẫn hợp lệ trong thời gian chờ duyệt.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 16, gap: 14 },
  info: { gap: 14 },
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  leg: { fontWeight: '700' },
  route: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  price: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 14,
  },
  hint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintText: { flexShrink: 1 },
  action: { height: 44, paddingHorizontal: 18, minWidth: 110 },
  note: { marginTop: -2 },
});
