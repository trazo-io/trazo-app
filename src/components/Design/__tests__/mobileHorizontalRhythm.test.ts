/**
 * Guard: one horizontal grid on a phone.
 *
 * MEASURED 2026-08-23 at 430px, walking the box tree from the screen edge to the text. Four
 * separate things were wrong, and none of them is visible from reading a single file:
 *
 * ── 1. Three pages, three page gutters ───────────────────────────────────────────────
 *   StandardPage (farm profile, parcel profile)  px base 3       -> card edge at 16
 *   Dashboard/index.tsx                          px base 1       -> card edge at  8
 *   Parcel/index.jsx                             px base '16px'  -> card edge at 20
 * A farmer moving between them saw the cards step in and out. `.claude/rules/frontend.md`
 * already says StandardPage owns the width; both hand-rolled pages pre-date that.
 *
 * ── 2. A page title on its own grid ──────────────────────────────────────────────────
 * The parcel dashboard's title carried `px={{ base: '16px' }}` ON TOP of the page's own
 * gutter, so it sat 16px right of the cards it titles — 36 against 20.
 *
 * ── 3. A one-sided scrollbar pad ─────────────────────────────────────────────────────
 * `HistoryCard` and `TrackList` (grid siblings, same defect in both) reserved room for the
 * scrollbar with `pr` alone. The scrollbar's own 8px landed on the SAME side, so the cards
 * inside sat 35px from the left of their container and 51px from the right. `scrollbarGutter:
 * 'stable both-edges'` reserves it symmetrically — which also matters because a phone paints
 * an overlay scrollbar (0px) and a desktop browser a classic one (8px), so any hand-tuned
 * one-sided offset can only ever be correct on one of the two.
 *
 * ── 4. A card header that pushed its own action off the card ─────────────────────────
 * See `StandardCard header roles` below.
 *
 * ⚠️ NOT asserted here, on purpose: the total 30px from screen edge to body text (page gutter
 * 16 + the 14px `.trazo-card` padding locked in `trazo-dashboard-styles.css`, a do-not-edit
 * file). That is roughly double the 16px iOS/Material/Bootstrap norm, but closing it means
 * making cards near-full-bleed on mobile — a visual-identity decision, not a defect, and one
 * for a human to take.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '../../..');

/** Blank comments, keeping newlines — every note above quotes the code it bans. */
const codeOf = (rel: string) =>
  readFileSync(join(SRC, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');

/** Reads a JSX opening tag whole, brace-balanced, so a multi-line prop value is not missed. */
const openingTagAt = (code: string, index: number, name: string) => {
  let i = index + name.length + 1;
  let depth = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) break;
    i++;
  }
  return code.slice(index, i);
};

