import { describe, expect, it } from 'vitest';
import { insertAtNearestEdge, isSelfIntersecting, toLatLngPath } from '../parcelPolygon';

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
