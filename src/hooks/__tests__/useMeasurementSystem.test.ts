/**
 * Unit-default resolution (2026-07-31 CA walnut pilot QA).
 *
 * Event forms defaulted to hectares / litres / kilograms on a US-only product, so a
 * California grower converted 42.5 acres to 17.2 ha by hand on every parcel and every
 * fuel figure from gallons to litres on every event.
 */
import { describe, expect, it } from 'vitest';

import { resolveMeasurementSystem } from '../useMeasurementSystem';

describe('resolveMeasurementSystem', () => {
  it('uses an explicit US country', () => {
    for (const c of ['US', 'usa', 'United States', 'united states of america', 'EEUU']) {
      expect(resolveMeasurementSystem(c, null), c).toBe('imperial');
    }
  });

  it('uses an explicit non-US country even when a state-like code is present', () => {
    // "CA" is also a plausible province code; an explicit country always wins.
    expect(resolveMeasurementSystem('Uruguay', 'CA')).toBe('metric');
    expect(resolveMeasurementSystem('Canada', 'CA')).toBe('metric');
  });

  it('falls back to the state code when country is null', () => {
    // Establishment.country is nullable and is in fact NULL on real records, while
    // `state` is populated — this is the path that actually runs in production.
    expect(resolveMeasurementSystem(null, 'CA')).toBe('imperial');
    expect(resolveMeasurementSystem(undefined, 'TX')).toBe('imperial');
    expect(resolveMeasurementSystem('', 'pr')).toBe('imperial');
  });

  it('defaults to imperial when nothing is known', () => {
    // Trazo's crop catalogue, emission factors and ICP are all US.
    expect(resolveMeasurementSystem(null, null)).toBe('imperial');
    expect(resolveMeasurementSystem('', '')).toBe('imperial');
  });

  it('is whitespace and case tolerant', () => {
    expect(resolveMeasurementSystem('  united states  ', null)).toBe('imperial');
    expect(resolveMeasurementSystem(null, '  ca ')).toBe('imperial');
  });
});
