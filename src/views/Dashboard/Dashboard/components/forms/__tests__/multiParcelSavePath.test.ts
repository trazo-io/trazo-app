import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { requiredFieldsForSave } from '../../../../../../config/events/saveRequiredFields';

/**
 * One spray on several blocks: the wizard's save path.
 *
 * MEASURED in a browser 2026-10-20: with three blocks picked and every per-block card answered,
 * Create refused with "Please fill in all required fields: Product Amount Applied, Area Treated".
 * The save path keeps its own required-field list per event type, and the chemical list still
 * asked for the single total and area that multi mode hides (they are per block, on the cards).
 * The cards and the server already hold that rule; this list must not demand fields that do not
 * exist in that mode.
 *
 * Source-level on purpose, like saveFiresOneToast: the wizard cannot be mounted cheaply. Every
 * slice is asserted non-empty so a moved anchor fails instead of passing vacuously.
 */
const SRC = readFileSync(join(__dirname, '..', 'NewEvent.jsx'), 'utf8');

const saveStart = SRC.indexOf('let savedEvent;');
const saveEnd = SRC.indexOf('clearDraft();', saveStart);
const savePath = saveStart > -1 && saveEnd > saveStart ? SRC.slice(saveStart, saveEnd) : '';

describe('multi-parcel save path', () => {
  it('reads the slices it asserts on', () => {
    expect(savePath.length).toBeGreaterThan(0);
  });

  it('does not require the single total and area when several parcels are picked', () => {
    // The save gate is config/events/saveRequiredFields; the wizard must pass the multi flag.
    expect(SRC).toContain('multiParcel: multiActive');
    const multi = requiredFieldsForSave(
      2,
      { type: 'FU', application_method: 'ground_spray' },
      { multiParcel: true }
    );
    expect(multi).toContain('commercial_name');
    expect(multi).not.toContain('volume_applied');
    expect(multi).not.toContain('area_treated');
  });

  it('sends the multi-target body, built by the one helper, with the session group', () => {
    const branch = savePath.slice(savePath.indexOf('} else if (multiActive) {'));
    expect(branch).toContain('buildMultiTargetBody(');
    expect(branch).toContain('applicationGroupRef.current');
    // A plan item and a crew note belong to one record: never in the multi branch.
    const multiOnly = branch.slice(0, branch.indexOf('} else {'));
    expect(multiOnly).not.toContain('plan_item_id');
    expect(multiOnly).not.toContain('field_note');
  });
});

describe('the voice banner counts only what reached the shared form', () => {
  // MEASURED 2026-10-24: an irrigation on two parcels said "5 campos completados" and listed hours
  // and depth, which with several parcels are asked on each card and held by no field.
  it('every "filled" list goes through the per-parcel filter', () => {
    expect(SRC).toMatch(/const filledEntriesFor = useCallback/);
    for (const list of ['voiceFilledEntries', 'voiceWrittenLabels', 'voiceAllFilledLabels']) {
      const start = SRC.indexOf(`const ${list} = useMemo(`);
      expect(start, list).toBeGreaterThan(-1);
      const body = SRC.slice(start, SRC.indexOf('\n  );', start) + 5);
      expect(body, list).toContain('filledEntriesFor(');
      expect(body, list).not.toContain('entriesForFieldNames(');
    }
  });
});
