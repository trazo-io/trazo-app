/**
 * The frontend half of the state contract must match `common/us_states.py` exactly.
 * If these two drift, a surface gated on 'CA' in the UI disagrees with the backend
 * that gates the same feature — which is how a Florida grower got shown a
 * "Generate PUR" button for a California-only filing.
 */
import { describe, expect, it } from 'vitest';

import { US_STATES, US_STATE_CODES, isState, normalizeState } from '../usStates';

describe('normalizeState', () => {
  it('accepts codes in any case, with whitespace', () => {
    expect(normalizeState('CA')).toBe('CA');
    expect(normalizeState('ca')).toBe('CA');
    expect(normalizeState('  fl  ')).toBe('FL');
  });

  it('accepts exact full names', () => {
    expect(normalizeState('California')).toBe('CA');
    expect(normalizeState('florida')).toBe('FL');
    expect(normalizeState('New York')).toBe('NY');
  });

  it('returns null for blank and nullish input', () => {
    expect(normalizeState('')).toBeNull();
    expect(normalizeState('   ')).toBeNull();
    expect(normalizeState(null)).toBeNull();
    expect(normalizeState(undefined)).toBeNull();
  });

  it('returns null rather than guessing — never California', () => {
    expect(normalizeState('Test State')).toBeNull();
    expect(normalizeState('XX')).toBeNull();
    expect(normalizeState('Calif')).toBeNull();
    // A Mexican state; a prefix match would wrongly resolve this to CA.
    expect(normalizeState('Baja California')).toBeNull();
    // A Uruguayan department present on a real row.
    expect(normalizeState('Salto')).toBeNull();
  });

  it('round-trips every state and territory', () => {
    US_STATES.forEach(({ code, name }) => {
      expect(normalizeState(code)).toBe(code);
      expect(normalizeState(name)).toBe(code);
    });
  });
});

describe('US_STATES', () => {
  it('covers 50 states plus DC and five territories', () => {
    expect(US_STATES).toHaveLength(56);
    expect(US_STATE_CODES.size).toBe(56);
  });

  it('has no duplicate codes', () => {
    expect(new Set(US_STATES.map((s) => s.code)).size).toBe(US_STATES.length);
  });
});

describe('isState', () => {
  it('matches regardless of stored format', () => {
    expect(isState('California', 'CA')).toBe(true);
    expect(isState('ca', 'CA')).toBe(true);
  });

  it('is false for a different state', () => {
    expect(isState('Florida', 'CA')).toBe(false);
  });

  it('is false for an unknown state — absence is not California', () => {
    expect(isState('', 'CA')).toBe(false);
    expect(isState(null, 'CA')).toBe(false);
    expect(isState('Baja California', 'CA')).toBe(false);
  });
});
