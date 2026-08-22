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

/** Defaults describe the ordinary create path; each test overrides only what it is about. */
const ask = (over: Partial<Parameters<typeof subtypeQuestionFor>[0]> = {}) =>
  subtypeQuestionFor({
    isEdit: false,
    eventType: 1,
    verb: undefined,
    fromPlanItem: false,
    planItem: undefined,
    allProductionSubtypes: ALL,
    ...over
  });

describe('subtypeQuestionFor', () => {
  it('is not vacuous — the registry list it falls back to is populated', () => {
    expect(ALL.length).toBeGreaterThan(10);
  });

  it('asks nothing in edit mode (ProductionTab keeps its select there)', () => {
    expect(ask({ isEdit: true, verb: verbForKey('field_work') })).toEqual([]);
  });

  it('asks nothing for a non-production event type', () => {
    // Soil, pest, weather, business, chemical and general ask inside their own tab.
    expect(ask({ eventType: 5, verb: verbForKey('soil') })).toEqual([]);
    expect(ask({ eventType: 0, verb: verbForKey('weather') })).toEqual([]);
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
