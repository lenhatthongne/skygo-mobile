import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Radius } from '@/constants/theme';
import { useSeatMap } from '@/hooks/use-seat-map';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/utils/error-messages';
import { formatVnd } from '@/utils/money';

export type SeatLegInfo = {
  leg: Api.TripLeg;
  title: string;
  flightId: number;
  /** Seats of the other cabin are not shown: a fare class only sits in its own cabin. */
  cabin: 'BUSINESS' | 'ECONOMY';
  /** False when the seat map of this flight could not be shown, so a seat cannot be demanded. */
  required: boolean;
};

export type SeatPassenger = {
  ref: string;
  label: string;
  name: string;
  seats: Record<Api.TripLeg, string | null>;
};

type SeatStepProps = {
  legs: SeatLegInfo[];
  passengers: SeatPassenger[];
  /** The customer already pressed continue once: missing seats are shown as errors. */
  attempted: boolean;
  onChange: (leg: Api.TripLeg, ref: string, code: string | null) => void;
  onUnavailable: (leg: Api.TripLeg) => void;
};

const KIND_LABEL: Record<Api.SeatKind, string> = {
  BUSINESS: 'Thương gia',
  FRONT: 'Hàng đầu',
  EXIT: 'Cửa thoát hiểm',
  STANDARD: 'Tiêu chuẩn',
};

const SEAT_W = 44;
const SEAT_H = 46;

/**
 * Seat selection right on the step: pick the passenger, tap a seat on the map and the next
 * passenger without a seat is selected automatically. The server decides prices and availability;
 * this only picks codes.
 */
export function SeatStep({ legs, passengers, attempted, onChange, onUnavailable }: SeatStepProps) {
  const theme = useTheme();
  const [legId, setLegId] = useState(legs[0].leg);
  const [chosenRef, setChosenRef] = useState<string | null>(null);
  const info = legs.find((l) => l.leg === legId) ?? legs[0];
  const leg = info.leg;

  const missing = passengers.filter((p) => !p.seats[leg]);
  const activeRef =
    passengers.find((p) => p.ref === chosenRef)?.ref ?? missing[0]?.ref ?? passengers[0]?.ref ?? null;
  const active = passengers.find((p) => p.ref === activeRef);
  const done = (l: Api.TripLeg) => passengers.every((p) => p.seats[l]);

  function pick(code: string | null) {
    if (!activeRef) return;
    onChange(leg, activeRef, code);
    if (code) {
      const next = passengers.find((p) => p.ref !== activeRef && !p.seats[leg]);
      if (next) setChosenRef(next.ref);
    }
  }

  return (
    <View style={styles.root}>
      {legs.length > 1 ? (
        <View style={styles.row}>
          {legs.map((l) => (
            <Chip
              key={l.leg}
              tone="dark"
              icon={done(l.leg) ? 'check' : undefined}
              label={l.leg === 'OUTBOUND' ? 'Chặng đi' : 'Chặng về'}
              selected={l.leg === leg}
              onPress={() => {
                setLegId(l.leg);
                setChosenRef(null);
              }}
            />
          ))}
        </View>
      ) : null}
      {legs.length > 1 ? (
        <AppText variant="smallBold" tone="primaryDark">
          {info.title}
        </AppText>
      ) : null}

      <View style={styles.row}>
        {passengers.map((p) => (
          <Chip
            key={p.ref}
            tone="dark"
            label={`${p.label}${p.seats[leg] ? ` · ${p.seats[leg]}` : ''}`}
            selected={p.ref === activeRef}
            onPress={() => setChosenRef(p.ref)}
          />
        ))}
      </View>

      {active ? (
        <View style={[styles.summary, { backgroundColor: theme.primarySoft }]}>
          <Feather name="user" size={18} color={theme.primaryDark} />
          <View style={styles.flex}>
            <AppText variant="smallBold" numberOfLines={1}>
              {active.label} · {active.name}
            </AppText>
            <AppText variant="small" tone="textSecondary">
              Đang chọn ghế cho hành khách này
            </AppText>
          </View>
        </View>
      ) : null}

      {attempted && info.required && missing.length > 0 ? (
        <AppText variant="small" tone="danger">
          Còn {missing.length} hành khách chưa chọn ghế
          {legs.length > 1 ? ` ở ${leg === 'OUTBOUND' ? 'chặng đi' : 'chặng về'}` : ''}.
        </AppText>
      ) : null}

      <SeatGrid
        key={leg}
        flightId={info.flightId}
        cabin={info.cabin}
        passengers={passengers}
        leg={leg}
        activeRef={activeRef}
        onPick={pick}
        onUnavailable={() => onUnavailable(leg)}
      />
    </View>
  );
}

type SeatGridProps = {
  flightId: number;
  cabin: 'BUSINESS' | 'ECONOMY';
  passengers: SeatPassenger[];
  leg: Api.TripLeg;
  activeRef: string | null;
  onPick: (code: string | null) => void;
  onUnavailable: () => void;
};

