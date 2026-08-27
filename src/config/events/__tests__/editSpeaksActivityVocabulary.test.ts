/**
 * Guard: the EDIT path names an ACTIVITY, never a backend category.
 *
 * WS-4b moved every entry point to the farmer verb vocabulary — "Log activity — Seed search",
 * one tile, seventeen of them. Edit was left behind: it rendered the retired seven-tile
 * CATEGORY grid (`eventTypeConfig`) with six tiles `disabled` and dimmed to 0.4, under a
 * header reading "Event Type" / "Required" / "Select the type of agricultural activity you
 * want to document", and titled the page "Edit the selected Event".
 *
 * Three separate defects in one screen:
 *
 *   1. WRONG VOCABULARY. The record a farmer created as "Seed search" came back as
 *      "Production" — a word that covers sixteen distinct practices and that they never chose.
 *      `eventTypeConfig`'s labels are also hardcoded English ("Other Farm Activities"), so
 *      that screen was untranslated in es-419 regardless of locale.
 *   2. A PICKER FOR SOMETHING UNPICKABLE. Seven tap targets, every one `disabled`, to
 *      communicate one word — with a "Required" badge over controls that cannot be filled and
 *      an instruction to "Select" something that cannot be selected.
 *   3. UNREADABLE. `opacity 0.4` on gray.700 label text is ~2.4:1, under the 4.5 a label owes.
 *
 * What this file pins is the DERIVATION, which is where a regression would actually land: the
 * component now restates `verbForEvent(event_type, subtype)`, so the identity it shows is a
 * function of the record. The rendering is a nine-line read-only row; the branchy part is
 * here. Same reasoning as subtypeQuestion.test.ts — mounting NewEvent needs a router, a
 * subscription context and an event fetch, and a guard nobody can run is a guard nobody
 * writes.
 */
import { describe, expect, it } from 'vitest';

import { ACTIVITY_VERBS, subtypeChoicesFor, verbForEvent } from '../../activityVerbs';
import { getSubtypes } from '../index';

const PRODUCTION = 1;

describe('edit-mode activity identity', () => {
  it('is not vacuous — the verb list and the production registry are both populated', () => {
    expect(ACTIVITY_VERBS.length).toBeGreaterThan(10);
    expect(getSubtypes(PRODUCTION).length).toBeGreaterThan(10);
  });

  it('names EVERY production subtype with a verb — no saved record edits as "Production"', () => {
    const unnamed = getSubtypes(PRODUCTION)
      .map((s) => s.code as string)
      .filter((code) => !verbForEvent(PRODUCTION, code));
    expect(unnamed).toEqual([]);
  });

  it('names every non-production event type a verb covers', () => {
    // 4 (Equipment) is deliberately absent: merged into Production as the EM subtype, kept in
    // eventTypeConfig only so legacy rows still open. It is the one category with no verb, and
    // the component falls back to the category label for it rather than rendering nothing.
    for (const eventType of [0, 2, 3, 5, 6, 7]) {
      expect(verbForEvent(eventType, null), `event_type ${eventType}`).toBeDefined();
    }
  });

  it('resolves a 1:1 verb to itself and asks for no second word', () => {
    const seedSearch = verbForEvent(PRODUCTION, 'SS');
    expect(seedSearch?.key).toBe('seed_search');
    // The tile pinned the subtype, so the header alone carries the answer — echoing the
    // registry label beside it would be the duplicate the create path deliberately dropped.
    expect(subtypeChoicesFor(seedSearch)).toEqual([]);
  });

  it('resolves a FAMILY verb to the family, and still needs the subtype to name the record', () => {
    // "Field work" is cultivation, thinning or mowing — three different forms. The verb alone
    // does not identify the record, which is why the edit row prints the registry label too.
    for (const [code, expected] of [
      ['CU', 'field_work'],
      ['TH', 'field_work'],
      ['MO', 'field_work'],
      ['PR', 'pruning'],
      ['CM', 'pruning'],
      ['PH', 'harvest'],
      ['TR', 'planting']
    ] as const) {
      const verb = verbForEvent(PRODUCTION, code);
      expect(verb?.key, code).toBe(expected);
      expect(subtypeChoicesFor(verb).length, code).toBeGreaterThan(1);
      // …and the registry has a label for it, so the row never prints a raw code at a farmer.
      expect(getSubtypes(PRODUCTION).find((s) => s.code === code)?.labelKey).toBeTruthy();
    }
  });

  it('tracks a CORRECTED subtype — edit keeps ProductionTab’s select', () => {
    // The restatement is derived, not snapshotted: correcting SS→HA in step 1 must re-title
    // the record "Harvest". A stored copy would leave the header naming the old practice.
    expect(verbForEvent(PRODUCTION, 'SS')?.key).toBe('seed_search');
    expect(verbForEvent(PRODUCTION, 'HA')?.key).toBe('harvest');
  });
});
