import { Pressable, StyleSheet, View } from 'react-native';

import { AirlineBadge } from '@/components/flight/airline-badge';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayMonth, formatTime, vnDateOf } from '@/utils/datetime';
import { formatVnd } from '@/utils/money';
import { BOOKING_STATUS, clock, isPayable } from '@/utils/trips';

type TripGroupCardProps = {
  legs: Api.Booking[];
  now: number;
  /** The list is a saved copy: payment needs the network, a saved ticket does not. */
  offline?: boolean;
  onOpen: (booking: Api.Booking) => void;
  onPay: (booking: Api.Booking) => void;
  onTicket: (booking: Api.Booking) => void;
  onSeats: (legs: Api.Booking[]) => void;
};

const LEG_LABEL: Record<Api.TripLeg, string> = { OUTBOUND: 'Chặng đi', RETURN: 'Chặng về' };

/** One card for the two linked bookings of a round trip; each leg keeps its own actions. */
export function TripGroupCard({ legs, now, offline = false, onOpen, onPay, onTicket, onSeats }: TripGroupCardProps) {
  const theme = useTheme();
  const first = legs[0];
  const last = legs[legs.length - 1];
  const total = legs.reduce((sum, l) => sum + l.totalAmount, 0);
  const hasSeats = legs.some((l) => l.passengers.some((p) => p.seatCode));
  const complete = legs.length === 2;
  const payable = legs.filter((l) => isPayable(l, now));
  const paid = legs.filter((l) => l.status === 'CONFIRMED' || l.status === 'CANCEL_REQUESTED');

  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.top}>
        <View style={[styles.pill, { backgroundColor: theme.primarySoft }]}>
          <AppText variant="label" tone="primaryDark">
            Khứ hồi
          </AppText>
        </View>
        <AppText variant="small" tone="textMuted">
          {legs.map((l) => l.bookingCode).filter(Boolean).join(' · ')}
        </AppText>
      </View>

      <View style={styles.headRow}>
        <View style={styles.flex}>
          <AppText style={styles.route}>
            {first.flight.origin} ⇄ {first.flight.destination}
          </AppText>
          <AppText variant="small" tone="textMuted">
            {formatDayMonth(vnDateOf(first.flight.departureAt))}
            {complete ? ` – ${formatDayMonth(vnDateOf(last.flight.departureAt))}` : ''} · {first.seatCount} khách
          </AppText>
        </View>
        <AppText style={styles.price}>{formatVnd(total)}</AppText>
      </View>

      <View style={[styles.legs, { borderColor: theme.border }]}>
        {legs.map((leg, i) => {
          const status = BOOKING_STATUS[leg.status];
          const toneColor = theme[status.tone];
          const canPay = !offline && isPayable(leg, now);
          const canTicket = leg.status === 'CONFIRMED' && Date.parse(leg.flight.departureAt) > now;
          return (
            <View key={leg.id} style={[styles.leg, i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${leg.leg ? LEG_LABEL[leg.leg] : 'Chặng'} ${leg.flight.origin} đến ${leg.flight.destination}, ${status.label}`}
                onPress={() => onOpen(leg)}
                style={({ pressed }) => [styles.legInfo, { opacity: pressed ? 0.85 : 1 }]}>
                <AirlineBadge airline={leg.flight.airline} size={36} />
                <View style={styles.flex}>
                  <AppText variant="smallBold">
                    {leg.leg ? LEG_LABEL[leg.leg] : 'Chặng'} · {leg.flight.origin} → {leg.flight.destination}
                  </AppText>
                  <AppText variant="caption" tone="textMuted">
                    {formatDayMonth(vnDateOf(leg.flight.departureAt))} · {formatTime(leg.flight.departureAt)} ·{' '}
                    {leg.flight.flightNumber}
                  </AppText>
                  <View style={styles.statusRow}>
                    <View style={[styles.dot, { backgroundColor: toneColor }]} />
                    <AppText variant="caption" style={{ color: toneColor, fontWeight: '700' }}>
                      {status.label}
                    </AppText>
                  </View>
                </View>
              </Pressable>
              {canPay ? (
                <Button
                  label={leg.status === 'PAYMENT_FAILED' ? 'Thử lại' : 'Thanh toán'}
                  onPress={() => onPay(leg)}
                  style={styles.action}
                />
              ) : canTicket ? (
                <Button label="Xem vé" variant="outline" onPress={() => onTicket(leg)} style={styles.action} />
              ) : null}
            </View>
          );
        })}
      </View>

      {paid.length > 0 && payable.length > 0 ? (
        <AppText variant="small" tone="warning" style={styles.note}>
          {paid.map((l) => (l.leg ? LEG_LABEL[l.leg] : 'Chặng')).join(', ')} đã thanh toán. Còn{' '}
          {payable.map((l) => (l.leg ? LEG_LABEL[l.leg].toLowerCase() : 'chặng')).join(', ')} chờ thanh toán, giữ chỗ
          còn {clock(Math.max(0, Math.ceil((Date.parse(payable[0].holdExpiresAt) - now) / 1000)))}.
        </AppText>
      ) : null}
      {!complete ? (
        <AppText variant="caption" tone="textMuted" style={styles.note}>
          Chặng còn lại đang ở trang sau của danh sách, kéo xuống để tải thêm.
        </AppText>
      ) : null}
      {hasSeats ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onSeats(legs)} style={styles.seats}>
          <AppText variant="smallBold" tone="primary">
            Thông tin ghế
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 16, gap: 12 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  route: { fontSize: 21, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3 },
  price: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  legs: { borderWidth: 1, borderRadius: Radius.lg },
  leg: { padding: 12, gap: 10 },
  legInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  action: { height: 44 },
  note: { paddingHorizontal: 2 },
  seats: { minHeight: 36, justifyContent: 'center' },
});
