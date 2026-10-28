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

// Flat x/y in metres-ish units around the outline: longitude shrinks with latitude, so a
// raw lat/lng comparison would bend every distance on a farm at 45°N by ~30%. Good enough
// at field scale, which is the only scale an outline is edited at.
const toPlane = (path: LatLng[]) => {
  const k = Math.cos(((path[0]?.lat ?? 0) * Math.PI) / 180);
  return (p: LatLng) => ({ x: p.lng * k, y: p.lat });
};

/**
 * Where a new corner goes once the outline is closed: into the edge it lengthens least.
 *
 * Appending put every tap after the LAST corner, so a corner added anywhere but beside the
 * closing edge crossed the outline over itself (a bow-tie). A grower walking the edge in
 * order still gets the closing edge, which is the same as appending.
 */
export const insertAtNearestEdge = (path: LatLng[], point: LatLng): LatLng[] => {
  if (path.length < 3) return [...path, point];
  const plane = toPlane(path);
  const p = plane(point);
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  let best = 0;
  let bestCost = Infinity;
  path.forEach((corner, i) => {
    const a = plane(corner);
    const b = plane(path[(i + 1) % path.length]);
    const cost = dist(a, p) + dist(p, b) - dist(a, b);
    if (cost < bestCost) {
      bestCost = cost;
      best = i;
    }
  });
  return [...path.slice(0, best + 1), point, ...path.slice(best + 1)];
};

/**
 * True when two edges of the closed outline cross or touch (other than neighbouring edges
 * sharing their corner). A crossed outline has no single inside, so it is no map of a field.
 */
export const isSelfIntersecting = (path: LatLng[]): boolean => {
  const n = path.length;
  if (n < 4) return false;
  const plane = toPlane(path);
  const pts = path.map(plane);
  const orient = (a: (typeof pts)[0], b: (typeof pts)[0], c: (typeof pts)[0]) => {
    const v = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    return v === 0 ? 0 : v > 0 ? 1 : -1;
  };
  const onSegment = (a: (typeof pts)[0], b: (typeof pts)[0], c: (typeof pts)[0]) =>
    Math.min(a.x, c.x) <= b.x &&
    b.x <= Math.max(a.x, c.x) &&
    Math.min(a.y, c.y) <= b.y &&
    b.y <= Math.max(a.y, c.y);
  const cross = (
    p1: (typeof pts)[0],
    q1: (typeof pts)[0],
    p2: (typeof pts)[0],
    q2: (typeof pts)[0]
  ) => {
    const o1 = orient(p1, q1, p2);
    const o2 = orient(p1, q1, q2);
    const o3 = orient(p2, q2, p1);
    const o4 = orient(p2, q2, q1);
    if (o1 !== o2 && o3 !== o4) return true;
    return (
      (o1 === 0 && onSegment(p1, p2, q1)) ||
      (o2 === 0 && onSegment(p1, q2, q1)) ||
      (o3 === 0 && onSegment(p2, p1, q2)) ||
      (o4 === 0 && onSegment(p2, q1, q2))
    );
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Neighbouring edges share a corner; that is not a crossing.
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (cross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
};
