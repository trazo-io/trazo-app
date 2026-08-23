/**
 * Guard: empty states come from one component, and their glyph clears the contrast floor.
 *
 * MEASURED 2026-08-22 on the parcel page. Three files had hand-rolled the SAME empty state —
 * `Parcel/components/TrackList`, `Parcel/components/HistoryCard`, `Carousel/CarouselHorizontal`
 * — all a centred `FaSeedling` over a title and a description, and all three had already
 * drifted apart on `spacing` and `py`. Two more sat inside TrackList alone and disagreed with
 * each other on `boxSize` (12 vs 10), title size (`lg` vs `md`), `py` (16 vs 8) and colour.
 *
 * Every one of those glyphs failed the 3.0:1 a non-text mark owes on white:
 *
 *     green.400  2.01     FaSeedling, x3
 *     green.300  1.65     timeline dot
 *     blue.400   2.65     "no events yet" — and blue carries no meaning in this palette
 *     orange.400 2.55     "setup failed" — and the theme defines `amber`, not `orange`,
 *                         so this was Chakra's accent leaking in
 *     gray.400   2.68     the card's ⋮
 *
 * An empty state "feels" like a place for a soft friendly tint. It is the opposite: the glyph
 * is the only thing on the screen. `StandardEmptyState` renders it at `green.700` (5.13), the
 * colour section headings already use.
 *
 * Asserted against SOURCE: the failure is an author typing a colour into a fresh VStack, and
 * it stays invisible until someone opens that particular empty page.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '../../..');

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(p)) out.push(p);
  }
  return out;
};

/**
 * Blank out comments — a colour named in prose explaining why it was removed is not a usage.
 *
 * ⚠️ Blanked, NOT deleted. Deleting a block comment removes its newlines too, which shifts
 * every line number after it: the first version of this reported `AdminGuard.tsx:18` for a
 * glyph that actually sits ~30 lines lower, and a guard that points at the wrong line sends
 * whoever reads it to innocent code. Whitespace of the same shape keeps the mapping honest.
 */
const codeOf = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');

/**
 * MEASURED against white. A glyph big enough to be an illustration is the focal point of an
 * otherwise blank panel, so it owes the full 3.0 non-text minimum — these are the tokens that
 * were actually in use and do not clear it.
 */
const SUB_THRESHOLD: Record<string, number> = {
  'green.300': 1.65,
  'green.400': 2.01,
  'green.500': 2.78,
  'blue.400': 2.65,
  'orange.300': 1.9,
  'orange.400': 2.55,
  'yellow.400': 1.9,
  'gray.400': 2.68,
  'teal.400': 2.3
};

/**
 * Props of a JSX opening tag, by name, with the raw value text.
 *
 * ⚠️ This replaced a single regex whose value pattern was `\{[^=]*?\}\}|\{[^{}]*\}|"[^"]*"`,
 * and that regex is why the parcel-page bug shipped past this very guard. `CardWithImage` wrote
 *
 *     height={
 *       fillHeight
 *         ? '100%'
 *         : { base: '220px', sm: '240px', md: '270px', lg: '290.5px', xl: '290.5px' }
 *     }
 *
 * — a multi-line ternary. It has no adjacent `}}` for the first alternative and it contains
 * inner braces, so the second could not match either. The guard read the prop as ABSENT and
 * passed. Brace-balance the value instead of pattern-matching its shape.
 */
const propsOf = (tag: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/(?<![a-zA-Z0-9_$])([a-zA-Z_][\w$]*)=/g)) {
    let i = m.index! + m[0].length;
    const open = tag[i];
    if (open === '"' || open === "'") {
      const close = tag.indexOf(open, i + 1);
      if (close === -1) continue;
      out[m[1]] = tag.slice(i, close + 1);
    } else if (open === '{') {
      let depth = 0;
      const start = i;
      while (i < tag.length) {
        if (tag[i] === '{') depth++;
        else if (tag[i] === '}') {
          depth--;
          if (depth === 0) break;
        }
        i++;
      }
      out[m[1]] = tag.slice(start, i + 1);
    }
  }
  return out;
};

/**
 * The part of a responsive value that applies on a PHONE.
 *
 * A fixed height is legitimate from the breakpoint where a layout needs one — `CardWithImage`
 * has a `height: 100%` image beside its text from `xl`. What breaks a phone is a px value at
 * `base`. So: if the value names a `base` step, judge only that; otherwise the value is
 * unconditional and applies everywhere, so judge all of it.
 */
