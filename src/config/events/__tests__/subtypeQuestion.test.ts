/**
 * Every branch of "does the wizard still need to ask which subtype this was".
 *
 * Five lines of conditionals, and they were wrong twice on the day they were written — both
 * times invisible on the happy path, because the happy path is a verb tile that pins its
 * subtype and returns `[]` from the first branch it reaches:
 *
 *   1. `?event_type=1` with no `verb=` (an old bookmark, a hand-edited link) rendered the
 *      sixteen-option fallback chooser UNDERNEATH the verb grid — two questions about one
 *      fact, the second one answered against a verb nobody had chosen.
 *   2. A season-plan item whose catalogue row carries no `event_subtype` fell straight through
 *      to ProductionTab's `initialValues.type || 'PL'`, saving a Planting record for whatever
 *      practice the farmer actually did.
 *
 * That is why the logic is a pure exported function and not an inline `useMemo`: mounting
 * NewEvent to reach branch 2 means a season-plan fetch, a subscription context and a router,
 * and a guard nobody can run is a guard nobody writes.
 */
import { describe, expect, it } from 'vitest';

import { subtypeQuestionFor, verbForKey } from '../../activityVerbs';
import { getSubtypes } from '../index';

const ALL = getSubtypes(1).map((s) => s.code as string);
const ALL_CHEMICAL = getSubtypes(2).map((s) => s.code as string);

/** Defaults describe the ordinary create path; each test overrides only what it is about. */
const ask = (over: Partial<Parameters<typeof subtypeQuestionFor>[0]> = {}) =>
  subtypeQuestionFor({
    isEdit: false,
    eventType: 1,
    verb: undefined,
    fromPlanItem: false,
    planItem: undefined,
    allSubtypesForType: ALL,
    ...over
  });

describe('subtypeQuestionFor', () => {
  it('is not vacuous — the registry list it falls back to is populated', () => {
    expect(ALL.length).toBeGreaterThan(10);
  });

  it('asks nothing in edit mode (ProductionTab keeps its select there)', () => {
    expect(ask({ isEdit: true, verb: verbForKey('field_work') })).toEqual([]);
  });

  it('asks nothing for an event type whose tab owns its own subtype', () => {
    // Soil, pest, weather, business and general ask inside their own tab. Chemical does NOT —
    // it is hoisted, and has its own cases below.
    expect(ask({ eventType: 5, verb: verbForKey('soil') })).toEqual([]);
    expect(ask({ eventType: 0, verb: verbForKey('weather') })).toEqual([]);
    expect(ask({ eventType: 6, verb: verbForKey('pest') })).toEqual([]);
    expect(ask({ eventType: 7, verb: verbForKey('business') })).toEqual([]);
    expect(ask({ eventType: 3, verb: verbForKey('other') })).toEqual([]);
    expect(ask({ eventType: null })).toEqual([]);
  });

  it('asks nothing while the verb grid is still on screen', () => {
    // Regression 1. Before the fix this returned all sixteen codes, rendering a second
    // chooser below the grid.
    expect(ask({ verb: undefined })).toEqual([]);
  });

  it('asks nothing for a tile that pinned its subtype', () => {
    expect(ask({ verb: verbForKey('irrigation') })).toEqual([]);
    expect(ask({ verb: verbForKey('pollination') })).toEqual([]);
    expect(ask({ verb: verbForKey('seed_search') })).toEqual([]);
  });

  it('asks the family choices for a family tile', () => {
    expect(ask({ verb: verbForKey('field_work') })).toEqual(['CU', 'TH', 'MO']);
    expect(ask({ verb: verbForKey('harvest') })).toEqual(['HA', 'PH']);
    expect(ask({ verb: verbForKey('pruning') })).toEqual(['PR', 'CM']);
    expect(ask({ verb: verbForKey('planting') })).toEqual(['PL', 'TR']);
  });

  it('asks nothing while a plan item is still loading', () => {
    // The chooser must not flash the full list for one render and then vanish.
    expect(ask({ fromPlanItem: true, planItem: undefined })).toEqual([]);
    expect(ask({ fromPlanItem: true, planItem: null })).toEqual([]);
  });

  it('asks nothing for a plan item that names its practice', () => {
    expect(ask({ fromPlanItem: true, planItem: { event_subtype: 'PR' } })).toEqual([]);
  });

  it('asks the full list for a plan item with no subtype', () => {
    // Regression 2. Returning [] here is the silent-Planting bug: nothing else on the create
    // path would ever set `type`.
    expect(ask({ fromPlanItem: true, planItem: { event_subtype: null } })).toEqual(ALL);
    expect(ask({ fromPlanItem: true, planItem: {} })).toEqual(ALL);
  });

  it('asks the full list for a production verb that pins nothing', () => {
    // No such verb ships today (the coverage guard would flag the unreachable subtypes), but
    // adding one must ask rather than default to 'PL'.
    expect(ask({ verb: { key: 'invented', eventType: 1, icon: (() => null) as never } })).toEqual(
      ALL
    );
  });

  it('the plan branch outranks the verb branch', () => {
    // "Log this" carries both `?plan_item=` and, sometimes, a verb resolved from the item.
    // The item is the more specific answer and must win.
    expect(
      ask({
        fromPlanItem: true,
        planItem: { event_subtype: 'CM' },
        verb: verbForKey('field_work')
      })
    ).toEqual([]);
  });
});

