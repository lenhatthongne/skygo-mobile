import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatTime } from '@/utils/datetime';
import { formatVnd } from '@/utils/money';

import { AirlineBadge } from './airline-badge';

type FlightCardProps = {
  flight: Api.Flight;
  /** Marks the cheapest flight of the list. */
  cheapest?: boolean;
  onPress: () => void;
};

const LOW_SEATS = 5;

export function FlightCard({ flight, cheapest = false, onPress }: FlightCardProps) {
  const theme = useTheme();
  const soldOut = flight.lowestAdultFare === null;
  const seats = flight.fareClasses.reduce((max, f) => Math.max(max, f.seatsAvailable), 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${flight.airline.name} ${flight.flightNumber}, ${formatTime(flight.departureAt)} đến ${formatTime(flight.arrivalAt)}`}
      disabled={soldOut}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          opacity: soldOut ? 0.6 : pressed ? 0.9 : 1,
        },
      ]}>
      <View style={styles.top}>
        <AirlineBadge airline={flight.airline} />
        <View style={styles.flex}>
          <AppText variant="smallBold">{flight.airline.name}</AppText>
          <AppText variant="caption" tone="textMuted">
            {flight.flightNumber}
          </AppText>
        </View>
        {soldOut ? (
          <Tag text="Hết chỗ" tone="danger" />
        ) : cheapest ? (
          <Tag text="Rẻ nhất" tone="success" />
        ) : seats > 0 && seats <= LOW_SEATS ? (
          <Tag text={`Còn ${seats} chỗ`} tone="warning" />
        ) : null}
      </View>

      <View style={styles.times}>
        <View>
          <AppText style={styles.time}>{formatTime(flight.departureAt)}</AppText>
          <AppText variant="smallBold" tone="textSecondary">
            {flight.origin}
          </AppText>
        </View>
        <View style={styles.middle}>
          <AppText variant="caption" tone="textMuted">
            {formatDuration(flight.durationMinutes)}
          </AppText>
          <View style={[styles.line, { borderColor: theme.border }]}>
            <View style={[styles.dot, styles.dotStart, { borderColor: theme.primary, backgroundColor: theme.background }]} />
            <View style={[styles.dot, styles.dotEnd, { backgroundColor: theme.primary, borderColor: theme.primary }]} />
          </View>
          <AppText variant="caption" tone="textMuted">
            Bay thẳng
          </AppText>
        </View>
        <View style={styles.right}>
          <AppText style={styles.time}>{formatTime(flight.arrivalAt)}</AppText>
          <AppText variant="smallBold" tone="textSecondary">
            {flight.destination}
          </AppText>
        </View>
      </View>

      <View style={[styles.footer, { borderColor: theme.border }]}>
        <AppText variant="caption" tone="textMuted">
          {soldOut ? 'Không còn chỗ phù hợp' : `${flight.availableFareClasses.length} hạng vé`}
        </AppText>
        {soldOut ? null : (
          <AppText variant="small" tone="textSecondary">
            Từ{' '}
            <AppText style={styles.price}>{formatVnd(flight.lowestAdultFare ?? 0)}</AppText>
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

function Tag({ text, tone }: { text: string; tone: 'success' | 'warning' | 'danger' }) {
  const theme = useTheme();
  const bg = { success: theme.successSoft, warning: theme.warningSoft, danger: theme.dangerSoft }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <AppText variant="caption" tone={tone} style={styles.tagText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  time: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  middle: { flex: 1, alignItems: 'center', gap: 4 },
  right: { alignItems: 'flex-end' },
  line: { width: '100%', borderTopWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center' },
  dot: { position: 'absolute', top: -5, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  dotStart: { left: -2 },
  dotEnd: { right: -2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  price: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  tagText: { fontWeight: '700' },
});
