import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * One save, one toast.
 *
 * The save path used to fire "Success" and then, when the server reported documentation gaps,
 * a second "Saved, a certifier will also want" toast, and the Admin layout could add the
 * first-activity milestone toast on top, all in the second before navigating away. Now the
 * gaps toast replaces the plain confirmation, and the milestone is recorded as seen instead
 * of celebrated on top of it.
 *
 * Source-level on purpose: the wizard is a 4,000-line component that cannot be mounted
 * cheaply. The slice is cut from the first save call to the navigate call, and every read is
 * asserted non-empty so a moved anchor fails instead of passing vacuously.
 */
const SRC = readFileSync(join(__dirname, '..', 'NewEvent.jsx'), 'utf8');

const start = SRC.indexOf('let savedEvent;');
const end = SRC.indexOf('clearDraft();', start);
const savePath = start > -1 && end > start ? SRC.slice(start, end) : '';

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe('NewEvent save path toasts', () => {
  it('found the save path it is about to judge', () => {
    expect(savePath.length, 'anchors moved: let savedEvent; ... clearDraft();').toBeGreaterThan(
      500
    );
    expect(savePath).toContain('await updateEvent(');
    expect(savePath).toContain('await createEvent(');
    expect(savePath).toContain('completeness_gaps');
  });

  it('fires at most one success toast, and only when there are no gaps', () => {
    expect(count(savePath, "status: 'success'")).toBe(1);
    const elseAt = savePath.lastIndexOf('} else {');
    expect(
      savePath.indexOf("status: 'success'"),
      'the success toast must sit in the no-gaps branch'
    ).toBeGreaterThan(elseAt);
    expect(savePath).toContain("id: 'app.activitySaved'");
  });

  it('puts no toast between the save calls and the gaps check', () => {
    const afterSave = savePath.slice(savePath.indexOf('await createEvent('));
    const gapsAt = afterSave.indexOf('completeness_gaps');
    expect(gapsAt).toBeGreaterThan(-1);
    expect(afterSave.slice(0, gapsAt)).not.toContain('toast(');
  });

  it('records the first-activity milestone instead of celebrating on top of a gaps toast', () => {
    const warningAt = savePath.indexOf("status: 'warning'");
    const elseAt = savePath.lastIndexOf('} else {');
    expect(warningAt).toBeGreaterThan(-1);
    const gapsBranch = savePath.slice(warningAt, elseAt);
    expect(gapsBranch).toContain("celebrateMilestone('first-event')");
  });

  it("puts a pick inside a spray's PHI in the same one warning, ahead of the gaps", () => {
    // 2026-11-05: the save response carries `phi_conflicts` for a spray or a pick. It must not
    // raise a second toast: one warning, titled for the PHI when there is one.
    expect(savePath).toContain('phi_conflicts');
    expect(count(savePath, "status: 'warning'")).toBe(1);
    const warning = savePath.slice(0, savePath.indexOf("status: 'warning'"));
    expect(warning).toContain("id: 'app.phiConflictSavedTitle'");
    expect(savePath).toContain('completenessGaps.length > 0 || phiConflicts.length > 0');
    // Review of app #273: under a "Saved." title the gaps take the inline label, never the
    // title again; and the title counts picks.
    expect(savePath).toContain("id: 'app.completenessGapsInlineLabel'");
    expect(savePath).not.toContain('`${gapsTitle} ${gapNames}`');
    expect(savePath).toContain('{ count: phiPickCount }');
  });

  it('keeps the removed carbon-calculation fallback string out', () => {
    expect(SRC).not.toContain('complete data for carbon calculation');
  });
});
