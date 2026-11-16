/**
 * Restoring a draft in the event wizard (NewEvent.jsx), as a farmer meets it.
 *
 * MEASURED in a browser 2026-10-25 on main: after "Restore draft" the toast said the entries were
 * back, but step 0 showed no activity picked and an empty "Performed By". Tapping the activity
 * (the obvious next move, marked Required) ran the type-change reset and cleared every restored
 * field; pressing Continue instead copied the empty name and today's date over the restored ones.
 * The wizard is too large to mount here, so these read its source, the way the other wizard
 * guards in this repo do, plus the pure lookup the restore relies on.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { ACTIVITY_VERBS, verbForEvent, verbForKey } from 'config/activityVerbs';

const wizard = readFileSync(
  resolve(__dirname, '../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
  'utf8'
);

const restoreHandler = (() => {
  const start = wizard.indexOf('const handleRestoreDraft = useCallback(');
  const end = wizard.indexOf('}, [restoreDraft', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return wizard.slice(start, end);
})();

describe('restoring a draft in the event wizard', () => {
  it('puts step 0 back on screen, not only into state', () => {
    expect(restoreHandler).toMatch(/basicMethods\.reset\(\s*\{[\s\S]*date:[\s\S]*performed_by:/);
  });

  it('brings back an operator-set date and never a stale default', () => {
    expect(restoreHandler).toMatch(/draft\.dateChosen !== false/);
    // Replacing RHF's defaults with the restored day made it compare as untouched (measured).
    expect(restoreHandler).toMatch(/\{ keepDefaultValues: true \}/);
    expect(wizard).toMatch(/isOperatorChosenDate\(step0Date, wizardDefaultDate\)/);
  });

  it('selects the tile the farmer had picked, and none when none was', () => {
    // Review of app #201: 0 is both "nothing picked" and Weather, so a draft holding only a name
    // restored as a Weather record when the tile was inferred from `activeEventType`.
    expect(wizard).toMatch(/verbKey: activeVerbKey \?\? null/);
    expect(restoreHandler).toMatch(/'verbKey' in draft\s*\?\s*verbForKey\(draft\.verbKey\)/);
    expect(restoreHandler).toMatch(/draftFields\.type\s*\?\s*verbForEvent\(/);
    expect(restoreHandler).toMatch(/setPickedVerbKey\(restoredVerb\.key\)/);
    expect(verbForKey(null)).toBeUndefined();
  });

  it('every saved activity resolves to a tile the restore can select', () => {
    for (const verb of ACTIVITY_VERBS) {
      const picked = verbForEvent(verb.eventType, verb.subtype ?? undefined);
      expect(picked, verb.key).toBeDefined();
      expect(picked!.eventType).toBe(verb.eventType);
    }
    expect(verbForEvent(1, 'IR')?.key).toBe('irrigation');
  });

  it('picking the activity already in force clears nothing', () => {
    const handler = wizard.slice(wizard.indexOf('const handleVerbSelect = (verb) => {'));
    const guard = handler.indexOf(
      'verb.key === activeVerbKey && verb.eventType === activeEventType'
    );
    const reset = handler.indexOf('handleEventTypeChange(verb.eventType)');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(reset);
    expect(handler.slice(guard, reset)).toMatch(/return;/);
  });

  it('saves the "times differ by parcel" switch and restores it as saved, never from the cards', () => {
    // Review of app #402: inferred from card times, "different" with blank cards came back as
    // "same" (the old shared window went to every parcel), and "same" with stale card times came
    // back as "different" (the stale times were sent).
    expect(wizard).toMatch(
      /\{ parcelIds: multiParcelIds, targets: multiTargets, timesPerParcel \}/
    );
    expect(restoreHandler).toMatch(/setTimesPerParcel\(draft\.multi\.timesPerParcel === true\)/);
    expect(restoreHandler).not.toMatch(/\.times \|\| \{\}/);
  });

  it('saves step 0 fields with the draft', () => {
    expect(wizard).toMatch(/basicMethods\.watch\(\['date', 'performed_by'\]\)/);
    expect(wizard).toMatch(/performed_by: step0PerformedBy/);
  });

  it('keeps a plan item draft under its own key and none on a crew note', () => {
    expect(wizard).toMatch(/scope: planItemIdFromUrl \? `plan-\$\{planItemIdFromUrl\}` : null/);
    expect(wizard).toMatch(/const draftKept = !isEdit && !isRepeat && !fieldNoteIdFromUrl;/);
  });
});
