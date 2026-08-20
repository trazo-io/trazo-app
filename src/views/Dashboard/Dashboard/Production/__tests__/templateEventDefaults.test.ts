/**
 * A crop template's suggestions are OPT-IN, and a prohibited input is never suggested at all.
 *
 * Originally, choosing a crop auto-selected the first matching template and every one of its
 * pre-configured events defaulted to enabled — and those events were saved as REAL, backdated
 * event rows attributed to the farmer by name, not drafts. So starting a walnut production on
 * a CERTIFIED ORGANIC farm wrote ~20 operations the grower never performed, including
 * "Roundup PowerMax 3 (glyphosate)" (`organic_approved: 'not_organic'`,
 * `performed_by: <the real grower>`) — a § 205.105 hard disqualification in the certifier
 * dossier and a synthetic herbicide on the consumer QR page.
 *
 * Since 2026-08-19 a ticked suggestion becomes a ProductionPlanItem (a to-do), not a record:
 * the operator authors the record in the activity wizard with their own date. That closed the
 * defect CLASS. This file still pins the two opt-ins and the prohibited-input rule, because a
 * prohibited practice is still the wrong thing to put in front of an organic grower — and
 * because the browser predicate has to stay in step with the server's, which is the one that
 * decides (`history/services/season_plan_service.py`, cross-checked by
 * `history/tests/test_season_plan_not_records.py`).
 */
import { describe, expect, it } from 'vitest';

import { isProhibitedSuggestion } from '../QuickStartProduction';

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

describe('isProhibitedSuggestion', () => {
  it('flags a prohibited input on an organic operation', () => {
    expect(isProhibitedSuggestion(glyphosate, 'organic')).toBe(true);
  });

  it('applies the same rule to regenerative operations', () => {
    expect(isProhibitedSuggestion(glyphosate, 'regenerative')).toBe(true);
  });

  it('applies the same rule to biodynamic operations', () => {
    // Demeter certification requires organic certification underneath it, so § 205.105
    // applies in full. `biodynamic` was missing from the list until 2026-08-19, which meant
    // a Demeter operation was offered the conventional programme's synthetics.
    expect(isProhibitedSuggestion(glyphosate, 'biodynamic')).toBe(true);
  });

  it('does not flag organic-approved inputs', () => {
    // Copper hydroxide is allowed under § 205.601 — "Select all" must still include it, or the
    // feature stops being a time-saver and farmers go back to manual entry.
    expect(isProhibitedSuggestion(copperFungicide, 'organic')).toBe(false);
    expect(isProhibitedSuggestion(harvest, 'organic')).toBe(false);
  });

  it('leaves conventional operations untouched', () => {
    // A conventional grower applying glyphosate is a legitimate record.
    expect(isProhibitedSuggestion(glyphosate, 'conventional')).toBe(false);
    expect(isProhibitedSuggestion(glyphosate, '')).toBe(false);
    expect(isProhibitedSuggestion(glyphosate, undefined)).toBe(false);
  });

  it('catches a synthetic subtype even when organic_approved is unset', () => {
    const partial = { backend_event_fields: { chemical_subtype: 'synthetic_pesticide' } };
    expect(isProhibitedSuggestion(partial, 'organic')).toBe(true);
  });

  it('reads the attributes whether nested or flattened onto the event', () => {
    // The mapper spreads backend_event_fields onto the event, so both shapes occur in practice.
    const flattened = { name: 'Herbicide', organic_approved: 'not_organic' };
    expect(isProhibitedSuggestion(flattened, 'organic')).toBe(true);
  });

  it('is case-insensitive about the production method', () => {
    expect(isProhibitedSuggestion(glyphosate, 'Organic')).toBe(true);
  });

  it('does not throw on a malformed event', () => {
    expect(isProhibitedSuggestion(undefined, 'organic')).toBe(false);
    expect(isProhibitedSuggestion({}, 'organic')).toBe(false);
  });
});

describe('"Select all" semantics', () => {
  // Mirrors handleToggleAll / allSelectableSuggestionsEnabled in QuickStartProduction.
  const method = 'organic';
  const events = [glyphosate, copperFungicide, harvest];
  const selectAll = (evs: any[]) =>
    evs.map((e) => ({ ...e, enabled: !isProhibitedSuggestion(e, method) }));

  it('turns on every permitted event and no prohibited one', () => {
    const result = selectAll(events);
    expect(result.map((e) => e.enabled)).toEqual([false, true, true]);
  });

  it('reports "all selected" from the selectable events only', () => {
    // Counting the prohibited event would make this permanently false on an organic farm, and
    // the master switch could never be used to clear the list again.
    const afterSelectAll = selectAll(events);
    const selectable = afterSelectAll.filter((e) => !isProhibitedSuggestion(e, method));
    expect(selectable.length > 0 && selectable.every((e) => e.enabled)).toBe(true);
  });
});
