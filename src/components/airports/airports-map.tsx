// iOS: Apple Maps through react-native-maps. Android uses airports-map.android.tsx (MapLibre).
import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/hooks/use-theme';
import type { Coords } from '@/utils/geo';

type AirportsMapProps = {
  airports: Api.Airport[];
  selectedCode: string | null;
  user: Coords | null;
  onSelect: (code: string) => void;
};

// Roughly all of Vietnam.
const VIETNAM = { latitude: 15.8, longitude: 106.5, latitudeDelta: 17, longitudeDelta: 12 };

export function AirportsMap({ airports, selectedCode, user, onSelect }: AirportsMapProps) {
  const theme = useTheme();
  const map = useRef<MapView>(null);

  useEffect(() => {
    const airport = airports.find((a) => a.code === selectedCode);
    if (airport) {
      map.current?.animateToRegion(
        { latitude: airport.latitude, longitude: airport.longitude, latitudeDelta: 4, longitudeDelta: 4 },
        400,
      );
    }
  }, [airports, selectedCode]);

  return (
    <MapView ref={map} style={styles.map} initialRegion={VIETNAM} showsUserLocation={!!user}>
      {airports.map((a) => {
        const selected = a.code === selectedCode;
        return (
          <Marker
            key={a.code}
            coordinate={{ latitude: a.latitude, longitude: a.longitude }}
            onPress={() => onSelect(a.code)}
            accessibilityLabel={`Sân bay ${a.name}`}>
            <View style={styles.marker}>
              <View style={[styles.pin, { backgroundColor: selected ? theme.primary : theme.background }]}>
                <Feather name="send" size={16} color={selected ? theme.onPrimary : theme.primary} />
              </View>
              <View style={[styles.label, { backgroundColor: selected ? '#1C2230' : theme.background }]}>
                <AppText variant="caption" style={[styles.labelText, { color: selected ? '#ffffff' : theme.text }]}>
                  {a.code}
                </AppText>
              </View>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  marker: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pin: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  labelText: { fontWeight: '800' },
});
