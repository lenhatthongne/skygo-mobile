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

/** Messages with an id above `after` (0 = all); opening the conversation marks replies as read. */
export async function getSupportThread(id: number, after: number, signal?: AbortSignal) {
  const { data } = await api.get<Api.SupportThread>(`/support-requests/${id}/messages`, {
    params: { after },
    signal,
  });
  return data;
}

export type SupportImage = { uri: string; mimeType?: string | null };

/** Sends text, a photo (JPG/PNG/WebP up to 5 MB) or both into a conversation. */
export async function sendSupportMessage(
  id: number,
  message: { body?: string; image?: SupportImage },
) {
  const form = new FormData();
  if (message.body) form.append('body', message.body);
  if (message.image) {
    const type = message.image.mimeType ?? 'image/jpeg';
    const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    // React Native's FormData takes a { uri, name, type } descriptor in place of a Blob.
    form.append('image', {
      uri: message.image.uri,
      name: `photo.${extension}`,
      type,
    } as unknown as Blob);
  }
  const { data } = await api.post<Api.SupportMessage>(`/support-requests/${id}/messages`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

/** Replies from SkyGo the customer has not opened yet, over every conversation. */
export async function getSupportUnread(signal?: AbortSignal) {
  const { data } = await api.get<{ count: number }>('/support-requests/unread', { signal });
  return data.count;
}