describe('subtypeQuestionFor — the edit path', () => {
  /*
   * Edit used to return `[]` unconditionally, because the question was asked somewhere else:
   * ProductionTab kept its raw `type` select on the edit path. That made one wizard contradict
   * itself — step 0 stated the activity beside a notice that the record type was fixed, and a
   * select two steps below changed it, labelled "Production type". The ask moved here.
   */
  it('asks nothing until the farmer opts in — an edit is usually a date fix', () => {
    expect(ask({ isEdit: true, verb: verbForKey('seed_search') })).toEqual([]);
  });

  it('offers ALL production subtypes when correcting, not just the family', () => {
    // A mis-tapped tile is not constrained to the family it landed in: Seed search and Harvest
    // are both event_type 1, and the farmer who wants the second may have saved the first.
    const asked = ask({ isEdit: true, isCorrecting: true, verb: verbForKey('seed_search') });
    expect(asked).toEqual(ALL);
    expect(asked).toContain('HA');
    expect(asked).toContain('SS');
  });

  it('never asks for a record whose tab owns its own subtype', () => {
    for (const eventType of [0, 3, 5, 6, 7]) {
      expect(
        ask({ isEdit: true, isCorrecting: true, eventType }),
        `event_type ${eventType}`
      ).toEqual([]);
    }
  });

  it('leaves the CREATE path untouched — correcting is an edit-only concept', () => {
    // isCorrecting must not leak into create: the verb grid is the ask there, and a chooser
    // rendered underneath it is the two-questions-one-fact bug branch 1 of this file records.
    expect(ask({ isCorrecting: true, verb: undefined })).toEqual([]);
    expect(ask({ isCorrecting: true, verb: verbForKey('irrigation') })).toEqual([]);
    expect(ask({ isCorrecting: true, verb: verbForKey('field_work') })).toEqual(['CU', 'TH', 'MO']);
  });
});

describe('subtypeQuestionFor — "Log this again"', () => {
  /*
   * 🔴 2026-08-27, reported from the running app: pressing *Log this again* on a Seed search
   * opened "What did you do?" and made the farmer pick the activity they had just pressed the
   * button on. `?repeat=639&event_type=1` carries no `verb=`, so every verb-shaped preset was
   * false and the wizard fell through to the no-verb branch.
   *
   * Structurally identical to branch 1 in this file's header (an `?event_type=1` bookmark with
   * no `verb=`) and to the plan-item preset: a link that already names the practice, landing on
   * a grid that asks for it.
   */
  it('asks nothing once the source record has loaded', () => {
    expect(ask({ fromRepeat: true, knownSubtype: 'SS' })).toEqual([]);
    // A family subtype too: the record names CU exactly, so "which one was it" is answered.
    expect(ask({ fromRepeat: true, knownSubtype: 'CU', verb: verbForKey('field_work') })).toEqual(
      []
    );
  });

  it('asks rather than defaulting when the source names no subtype', () => {
    // Unreachable in practice (`type` is required on the model) and the render gate hides this
    // window anyway — but a QUESTION is the safe failure. Falling through to ProductionTab's
    // silent 'PL' is how a repeat of a Harvest would save as a Planting.
    expect(ask({ fromRepeat: true, knownSubtype: undefined })).toEqual(ALL);
    expect(ask({ fromRepeat: true, knownSubtype: null })).toEqual(ALL);
  });

  it('yields to an in-page pick — changing your mind re-opens the family question', () => {
    // The caller passes `fromRepeat: isRepeat && !pickedVerbKey`. Once the farmer reopens the
    // grid and taps "Field work", handleVerbSelect seeds the family default (CU) — so a repeat
    // branch that only looked at knownSubtype would skip CU/TH/MO for someone who had just
    // explicitly changed the activity.
    expect(ask({ fromRepeat: false, knownSubtype: 'CU', verb: verbForKey('field_work') })).toEqual([
      'CU',
      'TH',
      'MO'
    ]);
  });

  it('never applies to a repeat whose tab owns its own subtype', () => {
    expect(ask({ fromRepeat: true, knownSubtype: 'HD', eventType: 5 })).toEqual([]);
  });

  it('answers a CHEMICAL repeat from the source record too', () => {
    // Hoisted since 2026-09-01, so the repeat branch runs for it: the row says FE, and asking
    // "fertilizer or pesticide?" about a record that names one is the wizard doubting itself.
    expect(
      ask({
        fromRepeat: true,
        knownSubtype: 'FE',
        eventType: 2,
        verb: verbForKey('input_application'),
        allSubtypesForType: ALL_CHEMICAL
      })
    ).toEqual([]);
  });

  it('does not disturb the edit or plan branches', () => {
    expect(ask({ isEdit: true, fromRepeat: true, knownSubtype: 'SS' })).toEqual([]);
    expect(
      ask({ fromPlanItem: true, planItem: { event_subtype: 'PR' }, knownSubtype: 'PR' })
    ).toEqual([]);
  });
});

