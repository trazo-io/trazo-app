/**
 * The activity sheet states what to know about a record as rows, not tinted boxes (2026-11-17).
 *
 * Before: the sheet opened on stacked StandardAlert boxes (blue "One application on 3 parcels",
 * blue "One tank, 3 products", blue "Certifier only") and flagged a stock or AI photo with a bare
 * amber Alert. Oscar saw the harvest-interval warning drawn the same way (cream ground, orange
 * edge, the regulation always open) and called it the look the November notice refactor retired;
 * he picked StatusRow rows from rendered options. The rest of the sheet follows so it speaks one
 * language. The edit form keeps StandardAlert: there it is the form's own message.
 *
 * Same family as traceIsRowsNotBoxes.test.ts (the traceback) and the farm-home readiness card.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const code = (p: string) =>
  read(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const MODAL = code('src/components/Modals/EventDetailsModal.tsx');
const GROUP = code('src/components/Events/ApplicationGroupNotice.tsx');
const TANK = code('src/components/Events/TankMixNotice.tsx');
const HARVEST = code('src/components/Events/HarvestIntervalNotice.tsx');

/** The branch a notice renders on the record: from `variant === 'detail'` to its return. */
const detailBranch = (src: string) => {
  const start = src.indexOf("if (variant === 'detail')");
  return start < 0 ? '' : src.slice(start, src.indexOf('}', src.indexOf('</StatusRow>', start)));
};

describe('the activity sheet is rows, not boxes', () => {
  it('reads the files (guards the guard)', () => {
    expect(MODAL.length).toBeGreaterThan(20_000);
    expect(GROUP).toMatch(/export const ApplicationGroupNotice/);
    expect(TANK).toMatch(/export const TankMixNotice/);
    expect(HARVEST).toMatch(/export const HarvestIntervalNotice/);
  });

  it('draws no Alert box anywhere on the sheet', () => {
    expect(MODAL).not.toMatch(/StandardAlert/);
    expect(MODAL).not.toMatch(/<Alert[\s>]/);
    expect(MODAL).not.toMatch(/<AlertIcon/);
  });

  it('opens on ONE list holding the group, tank-mix and certifier-only rows', () => {
    const start = MODAL.indexOf('<StatusList testId="record-notices">');
    expect(start).toBeGreaterThan(0);
    const list = MODAL.slice(start, MODAL.indexOf('</StatusList>', start));
    expect(list).toMatch(/<ApplicationGroupNotice[\s\S]*?variant="detail"/);
    expect(list).toMatch(/<TankMixNotice[\s\S]*?variant="detail"/);
    expect(list).toMatch(/testId="record-notice-certifier-only"/);
  });

  it('leads with the harvest-interval warning, as warn rows with the rule folded (VID-03)', () => {
    const start = MODAL.indexOf('<StatusList testId="record-notices">');
    const list = MODAL.slice(start, MODAL.indexOf('</StatusList>', start));
    const first = list.indexOf('<HarvestIntervalNotice');
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(list.indexOf('<ApplicationGroupNotice'));
    expect(HARVEST).not.toMatch(/StandardAlert|<Alert[\s>]|<VStack|<Box/);
    expect(HARVEST.match(/<StatusRow\s+tone="warn"/g)).toHaveLength(2);
    expect(HARVEST.match(/details=\{/g)).toHaveLength(2);
  });

  it('flags a stock or AI photo with a warning row, read from the record detail', () => {
    // PhotoFlagNotice reads `photo_content_flag` from the detail query: the parcel timeline and
    // Activities rows never carried it, so a sheet opened from them never warned.
    expect(MODAL).toMatch(/<PhotoFlagNotice\s+farmId=\{farmId\}\s+eventId=\{event\.id\}/);
    expect(MODAL).not.toMatch(/event\.photo_content_flag/);
    const notice = code('src/components/Events/PhotoFlagNotice.tsx');
    expect(notice).toMatch(/useGetEventQuery/);
    expect(notice).toMatch(/<StatusRow\s+tone="warn"/);
  });

  it('renders each notice on the record as a StatusRow, and keeps the alert for the form', () => {
    for (const [name, src] of [
      ['ApplicationGroupNotice', GROUP],
      ['TankMixNotice', TANK]
    ] as const) {
      const branch = detailBranch(src);
      expect(branch, name).toMatch(/<StatusRow\s+tone="neutral"/);
      expect(branch, name).not.toMatch(/StandardAlert/);
      // The edit form's message is still the form's own alert.
      expect(src.slice(src.indexOf('</StatusRow>')), name).toMatch(
        /<StandardAlert\s+status="info"/
      );
    }
  });
});
