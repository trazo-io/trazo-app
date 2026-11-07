/**
 * An emptied form input is '' and must resolve to no field at all (2026-11-07).
 *
 * The buffer-zone formatter is `v != null ? `${v} m` : null`, and many formatters share that
 * shape, so '' came out as " m": the activity wizard's review printed "Buffer Zone: m" for a
 * spray with no buffer entered. The resolver now drops an empty or blank string before any
 * formatter sees it.
 */
import { describe, expect, it } from 'vitest';

import { getFieldsForSurface } from '../index';

const names = (event: Record<string, unknown>) => {
  const set = getFieldsForSurface('chemical', 'PE', 'modal', event as never);
  return [...set.hero, ...set.immediate, ...set.secondary, ...set.details].map((f) => [
    f.name,
    f.formattedValue
  ]);
};

describe('an empty string is no value', () => {
  it.each(['', '   '])('buffer_zone_meters %j resolves to nothing', (value) => {
    const fields = names({ event_type: 2, type: 'PE', buffer_zone_meters: value });
    expect(fields.find(([n]) => n === 'buffer_zone_meters')).toBeUndefined();
  });

  it('a real buffer still prints with its unit', () => {
    const fields = names({ event_type: 2, type: 'PE', buffer_zone_meters: '8' });
    expect(fields.find(([n]) => n === 'buffer_zone_meters')).toEqual(['buffer_zone_meters', '8 m']);
  });

  it('a blank group anchor still shows its companions (review comment on #312)', () => {
    const set = getFieldsForSurface('soil_management', 'ST', 'modal', {
      event_type: 5,
      type: 'ST',
      lab_nitrogen: '',
      lab_phosphorus: '12',
      lab_potassium: '150'
    } as never);
    const npk = [...set.hero, ...set.immediate, ...set.secondary, ...set.details].find(
      (f) => f.name === 'lab_nitrogen'
    );
    expect(npk?.formattedValue).toBe('— / 12 / 150');
  });
});
