import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AirlineBadge } from '@/components/flight/airline-badge';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useFlight } from '@/hooks/use-flight';
import { useTheme } from '@/hooks/use-theme';
import { useSearch } from '@/providers/search-provider';
import { formatDuration, formatLongDate, formatTime, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { adultPrice, fareBenefits, fareName, hasSeatsFor } from '@/utils/fares';
import { formatVnd } from '@/utils/money';
import { partySummary } from '@/utils/passengers';

export default function FlightDetailsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { criteria, outbound } = useSearch();
  const { flight, airports, error, loading, retry } = useFlight(id);

  const header = { title: 'Chi tiết chuyến bay', onBack: () => router.back() };

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

  const airport = (code: string) => airports.find((a) => a.code === code);
  const origin = airport(flight.origin);
  const destination = airport(flight.destination);
  const bookable = flight.status !== 'CANCELLED';
  const choosable = flight.fareClasses.filter((f) => hasSeatsFor(f, criteria));
  const cheapest = choosable.reduce<number | null>(
    (min, f) => (min === null || adultPrice(f) < min ? adultPrice(f) : min),
    null,
  );
  const canContinue = bookable && choosable.length > 0;

  return (
    <Screen
      header={header}
      footer={
        <View style={styles.footer}>
          <View style={styles.flex}>
            <AppText variant="caption" tone="textMuted">
              {cheapest === null ? 'Giá vé' : 'Giá từ'}
            </AppText>
            <AppText variant="h2">{cheapest === null ? '—' : formatVnd(cheapest)}</AppText>
            <AppText variant="caption" tone="textMuted">
              /người lớn, đã gồm thuế
            </AppText>
          </View>
          <Button
            label="Chọn hạng vé"
            disabled={!canContinue}
            style={styles.cta}
            onPress={() => router.push({ pathname: '/flight/[id]/fares', params: { id } })}
          />
        </View>
      }>
      <AppText variant="h1" style={styles.title}>
        Chuyến bay tới {destination?.city ?? flight.destination}
      </AppText>
      <AppText tone="textMuted" style={styles.sub}>
        từ {origin?.city ?? flight.origin}
      </AppText>
      <View style={styles.chips}>
        <Chip label={formatLongDate(vnDateOf(flight.departureAt))} icon="calendar" selected tone="dark" onPress={() => {}} />
        <Chip label={`${partySummary(criteria)} · ${criteria.tripType === 'ROUND_TRIP' ? (outbound ? 'Chặng về' : 'Chặng đi') : 'Một chiều'}`} onPress={() => {}} />
      </View>

      {flight.status === 'CANCELLED' ? (
        <View style={styles.gap}>
          <Banner tone="error">Chuyến bay này đã bị hủy nên không thể đặt vé.</Banner>
        </View>
      ) : flight.status === 'DELAYED' ? (
        <View style={styles.gap}>
          <Banner tone="warning">Chuyến bay này đang bị hoãn. Giờ bay có thể thay đổi.</Banner>
        </View>
      ) : null}

      <View style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.airline}>
          <AirlineBadge airline={flight.airline} />
          <View style={styles.flex}>
            <AppText variant="smallBold">{flight.airline.name}</AppText>
            <AppText variant="caption" tone="textMuted">
              {flight.flightNumber} · Bay thẳng
            </AppText>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
            <AppText variant="caption" tone="textSecondary" style={styles.pillText}>
              {formatDuration(flight.durationMinutes)}
            </AppText>
          </View>
        </View>

        <View style={styles.timeline}>
          <View style={styles.rail}>
            <View style={[styles.node, { borderColor: theme.primary, backgroundColor: theme.background }]} />
            <View style={[styles.stem, { backgroundColor: theme.border }]} />
            <View style={[styles.node, { borderColor: theme.primary, backgroundColor: theme.primary }]} />
          </View>
          <View style={styles.flex}>
            <Stop time={formatTime(flight.departureAt)} code={flight.origin} airport={origin} />
            <View style={styles.between} />
            <Stop time={formatTime(flight.arrivalAt)} code={flight.destination} airport={destination} />
          </View>
        </View>
      </View>

      <AppText variant="bodyBold" style={styles.section}>
        Hạng vé của chuyến bay
      </AppText>
      <View style={[styles.card, styles.fares, { borderColor: theme.border }]}>
        {flight.fareClasses.length === 0 ? (
          <AppText tone="textSecondary" style={styles.pad}>
            Chuyến bay này chưa có hạng vé nào để đặt.
          </AppText>
        ) : (
          flight.fareClasses.map((fare, i) => {
            const enough = hasSeatsFor(fare, criteria);
            const benefits = fareBenefits(fare);
            return (
              <View
                key={fare.id}
                style={[styles.fareRow, i > 0 && { borderTopWidth: 1, borderColor: theme.border }, !enough && styles.dim]}>
                <View style={styles.flex}>
                  <AppText variant="smallBold">{fareName(fare)}</AppText>
                  <AppText variant="caption" tone="textMuted">
                    {benefits.map((b) => b.text).slice(0, 2).join(' · ')}
                  </AppText>
                  {!enough ? (
                    <AppText variant="caption" tone="danger">
                      {fare.seatsAvailable === 0 ? 'Hết chỗ' : `Chỉ còn ${fare.seatsAvailable} chỗ`}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="smallBold">{formatVnd(adultPrice(fare))}</AppText>
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}

function Stop({ time, code, airport }: { time: string; code: string; airport?: Api.Airport }) {
  return (
    <View>
      <AppText style={styles.time}>{time}</AppText>
      <AppText variant="smallBold">
        {airport?.city ?? code} · {code}
      </AppText>
      {airport ? (
        <AppText variant="caption" tone="textMuted">
          Sân bay {airport.name}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  block: { marginTop: 16 },
  gap: { marginTop: 16 },
  title: { marginTop: 16, fontSize: 23, lineHeight: 29 },
  sub: { marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, marginTop: 16 },
  airline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  pillText: { fontWeight: '700' },
  timeline: { flexDirection: 'row', gap: 14, marginTop: 18 },
  rail: { alignItems: 'center', paddingTop: 8, paddingBottom: 30 },
  node: { width: 13, height: 13, borderRadius: 7, borderWidth: 2.5 },
  stem: { width: 2, flex: 1, marginVertical: 4 },
  between: { height: 26 },
  time: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  section: { marginTop: 24, marginBottom: 2 },
  fares: { padding: 0, marginTop: 10 },
  fareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dim: { opacity: 0.55 },
  pad: { padding: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cta: { width: 170 },
});
