/**
 * The passenger form of the booking in progress, kept in memory only so that going back to pick
 * another seat or fare and returning does not lose what was typed. It is tied to the exact
 * flights, fares and party of the booking (`key`): a different choice starts a fresh form.
 * Cleared once the booking is created and on sign-out. Never written to disk.
 */
type Draft = { key: string; slots: unknown[]; email: string; phone: string };

let draft: Draft | null = null;

export function loadDraft<T>(key: string): { slots: T[]; email: string; phone: string } | null {
  if (!draft || draft.key !== key) return null;
  return { slots: draft.slots as T[], email: draft.email, phone: draft.phone };
}

export function saveDraft(key: string, value: { slots: unknown[]; email: string; phone: string }) {
  draft = { key, ...value };
}

export function clearDraft() {
  draft = null;
}
