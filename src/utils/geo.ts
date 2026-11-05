const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

export type Coords = { latitude: number; longitude: number };

/** Great-circle distance in km (haversine). Computed on the device; the position never leaves it. */
export function distanceKm(a: Coords, b: Coords) {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** 6,2 km below 100 km, then whole kilometres: 302 km. */
export function formatKm(km: number) {
  return km < 100 ? `${km.toFixed(1).replace('.', ',')} km` : `${Math.round(km)} km`;
}
