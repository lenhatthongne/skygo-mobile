import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The chat with the assistant, kept on the device only. It is removed on sign-out together with
 * the other offline data (see `clearOfflineData`). The consent is remembered per account.
 */
export const ASSISTANT_HISTORY_KEY = 'skygo.assistant.history';
const CONSENT_KEY = (userId: number) => `skygo.assistant.consent.${userId}`;
const MAX_SAVED = 40;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: Api.AssistantAction[];
  suggestions?: string[];
  /** A message that could not be sent or answered; shown with a retry. */
  failed?: boolean;
};

export async function loadChat(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(ASSISTANT_HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export async function saveChat(messages: ChatMessage[]) {
  try {
    await AsyncStorage.setItem(ASSISTANT_HISTORY_KEY, JSON.stringify(messages.slice(-MAX_SAVED)));
  } catch {
    // The chat still works without being saved.
  }
}

export async function clearChat() {
  try {
    await AsyncStorage.removeItem(ASSISTANT_HISTORY_KEY);
  } catch {
    // ignore
  }
}

export async function hasConsent(userId: number) {
  try {
    return (await AsyncStorage.getItem(CONSENT_KEY(userId))) === '1';
  } catch {
    return false;
  }
}

export async function giveConsent(userId: number) {
  try {
    await AsyncStorage.setItem(CONSENT_KEY(userId), '1');
  } catch {
    // Asked again next time.
  }
}
