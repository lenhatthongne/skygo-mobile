const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  const email = value.trim();
  return email.length > 0 && email.length <= 255 && EMAIL_REGEX.test(email);
}

/** National part of a Vietnamese phone number: digits only, without the leading 0. */
export function nationalPhoneDigits(value: string) {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}

export function isValidNationalPhone(value: string) {
  return /^[0-9]{9,10}$/.test(nationalPhoneDigits(value));
}

/** Backend format: optional "+" then 9–14 digits. */
export function toApiPhone(value: string) {
  return `+84${nationalPhoneDigits(value)}`;
}

export function passwordChecks(password: string) {
  const bytes = new TextEncoder().encode(password).length;
  return {
    length: bytes >= 8 && bytes <= 72,
    letter: /[A-Za-z]/.test(password),
    digit: /[0-9]/.test(password),
  };
}

export function isValidPassword(password: string) {
  const checks = passwordChecks(password);
  return checks.length && checks.letter && checks.digit;
}

/** National part of a stored phone: "+84912345678" or "0912345678" → "912345678". */
export function prefillNationalPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const national = digits.startsWith('84') && digits.length > 10 ? digits.slice(2) : digits;
  return national.replace(/^0+/, '');
}

/** "+84912345678" → "0912 345 678" for display. */
export function formatPhoneDisplay(phone: string) {
  const national = prefillNationalPhone(phone);
  if (national.length < 9) return phone;
  return `0${national}`.replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3');
}
