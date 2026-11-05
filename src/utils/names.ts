import { fold } from './text';

/** Passenger name in the backend format: UPPERCASE, no accents, single spaces. */
export function toApiName(text: string) {
  return fold(text)
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Same rule as the backend: [A-Z][A-Z ]{0,48}[A-Z]. */
export const isValidApiName = (name: string) => /^[A-Z][A-Z ]{0,48}[A-Z]$/.test(name);
