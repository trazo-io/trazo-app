/**
 * The spray-record export previews list records as rows, not bordered boxes (2026-11-17).
 *
 * Before: the California PUR and Washington spray previews drew every record as a white box
 * with a 1px border, a 4px orange or green left edge, and its own outline "Open activity"
 * button, so a month of six sprays was six boxed cards with six buttons. The November notice
 * pass made findings rows with hairlines (readiness card, traceback, activity sheet); Oscar
 * asked for the same here. The glyph shape and the words ("Missing: ...", "Complete") carry the
 * status; the edge only repeated them.
 *
 * Same family as traceIsRowsNotBoxes.test.ts and activitySheetNoticesAreRows.test.ts.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const code = (p: string) =>
  readFileSync(resolve(process.cwd(), p), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const PUR = code('src/components/PURExport/PURExportModal.tsx');
const WA = code('src/components/WASprayExport/WASprayExportModal.tsx');

describe('export previews are rows, not boxes', () => {
  it('reads the files (guards the guard)', () => {
    expect(PUR).toMatch(/export default PURExportModal;/);
    expect(WA).toMatch(/export default WASprayExportModal;/);
  });

  it('draws no coloured edge and no bordered box per record', () => {
    for (const [name, src] of [
      ['PURExportModal', PUR],
      ['WASprayExportModal', WA]
    ] as const) {
      expect(src, name).not.toMatch(/borderLeft/);
      expect(src, name).not.toMatch(/border="1px solid"/);
    }
  });

  it('lists the records in a StatusList of StatusRows', () => {
    expect(PUR).toMatch(/<StatusList testId="pur-rows">[\s\S]*?<StatusRow[\s\S]*?testId="pur-row"/);
    expect(PUR).toMatch(
      /<StatusList testId="pur-excluded-rows">[\s\S]*?<StatusRow[\s\S]*?tone="neutral"/
    );
    expect(WA).toMatch(
      /<StatusList testId="wa-spray-rows">[\s\S]*?<StatusRow[\s\S]*?testId="wa-spray-row"/
    );
  });

  it('ends a row in a text link, not an outline button', () => {
    for (const [name, src] of [
      ['PURExportModal', PUR],
      ['WASprayExportModal', WA]
    ] as const) {
      expect(src, name).toMatch(/<StatusRowLink onClick=\{\(\) => open/);
      expect(src, name).not.toMatch(/FiEdit2/);
    }
    // Two lists in the PUR preview (reported and hired), one in Washington's.
    expect(PUR.match(/<StatusRowLink/g)?.length).toBe(2);
    expect(WA.match(/<StatusRowLink/g)?.length).toBe(1);
  });
});
