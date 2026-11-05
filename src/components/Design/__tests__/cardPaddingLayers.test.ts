/**
 * Guard: one horizontal inset per nesting level on mobile.
 *
 * `assets/css/trazo-dashboard-styles.css` — one of the four files CLAUDE.md marks DO NOT
 * CHANGE — forces `.trazo-card { padding: 14px !important }` on mobile (22px from `md` up) on
 * every local `components/Card/Card`. That IS the card's inset. Anything a `CardBody` or
 * `CardHeader` adds with `px`/`p` is a SECOND inset nested inside the first, and a `SectionBox`
 * inside that body is a third.
 *
 * MEASURED 2026-08-22 on the add-activity form at 375px — the width `.claude/rules/frontend.md`
 * names as the design target:
 *
 *   16 page gutter + 1 card border + 14 card padding + 16 CardBody px
 *      + 1 SectionBox border + 12 SectionBox padding  =  60px each side
 *   → a text input got 255px of a 375px screen. 68%. A quarter of the phone spent on chrome.
 *
 * The page gutter was never the problem: 16px is exactly what Material (16dp), Apple HIG (16pt)
 * and Bootstrap (16px) specify, and the card was already 93% of the viewport. Every pixel over
 * that came from stacking insets that each looked reasonable alone.
 *
 * After: 16 + 1 + 14 = 31px each side, input 313px, 83%.
 *
 * Two bugs fell out of the same measurement, both in `NewEvent.jsx`:
 *   - three step cards gave `CardBody` `px={{base:4,md:6}}` and `CardHeader` NOTHING, so the
 *     card title rendered 16px to the LEFT of its own fields. `StandardCard` passes `px` to
 *     both for exactly this reason; these three hand-rolled a raw `<Card>` and never got it.
 *   - one `<StandardCard>` nested a second `<CardBody>` inside the one StandardCard already
 *     renders — three insets, 42px each side.
 *
 * Asserted against SOURCE, not the render: the failure is an author typing a padding prop, and
 * it is invisible until someone opens the page on a phone and notices the form feels narrow.
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
 * Files that still double-pad, left deliberately and listed so the debt is visible rather
 * than silently tolerated. Shrinking this list is the whole point; adding to it is not.
 *
 * - `views/Scan/**` is the CONSUMER QR surface. It carries its own <500ms / <500KB budget
 *   (`.claude/rules/frontend.md` → Performance) and none of it was rendered while making this
 *   change. Changing layout there blind is how you trade a padding win for a consumer-facing
 *   regression. MEASURED: 24 non-zero sites across 5 files — 23 `p={6}` and one `p={4}` —
 *   plus 2 already at zero. Awaiting a pass that actually opens the page.
 * - `views/Pages/Profile/Overview/**` and `views/Applications/**` are unmodified Creative Tim
 *   template pages (`p="12px 5px"`, `px="22px"` — values from a different design system).
 * - `views/Dashboard/ScannedProducts` is ORPHANED — rendered by no route.
 */
const KNOWN_UNFIXED = [
  'views/Scan/',
  'views/Pages/Profile/Overview/',
  'views/Applications/',
  'views/Dashboard/ScannedProducts/'
];

/** Read the opening tag of a JSX element, respecting `{}` nesting so `{{ base: 0 }}` survives. */
const openingTag = (src: string, from: number): string => {
  let i = from;
  let depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) break;
    i++;
  }
  return src.slice(from, i);
};

/**
 * True when a padding value contributes NO horizontal inset at the mobile base.
 *
 * Handles the three shapes that appear in this codebase, and the awkward fourth: a CSS
 * shorthand STRING nested inside a responsive object, `p={{ base: '0px 0px 16px 0px', … }}`,
 * which is vertical-only padding and must not be flagged. The first version of this helper
 * pattern-matched the whole prop value and reported that one as an offender.
 */
