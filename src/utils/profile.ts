/** Profile fields that count towards "complete", in the order the form asks for them. */
const FIELDS = [
  'avatarUrl',
  'title',
  'dateOfBirth',
  'gender',
  'nationality',
  'emergencyName',
  'emergencyPhone',
] as const satisfies readonly (keyof Api.User)[];

/** Share of the optional profile fields that are filled (0-100). Computed on the phone. */
export function profileCompletion(user: Api.User | null) {
  if (!user) return 0;
  const filled = FIELDS.filter((key) => !!user[key]).length;
  return Math.round((filled / FIELDS.length) * 100);
}

/** Empty or blank text becomes undefined so the server clears the field. */
export const orUndefined = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
