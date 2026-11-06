import i18n from '@/i18n';
import { isApiError } from '@/services/api/errors';

function waitText(seconds?: number) {
  if (!seconds) return i18n.t('errors.awhile');
  return seconds >= 60
    ? i18n.t('errors.minutes', { count: Math.ceil(seconds / 60) })
    : i18n.t('errors.seconds', { count: seconds });
}

/** Message for an error in the language chosen in Settings, chosen by HTTP status and `code`, never by server text. */
export function errorMessage(error: unknown, fallback = i18n.t('errors.fallback')) {
  if (!isApiError(error)) return fallback;
  switch (error.kind) {
    case 'network':
      return i18n.t('errors.network');
    case 'timeout':
      return i18n.t('errors.timeout');
    case 'canceled':
      return '';
  }
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return i18n.t('errors.invalidCredentials');
    case 'ACCOUNT_LOCKED':
      return i18n.t('errors.accountLocked');
    case 'ACCOUNT_BLOCKED':
      return i18n.t('errors.accountBlocked');
    case 'EMAIL_EXISTS':
      return i18n.t('errors.emailExists');
    case 'OTP_INVALID':
      return i18n.t('errors.codeInvalid');
    case 'OTP_EXPIRED':
      return i18n.t('errors.codeExpired');
    case 'OTP_RATE_LIMITED':
      return i18n.t('errors.tooFast', { wait: waitText(error.retryAfterSeconds) });
    case 'EMAIL_DELIVERY_FAILED':
      return i18n.t('errors.mailFailed');
    case 'VALIDATION_ERROR':
      return i18n.t('errors.validation');
    case 'SOLD_OUT':
      return i18n.t('errors.soldOut');
    case 'FLIGHT_UNAVAILABLE':
      return i18n.t('errors.flightClosed');
    case 'INVALID_PASSENGER':
      return i18n.t('errors.tooYoung');
    case 'HOLD_EXPIRED':
      return i18n.t('errors.holdExpired');
    case 'IDEMPOTENCY_CONFLICT':
      return i18n.t('errors.idempotency');
    case 'INVALID_STATE':
      return i18n.t('errors.invalidState');
    case 'ASSISTANT_RATE_LIMITED':
      return i18n.t('errors.chatTooFast', { wait: waitText(error.retryAfterSeconds) });
    case 'ASSISTANT_UNAVAILABLE':
      return i18n.t('errors.assistant');
    case 'INVALID_ROUND_TRIP':
      return i18n.t('errors.roundTrip');
    case 'INVALID_IMAGE':
      return i18n.t('errors.imageType');
    case 'FILE_TOO_LARGE':
      return i18n.t('errors.imageSize');
    case 'STORAGE_ERROR':
      return i18n.t('errors.imageFailed');
    case 'SEAT_TAKEN':
      return i18n.t('errors.seatTaken');
    case 'VOUCHER_INVALID':
      return i18n.t('errors.voucherInvalid');
    case 'VOUCHER_EXPIRED':
      return i18n.t('errors.voucherExpired');
    case 'VOUCHER_USED':
      return i18n.t('errors.voucherUsed');
    case 'VOUCHER_MIN_ORDER':
      return i18n.t('errors.voucherMinOrder');
    case 'INVALID_SEAT':
      return i18n.t('errors.seatInvalid');
    case 'SEAT_CHANGE_NOT_ALLOWED':
      return i18n.t('errors.seatChangeNotAllowed');
    case 'SEAT_CHANGE_CLOSED':
      return i18n.t('errors.seatChangeClosed');
    case 'INVALID_BAGGAGE':
      return i18n.t('errors.baggageInvalid');
    case 'CURRENT_PASSWORD_INCORRECT':
      return i18n.t('errors.wrongPassword');
    case 'CANCELLATION_NOT_ALLOWED':
      return i18n.t('errors.cannotCancel');
    case 'NOT_FOUND':
      return i18n.t('errors.notFound');
    case 'REFRESH_TOKEN_INVALID':
    case 'UNAUTHORIZED':
      return i18n.t('errors.sessionExpired');
  }
  if (error.status && error.status >= 500) return i18n.t('errors.server');
  return fallback;
}

/** Field → message map from a VALIDATION_ERROR response. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || !error.errors) return {};
  const result: Record<string, string> = {};
  for (const { field, message } of error.errors) result[field] ??= message;
  return result;
}
