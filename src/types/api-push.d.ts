declare namespace Api {
  type PushPlatform = 'ANDROID' | 'IOS';

  interface PushDeviceRequest {
    /** Expo push token, e.g. `ExponentPushToken[...]`. */
    expoToken: string;
    platform: PushPlatform;
  }

  interface PushDeviceRemoveRequest {
    expoToken: string;
  }
}
