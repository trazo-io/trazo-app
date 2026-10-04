import { describe, expect, it } from 'vitest';
import { toLatLngPath } from '../parcelPolygon';

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
