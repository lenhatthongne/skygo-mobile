import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useBooking } from '@/hooks/use-booking';
import { useNow } from '@/hooks/use-now';
import { useSeatMap } from '@/hooks/use-seat-map';
import { useTheme } from '@/hooks/use-theme';
import { changeSeats } from '@/services/api/bookings';
import { errorMessage } from '@/utils/error-messages';
import { SEAT_CHANGE_CLOSES_HOURS } from '@/utils/trips';

const SEAT_W = 44;
const SEAT_H = 46;

const STATE_KEY = {
  free: 'seatChange.stateFree',
  taken: 'seatChange.stateTaken',
  held: 'seatChange.stateHeld',
  current: 'seatChange.stateCurrent',
  new: 'seatChange.stateNew',
  other: 'seatChange.stateOther',
} as const;

const shortName = (fullName: string) => fullName.trim().split(/\s+/).pop() ?? fullName;

/**
 * Business fare: move passengers to other free Business seats after booking. A seat is not
 * selectable when it is taken, or held for up to 15 minutes by someone who has not paid yet; the
 * server checks it again when the change is sent.
 */
export default function ChangeSeatScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { booking, loading, error, reload } = useBooking(id);
  const now = useNow(false);
  const seatMap = useSeatMap(booking?.flight.flightId ?? 0, !!booking);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; from: string | null; to: string }[] | null>(
    null,
  );

  const header = { title: t('seatChange.title'), onBack: () => router.back(), close: true };

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
          <Button label={t('seatChange.retry')} variant="outline" onPress={reload} />
        </View>
      </Screen>
    );
  }

  const eligible = booking.passengers.filter((p) => p.type !== 'INF');
  const active = eligible.find((p) => p.id === activeId) ?? eligible[0];
  const cabin = seatMap.map?.cabins.find((c) => c.cabin === 'BUSINESS');
  const isBusiness = booking.fareClass.classCode === 'BUSINESS';
  const closed = Date.parse(booking.flight.departureAt) - now < SEAT_CHANGE_CLOSES_HOURS * 3600_000;
  const bookingId = booking.id;

  // Seats this booking holds now, by passenger, and the seats being picked.
  const ownerOfCurrent = (code: string) => booking.passengers.find((p) => p.seatCode === code);
  const pickerOf = (code: string) =>
    Object.entries(picked).find(([, seat]) => seat === code)?.[0] ?? null;

  const changes = eligible
    .filter((p) => picked[p.id] && picked[p.id] !== p.seatCode)
    .map((p) => ({ passenger: p, from: p.seatCode ?? null, to: picked[p.id] }));

  type SeatState = 'free' | 'taken' | 'held' | 'current' | 'new' | 'other';
  function stateOf(seat: Api.Seat): SeatState {
    if (!active) return 'taken';
    if (picked[active.id] === seat.code) return 'new';
    const pickedBy = pickerOf(seat.code);
    if (pickedBy && Number(pickedBy) !== active.id) return 'other';
    const holder = ownerOfCurrent(seat.code);
    if (holder) {
      if (holder.id === active.id) return 'current';
      // Another passenger of this booking sits there, unless they are moving away from it.
      const moved = picked[holder.id] && picked[holder.id] !== seat.code;
      return moved ? 'free' : 'other';
    }
    if (!seat.available) return seat.held ? 'held' : 'taken';
    return 'free';
  }

  function tap(seat: Api.Seat) {
    if (!active) return;
    const state = stateOf(seat);
    if (state === 'free') setPicked((p) => ({ ...p, [active.id]: seat.code }));
    else if (state === 'new' || state === 'current') {
      setPicked((p) => {
        const next = { ...p };
        delete next[active.id];
        return next;
      });
    }
  }

  async function send() {
    setSending(true);
    setMessage(null);
    try {
      await changeSeats(bookingId, {
        seats: changes.map((c) => ({ passengerId: c.passenger.id, seatCode: c.to })),
      });
      setDone(
        changes.map((c) => ({ name: shortName(c.passenger.fullName), from: c.from, to: c.to })),
      );
    } catch (e) {
      setMessage(errorMessage(e));
      // Someone may have taken the seat in the meantime: show the map as it is now.
      setPicked({});
      seatMap.retry();
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  if (done) {
    return (
      <Screen
        header={header}
        footer={<Button label={t('seatChange.done')} onPress={() => router.back()} />}>
        <View style={styles.doneBox}>
          <View style={[styles.doneIcon, { backgroundColor: theme.successSoft }]}>
            <Feather name="check" size={34} color={theme.success} />
          </View>
          <AppText variant="h2" style={styles.center}>
            {t('seatChange.doneTitle')}
          </AppText>
          <AppText tone="textSecondary" style={styles.center}>
            {t('seatChange.doneText')}
          </AppText>
          {done.map((d) => (
            <AppText key={d.name + d.to} variant="bodyBold">
              {d.name}: {d.from ?? '–'} → {d.to}
            </AppText>
          ))}
        </View>
      </Screen>
    );
  }

  const summary =
    changes.length === 1
      ? ` · ${shortName(changes[0].passenger.fullName)}: ${changes[0].from ?? '–'} → ${changes[0].to}`
      : changes.length > 1
        ? ` · ${changes.length}`
        : '';

  const gapAfter = cabin ? Math.floor(cabin.columns.length / 2) - 1 : -1;

  return (
    <>
      <Screen
        header={header}
        footer={
          isBusiness && !closed ? (
            <Button
              label={`${t('seatChange.confirm')}${summary}`}
              disabled={changes.length === 0}
              loading={sending}
              onPress={() => setConfirming(true)}
            />
          ) : undefined
        }>
        <View style={styles.stack}>
          {!isBusiness ? (
            <Banner tone="info">{t('errors.seatChangeNotAllowed')}</Banner>
          ) : closed ? (
            <Banner tone="info">{t('errors.seatChangeClosed')}</Banner>
          ) : (
            <Banner tone="primary" icon="info">
              {t('seatChange.perk')}
            </Banner>
          )}
          {message ? <Banner tone="error">{message}</Banner> : null}

          {isBusiness && !closed ? (
            <>
              <View style={styles.chips}>
                {eligible.map((p) => {
                  const shown = picked[p.id] ?? p.seatCode;
                  return (
                    <Chip
                      key={p.id}
                      label={`${shortName(p.fullName)}${shown ? ` · ${shown}` : ''}`}
                      selected={active?.id === p.id}
                      onPress={() => setActiveId(p.id)}
                    />
                  );
                })}
              </View>

              {seatMap.loading ? (
                <ActivityIndicator style={styles.loader} color={theme.primary} />
              ) : seatMap.error || !cabin ? (
                <View style={styles.stack}>
                  <Banner tone="error">{errorMessage(seatMap.error)}</Banner>
                  <Button label={t('seatChange.retry')} variant="outline" onPress={seatMap.retry} />
                </View>
              ) : (
                <View style={styles.map}>
                  <View style={styles.legend}>
                    <Legend
                      text={t('seatChange.legendFree')}
                      bg={theme.background}
                      border={theme.border}
                    />
                    <Legend
                      text={t('seatChange.legendNew')}
                      bg={theme.primary}
                      border={theme.primary}
                    />
                    <Legend
                      text={t('seatChange.legendCurrent')}
                      bg={theme.background}
                      border={theme.textSecondary}
                      thick
                    />
                    <Legend
                      text={t('seatChange.legendTaken')}
                      bg={theme.backgroundSelected}
                      border={theme.backgroundSelected}
                    />
                    <Legend
                      text={t('seatChange.legendHeld')}
                      bg={theme.warningSoft}
                      border={theme.warning}
                      dashed
                    />
                  </View>

                  <View style={styles.head}>
                    {cabin.columns.map((c, i) => (
                      <View key={c} style={[styles.headCell, i === gapAfter && styles.aisle]}>
                        <AppText variant="caption" tone="textMuted" style={styles.center}>
                          {c}
                        </AppText>
                      </View>
                    ))}
                  </View>
                  {cabin.rows.map((row) => (
                    <View key={row.row} style={styles.seatRow}>
                      {row.seats.map((seat, i) => {
                        const state = stateOf(seat);
                        const blocked = state === 'taken' || state === 'held' || state === 'other';
                        const bg =
                          state === 'new'
                            ? theme.primary
                            : state === 'taken'
                              ? theme.backgroundSelected
                              : state === 'held'
                                ? theme.warningSoft
                                : state === 'other'
                                  ? theme.primarySoft
                                  : theme.background;
                        const border =
                          state === 'new'
                            ? theme.primary
                            : state === 'taken'
                              ? theme.backgroundSelected
                              : state === 'held'
                                ? theme.warning
                                : state === 'other'
                                  ? theme.primary
                                  : state === 'current'
                                    ? theme.textSecondary
                                    : theme.border;
                        return (
                          <Pressable
                            key={seat.code}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: blocked, selected: state === 'new' }}
                            accessibilityLabel={t('seatChange.seatA11y', {
                              code: seat.code,
                              state: t(STATE_KEY[state]),
                            })}
                            disabled={blocked}
                            onPress={() => tap(seat)}
                            style={[
                              styles.seat,
                              i === gapAfter && styles.aisle,
                              {
                                backgroundColor: bg,
                                borderColor: border,
                                borderWidth: state === 'current' ? 2 : 1,
                                borderStyle: state === 'held' ? 'dashed' : 'solid',
                              },
                            ]}>
                            <AppText
                              variant="caption"
                              style={{
                                color:
                                  state === 'new'
                                    ? theme.onPrimary
                                    : state === 'held'
                                      ? theme.warning
                                      : state === 'taken'
                                        ? theme.textMuted
                                        : theme.text,
                                fontWeight: '700',
                              }}>
                              {state === 'taken' ? '×' : seat.code}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                  <Banner tone="warning" icon="clock">
                    {t('seatChange.heldNote')}
                  </Banner>
                  {changes.length === 0 ? (
                    <AppText variant="caption" tone="textMuted" style={styles.center}>
                      {t('seatChange.pickHint')}
                    </AppText>
                  ) : null}
                </View>
              )}
            </>
          ) : null}
        </View>
      </Screen>

      <ConfirmDialog
        visible={confirming}
        loading={sending}
        title={t('seatChange.confirmTitle')}
        message={`${t('seatChange.confirmMessage')}\n${changes
          .map((c) => `${shortName(c.passenger.fullName)}: ${c.from ?? '–'} → ${c.to}`)
          .join('\n')}`}
        confirmLabel={t('seatChange.confirmAction')}
        onConfirm={() => void send()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function Legend({
  text,
  bg,
  border,
  thick = false,
  dashed = false,
}: {
  text: string;
  bg: string;
  border: string;
  thick?: boolean;
  dashed?: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          {
            backgroundColor: bg,
            borderColor: border,
            borderWidth: thick ? 2 : 1,
            borderStyle: dashed ? 'dashed' : 'solid',
          },
        ]}
      />
      <AppText variant="caption" tone="textMuted">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14, paddingTop: 4 },
  loader: { marginTop: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  map: { gap: 8, alignItems: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 4 },
  head: { flexDirection: 'row', gap: 8, marginTop: 6 },
  headCell: { width: SEAT_W, alignItems: 'center' },
  seatRow: { flexDirection: 'row', gap: 8 },
  seat: {
    width: SEAT_W,
    height: SEAT_H,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aisle: { marginRight: 22 },
  center: { textAlign: 'center' },
  doneBox: { alignItems: 'center', gap: 10, paddingTop: 60 },
  doneIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
});
