import { api } from './client';

/** Public: sent without a token, like the other catalog data. */
export async function getFaqs(signal?: AbortSignal) {
  const { data } = await api.get<Api.Faq[]>('/faqs', { skipAuth: true, signal });
  return data;
}

export async function createSupportRequest(body: Api.SupportRequestInput) {
  const { data } = await api.post<Api.SupportRequest>('/support-requests', body);
  return data;
}

export async function listMySupportRequests(signal?: AbortSignal) {
  const { data } = await api.get<Api.PageResponse<Api.SupportRequest>>('/support-requests/mine', {
    params: { page: 0, size: 50 },
    signal,
  });
  return data;
}
