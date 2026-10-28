import { describe, expect, it } from 'vitest';
import {
  insertAtNearestEdge,
  isSelfIntersecting,
  outlinesOverlap,
  polygonAreaHectares,
  snapToNeighbours,
  toLatLngPath
} from '../parcelPolygon';

describe('toLatLngPath', () => {
  it('passes the form shape through', () => {
    const path = [
      { lat: 44.54, lng: -123.1 },
      { lat: 44.53, lng: -123.1 },
      { lat: 44.53, lng: -123.11 }
    ];
    expect(toLatLngPath(path)).toEqual(path);
  });

  // The shape the seeders write (seed_showcase_walnut_farm, seed_comprehensive_demo*).
  it('converts a GeoJSON Polygon, swapping [lng, lat] and dropping the closing position', () => {
    const geo = {
      type: 'Polygon',
      coordinates: [
        [
          [-123.1072, 44.5418],
          [-123.1049, 44.5418],
          [-123.1049, 44.5397],
          [-123.1072, 44.5397],
          [-123.1072, 44.5418]
        ]
      ]
    };
    expect(toLatLngPath(geo)).toEqual([
      { lat: 44.5418, lng: -123.1072 },
      { lat: 44.5418, lng: -123.1049 },
      { lat: 44.5397, lng: -123.1049 },
      { lat: 44.5397, lng: -123.1072 }
    ]);
  });

  it('returns a spreadable array for anything else', () => {
    for (const v of [null, undefined, '', 'x', 42, {}, { type: 'Point', coordinates: [1, 2] }]) {
      expect(toLatLngPath(v)).toEqual([]);
      expect(() => [...toLatLngPath(v), { lat: 0, lng: 0 }]).not.toThrow();
    }
  });

  it('drops malformed points rather than passing them to the map', () => {
    expect(toLatLngPath([{ lat: 1, lng: 2 }, { lat: 'a', lng: 2 }, null])).toEqual([
      { lat: 1, lng: 2 }
    ]);
  });
});

// A field at 44.5°N, corners in order: NW, NE, SE, SW.
const field = [
  { lat: 44.541, lng: -123.111 },
  { lat: 44.541, lng: -123.109 },
  { lat: 44.539, lng: -123.109 },
  { lat: 44.539, lng: -123.111 }
];

describe('insertAtNearestEdge', () => {
  it('appends while the outline is still short of three corners', () => {
    expect(insertAtNearestEdge(field.slice(0, 2), field[2])).toEqual(field.slice(0, 3));
  });

  it('puts a corner tapped beside the north edge INTO that edge, not after the last corner', () => {
    // Appended, this corner joined SW to NW through the middle of the field: a bow-tie.
    const north = { lat: 44.5415, lng: -123.11 };
    const next = insertAtNearestEdge(field, north);
    expect(next).toEqual([field[0], north, field[1], field[2], field[3]]);
    expect(isSelfIntersecting(next)).toBe(false);
    expect(isSelfIntersecting([...field, north])).toBe(true);
  });

  it('still appends when the grower keeps walking the edge in order', () => {
    const west = { lat: 44.54, lng: -123.1115 };
    expect(insertAtNearestEdge(field, west)).toEqual([...field, west]);
  });
});

describe('isSelfIntersecting', () => {
  it('passes a plain field and a triangle', () => {
    expect(isSelfIntersecting(field)).toBe(false);
    expect(isSelfIntersecting(field.slice(0, 3))).toBe(false);
  });

  it('catches a bow-tie', () => {
    expect(isSelfIntersecting([field[0], field[2], field[1], field[3]])).toBe(true);
  });

  it('catches a corner dropped onto another edge', () => {
    const onEast = { lat: 44.54, lng: -123.109 };
    expect(isSelfIntersecting([field[0], field[1], field[2], onEast])).toBe(true);
  });
});

// About 100 m on a side at 44.5°N: 1° lat = 111,195 m on the sphere Google measures with.
const M_LAT = 1 / 111319.49;
const M_LNG = M_LAT / Math.cos((44.5 * Math.PI) / 180);
const square = (lat0: number, lng0: number, side: number) => [
  { lat: lat0, lng: lng0 },
  { lat: lat0, lng: lng0 + side * M_LNG },
  { lat: lat0 - side * M_LAT, lng: lng0 + side * M_LNG },
  { lat: lat0 - side * M_LAT, lng: lng0 }
];

describe('polygonAreaHectares', () => {
  it('measures a 100 m square as one hectare', () => {
    expect(polygonAreaHectares(square(44.5, -123.1, 100))).toBeCloseTo(1, 2);
  });

  it('is zero until the outline closes', () => {
    expect(polygonAreaHectares(square(44.5, -123.1, 100).slice(0, 2))).toBe(0);
  });
});

describe('snapToNeighbours', () => {
  const neighbour = square(44.5, -123.1, 100);

  it("lands on a neighbour's corner within the tolerance", () => {
    const near = { lat: neighbour[1].lat + 3 * M_LAT, lng: neighbour[1].lng + 2 * M_LNG };
    const snapped = snapToNeighbours(near, [neighbour], 5);
    expect(snapped.lat).toBeCloseTo(neighbour[1].lat, 9);
    expect(snapped.lng).toBeCloseTo(neighbour[1].lng, 9);
  });

  it('else lands on its nearest edge', () => {
    // 3 m east of the middle of the east edge.
    const near = { lat: 44.5 - 50 * M_LAT, lng: neighbour[1].lng + 3 * M_LNG };
    const snapped = snapToNeighbours(near, [neighbour], 5);
    expect(snapped.lng).toBeCloseTo(neighbour[1].lng, 9);
    expect(snapped.lat).toBeCloseTo(near.lat, 9);
  });

  it('leaves a corner alone when nothing is close', () => {
    const far = { lat: 44.5 - 50 * M_LAT, lng: neighbour[1].lng + 30 * M_LNG };
    expect(snapToNeighbours(far, [neighbour], 5)).toEqual(far);
  });
});

describe('outlinesOverlap', () => {
  const a = square(44.5, -123.1, 100);

  it('does not count a shared fence as an overlap', () => {
    const east = square(44.5, a[1].lng, 100);
    expect(outlinesOverlap(east, a)).toBe(false);
  });

  it('does not count a corner snapped onto the middle of an edge', () => {
    // A smaller parcel whose west edge runs along part of a's east edge.
    const b = [
      { lat: 44.5 - 20 * M_LAT, lng: a[1].lng },
      { lat: 44.5 - 20 * M_LAT, lng: a[1].lng + 50 * M_LNG },
      { lat: 44.5 - 70 * M_LAT, lng: a[1].lng + 50 * M_LNG },
      { lat: 44.5 - 70 * M_LAT, lng: a[1].lng }
    ];
    expect(outlinesOverlap(b, a)).toBe(false);
  });

  it('catches outlines that share ground', () => {
    expect(outlinesOverlap(square(44.5 - 50 * M_LAT, -123.1 + 50 * M_LNG, 100), a)).toBe(true);
  });

  it('catches one outline drawn inside another', () => {
    expect(outlinesOverlap(square(44.5 - 20 * M_LAT, -123.1 + 20 * M_LNG, 30), a)).toBe(true);
  });
});
