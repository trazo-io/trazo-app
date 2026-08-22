/**
 * Guard: the per-event-type colour never drops back to a step that fails contrast.
 *
 * The same eight-entry map — `{ icon: Fa…, color: '<hue>.<step>' }`, keyed by event type — is
 * hand-copied across FOUR components, which is why one contrast defect had several lives:
 *
 *   components/Tables/EnhancedTimelineRow        getEventConfig     producer timeline
 *   components/Events/ConsumerEventCard          getEventTypeIcon   consumer QR card
 *   views/Scan/…/UltraMobileProductionJourney    getEventConfig x2  consumer QR journey
 *                                                (the first holds TWO map blocks — a switch
 *                                                 on event_type plus a keyword fallback —
 *                                                 so three blocks live in two functions)
 *   views/Dashboard/…/forms/NewEvent             EVENT_TYPES array  selector tiles (bare hue)
 *
 * MEASURED 2026-08-22, before this was enforced. The value is never used as body text — it is
 * a 42px ring border, the glyph inside that ring, a card hover border, a filled circle behind
 * a WHITE glyph, and a filled tile behind a WHITE LABEL. So most uses owe WCAG's 3.0 non-text
 * minimum and the last owes the full 4.5.
 *
 *   on white          green.500 2.78 ⛔  blue.500 3.12   orange.500 3.39
 *                     teal.500  3.51     yellow.700 3.64  red.500    3.68
 *   on a .50 tint     green.500 2.70 ⛔  blue.500 2.74 ⛔
 *   white ON the fill (NewEvent's selected tile — this is TEXT, 4.5)
 *                     yellow.500 2.39 ⛔ green.500 2.78 ⛔ blue.500 3.12 ⛔
 *                     orange.500 3.39 ⛔ teal.500  3.51 ⛔ red.500   3.68 ⛔
 *
 * `.claude/rules/frontend.md` bans a white icon on `green.500` by name; six of the seven
 * selector tiles were doing the equivalent with a white label.
 *
 * ⚠️ This guard is about the STEP, never the hue. The category Badge derives its palette by
 * string-splitting the same value (`eventConfig.color.split('.')[0]`), so `green.500` and
 * `green.700` produce an identical badge. Whether eight categories should carry eight hues at
 * all is an open design question and deliberately NOT decided here.
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

/** Blank comments, keeping newlines so reported line numbers stay true. */
const codeOf = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');

/**
 * Steps that do NOT clear 3.0 on white for at least one hue in this palette set, so none of
 * them may back an event-type glyph. `600` is absent on purpose: it is the boundary step and
 * clears 3.0 for every hue here (worst 3.64), so a hover border may use it.
 */
const TOO_LIGHT = new Set(['50', '100', '200', '300', '400', '500']);

const files = walk(SRC);

describe('event-type glyph colour', () => {
  /**
   * The functions that carry an event-type map, by name.
   *
   * ⚠️ Scoped deliberately. The first version of this assertion matched any `color:` sitting
   * near an `icon:` and reported SIXTY-FIVE offenders — almost all of them the
   * `fields.push({ label, value, icon, color })` detail rows inside EnhancedTimelineRow, which
   * are small inline markers beside a label that already states the fact. Those are decorative
   * and governed elsewhere; folding them in here would have made the guard permanently red for
   * reasons unrelated to the bug, which is how a guard gets muted.
   */
  const MAP_FUNCTIONS = [
    ['components/Tables/EnhancedTimelineRow.tsx', 'getEventConfig'],
    ['components/Events/ConsumerEventCard.tsx', 'getEventTypeIcon'],
    ['views/Scan/ProductDetail/components/UltraMobileProductionJourney.tsx', 'getEventConfig']
  ] as const;

  /** Body of every `const <name> = (` … matching brace, so nested copies are all captured. */
  const bodiesOf = (code: string, fn: string): string[] => {
    const out: string[] = [];
    const re = new RegExp(`const ${fn} = \\(`, 'g');
    for (const m of code.matchAll(re)) {
      let i = code.indexOf('{', m.index!);
      let depth = 0;
      const start = i;
      while (i < code.length) {
        if (code[i] === '{') depth++;
        else if (code[i] === '}') {
          depth--;
          if (depth === 0) break;
        }
        i++;
      }
      out.push(code.slice(start, i + 1));
    }
    return out;
  };

  it('still finds every event-type map', () => {
    // Renamed or consolidated, the assertion below would pass by scanning nothing.
    let found = 0;
    for (const [rel, fn] of MAP_FUNCTIONS) {
      const bodies = bodiesOf(codeOf(readFileSync(join(SRC, rel), 'utf8')), fn);
      expect(bodies.length, `${fn} not found in ${rel}`).toBeGreaterThan(0);
      found += bodies.length;
    }
    // 1 (timeline) + 1 (consumer card) + 2 (journey) at the time of writing. The journey's
    // first function holds two map blocks, so block count (3) != function count (2) there.
    expect(found, 'the maps moved — every assertion here would go vacuous').toBeGreaterThanOrEqual(4);
  });

  it('never backs an event-type glyph with a sub-threshold step', () => {
    const offenders: { file: string; token: string }[] = [];
    for (const [rel, fn] of MAP_FUNCTIONS) {
      const code = codeOf(readFileSync(join(SRC, rel), 'utf8'));
      for (const bodyText of bodiesOf(code, fn)) {
        for (const m of bodyText.matchAll(/color:\s*'([a-z]+)\.(\d+)'/g)) {
          if (TOO_LIGHT.has(m[2])) offenders.push({ file: rel, token: `${m[1]}.${m[2]}` });
        }
      }
    }
    expect(
      offenders,
      `An event-type colour backs a ring border, the glyph inside it, a card hover border and ` +
        `a filled circle carrying a WHITE glyph — all graphical objects owing 3.0:1. MEASURED ` +
        `on white: green.500 2.78, blue.500 3.12, orange.500 3.39; on a .50 tint green.500 ` +
        `drops to 2.70. Raise the STEP and leave the hue alone, so the category Badge (which ` +
        `derives its palette by string-splitting this value) is unaffected:\n${JSON.stringify(
          offenders,
          null,
          2
        )}`
    ).toEqual([]);
  });

  it("keeps NewEvent's selected tile legible", () => {
    /*
     * That tile interpolates ONE step across every hue (`${eventType.color}.800`) and puts a
     * white label on it, so the weakest hue sets the bar: yellow.800 at 5.54. `.700` is not
     * enough — yellow.700 is 3.64, under the 4.5 that text owes.
     */
    const code = codeOf(
      readFileSync(join(SRC, 'views/Dashboard/Dashboard/components/forms/NewEvent.jsx'), 'utf8')
    );
    const steps = [...code.matchAll(/\$\{eventType\.color\}\.(\d+)/g)].map((m) => Number(m[1]));
    expect(steps.length, 'the selector tiles moved — this would pass vacuously').toBeGreaterThan(2);
    expect(
      Math.min(...steps),
      `every interpolated step must be 600+ (hover border) and the white-label fill 800+; ` +
        `found ${JSON.stringify(steps)}`
    ).toBeGreaterThanOrEqual(600);
    // the focus ring must be the shared token, not a per-hue tint that varies by event type
    expect(code, 'focus ring must use the theme `outline` shadow').not.toMatch(
      /--chakra-colors-\$\{eventType\.color\}-\d+/
    );
  });
});
