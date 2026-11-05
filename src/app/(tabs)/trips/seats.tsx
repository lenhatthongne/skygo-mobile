import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useRemoteList } from '@/hooks/use-remote-list';
import { useTheme } from '@/hooks/use-theme';
import { getBooking } from '@/services/api/bookings';
import { formatDayMonth, formatTime, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { formatVnd } from '@/utils/money';

const TYPE_LABEL: Record<Api.PassengerType, string> = { ADT: 'Người lớn', CHD: 'Trẻ em', INF: 'Em bé' };
const LEG_LABEL: Record<Api.TripLeg, string> = { OUTBOUND: 'Chặng đi', RETURN: 'Chặng về' };

/**
 * Seat lookup by passenger and flight. `ids` is one booking id, or the two legs of a round trip
 * separated by commas. The data is the booking itself (`passengers[].seatCode`), nothing extra.
 */
export default function SeatInfoScreen() {
  const theme = useTheme();
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const list = (ids ?? '').split(',').filter(Boolean);
  const load = async (signal: AbortSignal) => {
    const bookings = await Promise.all(list.map((id) => getBooking(id, signal)));
    // Outbound first.
    return bookings.sort((a, b) => (a.leg === 'RETURN' ? 1 : 0) - (b.leg === 'RETURN' ? 1 : 0));
  };
  const { items, loading, error, reload } = useRemoteList(load);
  const header = { title: 'Thông tin ghế', onBack: () => router.back() };

  if (loading) {
    return (
      <Screen header={header}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </Screen>
    );
  }
  if (error || !items) {
    return (
      <Screen header={header}>
        <View style={styles.stack}>
          <Banner tone="error">{errorMessage(error)}</Banner>
          <Button label="Thử lại" onPress={reload} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen header={header}>
      <View style={styles.stack}>
        {items.map((booking) => {
          const { flight } = booking;
          const seated = booking.passengers.filter((p) => p.seatCode);
          const fee = booking.passengers.reduce((sum, p) => sum + (p.seatAmount ?? 0), 0);
          return (
            <View key={booking.id} style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <AppText variant="bodyBold">
                {booking.leg ? `${LEG_LABEL[booking.leg]} · ` : ''}
                {flight.origin} → {flight.destination}
              </AppText>
              <AppText variant="small" tone="textMuted">
                {formatDayMonth(vnDateOf(flight.departureAt))} · {formatTime(flight.departureAt)} · {flight.flightNumber}
                {booking.bookingCode ? ` · ${booking.bookingCode}` : ''}
              </AppText>

              {booking.passengers.map((p, i) => (
                <View key={p.id} style={[styles.row, i === 0 && styles.firstRow, { borderTopColor: theme.border }]}>
                  <View style={styles.flex}>
                    <AppText variant="smallBold">
                      {p.title} {p.fullName}
                    </AppText>
                    <AppText variant="caption" tone="textMuted">
                      {TYPE_LABEL[p.type]}
                    </AppText>
                  </View>
                  {p.type === 'INF' ? (
                    <AppText variant="small" tone="textMuted">
                      Ngồi cùng người lớn
                    </AppText>
                  ) : p.seatCode ? (
                    <View style={styles.seatCol}>
                      <View style={[styles.seat, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
                        <AppText variant="bodyBold" tone="primaryDark">
                          {p.seatCode}
                        </AppText>
                      </View>
                      <AppText variant="caption" tone="textMuted">
                        {p.seatAmount ? formatVnd(p.seatAmount) : 'Miễn phí'}
                      </AppText>
                    </View>
                  ) : (
                    <AppText variant="small" tone="textMuted">
                      Chưa chọn ghế
                    </AppText>
                  )}
                </View>
              ))}

              <AppText variant="caption" tone="textMuted">
                {seated.length > 0
                  ? `Phí ghế: ${fee > 0 ? formatVnd(fee) : 'miễn phí'}`
                  : 'Chưa có ghế nào được chọn. Hệ thống sẽ xếp chỗ khi làm thủ tục.'}
              </AppText>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 80 },
  stack: { gap: 14, paddingTop: 8 },
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 16, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1 },
  firstRow: { marginTop: 8 },
  seatCol: { alignItems: 'flex-end', gap: 2 },
  seat: { minWidth: 56, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center' },
});
