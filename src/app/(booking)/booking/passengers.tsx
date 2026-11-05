import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { LegExtras } from '@/components/booking/leg-extras';
import { SeatStep } from '@/components/booking/seat-step';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius } from '@/constants/theme';
import { useBaggageOptions } from '@/hooks/use-baggage-options';
import { useFareQuotes } from '@/hooks/use-fare-quotes';
import { useFlight } from '@/hooks/use-flight';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';
import { createBooking, createRoundTrip } from '@/services/api/bookings';
import { getSeatMap } from '@/services/api/flights';
import { clearDraft, loadDraft, saveDraft } from '@/services/booking-draft';
import { isApiError } from '@/services/api/errors';
import { listSavedPassengers } from '@/services/api/passengers';
import { ageClassOn, formatDobInput, isoToDob, parseDob } from '@/utils/age';
import { vnDateOf } from '@/utils/datetime';
import { errorMessage, fieldErrors } from '@/utils/error-messages';
import { fareName } from '@/utils/fares';
import { formatVnd } from '@/utils/money';
import { isValidApiName, toApiName } from '@/utils/names';
import { totalPassengers } from '@/utils/passengers';
import {
  isValidEmail,
  isValidNationalPhone,
  prefillNationalPhone,
  toApiPhone,
} from '@/utils/validators';

type Slot = {
  ref: string;
  type: Api.PassengerType;
  title: Api.PassengerTitle | null;
  name: string;
  dob: string;
  /** Extra checked baggage pack in kg, or null for none. */
  baggageKg: number | null;
  /** Chosen seat code such as "12A", or null. */
  seatCode: string | null;
  /** Round trip: the same choices for the return flight. */
  returnBaggageKg: number | null;
  returnSeatCode: string | null;
};

type Leg = Api.TripLeg;

const STEP_TITLES = ['Thông tin hành khách', 'Hành lý ký gửi', 'Chọn ghế'];

const TYPE_LABEL: Record<Api.PassengerType, string> = {
  ADT: 'Người lớn',
  CHD: 'Trẻ em',
  INF: 'Em bé',
};
const TYPE_HINT: Record<Api.PassengerType, string> = {
  ADT: 'từ 12 tuổi tại ngày bay',
  CHD: 'từ 2 đến dưới 12 tuổi tại ngày bay',
  INF: 'dưới 2 tuổi tại ngày bay',
};
const TITLES: Record<Api.PassengerType, { value: Api.PassengerTitle; label: string }[]> = {
  ADT: [
    { value: 'MR', label: 'Ông' },
    { value: 'MRS', label: 'Bà' },
    { value: 'MS', label: 'Cô' },
  ],
  CHD: [
    { value: 'MSTR', label: 'Bé trai' },
    { value: 'MISS', label: 'Bé gái' },
  ],
  INF: [
    { value: 'MSTR', label: 'Bé trai' },
    { value: 'MISS', label: 'Bé gái' },
  ],
};

const bagOf = (s: Slot, leg: Leg) => (leg === 'OUTBOUND' ? s.baggageKg : s.returnBaggageKg);
const seatOf = (s: Slot, leg: Leg) => (leg === 'OUTBOUND' ? s.seatCode : s.returnSeatCode);
const extrasPatch = (
  leg: Leg,
  patch: { baggage?: number | null; seat?: string | null },
): Partial<Slot> => ({
  ...(patch.baggage !== undefined
    ? leg === 'OUTBOUND'
      ? { baggageKg: patch.baggage }
      : { returnBaggageKg: patch.baggage }
    : {}),
  ...(patch.seat !== undefined
    ? leg === 'OUTBOUND'
      ? { seatCode: patch.seat }
      : { returnSeatCode: patch.seat }
    : {}),
});

function buildSlots(adults: number, children: number, infants: number): Slot[] {
  const types: Api.PassengerType[] = [
    ...Array<Api.PassengerType>(adults).fill('ADT'),
    ...Array<Api.PassengerType>(children).fill('CHD'),
    ...Array<Api.PassengerType>(infants).fill('INF'),
  ];
  return types.map((type, i) => ({
    ref: `p${i + 1}`,
    type,
    title: null,
    name: '',
    dob: '',
    baggageKg: null,
    seatCode: null,
    returnBaggageKg: null,
    returnSeatCode: null,
  }));
}

