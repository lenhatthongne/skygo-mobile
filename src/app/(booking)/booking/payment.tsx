import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AirlineBadge } from '@/components/flight/airline-badge';
import { FareHighlights } from '@/components/booking/fare-highlights';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { VoucherSheet } from '@/components/voucher/voucher-sheet';
import { Radius } from '@/constants/theme';
import { useAirportCities } from '@/hooks/use-airport-cities';
import { useBooking } from '@/hooks/use-booking';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { payBooking, removeBookingVoucher, setBookingVoucher } from '@/services/api/bookings';
import { isApiError } from '@/services/api/errors';
import { registerForPush } from '@/services/push/push-notifications';
import { formatDuration, formatLongDate, formatTime, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { fareName } from '@/utils/fares';
import { newIdempotencyKey } from '@/utils/idempotency';
import { formatVnd } from '@/utils/money';

const METHODS: {
  value: Api.PaymentMethod;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}[] = [
  { value: 'SIMULATED_CARD', label: 'Thẻ', icon: 'credit-card' },
  { value: 'SIMULATED_BANK', label: 'Chuyển khoản', icon: 'briefcase' },
  { value: 'SIMULATED_WALLET', label: 'Ví điện tử', icon: 'smartphone' },
];

const OUTCOMES: { value: Api.SimulatedResult; label: string }[] = [
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'CANCELLED', label: 'Hủy thanh toán' },
];

const TYPE_LABEL: Record<Api.PassengerType, string> = {
  ADT: 'Người lớn',
  CHD: 'Trẻ em',
  INF: 'Em bé',
};
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

type Pending = { key: string; payload: Api.PaymentRequest };

