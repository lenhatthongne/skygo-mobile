import { api } from './client';

/** Idempotent. The server moves the token to the signed-in account if another one held it. */
export async function registerPushDevice(body: Api.PushDeviceRequest) {
  await api.put('/me/push-devices', body);
}

export async function unregisterPushDevice(body: Api.PushDeviceRemoveRequest) {
  await api.post('/me/push-devices/unregister', body);
}
