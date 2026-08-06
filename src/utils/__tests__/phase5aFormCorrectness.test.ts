/**
 * Phase 5A — four defects that made a form record something other than what the farmer entered.
 *
 * D3  BusinessEvent.type defaults to CE and BusinessTab never set it, so an inspection, a
 *     compliance filing and a carbon-credit transaction were all stored and displayed as
 *     "Certification Event". A fabricated certification is the highest-risk claim class under
 *     compliance.md, and it appeared on both the audit PDF and the consumer page.
 *
 * D4  HD (habitat development) and NS (nesting/shelter) existed on the backend and in the soil
 *     form but had no registry entry, so nothing described them on any display surface.
 *
 * D5  The registry binds the STRUCTURED amendment pair while the form writes the LEGACY
 *     CharField pair, and the normalizer allow-list carried neither the structured names. The
 *     amount a farmer typed showed on the PDF (which falls back) and nowhere else.
 *
 * D8  covered separately in the component; see EventPreviewModal.
 */

import { describe, expect, it } from 'vitest';

import { getFieldsForSurface, getSubtypes } from '../../config/events';
import {
  BUSINESS_ACTIVITY_TO_SUBTYPE,
  resolveBusinessSubtype
} from '../../config/events/businessSubtype';
import enUS from '../../i18n/lang/en-US.json';
import esES from '../../i18n/lang/es-419.json';
import { extractSubtypeCode, normalizeBackendEventData } from '../eventDataNormalizer';

describe('D3 — business activity resolves an honest subtype', () => {
  it('maps a certification to CE', () => {
    expect(resolveBusinessSubtype('certification')).toBe('CE');
  });

  it('never resolves a non-certification to CE', () => {
    // The whole defect: anything reaching CE renders as "Certification Event".
    for (const activity of Object.keys(BUSINESS_ACTIVITY_TO_SUBTYPE)) {
      if (activity === 'certification') continue;
      expect(
        resolveBusinessSubtype(activity),
        `${activity} must not read as a certification`
      ).not.toBe('CE');
    }
  });

  it('routes a third-party verification to an inspection', () => {
    expect(resolveBusinessSubtype('verification')).toBe('IN');
  });

  it('falls back to CM for an unknown activity, never CE', () => {
    // Legacy rows carry values like 'sale' that were never in the choice list.
    for (const junk of ['sale', '', null, undefined, 42]) {
      expect(resolveBusinessSubtype(junk)).toBe('CM');
    }
  });
});

describe('D4 — every backend soil subtype is described by the registry', () => {
  // history/models.py SOIL_TYPE_CHOICES.
  const BACKEND_SOIL_SUBTYPES = ['ST', 'PA', 'OM', 'CC', 'TI', 'CO', 'GR', 'HD', 'NS', 'LA'];

  it('registers all of them', () => {
    const codes = getSubtypes('soil_management').map((s) => s.code);
    for (const code of BACKEND_SOIL_SUBTYPES) {
      expect(
        codes,
        `${code} exists on the backend but nothing in the registry describes it`
      ).toContain(code);
    }
  });

  it('resolves each label in both locales', () => {
    for (const subtype of getSubtypes('soil_management')) {
      expect(enUS[subtype.labelKey], `missing en-US: ${subtype.labelKey}`).toBeTypeOf('string');
      expect(esES[subtype.labelKey], `missing es-419: ${subtype.labelKey}`).toBeTypeOf('string');
    }
  });

  it('declares the photo tier the backend actually applies', () => {
    // transparency_calculator.py owns the penalty; the registry only reports it. HD and NS are
    // in neither tier set, so promising a penalty here would misstate the farmer's score.
    const tiers = Object.fromEntries(
      getSubtypes('soil_management').map((s) => [s.code, s.photoTier])
    );
    expect(tiers.HD).toBe('optional');
    expect(tiers.NS).toBe('optional');
    expect(tiers.CC).toBe('essential'); // in PHOTO_TIER_ESSENTIAL
    expect(tiers.ST).toBe('recommended'); // in PHOTO_TIER_RECOMMENDED
    expect(tiers.LA).toBe('recommended'); // added alongside ST
  });
});

describe('D5 — an amendment amount displays however it was stored', () => {
  const soilEvent = (extra: Record<string, unknown>) =>
    normalizeBackendEventData(5, {
      id: 1,
      type: 'soil_management',
      event_type: 5,
      soil_management_type: 'OM',
      date: '2026-03-01T08:00:00Z',
      amendment_type: 'compost',
      ...extra
    }) as Record<string, unknown>;

  const amountOn = (event: Record<string, unknown>) => {
    const r = getFieldsForSurface(5, extractSubtypeCode(event) as never, 'consumer_card', event);
    return [...r.hero, ...r.immediate, ...r.secondary, ...r.details].find(
      (f) => f.name === 'amendment_amount_numeric'
    )?.formattedValue;
  };

  it('renders the structured pair', () => {
    expect(
      amountOn(soilEvent({ amendment_amount_numeric: 3500, amendment_amount_unit: 'kg' }))
    ).toContain('3,500');
  });

  it('falls back to the legacy pair the form actually writes', () => {
    // Before the fix this rendered nothing, while the PDF showed the amount.
    // Thousands separators are locale-dependent, so assert the magnitude and the unit.
    const value = amountOn(soilEvent({ amendment_amount: '3500', amendment_unit: 'kg' }));
    expect(value).toMatch(/3[,. ]?500/);
    expect(value).toContain('kg');
  });

  it('renders nothing when no amount was recorded', () => {
    expect(amountOn(soilEvent({}))).toBeUndefined();
  });

  it('keeps the structured value when both are present', () => {
    const value = amountOn(
      soilEvent({
        amendment_amount_numeric: 3500,
        amendment_amount_unit: 'kg',
        amendment_amount: 'about three tonnes'
      })
    );
    expect(value).toContain('3,500');
  });
});
