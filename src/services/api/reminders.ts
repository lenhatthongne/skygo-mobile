import { api } from './client';

export type ReminderConfig = { serverReminders: boolean; leadMinutes: number[] };

/** Whether the server sends flight reminders by push (an admin switch). */
export async function getReminderConfig(signal?: AbortSignal) {
  const { data } = await api.get<ReminderConfig>('/me/reminder-config', { signal });
  return data;
}