/**
 * Fills the first adult from the profile (title, name, birth date) on a fresh booking so a
 * returning customer does not retype them. The customer can still change every field.
 */
function withProfile(slots: Slot[], user: Api.User | null): Slot[] {
  const first = slots.findIndex((s) => s.type === 'ADT');
  if (!user || first < 0) return slots;
  const name = toApiName(user.fullName);
  return slots.map((s, i) =>
    i !== first
      ? s
      : {
          ...s,
          title: user.title ?? s.title,
          name: isValidApiName(name) ? name : s.name,
          dob: user.dateOfBirth ? isoToDob(user.dateOfBirth) : s.dob,
        },
  );
}

export default function PassengersScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    flightId: string;
    fareClassId: string;
    adults: string;
    children: string;
    infants: string;
    returnFlightId?: string;
    returnFareClassId?: string;
  }>();
  const { user } = useSession();
  const party = {
    adults: Number(params.adults) || 1,
    children: Number(params.children) || 0,
    infants: Number(params.infants) || 0,
  };
  const fareClassId = Number(params.fareClassId);
  const isRound = !!params.returnFareClassId;
  const returnFareClassId = Number(params.returnFareClassId);
  const { flight, loading, error: flightError, retry } = useFlight(params.flightId);
  const fare = flight?.fareClasses.find((f) => f.id === fareClassId);
  // Round trip: the return leg has its own flight, fare class, extras and server quote.
  const returnFlight = useFlight(params.returnFlightId ?? '', isRound);
  const returnFare = returnFlight.flight?.fareClasses.find((f) => f.id === returnFareClassId);
  const baggageOptions = useBaggageOptions(fareClassId);
  const returnBaggageOptions = useBaggageOptions(returnFareClassId, isRound);

  // What was typed survives going back to the previous step, as long as the choice is the same.
  const draftKey = `${params.flightId}:${fareClassId}:${params.returnFlightId ?? ''}:${returnFareClassId || ''}:${party.adults}/${party.children}/${party.infants}`;
  const draft = loadDraft<Slot>(draftKey);
  const [slots, setSlots] = useState<Slot[]>(
    () => draft?.slots ?? withProfile(buildSlots(party.adults, party.children, party.infants), user),
  );
  const [email, setEmail] = useState(draft?.email ?? user?.email ?? '');
  const [phone, setPhone] = useState(() => draft?.phone ?? prefillNationalPhone(user?.phone ?? ''));
  useEffect(() => {
    saveDraft(draftKey, { slots, email, phone });
  }, [draftKey, slots, email, phone]);

  // The server prices the extras too: its quote (with the chosen packs and seats) gives the total.
  const extrasFor = (leg: Leg) => ({
    baggageWeightsKg: slots.flatMap((s) => (bagOf(s, leg) ? [bagOf(s, leg) as number] : [])),
    seatCodes: slots.flatMap((s) => (seatOf(s, leg) ? [seatOf(s, leg) as string] : [])),
  });
  const quotes = useFareQuotes(fare ? [fare] : [], { ...party, ...extrasFor('OUTBOUND') });
  const quote = fare ? quotes.quotes[fare.id] : undefined;
  const returnQuotes = useFareQuotes(returnFare ? [returnFare] : [], {
    ...party,
    ...extrasFor('RETURN'),
  });
  const returnQuote = returnFare ? returnQuotes.quotes[returnFare.id] : undefined;

  const [saved, setSaved] = useState<Api.SavedPassenger[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [priceChange, setPriceChange] = useState<{
    previous: number;
    next: Api.PriceQuote;
    leg?: Api.TripLeg;
  } | null>(null);
  const [agreedReturnTotal, setAgreedReturnTotal] = useState<number | null>(null);
  const [agreedTotal, setAgreedTotal] = useState<number | null>(null);
  // 0 passengers and contact, 1 baggage, 2 seats; payment is the 4th step of the stepper.
  const [step, setStep] = useState(0);
  // A seat is required, unless the seat map of that flight cannot be loaded at all.
  const [seatAttempted, setSeatAttempted] = useState(false);
  const [seatsUnavailable, setSeatsUnavailable] = useState({ OUTBOUND: false, RETURN: false });

  useEffect(() => {
    let alive = true;
    listSavedPassengers()
      .then((list) => alive && setSaved(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const departureDate = flight ? vnDateOf(flight.departureAt) : null;
  const outboundTotal = agreedTotal ?? quote?.total ?? null;
  const returnTotal = agreedReturnTotal ?? returnQuote?.total ?? null;
  const total = isRound
    ? outboundTotal !== null && returnTotal !== null
      ? outboundTotal + returnTotal
      : null
    : outboundTotal;

  function update(index: number, patch: Partial<Slot>) {
    // A different baggage choice is a different price: drop any price already accepted.
    if ('baggageKg' in patch || 'seatCode' in patch) setAgreedTotal(null);
    if ('returnBaggageKg' in patch || 'returnSeatCode' in patch) setAgreedReturnTotal(null);
    setSlots((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setServerErrors({});
  }

  function slotErrors(slot: Slot, index: number) {
    const errors: { title?: string; name?: string; dob?: string } = {};
    if (!slot.title) errors.title = 'Chọn danh xưng';
    const apiName = toApiName(slot.name);
    if (!isValidApiName(apiName)) errors.name = 'Nhập họ tên đầy đủ, chỉ gồm chữ cái';
    const dob = parseDob(slot.dob);
    if (!dob) errors.dob = 'Nhập ngày sinh dạng ngày/tháng/năm';
    else if (departureDate) {
      const cls = ageClassOn(dob, departureDate);
      if (cls === 'TOO_YOUNG') errors.dob = 'Hành khách phải từ 14 ngày tuổi tại ngày bay';
      else if (cls !== slot.type)
        errors.dob = `Ngày sinh không khớp: ${TYPE_LABEL[slot.type].toLowerCase()} ${TYPE_HINT[slot.type]}`;
    }
    const remote =
      serverErrors[`passengers[${index}].fullName`] ??
      serverErrors[`passengers[${index}].dateOfBirth`];
    if (remote && !errors.name && !errors.dob) errors.name = remote;
    return errors;
  }

  const emailError = !isValidEmail(email)
    ? 'Email chưa đúng định dạng'
    : (serverErrors['contact.email'] ?? null);
  const phoneError = !isValidNationalPhone(phone)
    ? 'Số điện thoại cần 9–10 chữ số'
    : (serverErrors['contact.phone'] ?? null);
  const allErrors = slots.map((s, i) => slotErrors(s, i));
  const valid =
    allErrors.every((e) => !e.title && !e.name && !e.dob) &&
    !emailError &&
    !phoneError &&
    !!departureDate;

  function buildPassengers(leg: Leg = 'OUTBOUND'): Api.PassengerRequest[] {
    const adultRefs = slots.filter((s) => s.type === 'ADT').map((s) => s.ref);
    let infantIndex = 0;
    return slots.map((s) => ({
      ref: s.ref,
      type: s.type,
      title: s.title as Api.PassengerTitle,
      fullName: toApiName(s.name),
      dateOfBirth: parseDob(s.dob) as string,
      accompanyingRef: s.type === 'INF' ? adultRefs[infantIndex++] : null,
      ...(bagOf(s, leg) ? { baggageKg: bagOf(s, leg) } : {}),
      ...(seatOf(s, leg) ? { seatCode: seatOf(s, leg) } : {}),
    }));
  }

  /**
   * Re-reads the seat maps right before booking: a seat chosen a while ago may be gone. Taken
   * seats are cleared so the user picks again; a failed check does not block (the server decides).
   */
  async function seatsStillFree(): Promise<boolean> {
    const legs: { leg: Leg; flightId: number }[] = [
      { leg: 'OUTBOUND', flightId: flight?.flightId ?? 0 },
    ];
    if (isRound && returnFlight.flight)
      legs.push({ leg: 'RETURN', flightId: returnFlight.flight.flightId });
    const clashes: string[] = [];
    for (const { leg, flightId } of legs) {
      const chosen = slots.map((s) => seatOf(s, leg)).filter((c): c is string => !!c);
      if (chosen.length === 0) continue;
      try {
        const map = await getSeatMap(flightId);
        const seats = map.cabins.flatMap((c) => c.rows.flatMap((r) => r.seats));
        const gone = chosen.filter((code) => seats.some((x) => x.code === code && !x.available));
        if (gone.length > 0) {
          clashes.push(
            `${isRound ? (leg === 'OUTBOUND' ? 'Chặng đi' : 'Chặng về') + ': ' : ''}${gone.join(', ')}`,
          );
          setSlots((list) =>
            list.map((s) =>
              gone.includes(seatOf(s, leg) ?? '')
                ? { ...s, ...extrasPatch(leg, { seat: null }) }
                : s,
            ),
          );
          if (leg === 'OUTBOUND') setAgreedTotal(null);
          else setAgreedReturnTotal(null);
        }
      } catch {
        // Offline or failed: the server still refuses a taken seat.
      }
    }
    if (clashes.length === 0) return true;
    setError(`Ghế ${clashes.join('; ')} vừa có người chọn. Vui lòng chọn ghế khác rồi tiếp tục.`);
    return false;
  }

  /** Round trip: both legs are created together or not at all. */
  async function submitRound(outTotal: number, retTotal: number) {
    setSubmitting(true);
    setError(null);
    setPriceChange(null);
    try {
      if (!(await seatsStillFree())) return;
      const contact = { email: email.trim(), phone: toApiPhone(phone) };
      const result = await createRoundTrip({
        outbound: {
          fareClassId,
          expectedTotal: outTotal,
          contact,
          passengers: buildPassengers('OUTBOUND'),
        },
        inbound: {
          fareClassId: returnFareClassId,
          expectedTotal: retTotal,
          contact,
          passengers: buildPassengers('RETURN'),
        },
      });
      clearDraft();
      // Pay the outbound leg first; the payment screen then continues with the return leg.
      router.replace({
        pathname: '/booking/payment',
        params: { bookingId: result.outbound.id, nextBookingId: result.inbound.id },
      });
    } catch (e) {
      if (isApiError(e) && e.code === 'PRICE_CHANGED') {
        const next = e.problem?.quote as Api.PriceQuote | undefined;
        const leg: Api.TripLeg = e.problem?.leg === 'RETURN' ? 'RETURN' : 'OUTBOUND';
        if (next) {
          setPriceChange({ previous: leg === 'RETURN' ? retTotal : outTotal, next, leg });
          return;
        }
      }
      if (isApiError(e) && e.code === 'SEAT_TAKEN') {
        const leg: Leg = e.problem?.leg === 'RETURN' ? 'RETURN' : 'OUTBOUND';
        const taken = Array.isArray(e.problem?.seatCodes) ? (e.problem.seatCodes as string[]) : [];
        setSlots((list) =>
          list.map((s) =>
            taken.includes(seatOf(s, leg) ?? '')
              ? { ...s, ...extrasPatch(leg, { seat: null }) }
              : s,
          ),
        );
        if (leg === 'OUTBOUND') setAgreedTotal(null);
        else setAgreedReturnTotal(null);
        setError(
          `${leg === 'OUTBOUND' ? 'Chặng đi' : 'Chặng về'}: ghế ${taken.join(', ')} vừa có người chọn. Vui lòng chọn ghế khác.`,
        );
        return;
      }
      setServerErrors(fieldErrors(e));
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(expectedTotal: number) {
    setSubmitting(true);
    setError(null);
    setPriceChange(null);
    try {
      if (!(await seatsStillFree())) return;
      const passengers = buildPassengers('OUTBOUND');
      const booking = await createBooking({
        fareClassId,
        expectedTotal,
        contact: { email: email.trim(), phone: toApiPhone(phone) },
        passengers,
      });
      clearDraft();
      router.replace({ pathname: '/booking/payment', params: { bookingId: booking.id } });
    } catch (e) {
      if (isApiError(e) && e.code === 'PRICE_CHANGED') {
        const next = e.problem?.quote as Api.PriceQuote | undefined;
        if (next) {
          setPriceChange({ previous: expectedTotal, next });
          return;
        }
      }
      if (isApiError(e) && e.code === 'SEAT_TAKEN') {
        // Someone else took the seat meanwhile: clear it so the user picks another one.
        const taken = Array.isArray(e.problem?.seatCodes) ? (e.problem.seatCodes as string[]) : [];
        setSlots((list) =>
          list.map((s) =>
            s.seatCode && taken.includes(s.seatCode) ? { ...s, seatCode: null } : s,
          ),
        );
        setAgreedTotal(null);
        setError(
          taken.length > 0
            ? `Ghế ${taken.join(', ')} vừa có người chọn. Vui lòng chọn ghế khác.`
            : errorMessage(e),
        );
        return;
      }
      const fields = fieldErrors(e);
      setServerErrors(fields);
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  function onNext() {
    if (step === 0) {
      if (!valid) {
        setAttempted(true);
        setError(null);
        return;
      }
      setError(null);
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    // Step 3: every passenger needs a seat on every leg before the booking is held.
    const missing = slots.some(
      (s) =>
        s.type !== 'INF' &&
        ((!s.seatCode && !seatsUnavailable.OUTBOUND) ||
          (isRound && !s.returnSeatCode && !seatsUnavailable.RETURN)),
    );
    if (missing) {
      setSeatAttempted(true);
      setError(
        `Vui lòng chọn ghế cho tất cả hành khách${isRound ? ' ở cả hai chặng' : ''} rồi tiếp tục.`,
      );
      return;
    }
    setError(null);
    onContinue();
  }

  function onContinue() {
    if (!valid || total === null) {
      setAttempted(true);
      setError(null);
      return;
    }
    if (isRound) {
      if (outboundTotal !== null && returnTotal !== null)
        void submitRound(outboundTotal, returnTotal);
      return;
    }
    void submit(total);
  }

  const header = {
    title: STEP_TITLES[step],
    onBack: step > 0 ? () => setStep(step - 1) : () => router.back(),
    steps: step + 1,
  };

  if (loading || (isRound && returnFlight.loading)) {
    return (
      <Screen header={header}>
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      </Screen>
    );
  }
  if (flightError || !flight || !fare || (isRound && (returnFlight.error || !returnFare))) {
    return (
      <Screen header={header}>
        <View style={styles.block}>
          <Banner tone="error">
            {flightError
              ? errorMessage(flightError)
              : 'Không tìm thấy hạng vé đã chọn. Vui lòng chọn lại.'}
          </Banner>
          <View style={styles.gap}>
            <Button
              label={flightError ? 'Thử lại' : 'Quay lại'}
              onPress={flightError ? retry : () => router.back()}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const adultNumbers = slots.map((s, i) => (s.type === 'ADT' ? i + 1 : 0)).filter(Boolean);

  return (
    <Screen
      header={header}
      scrollKey={step}
      footer={
        <View style={styles.footer}>
          <View style={styles.flex}>
            <AppText variant="caption" tone="textMuted">
              {isRound ? 'Khứ hồi · 2 chặng' : fareName(fare)} · {totalPassengers(party)} khách
            </AppText>
            <AppText variant="h2">{total !== null ? formatVnd(total) : '—'}</AppText>
            {isRound && outboundTotal !== null && returnTotal !== null ? (
              <AppText variant="caption" tone="textMuted">
                Đi {formatVnd(outboundTotal)}
                {quote?.baggageTotal || quote?.seatTotal
                  ? ` (gồm ${formatVnd((quote.baggageTotal ?? 0) + (quote.seatTotal ?? 0))} hành lý, ghế)`
                  : ''}
                {' · '}Về {formatVnd(returnTotal)}
                {returnQuote?.baggageTotal || returnQuote?.seatTotal
                  ? ` (gồm ${formatVnd((returnQuote.baggageTotal ?? 0) + (returnQuote.seatTotal ?? 0))} hành lý, ghế)`
                  : ''}
              </AppText>
            ) : (
              <>
                {quote?.baggageTotal ? (
                  <AppText variant="caption" tone="textMuted">
                    Gồm hành lý {formatVnd(quote.baggageTotal)}
                  </AppText>
                ) : null}
                {quote?.seatTotal ? (
                  <AppText variant="caption" tone="textMuted">
                    Gồm phí ghế {formatVnd(quote.seatTotal)}
                  </AppText>
                ) : null}
              </>
            )}
          </View>
          <Button
            label={step === 2 ? 'Giữ chỗ & tiếp tục' : 'Tiếp tục'}
            loading={submitting}
            disabled={step === 2 && total === null}
            style={styles.cta}
            onPress={onNext}
          />
        </View>
      }>
      {step === 2 ? (
        <View style={styles.hold}>
          <Banner tone="info">
            Chọn ghế cho từng hành khách. Sau khi bấm &quot;Giữ chỗ &amp; tiếp tục&quot;, chỗ của
            bạn được giữ trong 15 phút để thanh toán.
          </Banner>
        </View>
      ) : null}

      {step === 0
        ? slots.map((slot, index) => {
            const show: { title?: string; name?: string; dob?: string } = attempted
              ? allErrors[index]
              : {};
            const matches = saved.filter((sp) => {
              if (!departureDate) return false;
              if (ageClassOn(sp.dateOfBirth, departureDate) !== slot.type) return false;
              return !slots.some(
                (o, oi) =>
                  oi !== index &&
                  toApiName(o.name) === toApiName(sp.fullName) &&
                  o.dob === isoToDob(sp.dateOfBirth),
              );
            });
            const infantNo = slots.slice(0, index).filter((s) => s.type === 'INF').length;
            return (
              <View key={slot.ref} style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardHead}>
                  <AppText variant="bodyBold">Hành khách {index + 1}</AppText>
                  <View style={[styles.type, { backgroundColor: theme.primarySoft }]}>
                    <AppText variant="caption" tone="primaryDark" style={styles.typeText}>
                      {TYPE_LABEL[slot.type]}
                    </AppText>
                  </View>
                </View>
                <AppText variant="caption" tone="textMuted">
                  {TYPE_LABEL[slot.type]} {TYPE_HINT[slot.type]}
                  {slot.type === 'INF' && adultNumbers[infantNo]
                    ? ` · đi cùng hành khách ${adultNumbers[infantNo]}`
                    : ''}
                </AppText>

                {matches.length > 0 ? (
                  <View style={styles.savedRow}>
                    <AppText variant="caption" tone="textMuted">
                      Chọn nhanh từ hành khách đã lưu
                    </AppText>
                    <View style={styles.chips}>
                      {matches.map((sp) => (
                        <Chip
                          key={sp.id}
                          label={sp.fullName}
                          onPress={() =>
                            update(index, {
                              title: sp.title,
                              name: sp.fullName,
                              dob: isoToDob(sp.dateOfBirth),
                            })
                          }
                        />
                      ))}
                    </View>
                  </View>
                ) : null}

                <AppText variant="label" style={styles.label}>
                  Danh xưng
                </AppText>
                <View style={styles.chips}>
                  {TITLES[slot.type].map((t) => (
                    <Chip
                      key={t.value}
                      label={t.label}
                      selected={slot.title === t.value}
                      onPress={() => update(index, { title: t.value })}
                    />
                  ))}
                </View>
                {show.title ? (
                  <AppText variant="caption" tone="danger" style={styles.err}>
                    {show.title}
                  </AppText>
                ) : null}

                <TextField
                  label="Họ và tên (như trên giấy tờ)"
                  value={slot.name}
                  onChangeText={(v) => update(index, { name: v })}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={50}
                  placeholder="Nguyễn Văn An"
                  error={show.name}
                  hint={
                    toApiName(slot.name) && toApiName(slot.name) !== slot.name
                      ? `Tên trên vé: ${toApiName(slot.name)}`
                      : undefined
                  }
                />
                <TextField
                  label="Ngày sinh"
                  leftIcon="calendar"
                  value={slot.dob}
                  onChangeText={(v) => update(index, { dob: formatDobInput(v) })}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="01/01/1990"
                  error={show.dob}
                />
              </View>
            );
          })
        : null}

      {step === 0 ? (
        <View style={[styles.card, { borderColor: theme.border }]}>
          <AppText variant="bodyBold">Thông tin liên hệ</AppText>
          <AppText variant="caption" tone="textMuted">
            Chúng tôi gửi xác nhận đặt chỗ tới đây.
          </AppText>
          <TextField
            label="Email"
            leftIcon="mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            error={attempted ? emailError : null}
          />
          <TextField
            label="Số điện thoại"
            prefix="+84"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="912 345 678"
            error={attempted ? phoneError : null}
          />
        </View>
      ) : null}

      {step === 1
        ? slots.map((slot, index) =>
            slot.type === 'INF' ? null : (
              <View key={slot.ref} style={[styles.card, { borderColor: theme.border }]}>
                <View style={styles.cardHead}>
                  <AppText variant="bodyBold">Hành khách {index + 1}</AppText>
                  <AppText
                    variant="small"
                    tone="textMuted"
                    numberOfLines={1}
                    style={styles.cardName}>
                    {toApiName(slot.name) || TYPE_LABEL[slot.type]}
                  </AppText>
                </View>
                <LegExtras
                  title={
                    isRound ? `Chặng đi · ${flight.origin} → ${flight.destination}` : undefined
                  }
                  fare={fare}
                  baggageOptions={baggageOptions}
                  baggageKg={slot.baggageKg}
                  onBaggage={(kg) => update(index, extrasPatch('OUTBOUND', { baggage: kg }))}
                />
                {isRound && returnFare && returnFlight.flight ? (
                  <LegExtras
                    title={`Chặng về · ${returnFlight.flight.origin} → ${returnFlight.flight.destination}`}
                    fare={returnFare}
                    baggageOptions={returnBaggageOptions}
                    baggageKg={slot.returnBaggageKg}
                    onBaggage={(kg) => update(index, extrasPatch('RETURN', { baggage: kg }))}
                  />
                ) : null}
              </View>
            ),
          )
        : null}

      {step === 2 ? (
        <SeatStep
          legs={[
            {
              leg: 'OUTBOUND',
              title: `Chặng đi · ${flight.origin} → ${flight.destination}`,
              flightId: flight.flightId,
              cabin: fare.classCode === 'BUSINESS' ? 'BUSINESS' : 'ECONOMY',
              required: !seatsUnavailable.OUTBOUND,
            },
            ...(isRound && returnFare && returnFlight.flight
              ? [
                  {
                    leg: 'RETURN' as const,
                    title: `Chặng về · ${returnFlight.flight.origin} → ${returnFlight.flight.destination}`,
                    flightId: returnFlight.flight.flightId,
                    cabin: (returnFare.classCode === 'BUSINESS' ? 'BUSINESS' : 'ECONOMY') as
                      'BUSINESS' | 'ECONOMY',
                    required: !seatsUnavailable.RETURN,
                  },
                ]
              : []),
          ]}
          passengers={slots.flatMap((s, i) =>
            s.type === 'INF'
              ? []
              : [
                  {
                    ref: s.ref,
                    label: `Khách ${i + 1}`,
                    name: toApiName(s.name) || TYPE_LABEL[s.type],
                    seats: { OUTBOUND: s.seatCode, RETURN: s.returnSeatCode },
                  },
                ],
          )}
          attempted={seatAttempted}
          onChange={(leg, ref, code) => {
            const index = slots.findIndex((x) => x.ref === ref);
            if (index >= 0) update(index, extrasPatch(leg, { seat: code }));
          }}
          onUnavailable={(leg) => setSeatsUnavailable((p) => (p[leg] ? p : { ...p, [leg]: true }))}
        />
      ) : null}

      {attempted && !valid && step === 0 ? (
        <View style={styles.gap}>
          <Banner tone="warning">Vui lòng kiểm tra các ô được đánh dấu rồi bấm tiếp tục.</Banner>
        </View>
      ) : null}
      {error ? (
        <View style={styles.gap}>
          <Banner tone="error">{error}</Banner>
        </View>
      ) : null}

      <Modal
        transparent
        animationType="slide"
        visible={!!priceChange}
        onRequestClose={() => setPriceChange(null)}>
        <View style={styles.scrim}>
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={[styles.sheetIcon, { backgroundColor: theme.warningSoft }]}>
              <Feather name="trending-up" size={26} color={theme.warning} />
            </View>
            <AppText variant="h2" style={styles.sheetTitle}>
              Giá vé vừa thay đổi
            </AppText>
            <AppText tone="textSecondary" style={styles.sheetText}>
              Giá hạng {fareName(priceChange?.leg === 'RETURN' && returnFare ? returnFare : fare)}{' '}
              đã cập nhật trong lúc bạn nhập thông tin. Thông tin hành khách vẫn được giữ nguyên.
            </AppText>
            {priceChange ? (
              <View style={[styles.compare, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.row}>
                  <AppText variant="small" tone="textSecondary">
                    Giá trước đó
                  </AppText>
                  <AppText variant="small" tone="textSecondary" style={styles.strike}>
                    {formatVnd(priceChange.previous)}
                  </AppText>
                </View>
                <View style={styles.row}>
                  <AppText variant="bodyBold">Giá mới</AppText>
                  <AppText variant="h2">{formatVnd(priceChange.next.total)}</AppText>
                </View>
                <AppText
                  variant="caption"
                  tone={priceChange.next.total > priceChange.previous ? 'warning' : 'success'}
                  style={styles.diff}>
                  {priceChange.next.total > priceChange.previous ? '+' : '−'}
                  {formatVnd(Math.abs(priceChange.next.total - priceChange.previous))}
                </AppText>
              </View>
            ) : null}
            <View style={styles.sheetActions}>
              <Button
                label="Tiếp tục với giá mới"
                loading={submitting}
                onPress={() => {
                  if (!priceChange) return;
                  if (priceChange.leg && outboundTotal !== null && returnTotal !== null) {
                    const out =
                      priceChange.leg === 'OUTBOUND' ? priceChange.next.total : outboundTotal;
                    const ret = priceChange.leg === 'RETURN' ? priceChange.next.total : returnTotal;
                    if (priceChange.leg === 'OUTBOUND') setAgreedTotal(out);
                    else setAgreedReturnTotal(ret);
                    void submitRound(out, ret);
                    return;
                  }
                  setAgreedTotal(priceChange.next.total);
                  void submit(priceChange.next.total);
                }}
              />
              <Button
                label="Chọn chuyến khác"
                variant="ghost"
                onPress={() => {
                  setPriceChange(null);
                  router.dismissTo('/search/results');
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  baggage: { gap: 6, marginTop: 16 },
  baggageChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  loader: { marginTop: 48 },
  block: { marginTop: 16 },
  gap: { marginTop: 16 },
  hold: { marginTop: 8 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, marginTop: 16 },
  cardName: { flex: 1, textAlign: 'right' },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 2,
  },
  type: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  typeText: { fontWeight: '700' },
  savedRow: { marginTop: 12, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { marginTop: 16, marginBottom: 8 },
  err: { marginTop: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cta: { width: 190 },
  scrim: { flex: 1, backgroundColor: 'rgba(14,17,22,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 32 },
  sheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { marginTop: 14 },
  sheetText: { marginTop: 6 },
  compare: { borderRadius: Radius.md, padding: 14, marginTop: 16, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  strike: { textDecorationLine: 'line-through' },
  diff: { alignSelf: 'flex-end', fontWeight: '700' },
  sheetActions: { marginTop: 18, gap: 8 },
});
