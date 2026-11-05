import { listSavedPassengers } from '@/services/api/passengers';

import { useRemoteList } from './use-remote-list';

/** The customer's saved passengers. `reload()` refetches silently, `refresh()` on pull. */
export function useSavedPassengers() {
  return useRemoteList(listSavedPassengers);
}
