/**
 * Weather readback units (Astra audit AC-01, AC-10).
 *
 * AC-01: a 7-minute hailstorm read "7 hours" on the card and the detail. The form stores hail
 * duration in MINUTES and the other four subtypes in HOURS, in the same `duration` key.
 * AC-10: water deficit, wind speed, precipitation and humidity printed a bare number.
 *
 * Every assertion goes through the real resolver, the way a detail modal and a card read it.
 */
import { describe, expect, it } from 'vitest';

import { formatFieldValue, getFieldsForSurface } from '../index';
import { localizeFieldValue } from 'utils/fieldDisplayUtils';

type Surface = 'modal' | 'timeline' | 'consumer_card';

const read = (subtype: string, field: string, value: unknown, surface: Surface = 'modal') => {
  const event = { event_type: 0, type: subtype, weather_type: subtype, [field]: value };
  const set = getFieldsForSurface(0, subtype as never, surface, event as never);
  const row = [...set.hero, ...set.immediate, ...set.secondary, ...set.details].find(
    (f) => f.name === field
  );
  return row ? row.formattedValue : undefined;
};

describe('duration carries the unit the form collected', () => {
  it('hail (HL) is minutes', () => {
    expect(read('HL', 'duration', '7')).toBe('7 minutes');
    expect(read('HL', 'duration', 7)).toBe('7 minutes');
    expect(read('HL', 'duration', 1)).toBe('1 minute');
  });

  it.each(['TS', 'HW', 'HH', 'LH'])('%s is hours', (subtype) => {
    expect(read(subtype, 'duration', '7')).toBe('7 hours');
    expect(read(subtype, 'duration', 1)).toBe('1 hour');
  });

  it('never says hours for a hailstorm, on any surface that shows it', () => {
    for (const surface of ['modal', 'timeline', 'consumer_card'] as const) {
      const v = read('HL', 'duration', '7', surface);
      expect(v, surface).toBe('7 minutes');
    }
  });

  it('a zero or empty duration is nothing recorded, not "0 hours"', () => {
    expect(read('HL', 'duration', 0)).toBeUndefined();
    expect(read('TS', 'duration', '')).toBeUndefined();
    expect(read('TS', 'duration', 0)).toBeUndefined();
  });

  it('a subtype the form never asks duration for does not show it', () => {
    expect(read('FR', 'duration', '7')).toBeUndefined();
    expect(read('DR', 'duration', '7')).toBeUndefined();
  });

  it('formatFieldValue (voice chips) picks the declaration that owns the subtype', () => {
    expect(formatFieldValue(0, 'duration', { type: 'HL', duration: 7 })).toBe('7 minutes');
    expect(formatFieldValue(0, 'duration', { type: 'TS', duration: 7 })).toBe('7 hours');
  });

  it('reads in Spanish through the same map the consumer card uses', () => {
    expect(localizeFieldValue(read('HL', 'duration', 7), 'es-419')).toBe('7 minutos');
    expect(localizeFieldValue(read('HL', 'duration', 1), 'es-419')).toBe('1 minuto');
    expect(localizeFieldValue(read('TS', 'duration', 7), 'es-419')).toBe('7 horas');
  });
});

describe('measurements keep their unit', () => {
  it.each([
    ['DR', 'water_deficit', '15', '15 mm'],
    ['TS', 'wind_speed', '60', '60 km/h'],
    ['HW', 'wind_speed', 60, '60 km/h'],
    ['TS', 'precipitation_amount', '20', '20 mm'],
    ['HH', 'humidity_level', '90', '90%'],
    ['LH', 'humidity_level', 20, '20%']
  ])('%s %s = %s reads %s', (subtype, field, value, expected) => {
    expect(read(subtype, field, value)).toBe(expected);
  });

  it('does not double the unit when the value already names one', () => {
    expect(read('TS', 'wind_speed', '60 km/h')).toBe('60 km/h');
    expect(read('DR', 'water_deficit', '15 mm')).toBe('15 mm');
  });

  it('units are symbols, so Spanish needs no translation and is not mangled', () => {
    for (const [subtype, field, value] of [
      ['DR', 'water_deficit', '15'],
      ['TS', 'wind_speed', '60'],
      ['HH', 'humidity_level', '90']
    ] as const) {
      const en = read(subtype, field, value);
      expect(localizeFieldValue(en, 'es-419')).toBe(en);
    }
  });
});
