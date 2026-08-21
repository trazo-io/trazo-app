/**
 * Retiring an option from a picker must never delete the answer someone already gave.
 *
 * A `<select>` bound to a value with no matching `<option>` renders the placeholder, and the
 * next save writes `''`. So when `usda_nop_approved` and `organic_equivalent` were retired
 * from the chemical picker on 2026-08-15 — correctly; the NOP approves no products and
 * "organic equivalent" is a self-assessment — every older record a grower reopened lost its
 * recorded § 205.601 / § 205.203(b) verification basis on the next save. Silently, on records
 * already filed with a certifier.
 *
 * The forms now keep a retired value selectable, labelled as retired, until the grower
 * deliberately replaces it.
 */
import { describe, expect, it } from 'vitest';

import {
  ORGANIC_APPROVED_OFFERED,
  retiredOrganicApprovedLabelKey
} from '../enums';

describe('retiredOrganicApprovedLabelKey', () => {
  it.each(ORGANIC_APPROVED_OFFERED)('returns null for the offered value %s', (value) => {
    expect(retiredOrganicApprovedLabelKey(value)).toBeNull();
  });

  it.each([
    ['usda_nop_approved', 'events.organicApproved.usdaNop'],
    ['organic_equivalent', 'events.organicApproved.organicEquivalent'],
    ['yes', 'quickAdd.fields.organicApproved.legacyYes'],
    ['no', 'quickAdd.fields.organicApproved.legacyNo'],
    ['not_applicable', 'events.organicApproved.notApplicable']
  ])('keeps the retired value %s renderable', (value, key) => {
    expect(retiredOrganicApprovedLabelKey(value)).toBe(key);
  });

  it('returns null for nothing recorded, so no stray option is rendered', () => {
    expect(retiredOrganicApprovedLabelKey('')).toBeNull();
    expect(retiredOrganicApprovedLabelKey(null)).toBeNull();
    expect(retiredOrganicApprovedLabelKey(undefined)).toBeNull();
  });

  it('covers every value the backend enum can hold', async () => {
    // Mirrors ORGANIC_APPROVED in common/field_registry.py. A value the backend accepts but
    // this map does not know would render an option with no label.
    const backendValues = [
      'yes',
      'no',
      'not_applicable',
      'omri_listed',
      'wsda_listed',
      'nop_seal_on_label',
      'certifier_approved',
      'usda_nop_approved',
      'organic_equivalent',
      'not_organic',
      'transitional'
    ];
    for (const value of backendValues) {
      const offered = ORGANIC_APPROVED_OFFERED.includes(value);
      const key = retiredOrganicApprovedLabelKey(value);
      expect(offered ? key === null : typeof key === 'string').toBe(true);
    }
  });
});