function SeatGrid({ flightId, cabin, passengers, leg, activeRef, onPick, onUnavailable }: SeatGridProps) {
  const theme = useTheme();
  const { map, error, loading, retry } = useSeatMap(flightId, true);
  const layout = map?.cabins.find((c) => c.cabin === cabin);
  const unavailable = !loading && (!!error || !layout);
  useEffect(() => {
    if (unavailable) onUnavailable();
  }, [unavailable, onUnavailable]);

  if (loading) return <ActivityIndicator style={styles.loader} color={theme.primary} />;
  if (error || !layout) {
    return (
      <View style={styles.errorBox}>
        <Banner tone={error ? 'error' : 'info'}>
          {error
            ? errorMessage(error)
            : 'Chuyến bay này chưa có sơ đồ ghế cho hạng vé đã chọn. Ghế sẽ được xếp khi làm thủ tục.'}
        </Banner>
        {error ? <Button label="Thử lại" variant="outline" onPress={retry} /> : null}
      </View>
    );
  }

  const owner = (code: string) => passengers.find((p) => p.seats[leg] === code);
  const gapAfter = Math.floor(layout.columns.length / 2);

  function tap(seat: Api.Seat) {
    if (!activeRef || !seat.available) return;
    const holder = owner(seat.code);
    if (holder && holder.ref !== activeRef) return; // chosen for someone else in this booking
    onPick(holder ? null : seat.code);
  }

  return (
    <View style={styles.map}>
      <View style={styles.legend}>
        <Legend color={theme.background} border={theme.border} text="Trống" />
        <Legend color={theme.primary} border={theme.primary} text="Đã chọn" />
        <Legend color={theme.backgroundSelected} border={theme.backgroundSelected} text="Đã có người" />
      </View>

      <View style={styles.head}>
        {layout.columns.map((c, i) => (
          <View key={c} style={[styles.headCell, i === gapAfter && styles.aisle]}>
            <AppText variant="caption" tone="textMuted" style={styles.center}>
              {c}
            </AppText>
          </View>
        ))}
      </View>
      {layout.rows.map((row) => (
        <View key={row.row} style={styles.seatRow}>
          {row.seats.map((seat, i) => {
            const holder = owner(seat.code);
            const mine = holder?.ref === activeRef;
            const other = !!holder && !mine;
            const taken = !seat.available;
            const bg = taken
              ? theme.backgroundSelected
              : mine
                ? theme.primary
                : other
                  ? theme.primarySoft
                  : theme.background;
            const border = taken
              ? theme.backgroundSelected
              : mine || other
                ? theme.primary
                : seat.price > 0
                  ? theme.warning
                  : theme.border;
            return (
              <Pressable
                key={seat.code}
                accessibilityRole="button"
                accessibilityState={{ disabled: taken || other, selected: mine }}
                accessibilityLabel={`Ghế ${seat.code}, ${KIND_LABEL[seat.kind]}, ${seat.price > 0 ? formatVnd(seat.price) : 'miễn phí'}${taken ? ', đã có người' : ''}`}
                disabled={taken || other}
                onPress={() => tap(seat)}
                style={[styles.seat, i === gapAfter && styles.aisle, { backgroundColor: bg, borderColor: border }]}>
                <AppText
                  variant="caption"
                  style={{ color: mine ? theme.onPrimary : taken ? theme.textMuted : theme.text, fontWeight: '700' }}>
                  {taken ? '×' : seat.column}
                </AppText>
              </Pressable>
            );
          })}
          <AppText variant="caption" tone="textMuted" style={styles.rowNo}>
            {row.row}
          </AppText>
        </View>
      ))}
      <AppText variant="caption" tone="textMuted" style={styles.note}>
        Viền cam là ghế có phí ({chosenFees(passengers, layout, leg)}). Giá cuối cùng do SkyGo tính khi giữ chỗ.
      </AppText>
    </View>
  );
}

/** "Khách 1: 12A 120.000 ₫" for the seats already chosen on this leg. */
function chosenFees(passengers: SeatPassenger[], layout: Api.SeatCabin, leg: Api.TripLeg) {
  const seats = layout.rows.flatMap((r) => r.seats);
  const parts = passengers.flatMap((p) => {
    const seat = seats.find((s) => s.code === p.seats[leg]);
    return seat ? [`${seat.code} ${seat.price > 0 ? formatVnd(seat.price) : 'miễn phí'}`] : [];
  });
  return parts.length > 0 ? `đã chọn: ${parts.join(', ')}` : 'chọn ghế để xem phí';
}

function Legend({ color, border, text }: { color: string; border: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: border }]} />
      <AppText variant="caption" tone="textSecondary">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12, paddingTop: 8 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.lg, padding: 12 },
  loader: { marginTop: 40 },
  errorBox: { gap: 12 },
  map: { alignItems: 'center', gap: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 16, height: 16, borderRadius: 5, borderWidth: 1.5 },
  head: { flexDirection: 'row', gap: 6, paddingRight: 30 },
  headCell: { width: SEAT_W },
  center: { textAlign: 'center' },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seat: {
    width: SEAT_W,
    height: SEAT_H,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aisle: { marginLeft: 18 },
  rowNo: { width: 24, textAlign: 'right' },
  note: { marginTop: 8, textAlign: 'center' },
});
