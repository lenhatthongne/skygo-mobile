import { api } from './client';

export async function listSavedPassengers(signal?: AbortSignal) {
  const { data } = await api.get<Api.SavedPassenger[]>('/me/passengers', { signal });
  return data;
}

export async function createSavedPassenger(body: Api.SavedPassengerRequest) {
  const { data } = await api.post<Api.SavedPassenger>('/me/passengers', body);
  return data;
}

export async function updateSavedPassenger(id: number, body: Api.SavedPassengerRequest) {
  const { data } = await api.put<Api.SavedPassenger>(`/me/passengers/${id}`, body);
  return data;
}

export async function deleteSavedPassenger(id: number) {
  await api.delete(`/me/passengers/${id}`);
}
