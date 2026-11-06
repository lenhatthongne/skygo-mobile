import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useBooking } from '@/hooks/use-booking';
import { useTheme } from '@/hooks/use-theme';
import { getBooking, getCancellationQuote, requestCancellation } from '@/services/api/bookings';
import { type ApiError, isApiError, toApiError } from '@/services/api/errors';
import { formatDayMonth, formatTime, vnDateOf } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { fareShortName } from '@/utils/fares';
import { formatVnd } from '@/utils/money';

const REASON_KEYS = ['plan', 'mistake', 'health', 'other'] as const;
const NOTE_MAX = 500;

type QuoteState = { id: string; quote?: Api.CancellationQuote; error?: ApiError };

export default function CancelScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { booking, loading, error, reload } = useBooking(id);
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'warning'; text: string } | null>(null);
  const [unsure, setUnsure] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getCancellationQuote(id, controller.signal)
      .then((quote) => setQuoteState({ id, quote }))
      .catch((e: unknown) => {
        const failure = toApiError(e);
        if (failure.kind !== 'canceled') setQuoteState({ id, error: failure });
      });
    return () => controller.abort();
  }, [id, attempt]);

  const header = { title: t('cancel.title'), onBack: () => router.back() };
  const q = quoteState?.id === id ? quoteState : null;

  if (loading || (!q && !error)) {
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
          <Button label="Thử lại" onPress={reload} />
        </View>
      </Screen>
    );
  }

  if (sent) {
    return (
      <Screen
        footer={
          <Button
            label={t('ticketScreen.viewBooking')}
            onPress={() => router.replace({ pathname: '/trips/[id]', params: { id: booking.id } })}
          />
        }>
        <View style={styles.hero}>
          <View style={[styles.ring, { backgroundColor: theme.successSoft }]}>
            <Feather name="check" size={38} color={theme.success} />
          </View>
          <AppText variant="h2" style={styles.center}>
            {t('cancel.sent')}
          </AppText>
          <AppText tone="textSecondary" style={styles.center}>
            {t('cancel.sentText')}
          </AppText>
        </View>
      </Screen>
    );
  }

  if (q?.error || !q?.quote) {
    return (
      <Screen header={header}>
        <View style={styles.errorBox}>
          <Banner tone="error">{errorMessage(q?.error)}</Banner>
          {q?.error?.kind === 'network' || q?.error?.kind === 'timeout' ? (
            <Button
              label={t('cancel.retry')}
              onPress={() => {
                setQuoteState(null);
                setAttempt((n) => n + 1);
              }}
            />
          ) : (
            <Button label={t('cancel.back')} variant="outline" onPress={() => router.back()} />
          )}
        </View>
      </Screen>
    );
  }

  const { quote } = q;
  const { flight } = booking;
  const date = vnDateOf(flight.departureAt);
  const text = (reason ? (note.trim() ? `${reason}: ${note.trim()}` : reason) : note.trim()).slice(
    0,
    NOTE_MAX,
  );

  async function send() {
    setSending(true);
    setMessage(null);
    try {
      await requestCancellation(id, text || null);
      setConfirming(false);
      setSent(true);
    } catch (e) {
      setConfirming(false);
      const failure = toApiError(e);
      if (failure.kind === 'network' || failure.kind === 'timeout') {
        // The request may have reached the server: never assume it failed.
        setUnsure(true);
        setMessage({
          tone: 'warning',
          text: t('cancel.unsure'),
        });
      } else {
        setMessage({ tone: 'error', text: errorMessage(failure) });
      }
    } finally {
      setSending(false);
    }
  }

  async function checkStatus() {
    setSending(true);
    try {
      const fresh = await getBooking(id);
      if (fresh.status === 'CANCEL_REQUESTED' || fresh.status === 'CANCELLED') {
        setSent(true);
      } else {
        setUnsure(false);
        setMessage({ tone: 'warning', text: t('cancel.notRecorded') });
      }
    } catch (e) {
      setMessage({
        tone: 'error',
        text: isApiError(e) ? errorMessage(e) : t('cancel.checkFailed'),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Screen
        header={header}
        footer={
          unsure ? (
            <Button
              label={t('cancel.checkStatus')}
              loading={sending}
              onPress={() => void checkStatus()}
            />
          ) : (
            <Button label={t('cancel.send')} variant="danger" onPress={() => setConfirming(true)} />
          )
        }>
        <View style={styles.stack}>
          <View
            style={[
              styles.card,
              styles.summary,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}>
            <View style={styles.flex}>
              <AppText style={styles.route}>
                {flight.origin} → {flight.destination}
              </AppText>
              <AppText variant="small" tone="textMuted">
                {formatDayMonth(date)} · {formatTime(flight.departureAt)} · {booking.bookingCode} ·{' '}
                {t('common.guests', { count: booking.seatCount })}
              </AppText>
            </View>
            <View style={[styles.tag, { backgroundColor: theme.primarySoft }]}>
              <AppText variant="label" tone="primaryDark">
                {fareShortName(booking.fareClass.classCode)}
              </AppText>
            </View>
          </View>

          <View
            style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <AppText variant="bodyBold" style={styles.cardTitle}>
              {t('cancel.estimate')}
            </AppText>
            <View style={styles.line}>
              <AppText tone="textSecondary">{t('tripDetail.paid')}</AppText>
              <AppText variant="bodyBold">{formatVnd(booking.totalAmount)}</AppText>
            </View>
            <View style={styles.line}>
              <AppText tone="textSecondary">
                {t('cancel.fee', { guests: t('common.guests', { count: booking.seatCount }) })}
              </AppText>
              <AppText variant="bodyBold" tone="danger">
                − {formatVnd(quote.cancelFeeTotal)}
              </AppText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.line}>
              <AppText variant="bodyBold">{t('cancel.refund')}</AppText>
              <AppText style={[styles.refund, { color: theme.success }]}>
                {formatVnd(quote.refundAmount)}
              </AppText>
            </View>
          </View>

          <Banner tone="info">{t('cancel.review')}</Banner>

          {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}

          <View style={styles.reason}>
            <AppText variant="label">
              {t('cancel.reason')}{' '}
              <AppText variant="small" tone="textMuted">
                {t('cancel.optional')}
              </AppText>
            </AppText>
            <View style={styles.chips}>
              {REASON_KEYS.map((key) => {
                const label = t(`cancel.reasons.${key}`);
                return (
                  <Chip
                    key={key}
                    label={label}
                    selected={reason === label}
                    onPress={() => setReason(reason === label ? null : label)}
                  />
                );
              })}
            </View>
            <TextInput
              accessibilityLabel={t('cancel.noteLabel')}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={NOTE_MAX}
              placeholder={t('cancel.notePlaceholder')}
              placeholderTextColor={theme.textMuted}
              style={[
                styles.note,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
            />
            <AppText variant="caption" tone="textMuted" style={styles.count}>
              {note.length}/{NOTE_MAX}
            </AppText>
          </View>
        </View>
      </Screen>

      <ConfirmDialog
        visible={confirming}
        destructive
        loading={sending}
        title={t('cancel.confirmTitle')}
        message={t('cancel.confirmMessage', { amount: formatVnd(quote.refundAmount) })}
        confirmLabel={t('cancel.send')}
        onConfirm={() => void send()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 80 },
  errorBox: { gap: 16, paddingTop: 16 },
  stack: { gap: 14, paddingTop: 8 },
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 16, gap: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  route: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.3 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  cardTitle: { fontSize: 16 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1 },
  refund: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  reason: { gap: 10, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: {
    minHeight: 96,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 14,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  count: { textAlign: 'right' },
  hero: { alignItems: 'center', gap: 12, paddingTop: 72, paddingHorizontal: 12 },
  ring: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
