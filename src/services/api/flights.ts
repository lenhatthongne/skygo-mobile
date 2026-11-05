import { api } from './client';

const publicCall = { skipAuth: true } as const;

export async function searchFlights(params: Api.FlightSearchParams, signal?: AbortSignal) {
  const { airlines, ...rest } = params;
  const { data } = await api.get<Api.PageResponse<Api.Flight>>('/flights/search', {
    ...publicCall,
    signal,
    // The backend expects a comma-separated list, not repeated parameters.
    params: { ...rest, airlines: airlines?.length ? airlines.join(',') : undefined },
  });
  return data;
}

/** Seat map of a flight: which seats exist, their fee and whether they are free right now. */
export async function getSeatMap(flightId: number, signal?: AbortSignal) {
  const { data } = await api.get<Api.SeatMap>(`/flights/${flightId}/seat-map`, { skipAuth: true, signal });
  return data;
}

export async function getFlight(id: number | string, signal?: AbortSignal) {
  const { data } = await api.get<Api.Flight>(`/flights/${id}`, { ...publicCall, signal });
  return data;
}
