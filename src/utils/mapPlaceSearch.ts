/**
 * Finding a place on the boundary map and the farm form: pasted coordinates, a Google Maps
 * link, or a name for Google's geocoder.
 *
 * Coordinates and links are read here, with no request at all, so they work even where the
 * Maps key has no Geocoding API (where a name search reports itself unavailable). A grower
 * standing in an orchard often has exactly that to hand: a pin dropped in Google Maps, or the
 * coordinates on a certifier's map.
 */
import type { LatLng } from './parcelPolygon';

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

const valid = (lat: number, lng: number): LatLng | null =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;

/**
 * Coordinates in what a grower is likely to paste:
 *   - `44.5402, -123.1089` or `44.5402 -123.1089`
 *   - `44.5402° N, 123.1089° W` (hemisphere letters, with or without the degree sign)
 *   - a Google Maps link: `…/@44.5402,-123.1089,17z`, `…!3d44.5402!4d-123.1089`,
 *     `…?q=44.5402,-123.1089` (also `ll=`, `query=`, `center=`)
 * Anything else is `null`, and goes to the geocoder as a name.
 */
export const parseCoordinates = (text: string): LatLng | null => {
  const s = text.trim();
  if (!s) return null;

  // A dropped pin's own position (!3d…!4d…) beats the camera position (@…) in the same link.
  const pin = s.match(new RegExp(`!3d${NUM}!4d${NUM}`));
  if (pin) return valid(Number(pin[1]), Number(pin[2]));
  const param = s.match(new RegExp(`[?&](?:q|ll|query|center)=${NUM}(?:,|%2C)\\s*${NUM}`, 'i'));
  if (param) return valid(Number(param[1]), Number(param[2]));
  const at = s.match(new RegExp(`@${NUM},${NUM}`));
  if (at) return valid(Number(at[1]), Number(at[2]));

  const hemi = s.match(
    /^(\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])[\s,]+(\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])$/i
  );
  if (hemi) {
    const lat = Number(hemi[1]) * (hemi[2].toUpperCase() === 'S' ? -1 : 1);
    const lng = Number(hemi[3]) * (hemi[4].toUpperCase() === 'W' ? -1 : 1);
    return valid(lat, lng);
  }

  const plain = s.match(new RegExp(`^${NUM}\\s*[,\\s]\\s*${NUM}$`));
  if (plain) return valid(Number(plain[1]), Number(plain[2]));
  return null;
};

/**
 * Map centres the app once wrote when it knew nothing: the parcel form's Fresno fallback and the
 * New York default AddParcel injected on load and save. Parcels saved with them carry them in
 * `map_metadata`, where they read as "the grower was here". They are not a location.
 */
const PLACEHOLDER_CENTERS: LatLng[] = [
  { lat: 36.7378, lng: -119.7871 },
  { lat: 40.7128, lng: -74.006 }
];

export const isPlaceholderCenter = (center?: LatLng | null): boolean =>
  !center ||
  PLACEHOLDER_CENTERS.some(
    (p) => Math.abs(p.lat - center.lat) < 1e-4 && Math.abs(p.lng - center.lng) < 1e-4
  );

export interface FoundPlace {
  label: string;
  center: LatLng;
  /** The area the result covers (a town, a road), to frame on the map. */
  viewport?: google.maps.LatLngBoundsLiteral;
  /**
   * True when the result is the middle of an area (a town, a ZIP code, a road), not a point
   * on a building or a parcel. A farm's coordinates taken from it would be the town's.
   */
  approximate: boolean;
}

export type PlaceSearchResult =
  | { status: 'found'; places: FoundPlace[] }
  | { status: 'none' }
  /** The geocoder refused (the key has no Geocoding API) or could not be reached. */
  | { status: 'unavailable' };

/** Coordinates first, else Google's geocoder. Up to `limit` places, best first. */
export const findPlace = (query: string, limit = 4): Promise<PlaceSearchResult> => {
  const point = parseCoordinates(query);
  if (point) {
    return Promise.resolve({
      status: 'found',
      places: [
        {
          label: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
          center: point,
          approximate: false
        }
      ]
    });
  }
  if (!query.trim() || !window.google?.maps?.Geocoder) {
    return Promise.resolve({ status: query.trim() ? 'unavailable' : 'none' });
  }
  return new Promise((resolve) => {
    new google.maps.Geocoder().geocode({ address: query.trim() }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        resolve({
          status: 'found',
          places: results.slice(0, limit).map((r) => ({
            label: r.formatted_address,
            center: r.geometry.location.toJSON(),
            viewport: r.geometry.viewport?.toJSON(),
            approximate:
              r.geometry.location_type === 'APPROXIMATE' ||
              r.geometry.location_type === 'GEOMETRIC_CENTER'
          }))
        });
      } else if (status === 'ZERO_RESULTS') {
        resolve({ status: 'none' });
      } else {
        resolve({ status: 'unavailable' });
      }
    });
  });
};
