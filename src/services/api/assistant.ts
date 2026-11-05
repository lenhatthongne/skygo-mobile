import { api } from './client';

/** Sends the last turns of the chat; the server keeps no history. Replies take a few seconds. */
export async function askAssistant(messages: Api.AssistantTurn[], signal?: AbortSignal) {
  const { data } = await api.post<Api.AssistantReply>(
    '/assistant/chat',
    { messages },
    { timeout: 30000, signal },
  );
  return data;
}
