import { useTranslation } from 'react-i18next';
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

/** One card for the two linked bookings of a round trip; each leg keeps its own actions. */
export function TripGroupCard({
  legs,
  now,
  offline = false,
  onOpen,
  onPay,
  onTicket,
  onSeats,
}: TripGroupCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const legLabel = (leg: Api.TripLeg | null | undefined) =>
    leg === 'OUTBOUND' ? t('trips.legOut') : leg === 'RETURN' ? t('trips.legBack') : t('trips.leg');
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
            {t('trips.roundTrip')}
          </AppText>
        </View>
        <AppText variant="small" tone="textMuted">
          {legs
            .map((l) => l.bookingCode)
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      </View>

      <View style={styles.headRow}>
        <View style={styles.flex}>
          <AppText style={styles.route}>
            {first.flight.origin} ⇄ {first.flight.destination}
          </AppText>
          <AppText variant="small" tone="textMuted">
            {formatDayMonth(vnDateOf(first.flight.departureAt))}
            {complete ? ` – ${formatDayMonth(vnDateOf(last.flight.departureAt))}` : ''} ·{' '}
            {t('common.guests', { count: first.seatCount })}
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
            <View
              key={leg.id}
              style={[styles.leg, i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${legLabel(leg.leg)} ${leg.flight.origin} → ${leg.flight.destination}, ${status.label}`}
                onPress={() => onOpen(leg)}
                style={({ pressed }) => [styles.legInfo, { opacity: pressed ? 0.85 : 1 }]}>
                <AirlineBadge airline={leg.flight.airline} size={36} />
                <View style={styles.flex}>
                  <AppText variant="smallBold">
                    {legLabel(leg.leg)} · {leg.flight.origin} → {leg.flight.destination}
                  </AppText>
                  <AppText variant="caption" tone="textMuted">
                    {formatDayMonth(vnDateOf(leg.flight.departureAt))} ·{' '}
                    {formatTime(leg.flight.departureAt)} · {leg.flight.flightNumber}
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
                  label={
                    leg.status === 'PAYMENT_FAILED'
                      ? t('trips.card.retryShort')
                      : t('trips.card.pay')
                  }
                  size="sm"
                  onPress={() => onPay(leg)}
                  style={styles.action}
                />
              ) : canTicket ? (
                <Button
                  label={t('trips.card.viewTicket')}
                  variant="outline"
                  size="sm"
                  onPress={() => onTicket(leg)}
                  style={styles.action}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {paid.length > 0 && payable.length > 0 ? (
        <AppText variant="small" tone="warning" style={styles.note}>
          {t('trips.card.groupNote', {
            paid: paid.map((l) => legLabel(l.leg)).join(', '),
            payable: payable.map((l) => legLabel(l.leg).toLowerCase()).join(', '),
            time: clock(
              Math.max(0, Math.ceil((Date.parse(payable[0].holdExpiresAt) - now) / 1000)),
            ),
          })}
        </AppText>
      ) : null}
      {!complete ? (
        <AppText variant="caption" tone="textMuted" style={styles.note}>
          {t('trips.card.moreOnNextPage')}
        </AppText>
      ) : null}
      {hasSeats ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onSeats(legs)}
          style={styles.seats}>
          <AppText variant="smallBold" tone="primary">
            {t('trips.card.seatInfo')}
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
  action: { minWidth: 124 },
  note: { paddingHorizontal: 2 },
  seats: { minHeight: 36, justifyContent: 'center' },
});
