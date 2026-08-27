/**
 * The timeline card is RECORDS-FIRST, for every activity type (2026-08-27).
 *
 * Found on the producer timeline: `fuel_consumed` held a headline slot on 12 production
 * subtypes — a carbon-calculation INPUT promoted above the record facts, on a card that
 * already carries the kg CO2e line — while four subtypes (PO, TP, BU, SS) had NO timeline
 * fields at all, so a § 205.204(a)(1) seed search rendered as a bare description. Two
 * invariants, pinned for all seven families:
 *
 *  1. No carbon-relevant field takes a timeline slot. Fuel, kWh and friends feed the
 *     calculation and live in the modal's detail tiers; the card's carbon story is the
 *     computed kg CO2e line, once.
 *  2. Every subtype with any timeline-capable typed field shows at least one NON-carbon
 *     record fact on the card — no subtype's record renders as description-only.
 */
import { describe, expect, it } from 'vitest';

import { businessEventRegistry } from '../businessEvent';
import { chemicalEventRegistry } from '../chemicalEvent';
import { generalEventRegistry } from '../generalEvent';
import { pestEventRegistry } from '../pestEvent';
import { productionEventRegistry } from '../productionEvent';
import { soilEventRegistry } from '../soilEvent';
import { weatherEventRegistry } from '../weatherEvent';

const REGISTRIES = [
  productionEventRegistry,
  chemicalEventRegistry,
  soilEventRegistry,
  pestEventRegistry,
  weatherEventRegistry,
  generalEventRegistry,
  businessEventRegistry
] as Array<{
  eventTypeName: string;
  subtypes?: Array<{ code: string }>;
  fields: Array<{
    name: string;
    carbonRelevant?: boolean;
    visibleForSubtypes?: string[];
    surfaces: Record<string, string | undefined>;
  }>;
}>;

const timelineTier = (f: { surfaces: Record<string, string | undefined> }) => f.surfaces.timeline;

describe('timeline surface is records-first', () => {
  it('never gives a carbon-relevant field a timeline slot', () => {
    const offenders = REGISTRIES.flatMap((r) =>
      r.fields
        .filter((f) => f.carbonRelevant && timelineTier(f))
        .map((f) => `${r.eventTypeName}.${f.name}`)
    );
    expect(offenders).toEqual([]);
  });

  it('gives every subtype at least one non-carbon timeline field', () => {
    const empty: string[] = [];
    for (const r of REGISTRIES) {
      for (const st of r.subtypes ?? []) {
        const has = r.fields.some(
          (f) =>
            !f.carbonRelevant &&
            (timelineTier(f) === 'hero' || timelineTier(f) === 'immediate') &&
            (!f.visibleForSubtypes || f.visibleForSubtypes.includes(st.code))
        );
        if (!has) empty.push(`${r.eventTypeName}.${st.code}`);
      }
    }
    expect(empty).toEqual([]);
  });

  it('pins the four subtypes the 2026-08-27 audit found empty', () => {
    // Guard-the-guard: these went from zero timeline fields to real record facts —
    // if the registry parse above ever goes vacuous, this stays concrete.
    const byName = Object.fromEntries(productionEventRegistry.fields.map((f) => [f.name, f]));
    expect(timelineTier(byName.seed_search_attempts)).toBe('immediate'); // SS
    expect(timelineTier(byName.pollinator_type)).toBe('immediate'); // PO
    expect(timelineTier(byName.transport_origin)).toBe('immediate'); // TP
    expect(timelineTier(byName.buffer_disposition)).toBe('immediate'); // BU
    expect(timelineTier(byName.fuel_consumed)).toBeUndefined();
  });
});
