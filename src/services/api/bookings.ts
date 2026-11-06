import { api } from './client';

export async function createBooking(body: Api.CreateBookingRequest) {
  const { data } = await api.post<Api.Booking>('/bookings', body);
  return data;
}

/** Creates both legs or none; the error says which leg failed (`problem.leg`). */
export async function createRoundTrip(body: Api.RoundTripRequest) {
  const { data } = await api.post<Api.RoundTripResult>('/bookings/round-trip', body);
  return data;
}

export async function listBookings(page: number, size: number, signal?: AbortSignal) {
  const { data } = await api.get<Api.PageResponse<Api.Booking>>('/bookings', {
    params: { page, size },
    signal,
  });
  return data;
}

export async function getBooking(id: string, signal?: AbortSignal) {
  const { data } = await api.get<Api.Booking>(`/bookings/${id}`, { signal });
  return data;
}

/**
 * Simulated payment. `idempotencyKey` must be reused, with the same body, when retrying after a
 * timeout or network error, and must be new for every deliberate new attempt.
 */
export async function payBooking(id: string, idempotencyKey: string, body: Api.PaymentRequest) {
  const { data } = await api.post<Api.PaymentResponse>(`/bookings/${id}/payments`, body, {
    headers: { 'Idempotency-Key': idempotencyKey },
    timeout: 20000,
  });
  return data;
}

export async function getTicket(id: string, signal?: AbortSignal) {
  const { data } = await api.get<Api.Ticket>(`/bookings/${id}/ticket`, { signal });
  return data;
}

export async function getCancellationQuote(id: string, signal?: AbortSignal) {
  const { data } = await api.get<Api.CancellationQuote>(`/bookings/${id}/cancellation-quote`, {
    signal,
  });
  return data;
}

/** Not retried automatically: after a timeout, re-read the booking to learn whether it went through. */
export async function requestCancellation(id: string, reason: string | null) {
  const { data } = await api.post<Api.CancellationRequestResult>(
    `/bookings/${id}/cancellation-requests`,
    {
      reason,
    },
  );
  return data;
}

/** Picks or swaps the voucher of an unpaid booking; returns the booking with its new total. */
export async function setBookingVoucher(id: string, code: string) {
  const { data } = await api.put<Api.Booking>(`/bookings/${id}/voucher`, { code });
  return data;
}

export async function removeBookingVoucher(id: string) {
  const { data } = await api.delete<Api.Booking>(`/bookings/${id}/voucher`);
  return data;
}

/** Business fare only: new seats for some passengers of a booking (free, until 2 hours before departure). */
export async function changeSeats(id: string, body: Api.ChangeSeatsRequest) {
  const { data } = await api.put<Api.Booking>(`/bookings/${id}/seats`, body);
  return data;
}
