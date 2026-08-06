/**
 * Smart Setup Templates are OPT-IN, and must never fabricate prohibited-substance records
 * (2026-08-02 multi-parcel QA).
 *
 * Originally, choosing a crop auto-selected the first matching template and every one of its
 * pre-configured events defaulted to enabled. Those events are saved as REAL, backdated event
 * rows attributed to the farmer by name — not drafts. So starting a walnut production on a
 * CERTIFIED ORGANIC farm wrote ~20 operations the grower never performed, including
 * "Roundup PowerMax 3 (glyphosate)" (`organic_approved: 'not_organic'`,
 * `performed_by: <the real grower>`) — a § 205.105 hard disqualification in the certifier
 * dossier and a synthetic herbicide on the consumer QR page.
 *
 * Now there are two deliberate opt-ins: picking the template, then ticking the events. This file
 * pins the second guarantee — that "Select all" can never bulk-accept a prohibited input.
 */
import { describe, expect, it } from 'vitest';

import { isTemplateEventProhibited } from '../QuickStartProduction';

const glyphosate = {
  name: 'Herbicide Application',
  backend_event_fields: {
    commercial_name: 'Roundup PowerMax 3 (glyphosate)',
    organic_approved: 'not_organic',
    chemical_subtype: 'synthetic_herbicide'
  }
};

const copperFungicide = {
  name: 'Fungicide Application',
  backend_event_fields: {
    commercial_name: 'Kocide 3000 (copper hydroxide)',
    organic_approved: 'organic',
    chemical_subtype: 'organic_fungicide'
  }
};

const harvest = { name: 'Harvest', backend_event_fields: {} };

describe('isTemplateEventProhibited', () => {
  it('flags a prohibited input on an organic operation', () => {
    expect(isTemplateEventProhibited(glyphosate, 'organic')).toBe(true);
  });

  it('applies the same rule to regenerative operations', () => {
    expect(isTemplateEventProhibited(glyphosate, 'regenerative')).toBe(true);
  });

  it('does not flag organic-approved inputs', () => {
    // Copper hydroxide is allowed under § 205.601 — "Select all" must still include it, or the
    // feature stops being a time-saver and farmers go back to manual entry.
    expect(isTemplateEventProhibited(copperFungicide, 'organic')).toBe(false);
    expect(isTemplateEventProhibited(harvest, 'organic')).toBe(false);
  });

  it('leaves conventional operations untouched', () => {
    // A conventional grower applying glyphosate is a legitimate record.
    expect(isTemplateEventProhibited(glyphosate, 'conventional')).toBe(false);
    expect(isTemplateEventProhibited(glyphosate, '')).toBe(false);
    expect(isTemplateEventProhibited(glyphosate, undefined)).toBe(false);
  });

  it('catches a synthetic subtype even when organic_approved is unset', () => {
    const partial = { backend_event_fields: { chemical_subtype: 'synthetic_pesticide' } };
    expect(isTemplateEventProhibited(partial, 'organic')).toBe(true);
  });

  it('reads the attributes whether nested or flattened onto the event', () => {
    // The mapper spreads backend_event_fields onto the event, so both shapes occur in practice.
    const flattened = { name: 'Herbicide', organic_approved: 'not_organic' };
    expect(isTemplateEventProhibited(flattened, 'organic')).toBe(true);
  });

  it('is case-insensitive about the production method', () => {
    expect(isTemplateEventProhibited(glyphosate, 'Organic')).toBe(true);
  });

  it('does not throw on a malformed event', () => {
    expect(isTemplateEventProhibited(undefined, 'organic')).toBe(false);
    expect(isTemplateEventProhibited({}, 'organic')).toBe(false);
  });
});

describe('"Select all" semantics', () => {
  // Mirrors handleToggleAll / allSelectableEventsEnabled in QuickStartProduction.
  const method = 'organic';
  const events = [glyphosate, copperFungicide, harvest];
  const selectAll = (evs: any[]) =>
    evs.map((e) => ({ ...e, enabled: !isTemplateEventProhibited(e, method) }));

  it('turns on every permitted event and no prohibited one', () => {
    const result = selectAll(events);
    expect(result.map((e) => e.enabled)).toEqual([false, true, true]);
  });

  it('reports "all selected" from the selectable events only', () => {
    // Counting the prohibited event would make this permanently false on an organic farm, and
    // the master switch could never be used to clear the list again.
    const afterSelectAll = selectAll(events);
    const selectable = afterSelectAll.filter((e) => !isTemplateEventProhibited(e, method));
    expect(selectable.length > 0 && selectable.every((e) => e.enabled)).toBe(true);
  });
});
