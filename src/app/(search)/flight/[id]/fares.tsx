import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AirlineBadge } from '@/components/flight/airline-badge';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useFareQuotes } from '@/hooks/use-fare-quotes';
import { useFlight } from '@/hooks/use-flight';
import { useTheme } from '@/hooks/use-theme';
import { useSearch } from '@/providers/search-provider';
import { FareHighlights } from '@/components/booking/fare-highlights';
import { useSession } from '@/providers/session-provider';
import { formatDuration, formatLongDate, formatTime, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { adultPrice, fareName, hasSeatsFor } from '@/utils/fares';
import { formatVnd } from '@/utils/money';
import { seatCount, totalPassengers } from '@/utils/passengers';

const TYPE_LABEL: Record<Api.PassengerType, string> = {
  ADT: 'Người lớn',
  CHD: 'Trẻ em',
  INF: 'Em bé',
};

export default function FareClassScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { criteria, outbound, setOutbound } = useSearch();
  const { status } = useSession();
  const { flight, loading, error, retry } = useFlight(id);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Which leg this screen belongs to is fixed when it opens: an outbound fare screen that comes
  // back into view (after leaving the return results) means the outbound is not chosen any more.
  const [isOutboundScreen] = useState(() => !outbound);
  useFocusEffect(
    useCallback(() => {
      if (isOutboundScreen) setOutbound(null);
    }, [isOutboundScreen, setOutbound]),
  );
  const [needLogin, setNeedLogin] = useState(false);

  const party = { adults: criteria.adults, children: criteria.children, infants: criteria.infants };
  const fares = flight?.fareClasses ?? [];
  const available = fares.filter((f) => hasSeatsFor(f, criteria));
  const quotes = useFareQuotes(available, party);

  // Default to the cheapest fare that still has enough seats until the user picks another.
  const cheapest = [...available].sort((a, b) => adultPrice(a) - adultPrice(b))[0];
  const effectiveId =
    selectedId !== null && available.some((f) => f.id === selectedId) ? selectedId : (cheapest?.id ?? null);
  const quote = effectiveId !== null ? quotes.quotes[effectiveId] : undefined;

  const header = { title: 'Chọn hạng vé', onBack: () => router.back() };

  if (loading) {
    return (
      <Screen header={header}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </Screen>
    );
  }
  if (error || !flight) {
    return (
      <Screen header={header}>
        <View style={styles.block}>
          <Banner tone="error">{errorMessage(error)}</Banner>
          <View style={styles.gap}>
            <Button label="Thử lại" onPress={retry} />
          </View>
        </View>
      </Screen>
    );
  }

  function proceed() {
    if (effectiveId === null || !quote) return;
    if (status !== 'signedIn') {
      setNeedLogin(true);
      return;
    }
    const party3 = {
      adults: String(party.adults),
      children: String(party.children),
      infants: String(party.infants),
    };
    if (criteria.tripType === 'ROUND_TRIP' && !outbound) {
      // Outbound chosen: now pick the return flight on the reverse route.
      setOutbound({ flightId: id, fareClassId: effectiveId });
      router.push('/search/results');
      return;
    }
    router.push({
      pathname: '/booking/passengers',
      params: outbound
        ? {
            flightId: outbound.flightId,
            fareClassId: String(outbound.fareClassId),
            returnFlightId: id,
            returnFareClassId: String(effectiveId),
            ...party3,
          }
        : { flightId: id, fareClassId: String(effectiveId), ...party3 },
    });
  }

  const noSeats = available.length === 0;

  return (
    <Screen
      header={header}
      footer={
        needLogin ? (
          <>
            <Banner tone="info">Bạn cần đăng nhập để giữ chỗ và đặt vé.</Banner>
            <Button label="Đăng nhập" onPress={() => router.push('/login')} />
            <Button label="Để sau" variant="ghost" onPress={() => setNeedLogin(false)} />
          </>
        ) : (
          <View style={styles.footer}>
            <View style={styles.flex}>
              <AppText variant="caption" tone="textMuted">
                Tổng cho {totalPassengers(party)} khách
              </AppText>
              <AppText variant="h2">{quote ? formatVnd(quote.total) : '—'}</AppText>
              <AppText variant="caption" tone="textMuted">
                Đã gồm thuế và phí
              </AppText>
            </View>
            <Button
              label="Tiếp tục"
              disabled={!quote || noSeats}
              loading={quotes.loading && !quote}
              style={styles.cta}
              onPress={proceed}
            />
          </View>
        )
      }>
      <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
        <AirlineBadge airline={flight.airline} size={36} />
        <View style={styles.flex}>
          <AppText variant="smallBold">
            {flight.airline.name} · {flight.flightNumber}
          </AppText>
          <AppText variant="caption" tone="textMuted">
            {formatLongDate(vnDateOf(flight.departureAt))}
          </AppText>
        </View>
        <View style={styles.route}>
          <AppText variant="smallBold">
            {formatTime(flight.departureAt)} → {formatTime(flight.arrivalAt)}
          </AppText>
          <AppText variant="caption" tone="textMuted">
            {flight.origin} · {formatDuration(flight.durationMinutes)} · {flight.destination}
          </AppText>
        </View>
      </View>

      {noSeats ? (
        <View style={styles.gap}>
          <Banner tone="warning">
            Không hạng vé nào còn đủ {seatCount(party)} chỗ cho nhóm của bạn. Hãy giảm số hành khách hoặc chọn chuyến khác.
          </Banner>
        </View>
      ) : null}
      {quotes.error ? (
        <View style={styles.gap}>
          <Banner tone="error">{errorMessage(quotes.error)}</Banner>
          <View style={styles.gapSmall}>
            <Button label="Thử lại" variant="outline" onPress={quotes.retry} />
          </View>
        </View>
      ) : null}

      <View style={styles.list}>
        {fares.map((fare) => {
          const enough = hasSeatsFor(fare, criteria);
          const selected = fare.id === effectiveId;
          const q = quotes.quotes[fare.id];
          return (
            <Pressable
              key={fare.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !enough }}
              accessibilityLabel={`${fareName(fare)}, ${q ? formatVnd(q.total) : formatVnd(adultPrice(fare))}`}
              disabled={!enough}
              onPress={() => setSelectedId(fare.id)}
              style={[
                styles.fare,
                {
                  borderColor: selected ? theme.primary : theme.border,
                  borderWidth: selected ? 2 : 1.5,
                  backgroundColor: theme.background,
                  opacity: enough ? 1 : 0.55,
                },
              ]}>
              <View style={styles.fareTop}>
                <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border }]}>
                  {selected ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyBold">{fareName(fare)}</AppText>
                  <AppText variant="caption" tone="textMuted">
                    {formatVnd(adultPrice(fare))}/người lớn
                  </AppText>
                </View>
                <View style={styles.right}>
                  {q ? (
                    <AppText variant="h2" tone={selected ? 'primaryDark' : 'text'}>
                      {formatVnd(q.total)}
                    </AppText>
                  ) : enough ? (
                    <View style={[styles.skeleton, { backgroundColor: theme.backgroundSelected }]} />
                  ) : null}
                  {!enough ? (
                    <AppText variant="caption" tone="danger" style={styles.tag}>
                      {fare.seatsAvailable === 0 ? 'Hết chỗ' : `Còn ${fare.seatsAvailable} chỗ, không đủ`}
                    </AppText>
                  ) : fare.seatsAvailable <= 5 ? (
                    <AppText variant="caption" tone="warning" style={styles.tag}>
                      Còn {fare.seatsAvailable} chỗ
                    </AppText>
                  ) : null}
                </View>
              </View>
              <View style={styles.benefits}>
                <FareHighlights fare={fare} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {quote ? (
        <View style={[styles.breakdown, { borderColor: theme.border }]}>
          <AppText variant="bodyBold" style={styles.breakdownTitle}>
            Chi tiết giá
          </AppText>
          {quote.lines.map((line) => (
            <Row key={line.type} label={`${TYPE_LABEL[line.type]} × ${line.count}`} value={formatVnd(line.fare)} />
          ))}
          <Row label="Thuế và phí" value={formatVnd(quote.totalTax)} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Row label="Tổng cộng" value={formatVnd(quote.total)} strong />
        </View>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText variant={strong ? 'bodyBold' : 'small'} tone={strong ? 'text' : 'textSecondary'}>
        {label}
      </AppText>
      <AppText variant={strong ? 'bodyBold' : 'smallBold'}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  block: { marginTop: 16 },
  gap: { marginTop: 16 },
  gapSmall: { marginTop: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.lg, padding: 14, marginTop: 8 },
  route: { alignItems: 'flex-end' },
  list: { gap: 12, marginTop: 16 },
  fare: { borderRadius: Radius.lg, padding: 16 },
  fareTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  right: { alignItems: 'flex-end' },
  tag: { marginTop: 2, fontWeight: '700' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  skeleton: { width: 90, height: 20, borderRadius: 6 },
  benefits: { marginTop: 12, gap: 6 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdown: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, marginTop: 16 },
  breakdownTitle: { marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  divider: { height: 1, marginVertical: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cta: { width: 150 },
});
