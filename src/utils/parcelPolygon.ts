export type LatLng = { lat: number; lng: number };

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * `Parcel.polygon` is an untyped JSONField with two shapes on file:
 *   - `[{lat, lng}, ...]`: what the parcel form writes.
 *   - GeoJSON `{type: 'Polygon', coordinates: [[[lng, lat], ...]]}`: what the demo
 *     seeders (`seed_showcase_walnut_farm`, `seed_comprehensive_demo*`) and the audit
 *     fixture farms write.
 * Every reader expects the first shape. Given GeoJSON, the parcel form crashed on the
 * first map click (`polygon is not iterable`) and the map card silently drew no boundary.
 * Readers go through this instead. Anything unrecognised becomes `[]` (no boundary on
 * file), never a guess.
 */
export const toLatLngPath = (polygon: unknown): LatLng[] => {
  if (Array.isArray(polygon)) {
    return polygon.filter(
      (p): p is LatLng =>
        !!p && isFiniteNumber((p as LatLng).lat) && isFiniteNumber((p as LatLng).lng)
    );
  }

  if (
    polygon &&
    typeof polygon === 'object' &&
    (polygon as { type?: unknown }).type === 'Polygon' &&
    Array.isArray((polygon as { coordinates?: unknown }).coordinates)
  ) {
    // Outer ring only; GeoJSON positions are [lng, lat].
    const ring = (polygon as { coordinates: unknown[] }).coordinates[0];
    if (!Array.isArray(ring)) return [];
    const path = ring
      .filter(
        (pos): pos is [number, number] =>
          Array.isArray(pos) && isFiniteNumber(pos[0]) && isFiniteNumber(pos[1])
      )
      .map(([lng, lat]) => ({ lat, lng }));
    // GeoJSON closes the ring by repeating the first position; the editor does not.
    const first = path[0];
    const last = path[path.length - 1];
    if (path.length > 1 && first.lat === last.lat && first.lng === last.lng) path.pop();
    return path;
  }

  return [];
};