describe('mobile horizontal rhythm', () => {
  it('gives the hand-rolled pages the same mobile gutter as StandardPage', () => {
    const std = codeOf('components/Design/StandardComponents.tsx');
    // The value every other page is being held to. Read from the source rather than hard-coded,
    // so changing the standard moves the pages with it instead of turning this red.
    expect(
      std,
      'StandardPage no longer declares a page gutter — this would pass vacuously'
    ).toMatch(/px=\{\{ base: 3, md: 4 \}\}/);

    for (const rel of ['views/Dashboard/Dashboard/index.tsx', 'views/Dashboard/Parcel/index.jsx']) {
      const code = codeOf(rel);
      const m = code.match(/px=\{\{\s*base:\s*([^,]+),/);
      expect(m, `${rel} has no page-level px — the wrapper moved`).toBeTruthy();
      expect(
        m![1].trim(),
        `${rel} sets its own mobile gutter. StandardPage uses \`base: 3\`; anything else steps ` +
          `the cards in or out as the farmer navigates between pages`
      ).toBe('3');
    }
  });

  it('does not pad the parcel title on top of the page gutter', () => {
    /*
     * The title Text used to carry `px={{ base: '16px', md: '0' }}` inside a wrapper that
     * already had the page gutter, so title and cards sat on two grids 16px apart.
     */
    const code = codeOf('views/Dashboard/Parcel/index.jsx');
    // The title is the PARCEL's name since 2026-11-06 (it showed the farm's name before).
    const i = code.indexOf('{data?.name ||');
    expect(i, 'the parcel page title moved — this would pass vacuously').toBeGreaterThan(-1);
    const tagStart = code.lastIndexOf('<Text', i);
    const tag = openingTagAt(code, tagStart, 'Text');
    expect(
      tag,
      'the page title must not add its own horizontal padding — the page gutter is the only ' +
        'horizontal inset, or the title lands on a different grid from its own cards'
    ).not.toMatch(/(?<![a-zA-Z])(px|pl|ps|paddingLeft|paddingX)=/);
  });

  it('reserves scrollbar room on both edges, never one', () => {
    /*
     * Both files, because they are grid siblings that had a byte-identical
     * `pr={{ base: '8px', md: '12px' }}` — this repo's most common defect is a fix that lands
     * on one of a pair.
     */
    // HistoryCard lost its inner scroll on 2026-11-06 (a parcel holds a handful of seasons; a
    // 450px scroll box inside the page was a second scrollbar for a short list). Assert that
    // stays true, so the pair cannot silently diverge again; TrackList keeps its region.
    expect(
      codeOf('views/Dashboard/Parcel/components/HistoryCard.jsx'),
      'HistoryCard regrew an inner scroll region: give it symmetric padding like TrackList'
    ).not.toContain('overflowY="auto"');
    for (const rel of ['views/Dashboard/Parcel/components/TrackList.jsx']) {
      const code = codeOf(rel);
      const i = code.indexOf('overflowY="auto"');
      expect(i, `${rel} no longer has a vertical scroll region`).toBeGreaterThan(-1);
      const tagStart = code.lastIndexOf('<Box', i);
      const tag = openingTagAt(code, tagStart, 'Box');
      expect(
        tag,
        `${rel}: a lone \`pr\` on a scroll region stacks with the scrollbar's own width on the ` +
          `SAME side — measured 16px off centre. Use \`px\`.`
      ).not.toMatch(/(?<![a-zA-Z])pr=/);
      expect(tag, `${rel}: the region needs symmetric horizontal padding`).toMatch(
        /(?<![a-zA-Z])px=/
      );
      expect(
        tag,
        `${rel}: \`scrollbarGutter: 'stable both-edges'\` is what keeps it centred whether the ` +
          `browser paints an overlay scrollbar (phone, 0px) or a classic one (desktop, 8px)`
      ).toMatch(/scrollbarGutter: 'stable both-edges'/);
    }
  });

  it('lays out the page header action slot', () => {
    /*
     * `rightAction` is a SLOT. Seven pages pass one control; Documents passes two, and until
     * 2026-08-25 the slot was a bare <Box>, so block layout applied.
     *
     * MEASURED at 1440 on the Documents header: "Subir" (94px) and "Exportar todos los
     * registros (CSV)" (304px) rendered with a **0px gap** — touching — and left-aligned, so
     * their right edges finished 210px apart against a page margin they were both meant to
     * meet. The stack itself was an accident: a `data-tour` <Box> around the first button
     * forced the line break.
     *
     * A column Stack with `align="stretch"` gaps them and squares the edges, and is a no-op
     * for a single action (VERIFIED on Activities: 191px, right edge 1394, unchanged).
     */
    const code = codeOf('components/Design/StandardComponents.tsx');
    const slots = [...code.matchAll(/\{rightAction && \(/g)];
    expect(slots.length, 'StandardPage should render rightAction on both branches').toBe(2);
    for (const m of slots) {
      const region = code.slice(m.index!, m.index! + 260);
      expect(region, 'the slot must be a Stack, not a bare Box — two actions get no gap').toMatch(
        /<Stack[^>]*spacing=\{3\}/
      );
      expect(
        region,
        'align="stretch" is what squares the right edges when a page passes two actions'
      ).toMatch(/align="stretch"/);
    }
    expect(code, 'a bare rightAction Box is back').not.toMatch(/\{rightAction && <Box/);
  });

  it('keeps StandardCard header roles the right way round', () => {
    /*
     * MEASURED at 768px on the parcel profile. The title column carried `flexShrink={0}`, so it
     * kept its MAX-CONTENT width — the affidavit card's heading ran 94 → 690 on ONE line — and
     * the header action was pushed out instead: "Add Affidavit" landed at x=729, outside a card
     * ending at 698 and past the viewport.
     *
     * Backwards. The title reflows; the action is a fixed-size control that must not be
     * squeezed.
     */
    const code = codeOf('components/Design/StandardComponents.tsx');
    const i = code.indexOf('{headerAction}');
    expect(
      i,
      'StandardCard no longer renders headerAction — this would pass vacuously'
    ).toBeGreaterThan(-1);
    const vstackStart = code.lastIndexOf('<VStack', i);
    const vstack = openingTagAt(code, vstackStart, 'VStack');
    expect(
      vstack,
      'the title column must shrink: `flexShrink={0}` here pins it at max-content and shoves ' +
        'the header action off the card'
    ).not.toMatch(/flexShrink=\{0\}/);
    expect(vstack, 'a flex item needs `minW={0}` to wrap below its longest word').toMatch(
      /minW=\{0\}/
    );

    /*
     * …and the action must be the side that does NOT give.
     *
     * ⚠️ The first version of this was `lastIndexOf('<Box')` + a `flexShrink={0}` match, and it
     * PASSED the mutation that deleted the wrapper entirely — because the nearest preceding
     * `<Box` is then the one holding `titleIcon`, which carries the same prop. Checking that
     * SOMETHING nearby has the prop is not checking that the wrapper does. So: the wrapper must
     * be the DIRECT parent, with nothing between its `>` and `{headerAction}`.
     */
    const wrapperStart = code.lastIndexOf('<Box', i);
    const wrapper = openingTagAt(code, wrapperStart, 'Box');
    const between = code.slice(wrapperStart + wrapper.length + 1, i);
    expect(
      between.trim(),
      'headerAction is not the direct child of a Box — the wrapper was removed or something ' +
        `was inserted between them: ${JSON.stringify(between.slice(0, 80))}`
    ).toBe('');
    expect(
      wrapper,
      'headerAction must sit in a `flexShrink={0}` wrapper, or a long title squeezes the control'
    ).toMatch(/flexShrink=\{0\}/);
  });

  it('builds the affidavit card header from StandardCard, not a local copy', () => {
    /*
     * OBSERVED at 430px: a hand-rolled `<HStack justify="space-between">` header. An HStack is a
     * nowrap row, the title carries a regulation citation and wraps to three lines, and neither
     * side declared anything about shrinking — so "Add Affidavit" was pushed past the card's
     * right edge and rendered as "Add Affidav".
     *
     * Its sibling AdjoiningLandSection was never broken, because it uses these props and
     * StandardCard's header is already `direction={{ base: 'column', md: 'row' }}`.
     */
    const code = codeOf('views/Dashboard/Dashboard/Parcel/LandownerAffidavitSection.tsx');
    const i = code.indexOf('<StandardCard');
    expect(i, 'the affidavit card moved — this would pass vacuously').toBeGreaterThan(-1);
    const tag = openingTagAt(code, i, 'StandardCard');
    for (const prop of ['title', 'titleIcon', 'headerAction']) {
      expect(
        tag,
        `the affidavit card must pass \`${prop}\` rather than hand-rolling a header`
      ).toMatch(new RegExp(`(?<![a-zA-Z])${prop}=`));
    }
    // The shape that broke: a space-between row holding the title, inside the card body.
    const body = code.slice(i);
    expect(
      body.slice(0, body.indexOf('parcel.affidavit.description')),
      'a space-between header row is back inside the card body'
    ).not.toMatch(/<HStack justify="space-between">/);
  });
});
