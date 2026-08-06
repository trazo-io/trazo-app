/**
 * A boolean form default must never be decided by JS truthiness.
 *
 * The wizard round-trips its form state through `initialValues` as STRINGS. The string 'false'
 * is truthy, so `initialValues.x ? 'true' : 'false'` evaluated to 'true' the moment step 2
 * re-rendered — and ProductionTab used that idiom for `shared_with_conventional`,
 * `rinse_step_documented` and (briefly) `operator_is_custom`.
 *
 * The consequence was not cosmetic. Every production event silently claimed the farm shares
 * equipment with a conventional operation and that a rinse step was documented — two factual
 * § 205.272 assertions its owner never made, on the record a certifier reads. It was found by
 * creating an event through the real wizard and touching nothing: the row came back `true`.
 */

import { describe, expect, it } from 'vitest';

import { asToggle } from '../formToggle';

describe('asToggle', () => {
  it('treats the string "false" as false — the actual defect', () => {
    expect(asToggle('false')).toBe('false');
  });

  it('treats every falsy-in-intent value as false', () => {
    for (const v of [false, 'false', 0, '0', '', null, undefined, 'False']) {
      expect(asToggle(v), `${JSON.stringify(v)} should read as "false"`).toBe('false');
    }
  });

  it('treats only genuine affirmatives as true', () => {
    for (const v of [true, 'true', 1, '1']) {
      expect(asToggle(v), `${JSON.stringify(v)} should read as "true"`).toBe('true');
    }
  });

  it('round-trips its own output, so a re-render cannot flip the value', () => {
    expect(asToggle(asToggle(false))).toBe('false');
    expect(asToggle(asToggle('false'))).toBe('false');
    expect(asToggle(asToggle(true))).toBe('true');
  });
});
