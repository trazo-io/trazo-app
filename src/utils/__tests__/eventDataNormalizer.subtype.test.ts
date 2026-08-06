/**
 * Regression: normalized events must expose the two-letter sub-type code.
 *
 * `createBaseEvent` overwrites `type` with the event FAMILY name ('chemical', 'production',
 * …) because chapter routing and the field-registry bridge key on the family. That silently
 * made every `event.type === 'FE'` comparison in ConsumerEventCard false, so aggregate
 * (summary-mode) events rendered their header with none of their totals — grazing days,
 * N/P/K totals, scouting area all vanished from the consumer page.
 *
 * `subtype` carries the code so those branches fire. If this test fails, aggregate events
 * are silently blank on the consumer QR page again.
 */
import { describe, it, expect } from 'vitest';
import { extractSubtypeCode, normalizeEventData } from '../eventDataNormalizer';

describe('extractSubtypeCode', () => {
  it('reads the per-family key the consumer API sends', () => {
    expect(extractSubtypeCode({ chemical_type: 'FE' })).toBe('FE');
    expect(extractSubtypeCode({ production_type: 'HA' })).toBe('HA');
    expect(extractSubtypeCode({ soil_management_type: 'GR' })).toBe('GR');
    expect(extractSubtypeCode({ pest_management_type: 'SC' })).toBe('SC');
    expect(extractSubtypeCode({ business_event_type: 'CE' })).toBe('CE');
    expect(extractSubtypeCode({ operation_type: 'CL' })).toBe('CL');
  });

  it('falls back to `type` for families that send the bare code (weather, legacy rows)', () => {
    expect(extractSubtypeCode({ type: 'FR' })).toBe('FR');
  });

  it('is idempotent on an already-normalized event', () => {
    expect(extractSubtypeCode({ subtype: 'FE', type: 'chemical' })).toBe('FE');
  });

  it('never mistakes a family name in `type` for a sub-type code', () => {
    // This is the actual bug: post-normalization `type` is 'chemical', and treating it as
    // a code would resolve to a nonsense sub-type instead of undefined.
    expect(extractSubtypeCode({ type: 'chemical' })).toBeUndefined();
    expect(extractSubtypeCode({ type: 'soil_management' })).toBeUndefined();
    expect(extractSubtypeCode({ type: 'production' })).toBeUndefined();
  });

  it('returns undefined when nothing identifies the sub-type', () => {
    expect(extractSubtypeCode({})).toBeUndefined();
    expect(extractSubtypeCode(null)).toBeUndefined();
    expect(extractSubtypeCode({ type: '' })).toBeUndefined();
  });

  it('tolerates surrounding whitespace', () => {
    expect(extractSubtypeCode({ chemical_type: ' FE ' })).toBe('FE');
  });

  it('prefers the family-specific key over a stale `type`', () => {
    expect(extractSubtypeCode({ production_type: 'IR', type: 'production' })).toBe('IR');
  });

  it('falls through an unrecognised earlier candidate to a valid later one', () => {
    // A first-truthy-then-validate chain would stop at the bad `subtype` and return
    // undefined, discarding the perfectly good chemical_type sitting behind it.
    expect(extractSubtypeCode({ subtype: 'not-a-code', chemical_type: 'FU' })).toBe('FU');
    expect(extractSubtypeCode({ production_type: 'Harvesting', type: 'HA' })).toBe('HA');
  });
});

describe('normalizeEventData populates subtype end to end', () => {
  it('carries the sub-type through a backend chemical event', () => {
    const event = normalizeEventData(
      2,
      { id: '1', chemical_type: 'FE', type: 'chemical' },
      'backend'
    );
    expect(event.subtype).toBe('FE');
    // The family name must still be on `type` — chapter routing keys on it.
    expect(event.type).toBe('chemical');
  });

  it('carries the sub-type through a form-sourced production event', () => {
    const event = normalizeEventData(1, { type: 'HA', name: 'Harvest' }, 'form');
    expect(event.subtype).toBe('HA');
    expect(event.type).toBe('production');
  });

  it('resolves a sub-type that only the per-type builder synthesizes', () => {
    // normalizeBusinessEventData assigns business_event_type='CE' for form data AFTER
    // createBaseEvent has run, so the sub-type must be resolved again post-merge.
    const event = normalizeEventData(7, { business_type: 'certification' }, 'form');
    expect(event.subtype).toBe('CE');
  });

  it('leaves subtype undefined for a general activity slug', () => {
    const event = normalizeEventData(3, { type: 'maintenance', name: 'Shop cleanup' }, 'form');
    expect(event.subtype).toBeUndefined();
  });
});
