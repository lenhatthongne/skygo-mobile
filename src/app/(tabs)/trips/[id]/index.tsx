import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AirlineBadge } from '@/components/flight/airline-badge';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { FareHighlights } from '@/components/booking/fare-highlights';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useBooking } from '@/hooks/use-booking';
import { useNow } from '@/hooks/use-now';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatLongDate, formatTime, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { fareName } from '@/utils/fares';
import { formatVnd } from '@/utils/money';
import { BOOKING_STATUS, canChangeSeats } from '@/utils/trips';

const initials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return (
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  ).toUpperCase();
};

export default function BookingDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { booking, loading, error, reload, refresh, refreshing } = useBooking(id);
  const [copied, setCopied] = useState(false);
  const now = useNow(false);

  // Coming back from paying or cancelling: refresh the status shown here.
  useRefreshOnFocus(reload);

  const header = { title: t('tripDetail.title'), onBack: () => router.back() };

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
        <View style={styles.errorBox}>
          <Banner tone="error">{errorMessage(error)}</Banner>
          <Button label={t('tripDetail.retry')} onPress={reload} />
        </View>
      </Screen>
    );
  }

  const { flight, fareClass } = booking;
  const status = BOOKING_STATUS[booking.status];
  const toneColor = theme[status.tone];
  const toneSoft = {
    warning: theme.warningSoft,
    danger: theme.dangerSoft,
    success: theme.successSoft,
    purple: theme.purpleSoft,
    textMuted: theme.backgroundElement,
  }[status.tone];
  const unpaid = booking.status === 'PENDING_PAYMENT' || booking.status === 'PAYMENT_FAILED';
  const hasTicket = booking.status === 'CONFIRMED' || booking.status === 'CANCEL_REQUESTED';
  const holdOpen = Date.parse(booking.holdExpiresAt) > now;
  const hoursLeft = (Date.parse(flight.departureAt) - now) / 3600000;
  const canCancel = booking.status === 'CONFIRMED' && fareClass.refundable && hoursLeft >= 24;
  const canSwap = canChangeSeats(booking, now);

  async function copyCode() {
    if (!booking?.bookingCode) return;
    await Clipboard.setStringAsync(booking.bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const footer = hasTicket ? (
    <>
      <Button
        label={t('tripDetail.viewTicket')}
        onPress={() =>
          router.push({
            pathname: '/trips/[id]/ticket',
            params: { id: booking.id },
          })
        }
      />
      {canCancel ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/trips/[id]/cancel',
              params: { id: booking.id },
            })
          }
          style={styles.cancel}>
          <AppText variant="bodyBold" tone="danger">
            {t('tripDetail.cancelRequest')}
          </AppText>
        </Pressable>
      ) : null}
    </>
  ) : unpaid && holdOpen ? (
    <Button
      label={booking.status === 'PAYMENT_FAILED' ? t('tripDetail.payAgain') : t('tripDetail.pay')}
      onPress={() =>
        router.push({
          pathname: '/booking/payment',
          params: { bookingId: booking.id },
        })
      }
    />
  ) : undefined;

  return (
    <Screen header={header} footer={footer} refresh={{ refreshing, onRefresh: refresh }}>
      <View style={styles.stack}>
        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.codeRow}>
            <View style={styles.flex}>
              <AppText variant="small" tone="textMuted">
                {t('tripDetail.bookingCode')}
              </AppText>
              <View style={styles.codeLine}>
                <AppText style={styles.code}>
                  {booking.bookingCode ?? t('tripDetail.noCode')}
                </AppText>
                {booking.bookingCode ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('tripDetail.copyCode')}
                    hitSlop={10}
                    onPress={() => void copyCode()}>
                    <Feather
                      name={copied ? 'check' : 'copy'}
                      size={20}
                      color={copied ? theme.success : theme.textMuted}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={[styles.pill, { backgroundColor: toneSoft }]}>
              <View style={[styles.dot, { backgroundColor: toneColor }]} />
              <AppText variant="label" style={{ color: toneColor }}>
                {status.label}
              </AppText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.airline}>
            <AirlineBadge airline={flight.airline} size={48} />
            <View style={styles.flex}>
              <AppText variant="bodyBold">
                {flight.airline.name} · {flight.flightNumber}
              </AppText>
              <AppText variant="small" tone="textMuted">
                {formatLongDate(vnDateOf(flight.departureAt))}
              </AppText>
            </View>
          </View>

          <View style={styles.times}>
            <View>
              <AppText style={styles.time}>{formatTime(flight.departureAt)}</AppText>
              <AppText variant="bodyBold" tone="textSecondary">
                {flight.origin}
              </AppText>
            </View>
            <View style={styles.middle}>
              <AppText variant="caption" tone="textMuted">
                {formatDuration(flight.durationMinutes)}
              </AppText>
              <View style={[styles.line, { borderColor: theme.border }]} />
              <AppText variant="caption" tone="textMuted">
                {t('tripDetail.direct')}
              </AppText>
            </View>
            <View style={styles.right}>
              <AppText style={styles.time}>{formatTime(flight.arrivalAt)}</AppText>
              <AppText variant="bodyBold" tone="textSecondary">
                {flight.destination}
              </AppText>
            </View>
          </View>
        </View>

        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <AppText variant="bodyBold" style={styles.benefitsTitle}>
            {t('tripDetail.benefits', { name: fareName(fareClass) })}
          </AppText>
          <FareHighlights fare={fareClass} />
        </View>

        <View
          style={[
            styles.card,
            styles.list,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}>
          {booking.passengers.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <View style={[styles.rule, { backgroundColor: theme.border }]} /> : null}
              <View style={styles.passenger}>
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: i % 2 ? theme.warningSoft : theme.primarySoft,
                    },
                  ]}>
                  <AppText variant="bodyBold" tone={i % 2 ? 'warning' : 'primaryDark'}>
                    {initials(p.fullName)}
                  </AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyBold">
                    {p.title} {p.fullName}
                  </AppText>
                  <AppText variant="small" tone="textMuted">
                    {t(`passengerType.${p.type}`)}
                    {p.baggageKg ? t('tripDetail.baggage', { kg: p.baggageKg }) : ''}
                    {p.seatCode ? t('tripDetail.seat', { code: p.seatCode }) : ''}
                  </AppText>
                </View>
              </View>
            </View>
          ))}
        </View>

        {booking.status === 'PENDING_PAYMENT' && holdOpen ? (
          <Banner tone="warning">{t('tripDetail.holding')}</Banner>
        ) : unpaid || booking.status === 'EXPIRED' ? (
          !holdOpen ? (
            <Banner tone="info">{t('tripDetail.holdExpired')}</Banner>
          ) : null
        ) : booking.status === 'CONFIRMED' && !canCancel ? (
          <Banner tone="info">
            {!fareClass.refundable
              ? t('tripDetail.notRefundable')
              : t('tripDetail.cancelWindowPassed')}
          </Banner>
        ) : booking.status === 'CANCEL_REQUESTED' ? (
          <Banner tone="info">{t('tripDetail.cancelPending')}</Banner>
        ) : booking.status === 'CANCELLED' ? (
          <Banner tone="error">{t('tripDetail.cancelled')}</Banner>
        ) : null}

        {booking.passengers.some((p) => p.type !== 'INF') ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tripDetail.seatInfoLabel')}
            onPress={() =>
              router.push({
                pathname: '/trips/seats',
                params: { ids: booking.id },
              })
            }
            style={styles.seatLink}>
            <AppText variant="smallBold" tone="primary">
              {t('tripDetail.seatInfo')}
            </AppText>
          </Pressable>
        ) : null}

        {canSwap ? (
          <View
            style={[
              styles.swap,
              { backgroundColor: theme.primarySoft, borderColor: theme.primary },
            ]}>
            <View style={styles.flex}>
              <AppText variant="bodyBold">{t('seatChange.title')}</AppText>
              <AppText variant="caption" tone="textSecondary">
                {t('seatChange.perk')}
              </AppText>
            </View>
            <Button
              size="sm"
              icon="swap-horizontal"
              label={t('seatChange.button')}
              onPress={() =>
                router.push({ pathname: '/trips/[id]/change-seat', params: { id: booking.id } })
              }
            />
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tripDetail.priceLabel')}
          onPress={() =>
            router.push({
              pathname: '/trips/[id]/price',
              params: { id: booking.id },
            })
          }
          style={styles.total}>
          <View style={styles.flex}>
            <AppText tone="textSecondary">
              {hasTicket ? t('tripDetail.paid') : t('tripDetail.total')} ·{' '}
              {t('common.guests', { count: booking.seatCount })}
            </AppText>
            <AppText variant="small" tone="primary">
              {t('tripDetail.priceDetail')}
            </AppText>
          </View>
          <AppText style={styles.totalAmount}>{formatVnd(booking.totalAmount)}</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  swap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  flex: { flex: 1 },
  loader: { marginTop: 80 },
  errorBox: { gap: 16, paddingTop: 16 },
  stack: { gap: 14, paddingTop: 8 },
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 16 },
  list: { paddingVertical: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  codeLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { fontSize: 28, lineHeight: 36, fontWeight: '800', letterSpacing: 0.5 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  divider: { height: 1, marginVertical: 16 },
  airline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  time: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  middle: { flex: 1, alignItems: 'center', gap: 4 },
  line: { width: '100%', borderTopWidth: 1.5, borderStyle: 'dashed' },
  right: { alignItems: 'flex-end' },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: { height: 1 },
  passenger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  benefitsTitle: { marginBottom: 10 },
  seatLink: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  totalAmount: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
});
