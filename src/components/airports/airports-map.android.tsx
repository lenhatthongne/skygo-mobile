import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  NativeUserLocation,
} from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { Coords } from '@/utils/geo';

type AirportsMapProps = {
  airports: Api.Airport[];
  selectedCode: string | null;
  user: Coords | null;
  onSelect: (code: string) => void;
};

/**
 * Android map: MapLibre with OpenFreeMap tiles (OpenStreetMap data). Google Maps needs a billing
 * account, which Google does not offer for Maps in Vietnam; OpenFreeMap needs no key or account.
 * Its attribution stays visible, as the OpenStreetMap licence requires.
 *
 * Airports are drawn as map layers rather than view markers, so MapLibre places the labels and
 * hides the ones that would collide (HUI next to DAD, DLI next to CXR) until the user zooms in.
 * The selected airport is drawn larger and its label always wins.
 */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const FONT = ['Noto Sans Bold'];

// Roughly all of Vietnam.
const VIETNAM = { center: [106.5, 15.8] as [number, number], zoom: 4.6 };

export function AirportsMap({ airports, selectedCode, user, onSelect }: AirportsMapProps) {
  const theme = useTheme();
  const camera = useRef<CameraRef>(null);

  useEffect(() => {
    const airport = airports.find((a) => a.code === selectedCode);
    if (airport) {
      camera.current?.flyTo({
        center: [airport.longitude, airport.latitude],
        zoom: 8,
        duration: 400,
      });
    }
  }, [airports, selectedCode]);

  const data: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: 'FeatureCollection',
    features: airports.map((a) => ({
      type: 'Feature',
      id: a.code,
      geometry: { type: 'Point', coordinates: [a.longitude, a.latitude] },
      properties: { code: a.code, selected: a.code === selectedCode ? 1 : 0 },
    })),
  };

  return (
    <Map
      style={styles.map}
      mapStyle={MAP_STYLE}
      logo={false}
      compass={false}
      accessibilityLabel="Bản đồ các sân bay SkyGo">
      <Camera ref={camera} initialViewState={VIETNAM} />
      {user ? <NativeUserLocation /> : null}
      <GeoJSONSource
        id="airports"
        data={data}
        onPress={(event) => {
          const code = event.nativeEvent.features[0]?.properties?.code;
          if (typeof code === 'string') onSelect(code);
        }}>
        <Layer
          id="airport-dot"
          type="circle"
          paint={{
            'circle-radius': ['case', ['==', ['get', 'selected'], 1], 10, 7],
            'circle-color': theme.primary,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 3, 2],
          }}
        />
        <Layer
          id="airport-code"
          type="symbol"
          layout={{
            'text-field': ['get', 'code'],
            'text-font': FONT,
            'text-size': ['case', ['==', ['get', 'selected'], 1], 15, 13],
            'text-anchor': 'top',
            'text-offset': [0, 0.9],
            'text-padding': 4,
            'symbol-sort-key': ['case', ['==', ['get', 'selected'], 1], 0, 1],
          }}
          paint={{
            'text-color': '#1C2230',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.6,
          }}
        />
      </GeoJSONSource>
    </Map>
  );
}

const styles = StyleSheet.create({
  map: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
