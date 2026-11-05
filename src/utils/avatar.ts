import { API_BASE_URL } from '@/services/api/config';

/** Full address of a profile photo from the relative `avatarUrl` the server returns. */
export function avatarUri(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return null;
  // `API_BASE_URL` ends with /api; the avatar path already starts with /api.
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${avatarUrl}`;
}
