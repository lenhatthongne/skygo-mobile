import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useBooking } from '@/hooks/use-booking';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatDuration, formatTime, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { fareName } from '@/utils/fares';
import { formatVnd } from '@/utils/money';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Shows the outcome of a booking from its server status: success, failed payment or expired hold. */
export default function BookingResultScreen() {
  const theme = useTheme();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { booking, loading, error, reload } = useBooking(bookingId);
  const now = useNow();
  const [copied, setCopied] = useState(false);

  const goHome = () => router.replace('/home');

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </Screen>
    );
  }
  if (error || !booking) {
    return (
      <Screen header={{ title: 'Kết quả đặt vé' }}>
        <View style={styles.gap}>
          <Banner tone="error">{errorMessage(error)}</Banner>
          <View style={styles.gapSmall}>
            <Button label="Thử lại" onPress={reload} />
          </View>
          <Button label="Về trang chủ" variant="ghost" onPress={goHome} />
        </View>
      </Screen>
    );
  }

  const flight = booking.flight;

  if (booking.status === 'PENDING_PAYMENT') {
    return <Redirect href={{ pathname: '/booking/payment', params: { bookingId } }} />;
  }

  if (booking.status === 'PAYMENT_FAILED') {
    const remaining = Math.max(0, Math.ceil((Date.parse(booking.holdExpiresAt) - now) / 1000));
    return (
      <Screen
        footer={
          <>
            <Button label="Thử thanh toán lại" onPress={() => router.replace({ pathname: '/booking/payment', params: { bookingId } })} />
            <Button label="Về trang chủ" variant="ghost" onPress={goHome} />
          </>
        }>
        <Hero icon="x" tone="danger" title="Thanh toán chưa thành công" text="Giao dịch bị từ chối và bạn chưa bị trừ tiền. Vui lòng thử lại hoặc chọn phương thức khác." />
        <View style={[styles.card, { borderColor: theme.border }]}>
          <Row label="Số tiền" value={formatVnd(booking.totalAmount)} />
          <Row label="Chuyến bay" value={`${flight.origin} → ${flight.destination}`} />
        </View>
        <View style={styles.gap}>
          {remaining > 0 ? (
            <Banner tone="warning" icon="clock">
              Chỗ của bạn vẫn được giữ {clock(remaining)} nữa.
            </Banner>
          ) : (
            <Banner tone="error">Đã hết thời gian giữ chỗ.</Banner>
          )}
        </View>
      </Screen>
    );
  }

  if (booking.status === 'EXPIRED') {
    return (
      <Screen
        footer={
          <>
            <Button label="Tìm lại chuyến bay" onPress={() => router.replace('/search')} />
            <Button label="Về trang chủ" variant="ghost" onPress={goHome} />
          </>
        }>
        <Hero icon="clock" tone="muted" title="Hết thời gian giữ chỗ" text="Đơn đã hết hạn và chỗ đã được trả lại. Bạn chưa bị trừ tiền." />
        <View style={[styles.card, { borderColor: theme.border }]}>
          <Row label="Chuyến bay" value={`${flight.origin} → ${flight.destination}`} />
          <Row label="Ngày bay" value={formatDate(vnDateOf(flight.departureAt))} />
        </View>
      </Screen>
    );
  }

  if (booking.status !== 'CONFIRMED') {
    return (
      <Screen footer={<Button label="Về trang chủ" onPress={goHome} />}>
        <Hero
          icon="info"
          tone="muted"
          title={booking.status === 'CANCELLED' ? 'Đơn đã được hủy' : 'Đơn đang chờ xử lý hủy'}
          text="Bạn có thể theo dõi đơn này trong mục Chuyến đi."
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button
            label="Xem vé điện tử"
            onPress={() => router.replace({ pathname: '/trips/[id]/ticket', params: { id: booking.id } })}
          />
          <Button label="Về trang chủ" variant="ghost" onPress={goHome} />
        </>
      }>
      <Hero icon="check" tone="success" title="Đặt vé thành công" text="Vé điện tử đã được phát hành cho đơn của bạn." />

      <View style={[styles.code, { backgroundColor: theme.backgroundElement }]}>
        <AppText variant="caption" tone="textMuted">
          Mã đặt chỗ
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sao chép mã đặt chỗ"
          onPress={async () => {
            if (!booking.bookingCode) return;
            await Clipboard.setStringAsync(booking.bookingCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={styles.codeRow}>
          <AppText style={styles.codeText}>{booking.bookingCode ?? '—'}</AppText>
          <Feather name={copied ? 'check' : 'copy'} size={18} color={copied ? theme.success : theme.textMuted} />
        </Pressable>
        {copied ? (
          <AppText variant="caption" tone="success">
            Đã sao chép
          </AppText>
        ) : null}
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.times}>
          <View>
            <AppText style={styles.time}>{formatTime(flight.departureAt)}</AppText>
            <AppText variant="smallBold" tone="textSecondary">
              {flight.origin}
            </AppText>
          </View>
          <View style={styles.middle}>
            <AppText variant="caption" tone="textMuted">
              {formatDate(vnDateOf(flight.departureAt))}
            </AppText>
            <View style={[styles.line, { borderColor: theme.border }]} />
            <AppText variant="caption" tone="textMuted">
              {flight.flightNumber} · {formatDuration(flight.durationMinutes)}
            </AppText>
          </View>
          <View style={styles.right}>
            <AppText style={styles.time}>{formatTime(flight.arrivalAt)}</AppText>
            <AppText variant="smallBold" tone="textSecondary">
              {flight.destination}
            </AppText>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Row label="Hành khách" value={`${booking.seatCount + booking.passengers.filter((p) => p.type === 'INF').length} khách`} />
        <Row label="Hạng vé" value={fareName(booking.fareClass)} />
        <Row label="Đã thanh toán" value={formatVnd(booking.totalAmount)} strong />
      </View>
    </Screen>
  );
}

function Hero({
  icon,
  tone,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  tone: 'success' | 'danger' | 'muted';
  title: string;
  text: string;
}) {
  const theme = useTheme();
  const bg = { success: theme.successSoft, danger: theme.dangerSoft, muted: theme.backgroundElement }[tone];
  const fg = { success: theme.success, danger: theme.danger, muted: theme.textMuted }[tone];
  return (
    <View style={styles.hero}>
      <View style={[styles.ring, { backgroundColor: bg }]}>
        <Feather name={icon} size={38} color={fg} />
      </View>
      <AppText variant="h2" style={styles.centerText}>
        {title}
      </AppText>
      <AppText tone="textSecondary" style={styles.centerText}>
        {text}
      </AppText>
    </View>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText variant="small" tone="textSecondary">
        {label}
      </AppText>
      <AppText variant={strong ? 'bodyBold' : 'smallBold'}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 80 },
  gap: { marginTop: 16 },
  gapSmall: { marginVertical: 8 },
  hero: { alignItems: 'center', gap: 10, marginTop: 48, marginBottom: 24 },
  ring: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  centerText: { textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, marginTop: 16, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  code: { borderRadius: Radius.lg, padding: 14, alignItems: 'center', gap: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: 2 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  middle: { flex: 1, alignItems: 'center', gap: 4 },
  right: { alignItems: 'flex-end' },
  line: { width: '100%', borderTopWidth: 1.5, borderStyle: 'dashed' },
  divider: { height: 1, marginVertical: 10 },
});
