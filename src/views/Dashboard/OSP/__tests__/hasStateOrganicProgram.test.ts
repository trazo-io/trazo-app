import { describe, expect, it } from 'vitest';

import { hasStateOrganicProgram } from '../StateOrganicRegistrationCard';

/**
 * The certifier-deadlines strip asks for state organic registrations only where a State
 * Organic Program exists. Before 2026-09-06 every farm paid that request on every dashboard
 * load; Calapooia Bend (OR) got an empty list back each time.
 */
describe('hasStateOrganicProgram', () => {
  it('is true for California in any casing or padding', () => {
    expect(hasStateOrganicProgram('CA')).toBe(true);
    expect(hasStateOrganicProgram(' ca ')).toBe(true);
  });

  it('is false for a known state without a program', () => {
    expect(hasStateOrganicProgram('OR')).toBe(false);
    expect(hasStateOrganicProgram('WA')).toBe(false);
  });

  it('never excludes a farm whose state is unknown', () => {
    expect(hasStateOrganicProgram(undefined)).toBe(true);
    expect(hasStateOrganicProgram(null)).toBe(true);
    expect(hasStateOrganicProgram('')).toBe(true);
  });
});
