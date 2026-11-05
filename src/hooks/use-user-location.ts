import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coords } from '@/utils/geo';

export type LocationState = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable';

/**
 * The user's position, used only to rank airports by distance. Permission is asked when the user
 * taps "locate" (never on screen open); if it was already granted, the position is read quietly.
 * Declining leaves the app fully usable.
 */
export function useUserLocation() {
  const [state, setState] = useState<LocationState>('idle');
  const [coords, setCoords] = useState<Coords | null>(null);

  async function read() {
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setState('granted');
    } catch {
      setState('unavailable');
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        if (!alive || !current.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!alive) return;
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setState('granted');
      } catch {
        // Stay idle: the user can still tap the locate button.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function locate() {
    setState('locating');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setState('denied');
        return;
      }
      await read();
    } catch {
      setState('unavailable');
    }
  }

  return { state, coords, locate };
}