const mobileStepOf = (raw: string): string => {
  const steps = [...raw.matchAll(/(?:^|[{,\s])(base)\s*:\s*(['"])(.*?)\2/g)];
  if (steps.length) return steps.map((m) => m[3]).join(' ');
  return raw.replace(/\b(sm|smd|smdd|smddd|md|lg|xl)\s*:\s*(['"]).*?\2/g, '');
};

const files = walk(SRC);

describe('empty states', () => {
  it('has a corpus to check', () => {
    // If the tree moves, every assertion below passes by finding nothing.
    expect(files.length).toBeGreaterThan(200);
    expect(
      files.filter((f) => /StandardEmptyState/.test(readFileSync(f, 'utf8'))).length,
      'nothing uses StandardEmptyState — the component or its call sites moved'
    ).toBeGreaterThan(2);
  });

  it('puts no sub-threshold colour on an illustration-sized glyph', () => {
    const offenders: { file: string; line: number; glyph: string; colour: string; ratio: number }[] =
      [];
    for (const file of files) {
      const code = codeOf(readFileSync(file, 'utf8'));
      // `boxSize >= 8` (32px+) is what separates an empty-state illustration from an inline
      // marker beside copy. Inline markers are governed by the section-icon rules elsewhere.
      //
      // ⚠️ Read the whole tag, then pull `color` and `boxSize` out of it INDEPENDENTLY. The
      // first version of this was one regex requiring the order as → color → boxSize, so
      // writing `boxSize` before `color` — which is just as natural, and is how several
      // existing call sites are written — walked straight past it.
      for (const m of code.matchAll(/<Icon\b/g)) {
        let i = m.index! + m[0].length;
        let depth = 0;
        while (i < code.length) {
          const ch = code[i];
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          else if (ch === '>' && depth === 0) break;
          i++;
        }
        const tag = code.slice(m.index!, i);
        const colour = tag.match(/(?<![a-zA-Z])color="([a-z]+\.\d+)"/)?.[1];
        const size = tag.match(/(?<![a-zA-Z])boxSize=\{(\d+)\}/)?.[1];
        const glyph = tag.match(/as=\{(\w+)\}/)?.[1] ?? '(dynamic)';
        if (colour && size && Number(size) >= 8 && SUB_THRESHOLD[colour] !== undefined) {
          offenders.push({
            file: relative(SRC, file),
            line: code.slice(0, m.index).split('\n').length,
            glyph,
            colour,
            ratio: SUB_THRESHOLD[colour]
          });
        }
      }
    }
    expect(
      offenders,
      `An empty-state glyph is the only thing on the screen and owes 3.0:1 on white. Use ` +
        `StandardEmptyState, which renders at green.700 (5.13):\n${JSON.stringify(
          offenders,
          null,
          2
        )}`
    ).toEqual([]);
  });

  it('keeps StandardEmptyState on the one approved glyph colour', () => {
    const src = readFileSync(join(SRC, 'components/Design/StandardComponents.tsx'), 'utf8');
    const m = src.match(/export const StandardEmptyState = [\s\S]*?\n\};/);
    expect(m, 'StandardEmptyState moved or was renamed — this would pass vacuously').toBeTruthy();
    const body = m![0];
    expect(body, 'the glyph must use the shared section-icon colour, not a local literal').toMatch(
      /color=\{SECTION_ICON_COLOR\}/
    );
    // Scoped to the ICON line. The first version of this matched any colour literal in the
    // component and tripped on the title's `gray.700` and the description's `gray.600`, which
    // are text colours governed by the text floor (4.5), not the glyph rule.
    const iconLine = body.split('\n').find((l) => /<Icon\b/.test(l)) ?? '';
    expect(
      /color="[a-z]+\.\d+"/.test(iconLine),
      `a hard-coded glyph colour reappeared inside StandardEmptyState: ${iconLine.trim()}`
    ).toBe(false);

    /*
     * No `fill` prop. It existed for one day and was INERT: it set `flex: 1` to centre the
     * empty state in a stretched card, but MEASURED on TrackList the chain above it —
     * `CardBody` at `flex: 0 1 auto`, then a `Box` capped at `maxH: 400px` — never grows, so
     * there was no free space to take and a hard cap if there had been.
     *
     * Asserted rather than merely written in the docstring, because "we decided not to have
     * this" living only in prose is exactly how it comes back.
     */
    const props = src.match(/interface StandardEmptyStateProps \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(props, 'StandardEmptyStateProps moved — this would pass vacuously').not.toBe('');
    expect(
      /(?<![a-zA-Z])fill\??:/.test(props) || /(?<![a-zA-Z])fill\b\s*[,=}]/.test(body),
      'the inert `fill` prop is back — see the note on StandardEmptyStateProps'
    ).toBe(false);
  });

  it('never locks a card to a fixed pixel height at mobile width', () => {
    /*
     * `h`/`maxH` in px on a card is how the parcel page shipped 226px of dead space — 32% of
     * a 375px-tall card — with the CTA stranded 179px below the sentence that asked for it.
     * Its grid sibling locked a DIFFERENT mobile height (650 vs 700) in a layout that puts
     * them in separate rows on mobile, so the lock aligned nothing.
     *
     * ⛔ Worse than dead space: a locked height plus `overflow: hidden` DELETES whatever sits
     * past the cap. MEASURED 2026-08-23 on `/farm/166/parcel/299` at 430px — `CardWithImage`
     * held `height` and `maxHeight` at the `sm` step (240px) while its mobile column needed
     * 322px, so the "Read more" button — the ONLY route to the parcel profile page — rendered
     * at y=493 against a card ending at y=486. Fully outside. `elementFromPoint` over its
     * centre returned the card div, not the button. The farmer's report was "I can't get into
     * the parcel profile page", and they were right: there was no way in.
     *
     * `minH` is fine and deliberately not matched: it is a floor, content can still grow, and
     * it is the right way to stop a loading skeleton from collapsing (SmartUsageCard uses
     * `h="290px"` on its skeletons to match the real card's `minH="290px"`, which is correct —
     * hence the allowance for files whose only fixed heights sit in a loading/error branch).
     *
     * ⚠️ Only the MOBILE step is banned. A definite height is legitimate from the breakpoint
     * where a layout places a `height: 100%` image beside the text and needs something to
     * resolve against — which is what `CardWithImage` now does from `xl`.
     */
    const offenders: { file: string; line: number; prop: string }[] = [];
    for (const file of files) {
      const rel = relative(SRC, file);
      // skeletons deliberately mirror the real card's minH so the layout does not jump
      if (rel === 'views/Dashboard/Dashboard/components/SmartUsageCard.jsx') continue;
      const code = codeOf(readFileSync(file, 'utf8'));
      for (const m of code.matchAll(/<Card\b/g)) {
        let i = m.index! + m[0].length;
        let depth = 0;
        while (i < code.length) {
          const ch = code[i];
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          else if (ch === '>' && depth === 0) break;
          i++;
        }
        const tag = code.slice(m.index!, i);
        const props = propsOf(tag);
        /*
         * A card that fixes its WIDTH in px is a uniform tile — a carousel item, where every
         * card must be the same size for the row to scroll evenly — and fixing its height is
         * the point, not a bug. The defect is a full-width card that locks height and so
         * cannot shrink to its content. `CarouselCard` is the former and was the first thing
         * this assertion wrongly flagged.
         */
        const fixedWidthTile = ['w', 'width', 'maxW', 'maxWidth'].some(
          (k) => props[k] !== undefined && /\d{3}px/.test(mobileStepOf(props[k]))
        );
        if (fixedWidthTile) continue;
        for (const k of ['h', 'height', 'maxH', 'maxHeight']) {
          const raw = props[k];
          if (raw === undefined) continue;
          if (/\d{3}px/.test(mobileStepOf(raw))) {
            offenders.push({
              file: rel,
              line: code.slice(0, m.index).split('\n').length,
              prop: `${k}=${raw.replace(/\s+/g, ' ').slice(0, 90)}`
            });
          }
        }
      }
    }
    expect(
      offenders,
      `A card locked to a pixel height cannot shrink to its content, and with ` +
        `\`overflow: hidden\` it DELETES what does not fit — including the link out of it. Use ` +
        `\`minH\` for a floor, or scope the fixed height to the breakpoint that needs it:\n` +
        `${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });

  it("keeps CardWithImage's only exit link reachable", () => {
    /*
     * Two facts the fix depends on, neither visible from the height prop:
     *
     *   - ONE shared `readMore` node. It used to be two byte-identical copies, one per
     *     breakpoint layout, which is the shape that lets a fix land on one and miss the other
     *     — this repo's most common defect.
     *   - a 44px touch target. The button is `p="0px"` around a 14px label, so its natural hit
     *     area was ~20px, sitting at the very bottom edge of a card.
     */
    const src = readFileSync(join(SRC, 'components/Card/CardWithImage.tsx'), 'utf8');
    const code = codeOf(src);
    expect(code, 'the readMore node was inlined again — declare it once').toMatch(
      /const readMore = \(/
    );
    expect(
      (code.match(/\{readMore\}/g) ?? []).length,
      'both the mobile and the desktop layout must render the shared node'
    ).toBe(2);
    expect(
      (code.match(/navigate\(readMoreLink\)/g) ?? []).length,
      'a second, unshared copy of the navigation is back'
    ).toBe(1);
    const decl = code.slice(code.indexOf('const readMore = ('), code.indexOf('const identity'));
    expect(
      decl,
      'the exit link owes the 44px touch target on the layout that can grow — MEASURED, an ' +
        'unconditional 44px pushed the desktop label past a card that clips at 290.5px'
    ).toMatch(/minH=\{\{ base: '44px', xl: 'auto' \}\}/);

    /*
     * The STRUCTURAL guarantee, and the reason the line clamps are safe rather than lucky:
     * the text block takes the leftover space and clips ITSELF, so the link below it can never
     * be what gets pushed out of the card. Both layouts, because a fix that lands on one
     * breakpoint and misses the other is this repo's most common defect.
     *
     * It replaced a `Spacer`, which only pushes when there IS free space — once the text
     * overflowed there was none, so it collapsed to 0px and the link went over the edge.
     */
    expect(
      (code.match(/flex="1" minH=\{0\} overflow="hidden"/g) ?? []).length,
      'both text blocks must absorb-and-clip, or a long description pushes the link out again'
    ).toBe(2);
    expect(code, 'the Spacer is back — it cannot push when the content already overflows')
      .not.toMatch(/<Spacer\b/);
  });
});
