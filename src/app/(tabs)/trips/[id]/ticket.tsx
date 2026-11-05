import { Feather } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AirlineBadge } from '@/components/flight/airline-badge';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useAirportCities } from '@/hooks/use-airport-cities';
import { useTheme } from '@/hooks/use-theme';
import { useTicket } from '@/hooks/use-ticket';
import { formatDate, formatDateTime, formatDuration, formatTime, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { FARE_NAMES } from '@/utils/fares';
import { formatVnd } from '@/utils/money';

const QR_SIZE = 220;

/** Raises the screen brightness while the QR code is shown, so it scans easily. */
function useBoostedBrightness(active: boolean) {
  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    let previous: number | null = null;
    let cancelled = false;
    (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        if (!cancelled) await Brightness.setBrightnessAsync(1);
      } catch {
        // No permission or no support: the QR still works at the current brightness.
      }
    })();
    return () => {
      cancelled = true;
      if (previous !== null) void Brightness.setBrightnessAsync(previous).catch(() => undefined);
    };
  }, [active]);
}

export default function TicketScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ticket, offline, loading, error, reload } = useTicket(id);
  const cityOf = useAirportCities();

  // Brightness is raised only for a ticket that is still valid.
  useBoostedBrightness(!!ticket && ticket.valid && ticket.booking.status !== 'CANCELLED');

  const revoked = !!ticket && (!ticket.valid || ticket.booking.status === 'CANCELLED');
  const band = revoked ? '#4B5563' : theme.primary;

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.band, { backgroundColor: band, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.back}>
            <Feather name="arrow-left" size={22} color="#ffffff" />
          </Pressable>
          <AppText variant="bodyBold" style={styles.title}>
            Vé điện tử
          </AppText>
          <View style={styles.back} />
        </View>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.inner}>
          {loading ? (
            <View style={[styles.card, styles.center, { backgroundColor: theme.background }]}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : error || !ticket ? (
            <View style={styles.errorBox}>
              <Banner tone="error">{errorMessage(error)}</Banner>
              <Button label="Thử lại" onPress={reload} />
            </View>
          ) : (
            <TicketBody
              ticket={ticket}
              revoked={revoked}
              offline={offline}
              cityOf={cityOf}
              onRetry={reload}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function TicketBody({
  ticket,
  revoked,
  offline,
  cityOf,
  onRetry,
}: {
  ticket: Omit<Api.Ticket, 'qrToken'>;
  revoked: boolean;
  offline: boolean;
  cityOf: (code: string) => string;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const { booking } = ticket;
  const { flight } = booking;
  const lead = booking.passengers[0];
  const extra = booking.passengers.length - 1;
  const muted = revoked ? 0.55 : 1;

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.background }]}>
        <View style={styles.airline}>
          <View style={{ opacity: muted }}>
            <AirlineBadge airline={flight.airline} size={48} />
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyBold" style={{ opacity: muted }}>
              {flight.airline.name}
            </AppText>
            <AppText variant="small" tone="textMuted">
              {flight.flightNumber} · {formatDate(vnDateOf(flight.departureAt))}
            </AppText>
          </View>
        </View>

        <View style={[styles.times, { opacity: muted }]}>
          <View>
            <AppText style={styles.time}>{formatTime(flight.departureAt)}</AppText>
            <AppText variant="bodyBold" tone="textSecondary">
              {cityOf(flight.origin)}
            </AppText>
          </View>
          <View style={styles.middle}>
            <AppText variant="caption" tone="textMuted">
              {formatDuration(flight.durationMinutes)}
            </AppText>
            <View style={[styles.line, { borderColor: theme.border }]} />
            <AppText variant="caption" tone="textMuted">
              Bay thẳng
            </AppText>
          </View>
          <View style={styles.right}>
            <AppText style={styles.time}>{formatTime(flight.arrivalAt)}</AppText>
            <AppText variant="bodyBold" tone="textSecondary">
              {cityOf(flight.destination)}
            </AppText>
          </View>
        </View>

        {!revoked ? (
          <View style={styles.facts}>
            <View style={styles.flex}>
              <AppText variant="caption" tone="textMuted">
                Hành khách
              </AppText>
              <AppText variant="bodyBold" numberOfLines={1}>
                {lead.fullName}
              </AppText>
              {extra > 0 ? (
                <AppText variant="small" tone="textMuted">
                  +{extra} khách
                </AppText>
              ) : null}
            </View>
            <View>
              <AppText variant="caption" tone="textMuted">
                Hạng vé
              </AppText>
              <AppText variant="bodyBold">{FARE_NAMES[booking.fareClass.classCode]?.replace('Phổ thông ', '')}</AppText>
            </View>
            <View style={styles.factRight}>
              <AppText variant="caption" tone="textMuted">
                Mã đặt chỗ
              </AppText>
              <AppText variant="bodyBold">{booking.bookingCode ?? '—'}</AppText>
            </View>
          </View>
        ) : null}

        {!revoked && booking.passengers.some((p) => p.seatCode) ? (
          <View style={styles.seats}>
            <AppText variant="caption" tone="textMuted">
              Ghế
            </AppText>
            <AppText variant="bodyBold">
              {booking.passengers
                .filter((p) => p.seatCode)
                .map((p) => (booking.passengers.length > 1 ? `${p.fullName}: ${p.seatCode}` : (p.seatCode as string)))
                .join(' · ')}
            </AppText>
          </View>
        ) : null}

        <View style={styles.tear}>
          <View style={[styles.notch, styles.notchLeft, { backgroundColor: theme.backgroundElement }]} />
          <View style={[styles.tearLine, { borderColor: theme.border }]} />
          <View style={[styles.notch, styles.notchRight, { backgroundColor: theme.backgroundElement }]} />
        </View>

        <View style={styles.qrWrap}>
          <View style={[styles.qrBox, { borderColor: theme.border }]}>
            <View style={{ opacity: revoked ? 0.12 : 1 }}>
              <QRCode value={ticket.qrContent} size={QR_SIZE} color="#000000" backgroundColor="#ffffff" />
            </View>
            {revoked ? (
              <View style={styles.overlay}>
                <View style={[styles.revoked, { backgroundColor: theme.dangerSoft }]}>
                  <Feather name="x-circle" size={18} color={theme.danger} />
                  <AppText variant="bodyBold" tone="danger">
                    Vé không còn hiệu lực
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>

          {!revoked ? (
            <View style={[styles.valid, { backgroundColor: theme.successSoft }]}>
              <Feather name="check-circle" size={18} color={theme.success} />
              <AppText variant="bodyBold" tone="success">
                Vé hợp lệ
              </AppText>
            </View>
          ) : null}

          <View style={styles.sync}>
            <Feather name="refresh-cw" size={14} color={theme.textMuted} />
            <AppText variant="small" tone="textMuted">
              Đồng bộ lúc {formatDateTime(ticket.syncedAt)}
            </AppText>
          </View>
        </View>
      </View>

      {revoked ? (
        <View style={styles.after}>
          <Banner tone="error">
            {booking.bookingCode ? `Đơn ${booking.bookingCode}` : 'Đơn này'} đã hủy nên mã QR đã bị thu hồi.
            {booking.priceSnapshot.refundable
              ? ` Khoản hoàn tiền dự kiến ${formatVnd(Math.max(0, booking.totalAmount - booking.priceSnapshot.cancelFee * booking.seatCount))}.`
              : ''}
          </Banner>
          <Button
            label="Xem chi tiết đặt chỗ"
            variant="outline"
            onPress={() => router.replace({ pathname: '/trips/[id]', params: { id: booking.id } })}
          />
        </View>
      ) : (
        <View style={styles.after}>
          {offline ? (
            <Banner tone="warning" icon="wifi-off">
              Không có mạng. Đang hiển thị vé đã lưu lúc {formatDateTime(ticket.syncedAt)}. Trạng thái hiệu lực sẽ
              được kiểm tra lại khi có mạng.
            </Banner>
          ) : (
            <View style={styles.hint}>
              <Feather name="info" size={18} color={theme.textMuted} style={styles.hintIcon} />
              <AppText variant="small" tone="textSecondary" style={styles.flex}>
                Xuất trình mã này khi làm thủ tục. Vé đã được lưu trên máy và xem được khi không có mạng.
              </AppText>
            </View>
          )}
          {offline ? (
            <Button label="Thử kết nối lại" variant="outline" onPress={onRetry} />
          ) : null}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  band: { height: 230, position: 'absolute', top: 0, left: 0, right: 0 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: '#ffffff', fontSize: 17 },
  body: { flex: 1, paddingTop: 112, paddingHorizontal: 20 },
  inner: { width: '100%', maxWidth: Math.min(MaxContentWidth, 480), alignSelf: 'center', gap: 16 },
  card: { borderRadius: Radius.xl, paddingTop: 18, overflow: 'hidden' },
  center: { height: 320, alignItems: 'center', justifyContent: 'center' },
  errorBox: { gap: 16, paddingTop: 48 },
  airline: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, marginTop: 18 },
  time: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  middle: { flex: 1, alignItems: 'center', gap: 4 },
  line: { width: '100%', borderTopWidth: 1.5, borderStyle: 'dashed' },
  right: { alignItems: 'flex-end' },
  facts: { flexDirection: 'row', gap: 16, paddingHorizontal: 18, marginTop: 18 },
  factRight: { alignItems: 'flex-end' },
  seats: { paddingHorizontal: 18, marginTop: 14, gap: 2 },
  tear: { height: 28, marginTop: 14, justifyContent: 'center' },
  tearLine: { marginHorizontal: 26, borderTopWidth: 1.5, borderStyle: 'dashed' },
  notch: { position: 'absolute', top: 0, width: 28, height: 28, borderRadius: 14 },
  notchLeft: { left: -14 },
  notchRight: { right: -14 },
  qrWrap: { alignItems: 'center', gap: 14, paddingBottom: 20, paddingTop: 6 },
  qrBox: { padding: 16, borderRadius: Radius.lg, borderWidth: 1, backgroundColor: '#ffffff' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  revoked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  valid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  after: { gap: 14 },
  hint: { flexDirection: 'row', gap: 10, paddingHorizontal: 4 },
  hintIcon: { marginTop: 2 },
});