const zeroOnMobile = (value: string): boolean => {
  // in a responsive object only the mobile `base` matters
  const base = value.match(/base:\s*("[^"]*"|'[^']*'|[^,}\s]+)/);
  const raw = (base ? base[1] : value).replace(/^[{"'\s]+|[}"'\s]+$/g, '');
  if (/^0(px)?$/.test(raw)) return true;
  // CSS shorthand: `V H`, `T H B`, or `T R B L` — the horizontal components must be 0
  const parts = raw.split(/\s+/);
  const isZero = (x: string) => /^0(px)?$/.test(x);
  if (parts.length === 2 || parts.length === 3) return isZero(parts[1]);
  if (parts.length === 4) return isZero(parts[1]) && isZero(parts[3]);
  return false;
};

const files = walk(SRC);

describe('card padding layers', () => {
  it('has a corpus to check', () => {
    // If the tree moves, every assertion below would pass by finding nothing.
    expect(files.length).toBeGreaterThan(200);
    expect(
      files.filter((f) => /<StandardCard\b/.test(readFileSync(f, 'utf8'))).length
    ).toBeGreaterThan(30);
  });

  it('gives no StandardCard a mobile padding inset', () => {
    const offenders: { file: string; line: number; padding: string }[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<StandardCard\b/g)) {
        const tag = openingTag(src, m.index! + m[0].length);
        const pm = tag.match(/padding=(\{[^=]*?\}\}|\{[^{}]*\})/);
        if (pm && !zeroOnMobile(pm[1])) {
          offenders.push({
            file: relative(SRC, file),
            line: src.slice(0, m.index).split('\n').length,
            padding: pm[1]
          });
        }
      }
    }
    expect(
      offenders,
      `StandardCard forwards \`padding\` to CardBody's \`px\`, and the card ALREADY carries ` +
        `14px on mobile from the protected CSS. A non-zero base is a second inset inside the ` +
        `first — it cost the add-activity form 32px of a 375px screen:\n${JSON.stringify(
          offenders,
          null,
          2
        )}`
    ).toEqual([]);
  });

  it('gives no CardBody/CardHeader a mobile horizontal inset', () => {
    const offenders: { file: string; line: number; prop: string }[] = [];
    for (const file of files) {
      const rel = relative(SRC, file);
      if (KNOWN_UNFIXED.some((p) => rel.includes(p))) continue;
      // StandardComponents DEFINES the contract: its `px={padding}` forwards a prop whose
      // value is a variable, so there is nothing to read here. Its default is asserted below.
      if (rel === 'components/Design/StandardComponents.tsx') continue;
      const src = readFileSync(file, 'utf8');
      /*
       * Which files are subject to the forced padding?
       *
       * The protected CSS selects on `.trazo-card` / `[data-component='Card']` — a CLASS, not a
       * component — so importing `components/Card/Card` is the common way in but not the only
       * one. `components/Tables/EnhancedTimelineRow` renders CHAKRA's `<Card>` and hand-applies
       * `className="trazo-card"`, which picks up the same `!important` padding while importing
       * no local Card at all. An import-only filter skipped that file entirely, so its
       * `CardBody` sat unguarded on top of a forced 14px inset.
       */
      const forcedPadding =
        /from\s*['"][^'"]*components\/Card\//.test(src) ||
        /className=["'`][^"'`]*trazo-card\b/.test(src) ||
        /data-component=['"][Cc]ard['"]/.test(src);
      if (!forcedPadding) continue;
      for (const m of src.matchAll(/<(CardBody|CardHeader|CardFooter)\b/g)) {
        const tag = openingTag(src, m.index! + m[0].length);
        const pm = tag.match(/(?<![a-zA-Z])(px|p)=(\{[^=]*?\}\}|\{[^{}]*\}|"[^"]*")/);
        if (pm && !zeroOnMobile(pm[2])) {
          offenders.push({
            file: rel,
            line: src.slice(0, m.index).split('\n').length,
            prop: `${pm[1]}=${pm[2]}`
          });
        }
      }
    }
    expect(
      offenders,
      `The local Card already pads 14px (mobile) / 22px (md+) via ` +
        `assets/css/trazo-dashboard-styles.css \`!important\`. Horizontal padding here nests a ` +
        `second inset inside it. Use \`py\` for vertical and \`px={{ base: 0, md: N }}\`:\n` +
        JSON.stringify(offenders, null, 2)
    ).toEqual([]);
  });

  it("defaults StandardCard's forwarded padding to zero on mobile", () => {
    // The call-site sweep skips this file because `px={padding}` is a variable. Read the
    // default directly, or 113 of the 149 call sites — every one that passes nothing — would
    // go unchecked.
    const src = readFileSync(join(SRC, 'components/Design/StandardComponents.tsx'), 'utf8');
    const m = src.match(/\n\s*padding = (\{[^}]*\}),/);
    expect(m, "StandardCard's `padding` default moved — this would pass vacuously").toBeTruthy();
    expect(zeroOnMobile(m![1]), `default is ${m![1]}`).toBe(true);
  });

  it('keeps SectionBox flush on mobile', () => {
    const src = readFileSync(join(SRC, 'components/Design/StandardComponents.tsx'), 'utf8');
    const m = src.match(/export const SectionBox = [\s\S]*?\n\};/);
    expect(m, 'SectionBox moved or was renamed — this assertion would pass vacuously').toBeTruthy();
    const body = m![0];
    // It is a white box on a white card: the border is its only signal, and on mobile it is a
    // third inset charging 12px a side for a line nobody needs beside a badge and a heading.
    expect(body, 'SectionBox must not re-introduce a mobile horizontal inset').toMatch(
      /px=\{\{\s*base:\s*0/
    );
    expect(body, 'SectionBox must not re-introduce its mobile border').toMatch(
      /borderWidth=\{\{\s*base:\s*0/
    );
    // the desktop treatment must survive — dropping it everywhere was never the intent
    expect(body).toMatch(/md:\s*'1px'/);
    // ...and the VERTICAL inset must survive on mobile. With the border gone, whitespace is the
    // only separator left, and these forms space fields 20px apart with a 20px stack gap
    // between sections — zeroing `py` too would make section spacing indistinguishable from
    // field spacing. Horizontal was the problem; vertical was never measured as one.
    const py = body.match(/py=\{\{\s*base:\s*(\d+)/);
    expect(py, 'SectionBox lost its responsive py').toBeTruthy();
    expect(
      Number(py![1]),
      'mobile py must stay non-zero — it is the only section separator'
    ).toBeGreaterThan(0);
  });

  it('nests no CardBody inside a StandardCard', () => {
    const offenders: { file: string; line: number }[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<StandardCard\b/g)) {
        // StandardCard renders its own CardBody; a second one inside is a third inset.
        //
        // Read the opening tag with the brace-aware helper rather than `<StandardCard[^>]*>`.
        // That character class stops at the FIRST `>`, and in any real tag that is the `>` of
        // an arrow function inside a prop (`onClick={() => …}`) — so the pattern would fail to
        // reach the children and silently report no nesting. It passed its mutation test only
        // because the one site that had this bug was a bare `<StandardCard>`.
        const tagEnd = m.index! + m[0].length + openingTag(src, m.index! + m[0].length).length;
        const children = src.slice(tagEnd, tagEnd + 400);
        if (/^>\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<CardBody\b/.test(children)) {
          offenders.push({
            file: relative(SRC, file),
            line: src.slice(0, m.index).split('\n').length
          });
        }
      }
    }
    expect(
      offenders,
      `StandardCard already renders a CardBody. Nesting another puts a third inset inside the ` +
        `card's forced padding — 42px each side on a 375px screen:\n${JSON.stringify(
          offenders,
          null,
          2
        )}`
    ).toEqual([]);
  });
});
