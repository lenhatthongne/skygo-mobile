/**
 * True when two API payloads carry the same data. A refetch that returns what is already shown
 * keeps the old object, so lists do not re-render (and flicker) for nothing. Meant for the small
 * JSON payloads of this app, not for large or cyclic objects.
 */
export function sameData(a: unknown, b: unknown) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
