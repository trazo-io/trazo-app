/**
 * NOP raw-manure pre-harvest interval on GRAZING events (7 CFR 205.203(c)(1)).
 *
 * Found 2026-07-31 by logging a real CA organic walnut season through the UI:
 * a "Targeted sheep grazing" event offered no interval fields at all, because
 * `manure_harvest_interval` / `manure_application_date` were gated to the OM
 * (Organic Matter Addition) subtype only. Livestock turned into a crop
 * production area deposit RAW manure, so the same 90/120-day interval applies
 * as for a spreader pass — 120 days where the edible portion contacts the soil,
 * 90 days where it does not.
 *
 * Sources:
 *  - 7 CFR 205.203(c)(1)(ii)-(iii)
 *  - Oregon Tilth: "Livestock grazing ... follows the same rules for raw manure.
 *    Animals must be removed either 90 or 120 days prior to harvest."
 *  - AMS/NCAT "Manure in Organic Production Systems" illustrates the hazard with
 *    a photo of sheep grazing a walnut orchard.
 *
 * Without these fields the audit packet documented sheep in an orchard and no
 * interval — the first thing an inspector asks about when they see livestock in
 * a crop field.
 */

import { describe, expect, it } from 'vitest';

import { getFieldsForSurface } from '../index';
import type { ResolvedFieldSet } from '../index';

const fieldNames = (result: ResolvedFieldSet) =>
  [...result.hero, ...result.immediate, ...result.secondary, ...result.details].map((f) => f.name);

const resolve = (subtype: string, surface: string, event: Record<string, unknown>) =>
  fieldNames(
    getFieldsForSurface(
      'soil_management',
      subtype as never,
      surface as never,
      event
    ) as ResolvedFieldSet
  );

const grazingEvent = {
  event_type: 5,
  soil_management_type: 'GR',
  area_covered: 42.5,
  area_unit: 'acres',
  name: 'Targeted sheep grazing - cover crop and weed management',
  animal_type: 'sheep',
  animal_count: 180,
  grazing_duration_days: 12,
  manure_harvest_interval: '90',
  manure_application_date: '2025-03-30'
};

const amendmentEvent = {
  event_type: 5,
  soil_management_type: 'OM',
  area_covered: 42.5,
  area_unit: 'acres',
  name: 'OMRI-listed compost application',
  amendment_type: 'compost',
  manure_treatment: 'composted',
  manure_harvest_interval: 'na',
  manure_application_date: '2025-03-04'
};

describe('grazing (GR) exposes the raw-manure pre-harvest interval', () => {
  it('offers manure_harvest_interval on the grazing form', () => {
    const names = resolve('GR', 'form', grazingEvent);
    expect(names).toContain('manure_harvest_interval');
  });

  it('offers manure_application_date on the grazing form (date animals came OFF)', () => {
    const names = resolve('GR', 'form', grazingEvent);
    expect(names).toContain('manure_application_date');
  });

  it('surfaces the interval to the certifier modal', () => {
    const names = resolve('GR', 'modal', grazingEvent);
    expect(names).toContain('manure_harvest_interval');
  });

  it('does NOT offer manure_treatment on grazing', () => {
    // Manure deposited by a grazing animal is raw by definition. Offering
    // "composted" / "processed" here would invite a claim the practice cannot
    // support, and composted/processed are what make an application
    // interval-EXEMPT under 205.203(c)(2)-(3).
    const names = resolve('GR', 'form', grazingEvent);
    expect(names).not.toContain('manure_treatment');
  });

  it('still offers the full manure field set on amendment (OM) events', () => {
    const names = resolve('OM', 'form', amendmentEvent);
    expect(names).toContain('manure_harvest_interval');
    expect(names).toContain('manure_application_date');
    expect(names).toContain('manure_treatment');
  });
});
