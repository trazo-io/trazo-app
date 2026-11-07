/**
 * Guard: two header rows that could not fit a phone.
 *
 * Both were user-reported, both are invisible on a desktop, and both come from the same shape:
 * a row whose content has a hard minimum wider than the screen.
 *
 * ── 1. ProfileProduction header ──────────────────────────────────────────────────────
 * OBSERVED 2026-08-22 at 430px. The heading rendered ONE WORD PER LINE and the action buttons
 * sat on top of it:
 *
 *     On…   ┌──────────────────────┐
 *     Lot   │ Export for certifier │  Copy buyer link  ⋮
 *     ID:   └──────────────────────┘
 *     CBF-
 *     25-
 *
 * The usual culprits were already correct — the title column had `minW={0}` and the action
 * `Wrap` had `flexShrink={0}`, which is the right pairing. What was wrong is that `direction`
 * was hard-coded to `"row"`. Four unshrinkable actions (Export + Finish + Copy link + the
 * overflow menu) demand ~330px, so on a 430px screen (~370px of content) the heading was left
 * roughly 40px and had nowhere to go.
 *
 * ⚠️ Its siblings `ProfileFarm` and `ProfileParcel` use a byte-identical row and are NOT
 * broken — MEASURED at 430px, both headings render on one line — because their action side is
 * a single "Edit" button. The defect is the combination, not the pattern, which is why this
 * guard names the one file instead of banning `direction="row"` everywhere.
 *
 * ── 2. Parcel Application button ─────────────────────────────────────────────────────
 * Its label is CONCATENATED at runtime — title + " · status" + " (n)" — so no one reading the
 * JSX can see how long it gets. In es-419 it becomes "Solicitud de parcela · En progreso (4)".
 * A Chakra Button is `white-space: nowrap`, and the page wrapper carries `overflow="hidden"`
 * (which is what stops the page scrolling sideways), so the tail was silently CLIPPED — the
 * farmer saw the count cut in half.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const VIEWS = join(__dirname, '..');

/** Blank comments, keeping newlines — both notes above quote the code they ban. */
const codeOf = (rel: string) =>
  readFileSync(join(VIEWS, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');

describe('mobile header overflow', () => {
  it('stacks the production header on mobile', () => {
    const code = codeOf('Dashboard/Production/ProfileProduction.tsx');
    // the header row, identified by the title column that follows it
    const i = code.indexOf('<Flex');
    expect(i, 'ProfileProduction has no Flex — the header was restructured').toBeGreaterThan(-1);
    const header = code.slice(code.indexOf('PAGE HEADER') >= 0 ? code.indexOf('PAGE HEADER') : 0);
    const rowDecl = header.match(/<Flex[\s\S]{0,240}?justify="space-between"[\s\S]{0,240}?>/);
    expect(rowDecl, 'the header row moved — this would pass vacuously').toBeTruthy();
    expect(
      rowDecl![0],
      'the production header carries FOUR actions and must stack on mobile — a hard-coded ' +
        '`direction="row"` left the heading ~40px at 430px, one word per line'
    ).toMatch(/direction=\{\{\s*base:\s*'column'/);
  });

  it('keeps the title column shrinkable and the actions unshrinkable', () => {
    // Both were already right when the bug shipped; losing either brings back a worse version.
    const code = codeOf('Dashboard/Production/ProfileProduction.tsx');
    expect(code, 'title column needs minW={0} or it cannot wrap below its longest word').toMatch(
      /<VStack align="flex-start" gap=\{1\} minW=\{0\}>/
    );
    // The actions were a Wrap of four buttons; since 2026-11-06 they are one HStack of a primary,
    // an optional Finish and a menu. Either container must refuse to shrink.
    expect(
      code,
      'the actions row needs flexShrink={0} so the buttons are not the thing squeezed'
    ).toMatch(/<(?:Wrap|HStack)[^>]*flexShrink=\{0\}/);
  });

  it('keeps the Parcel Application status out of a button label', () => {
    /*
     * Until 2026-11-06 the parcel header carried a button whose label was CONCATENATED
     * ("Parcel Application · In progress (4)"); in es-419 it ran long and the page wrapper's
     * overflow:hidden clipped the count. The status now lives in ParcelApplicationCard as a
     * badge plus one row per missing item, so no label is built by concatenation.
     */
    const code = codeOf('Parcel/index.jsx');
    expect(code, 'the parcel page no longer mounts the application card').toContain(
      '<ParcelApplicationCard'
    );
    expect(
      code,
      'a status concatenated into a header button label is back; it clips in es-419'
    ).not.toMatch(/parcelApp\.status\./);
  });
});
