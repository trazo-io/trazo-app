// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { findPlace, parseCoordinates } from '../mapPlaceSearch';

describe('parseCoordinates', () => {
  it.each([
    ['44.5402, -123.1089', { lat: 44.5402, lng: -123.1089 }],
    ['44.5402 -123.1089', { lat: 44.5402, lng: -123.1089 }],
    ['  44.5402,-123.1089  ', { lat: 44.5402, lng: -123.1089 }],
    ['44.5402° N, 123.1089° W', { lat: 44.5402, lng: -123.1089 }],
    ['44.5402N 123.1089W', { lat: 44.5402, lng: -123.1089 }],
    [
      'https://www.google.com/maps/@44.5402,-123.1089,17z?entry=ttu',
      { lat: 44.5402, lng: -123.1089 }
    ],
    // A dropped pin: its own position (!3d!4d), not the camera's (@).
    [
      'https://www.google.com/maps/place/44%C2%B032/@44.5,-123.2,15z/data=!3m1!4b1!4m4!3m3!8m2!3d44.5402!4d-123.1089',
      { lat: 44.5402, lng: -123.1089 }
    ],
    ['https://maps.google.com/?q=44.5402,-123.1089', { lat: 44.5402, lng: -123.1089 }],
    [
      'https://www.google.com/maps/search/?api=1&query=44.5402%2C-123.1089',
      { lat: 44.5402, lng: -123.1089 }
    ]
  ])('reads %s', (text, expected) => {
    expect(parseCoordinates(text)).toEqual(expected);
  });

  it.each(['Tangent, OR', '97389', 'Smith Road', '', '95.1, -123.1', '44.5, -190'])(
    'leaves %s to the geocoder (or rejects it)',
    (text) => {
      expect(parseCoordinates(text)).toBeNull();
    }
  );
});

describe('findPlace', () => {
  const realGoogle = (window as any).google;
  afterEach(() => {
    (window as any).google = realGoogle;
  });

  const geocoderAnswering = (status: string, results: unknown[] = []) => {
    (window as any).google = {
      maps: {
        Geocoder: class {
          geocode(_req: unknown, cb: (r: unknown[], s: string) => void) {
            cb(results, status);
          }
        }
      }
    };
  };

  const result = (address: string, type: string) => ({
    formatted_address: address,
    geometry: {
      location: { toJSON: () => ({ lat: 44.53, lng: -123.1 }) },
      viewport: { toJSON: () => ({ north: 44.6, south: 44.5, east: -123, west: -123.2 }) },
      location_type: type
    }
  });

  it('answers coordinates without asking Google at all', async () => {
    (window as any).google = undefined;
    expect(await findPlace('44.54, -123.11')).toMatchObject({
      status: 'found',
      places: [{ center: { lat: 44.54, lng: -123.11 }, approximate: false }]
    });
  });

  it('marks a town or ZIP result as approximate, a street address as not', async () => {
    geocoderAnswering('OK', [
      result('Tangent, OR, USA', 'APPROXIMATE'),
      result('33000 Tangent Dr, Tangent, OR', 'ROOFTOP')
    ]);
    const found = await findPlace('Tangent');
    expect(found.status).toBe('found');
    if (found.status !== 'found') return;
    expect(found.places.map((p) => [p.label, p.approximate])).toEqual([
      ['Tangent, OR, USA', true],
      ['33000 Tangent Dr, Tangent, OR', false]
    ]);
    expect(found.places[0].viewport).toEqual({
      north: 44.6,
      south: 44.5,
      east: -123,
      west: -123.2
    });
  });

  it('tells "nothing there" apart from "search refused"', async () => {
    geocoderAnswering('ZERO_RESULTS');
    expect(await findPlace('Nowhereville')).toEqual({ status: 'none' });
    // What a key without the Geocoding API gets back.
    geocoderAnswering('REQUEST_DENIED');
    expect(await findPlace('Tangent')).toEqual({ status: 'unavailable' });
  });
});