export default function PaymentScreen() {
  const theme = useTheme();
  const cityOf = useAirportCities();
  const { bookingId, nextBookingId, afterOutbound } = useLocalSearchParams<{
    bookingId: string;
    /** Round trip: the return booking to pay right after this one. */
    nextBookingId?: string;
    /** Set on the return leg's payment screen once the outbound leg is paid. */
    afterOutbound?: string;
  }>();
  const { booking, loading, error, reload } = useBooking(bookingId);
  const now = useNow();
  const [method, setMethod] = useState<Api.PaymentMethod>('SIMULATED_CARD');
  const [outcome, setOutcome] = useState<Api.SimulatedResult>('SUCCESS');
  const [paying, setPaying] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);

  // Ask for notification permission here, in context, before paying: the "booking confirmed" push
  // can only reach a device registered by then. Declining never blocks the payment.
  useEffect(() => {
    void registerForPush({ ask: true });
  }, []);

  const header = { title: 'Thanh toán', onBack: () => router.back(), steps: 4 };
  const toResult = () => router.replace({ pathname: '/booking/result', params: { bookingId } });

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
        <View style={styles.block}>
          <Banner tone="error">{errorMessage(error)}</Banner>
          <View style={styles.gap}>
            <Button label="Thử lại" onPress={reload} />
          </View>
        </View>
      </Screen>
    );
  }

  // Only an unpaid booking can be paid; every other state has its own result view.
  if (booking.status !== 'PENDING_PAYMENT' && booking.status !== 'PAYMENT_FAILED') {
    return <Redirect href={{ pathname: '/booking/result', params: { bookingId } }} />;
  }

  const remaining = Math.max(0, Math.ceil((Date.parse(booking.holdExpiresAt) - now) / 1000));
  const expired = remaining === 0;
  const flight = booking.flight;
  const snap = booking.priceSnapshot;

  async function pay(resume?: Pending) {
    const payload: Api.PaymentRequest = resume?.payload ?? { method, simulatedResult: outcome };
    // A new key per deliberate attempt; the same key and body when resuming after a timeout.
    const key = resume?.key ?? newIdempotencyKey();
    setPaying(true);
    setMessage(null);
    try {
      const result = await payBooking(bookingId, key, payload);
      setPending(null);
      if (result.bookingStatus === 'PENDING_PAYMENT') {
        // The payment was cancelled; the reservation is kept.
        setMessage({
          tone: 'info',
          text: 'Bạn đã hủy thanh toán. Chỗ của bạn vẫn được giữ, hãy thanh toán trước khi hết giờ.',
        });
        reload();
      } else if (nextBookingId && result.bookingStatus === 'CONFIRMED') {
        // Outbound leg paid: carry on with the return leg of the same round trip.
        router.replace({
          pathname: '/booking/payment',
          params: { bookingId: nextBookingId, afterOutbound: '1' },
        });
      } else {
        toResult();
      }
    } catch (e) {
      if (isApiError(e) && (e.kind === 'network' || e.kind === 'timeout')) {
        // Unknown outcome: never treat it as a failure. Keep the key for an idempotent retry.
        setPending({ key, payload });
        // On a repeated check, tell the user the result is still unknown.
        if (resume) {
          setMessage({
            tone: 'info',
            text: 'Vẫn chưa nhận được kết quả. Hãy kiểm tra kết nối mạng rồi bấm “Kiểm tra lại”.',
          });
        }
      } else if (isApiError(e) && e.code === 'HOLD_EXPIRED') {
        toResult();
      } else {
        setMessage({ tone: 'error', text: errorMessage(e) });
      }
    } finally {
      setPaying(false);
    }
  }

  if (pending) {
    return (
      <Screen
        header={{ title: 'Thanh toán', onBack: undefined, steps: 4 }}
        footer={<Button label="Kiểm tra lại" loading={paying} onPress={() => void pay(pending)} />}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <AppText variant="h2" style={styles.centerText}>
            Đang xác nhận thanh toán
          </AppText>
          <AppText tone="textSecondary" style={styles.centerText}>
            Kết nối đang chậm hoặc bị gián đoạn nên chưa biết kết quả thanh toán cho đơn của bạn.
          </AppText>
        </View>
        <View style={[styles.card, { borderColor: theme.border }]}>
          <Step done text="Đã gửi yêu cầu thanh toán" />
          <Step text="Chờ hệ thống xác nhận" />
          <Step muted text="Phát hành vé điện tử" />
        </View>
        <View style={styles.gap}>
          <Banner tone="info">
            Vui lòng không tạo thanh toán mới. Bấm “Kiểm tra lại” để hỏi lại kết quả; yêu cầu được
            gửi lại với cùng mã, nên bạn sẽ không bị trừ tiền hai lần.
          </Banner>
        </View>
        {message ? (
          <View style={styles.gap}>
            <Banner tone={message.tone === 'error' ? 'error' : 'info'}>{message.text}</Banner>
          </View>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <Button
          label={`Thanh toán ${formatVnd(booking.totalAmount)}`}
          loading={paying}
          disabled={expired}
          onPress={() => void pay()}
        />
      }>
      <View style={styles.gap}>
        {expired ? (
          <Banner tone="error">
            Đã hết thời gian giữ chỗ. Bấm “Kiểm tra” để xem trạng thái đơn.
          </Banner>
        ) : (
          <Banner tone={remaining <= 120 ? 'error' : 'warning'} icon="clock">
            Giữ chỗ còn {clock(remaining)}. Hoàn tất thanh toán trước khi hết giờ.
          </Banner>
        )}
        {expired ? (
          <View style={styles.gapSmall}>
            <Button label="Kiểm tra" variant="outline" onPress={reload} />
          </View>
        ) : null}
      </View>

      {afterOutbound === '1' ? (
        <View style={styles.gap}>
          <Banner tone="success">
            Chặng đi đã thanh toán. Hoàn tất chặng về để nhận đủ vé khứ hồi.
          </Banner>
        </View>
      ) : nextBookingId ? (
        <View style={styles.gap}>
          <Banner tone="info">
            Đây là chặng đi của vé khứ hồi. Sau bước này bạn thanh toán tiếp chặng về.
          </Banner>
        </View>
      ) : null}
      {booking.status === 'PAYMENT_FAILED' ? (
        <View style={styles.gap}>
          <Banner tone="warning">Lần thanh toán trước chưa thành công. Bạn có thể thử lại.</Banner>
        </View>
      ) : null}
      {message ? (
        <View style={styles.gap}>
          <Banner tone={message.tone === 'error' ? 'error' : 'info'}>{message.text}</Banner>
        </View>
      ) : null}

      <View style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.rowBetween}>
          <View style={styles.airline}>
            <AirlineBadge airline={flight.airline} size={36} />
            <View>
              <AppText variant="smallBold">{flight.airline.name}</AppText>
              <AppText variant="caption" tone="textMuted">
                {flight.flightNumber}
                {booking.leg ? ` · ${booking.leg === 'OUTBOUND' ? 'Chặng đi' : 'Chặng về'}` : ''}
              </AppText>
            </View>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.primarySoft }]}>
            <AppText variant="caption" tone="primaryDark" style={styles.bold}>
              {fareName(booking.fareClass)}
            </AppText>
          </View>
        </View>
        <View style={styles.times}>
          <View>
            <AppText style={styles.time}>{formatTime(flight.departureAt)}</AppText>
            <AppText variant="smallBold" tone="textSecondary">
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
            <AppText variant="smallBold" tone="textSecondary">
              {cityOf(flight.destination)}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" tone="textMuted">
          {formatLongDate(vnDateOf(flight.departureAt))}
        </AppText>
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <AppText variant="bodyBold" style={styles.title}>
          Quyền lợi hạng {fareName(booking.fareClass)}
        </AppText>
        <FareHighlights fare={booking.fareClass} />
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <AppText variant="bodyBold" style={styles.title}>
          Hành khách
        </AppText>
        {booking.passengers.map((p, i) => (
          <View
            key={p.id}
            style={[
              styles.passengerBlock,
              i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 },
            ]}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <AppText variant="smallBold">
                  {p.title} {p.fullName}
                </AppText>
                <AppText variant="caption" tone="textMuted">
                  {TYPE_LABEL[p.type]}
                </AppText>
              </View>
            </View>
            <View style={styles.extras}>
              {p.type === 'INF' ? (
                <ExtraChip icon="human-baby-changing-table" text="Ngồi cùng người lớn" />
              ) : (
                <ExtraChip
                  icon="seat-passenger"
                  text={
                    p.seatCode
                      ? `Ghế ${p.seatCode}${p.seatAmount ? ` · ${formatVnd(p.seatAmount)}` : ''}`
                      : 'Chưa chọn ghế'
                  }
                  muted={!p.seatCode}
                />
              )}
              {p.baggageKg ? (
                <ExtraChip
                  icon="bag-suitcase"
                  text={`+${p.baggageKg} kg${p.baggageAmount ? ` · ${formatVnd(p.baggageAmount)}` : ''}`}
                />
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <AppText variant="bodyBold" style={styles.title}>
          Chi tiết giá
        </AppText>
        {snap.lines
          .filter((line) => line.count > 0)
          .map((line) => (
            <Row
              key={line.type}
              label={`${TYPE_LABEL[line.type]} × ${line.count}`}
              value={formatVnd(line.fare)}
            />
          ))}
        <Row label="Thuế và phí" value={formatVnd(snap.totalTax)} />
        {snap.baggageTotal ? (
          <Row label="Hành lý mua thêm" value={formatVnd(snap.baggageTotal)} />
        ) : null}
        {snap.seatTotal ? <Row label="Phí chọn ghế" value={formatVnd(snap.seatTotal)} /> : null}
        {booking.discountAmount ? (
          <Row
            label={`Giảm giá${booking.voucherCode ? ` (${booking.voucherCode})` : ''}`}
            value={`−${formatVnd(booking.discountAmount)}`}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            booking.voucherCode ? `Đổi voucher ${booking.voucherCode}` : 'Chọn voucher'
          }
          disabled={expired}
          onPress={() => setVoucherOpen(true)}
          style={[
            styles.voucherRow,
            {
              backgroundColor: booking.voucherCode ? theme.successSoft : theme.primarySoft,
              borderColor: booking.voucherCode ? theme.success : theme.primary,
            },
          ]}>
          <Feather
            name="tag"
            size={18}
            color={booking.voucherCode ? theme.success : theme.primaryDark}
          />
          <View style={styles.flex}>
            <AppText variant="smallBold" tone={booking.voucherCode ? 'success' : 'primaryDark'}>
              {booking.voucherCode
                ? `${booking.voucherCode} · giảm ${formatVnd(booking.discountAmount ?? 0)}`
                : 'Chọn voucher'}
            </AppText>
            <AppText variant="caption" tone="textMuted">
              {booking.voucherCode ? 'Chạm để đổi hoặc bỏ voucher' : 'Chạm để xem voucher của bạn'}
            </AppText>
          </View>
          <Feather name="chevron-right" size={18} color={theme.textMuted} />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Row label="Tổng cộng" value={formatVnd(booking.totalAmount)} strong />
      </View>

      <VoucherSheet
        visible={voucherOpen}
        subtotal={snap.total}
        currentCode={booking.voucherCode}
        onSelect={async (code) => {
          await setBookingVoucher(bookingId, code);
          reload();
        }}
        onRemove={async () => {
          await removeBookingVoucher(bookingId);
          reload();
        }}
        onClose={() => setVoucherOpen(false)}
      />

      <View style={styles.methodsHead}>
        <AppText variant="bodyBold">Phương thức thanh toán</AppText>
        <View style={[styles.pill, { backgroundColor: theme.infoSoft }]}>
          <AppText variant="caption" tone="info" style={styles.bold}>
            Mô phỏng
          </AppText>
        </View>
      </View>
      <View style={styles.methods}>
        {METHODS.map((m) => {
          const selected = method === m.value;
          return (
            <Pressable
              key={m.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setMethod(m.value)}
              style={[
                styles.method,
                {
                  borderColor: selected ? theme.primary : theme.border,
                  backgroundColor: selected ? theme.primarySoft : theme.background,
                  borderWidth: selected ? 2 : 1.5,
                },
              ]}>
              <Feather
                name={m.icon}
                size={22}
                color={selected ? theme.primary : theme.textSecondary}
              />
              <AppText variant="caption" style={{ fontWeight: selected ? '700' : '500' }}>
                {m.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Picking the outcome is a developer test aid; customers always get a successful payment. */}
      {__DEV__ ? (
        <View
          style={[
            styles.card,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          ]}>
          <AppText variant="smallBold">Kết quả mô phỏng (chỉ để thử nghiệm)</AppText>
          <AppText variant="caption" tone="textMuted" style={styles.hint}>
            Không có khoản tiền thật nào bị trừ. Chọn kết quả bạn muốn thử.
          </AppText>
          <View style={styles.chips}>
            {OUTCOMES.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                selected={outcome === o.value}
                onPress={() => setOutcome(o.value)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function ExtraChip({
  icon,
  text,
  muted = false,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  text: string;
  muted?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.extraChip, { backgroundColor: theme.backgroundElement }]}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={muted ? theme.textMuted : theme.primary}
      />
      <AppText variant="caption" tone={muted ? 'textMuted' : 'text'} style={styles.bold}>
        {text}
      </AppText>
    </View>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.rowBetween}>
      <AppText variant={strong ? 'bodyBold' : 'small'} tone={strong ? 'text' : 'textSecondary'}>
        {label}
      </AppText>
      <AppText variant={strong ? 'h2' : 'smallBold'}>{value}</AppText>
    </View>
  );
}

function Step({
  text,
  done = false,
  muted = false,
}: {
  text: string;
  done?: boolean;
  muted?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepDot,
          {
            backgroundColor: done ? theme.success : 'transparent',
            borderColor: done ? theme.success : muted ? theme.border : theme.primary,
          },
        ]}>
        {done ? <Feather name="check" size={13} color="#ffffff" /> : null}
      </View>
      <AppText variant="small" tone={muted ? 'textMuted' : 'text'}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 48 },
  block: { marginTop: 16 },
  gap: { marginTop: 16 },
  gapSmall: { marginTop: 8 },
  center: { alignItems: 'center', gap: 12, marginTop: 40, marginBottom: 24 },
  centerText: { textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, marginTop: 16, gap: 6 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  bold: { fontWeight: '700' },
  divider: { height: 1, marginVertical: 8 },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  airline: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  time: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  middle: { flex: 1, alignItems: 'center', gap: 4 },
  line: { width: '100%', borderTopWidth: 1.5, borderStyle: 'dashed' },
  right: { alignItems: 'flex-end' },
  passengerBlock: { paddingVertical: 10, gap: 8 },
  extras: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  extraChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  title: { marginBottom: 4 },
  methodsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  methods: { flexDirection: 'row', gap: 8, marginTop: 10 },
  method: { flex: 1, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', gap: 6 },
  hint: { marginTop: 2, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