describe('subtypeQuestionFor — chemical, hoisted 2026-09-01', () => {
  /*
   * "Input application" names no practice on its own, and FE/PE/FU/HE decide which half of
   * ChemicalTab's 45 fields the next step renders (`visibleForSubtypes`) — the same criterion
   * the production families are hoisted on. Before this the question was a four-option select
   * in hardcoded English two steps down, inside the tab whose shape it decides.
   */
  const chem = (over: Partial<Parameters<typeof subtypeQuestionFor>[0]> = {}) =>
    ask({ eventType: 2, allSubtypesForType: ALL_CHEMICAL, ...over });

  it('is not vacuous — the registry knows all four codes', () => {
    expect(ALL_CHEMICAL).toEqual(['FE', 'PE', 'FU', 'HE']);
  });

  it('asks the four input types once the tile is tapped', () => {
    expect(chem({ verb: verbForKey('input_application') })).toEqual(['FE', 'PE', 'FU', 'HE']);
  });

  it('⛔ pins NO default — the tile must not answer for the farmer', () => {
    /*
     * `handleVerbSelect` seeds `verb.subtype` the instant a tile is tapped. A default here
     * would file a restricted-use spray as a fertilizer for anyone who tapped Continue without
     * looking — and unlike a production family, the four chemical codes change what the record
     * CLAIMS, not merely which fields are asked. The certifier packet and the CA PUR export
     * both read it.
     */
    expect(verbForKey('input_application')?.subtype).toBeUndefined();
  });

  it('asks nothing while the verb grid is still on screen', () => {
    expect(chem({ verb: undefined })).toEqual([]);
  });

  it('asks nothing once the farmer has answered — one ask, not two', () => {
    // The chooser stays mounted with its selection; what must never happen is the tab asking
    // again. That half is pinned by subtypeAskedOnce.test.tsx, rendered.
    expect(chem({ verb: verbForKey('input_application') })).toEqual(ALL_CHEMICAL);
  });

  it('offers all four when correcting a saved record, and nothing until asked', () => {
    expect(chem({ isEdit: true, verb: verbForKey('input_application') })).toEqual([]);
    expect(
      chem({ isEdit: true, isCorrecting: true, verb: verbForKey('input_application') })
    ).toEqual(ALL_CHEMICAL);
  });

  it('asks rather than defaulting for a plan item with no subtype', () => {
    expect(chem({ fromPlanItem: true, planItem: { event_subtype: null } })).toEqual(ALL_CHEMICAL);
    expect(chem({ fromPlanItem: true, planItem: { event_subtype: 'PE' } })).toEqual([]);
  });

  it('never offers production codes on a chemical record', () => {
    // The fallback list is per-type for exactly this: sixteen production codes on a chemical
    // record would be a worse question than none.
    const asked = chem({ isEdit: true, isCorrecting: true });
    expect(asked).not.toContain('HA');
    expect(asked).not.toContain('PL');
  });
});
