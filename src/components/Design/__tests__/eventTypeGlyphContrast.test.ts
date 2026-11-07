/**
 * Guard: the per-event-type colour never drops back to a step that fails contrast.
 *
 * The same eight-entry map — `{ icon: Fa…, color: '<hue>.<step>' }`, keyed by event type — is
 * hand-copied across FOUR components, which is why one contrast defect had several lives:
 *
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
import { TYPE_BADGE } from 'config/events/eventTypeAppearance';
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
   * `fields.push({ label, value, icon, color })` detail rows of the old timeline row, which
   * are small inline markers beside a label that already states the fact. Those are decorative
   * and governed elsewhere; folding them in here would have made the guard permanently red for
   * reasons unrelated to the bug, which is how a guard gets muted.
   */
  const MAP_FUNCTIONS = [
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
    // 1 (consumer card) + 2 (journey). The journey's first function holds two map blocks, so
    // block count (2) != function count (1) there. The producer timeline's copy left with
    // `EnhancedTimelineRow` (2026-11-07).
    expect(found, 'the maps moved — every assertion here would go vacuous').toBeGreaterThanOrEqual(
      3
    );
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

  /*
   * 🔄 2026-08-31 — REPOINTED, and the original concern is now moot by design.
   *
   * This used to read NewEvent.jsx for `${eventType.color}.<step>`, the seven-hue selector
   * tile, and assert the interpolated step never fell below 600. Its own vacuity guard
   * ("the selector tiles moved") started failing because they did: the picker is now
   * `components/Events/VerbPickerGrid.tsx`, part of the activity-verb pivot, and it dropped
   * the per-hue tile entirely — one green for every verb instead of seven hues in one modal.
   * `eventType.color` no longer appears anywhere under src/.
   *
   * So there is no weakest hue left to set the bar, and the guard that mattered is simpler:
   * the selected tile is a WHITE LABEL on a green fill, which is text and owes 4.5. green.700
   * is 5.13; green.600 is 4.12 and green.500 is 2.78, both of which fail — and `green.600` is
   * exactly the "safe dark green" that `.claude/rules/frontend.md` documents spreading to 75
   * text call sites. Hover must darken, not lighten.
   */
  it('keeps the selected verb tile legible', () => {
    const code = codeOf(readFileSync(join(SRC, 'components/Events/VerbPickerGrid.tsx'), 'utf8'));

    // Split by ROLE, because the thresholds differ: the fill sits behind a white LABEL and
    // owes 4.5, the borders owe only the 3.0 non-text floor. Asserting 4.5 on all four
    // `isSelected ? 'green.N'` sites would fail a hover border set to green.600 — which
    // `.claude/rules/frontend.md` says is the RIGHT colour for a boundary.
    const WHITE_TEXT_SAFE = ['green.700', 'green.800', 'green.900'];

    const fill = code.match(/bg=\{isSelected \? '(green\.\d+)'/);
    expect(
      fill,
      'the selected tile no longer sets bg from isSelected — this would pass vacuously'
    ).not.toBeNull();
    expect(
      WHITE_TEXT_SAFE,
      `selected tile fills with ${fill?.[1]} behind a white label; green.600 is 4.12 and ` +
        'green.500 is 2.78, both under the 4.5 that text owes'
    ).toContain(fill?.[1]);

    // The 4.5 above is only the right threshold while everything ON that fill is white.
    // matchAll, not match: the tile sets `color` twice (the label and the glyph inside it),
    // and `match` returns whichever comes first — so changing the OTHER one passed silently.
    // `[\w.]+` so a dotted token like `gray.100` is captured and fails, rather than not
    // matching at all and disappearing.
    const onFill = [...code.matchAll(/color=\{isSelected \? '([\w.]+)'/g)].map((m) => m[1]);
    expect(
      onFill.length,
      'nothing on the selected tile keys its colour off isSelected — this would pass vacuously'
    ).toBeGreaterThan(1);
    for (const token of onFill) {
      expect(token, `${token} sits on the selected fill; it must be white`).toBe('white');
    }

    // Borders (base, hover, focus) owe 3.0, so green.600 passes and green.500 (4.12 vs 2.78
    // on white) does not.
    const borders = [...code.matchAll(/borderColor[:=]\s*\{?\s*isSelected \? '(green\.(\d+))'/g)];
    expect(borders.length, 'selected borders no longer key off isSelected').toBeGreaterThan(1);
    for (const [, token, step] of borders) {
      expect(
        Number(step),
        `selected border uses ${token}; a boundary needs 600+ (green.500 is 2.78 on white)`
      ).toBeGreaterThanOrEqual(600);
    }

    // The hue must not come back per-verb: seven hues in one modal is what the pivot removed.
    expect(code, 'verb tiles must not reintroduce a per-verb hue').not.toMatch(/verb\.color/);
  });
});

// The producer timeline's badge and ring checks pinned `EnhancedTimelineRow`, deleted 2026-11-07
// (no screen rendered it). The shared month timeline that replaced it takes its hue from
// `components/Events/categoryTone` (no badge), and consumerJourneyColourIsMeaning.test.ts keeps
// every status hue out of that map: pest is teal, inputs purple.

/**
 * Red and amber must stay spendable.
 *
 * The bug (2026-08-28): `TYPE_BADGE` read "inputs warn, pest is danger" — a conventional-ag
 * instinct applied to a certified-organic product. A pheromone-trap reading rendered with a red
 * badge and red ring, and an OMRI-type fish fertiliser with the amber `warning` pill, in the
 * same two colours the dashboard spends on a real blocker and on "Needs attention". 7 CFR
 * 205.206 monitoring and 7 CFR 205.601 inputs are the compliance evidence a certifier looks
 * for, not incidents.
 */
describe('status colour stays reserved for things a grower must act on', () => {
  const PEST = 6;
  const INPUTS = 2;

  it('neither pest nor inputs claims a status variant', () => {
    for (const code of [PEST, INPUTS]) {
      expect(['danger', 'warning'], `event_type ${code}`).not.toContain(TYPE_BADGE[code]);
    }
  });

  it('no event family carries a status variant — the glyph is the identity', () => {
    const offenders = Object.entries(TYPE_BADGE)
      .filter(([, v]) => v === 'danger' || v === 'warning')
      .map(([k, v]) => `${k}=${v}`);
    expect(offenders, `families claiming a status colour: ${JSON.stringify(offenders)}`).toEqual(
      []
    );
  });
});

/**
 * An emissions figure is a measurement, not a performance. `getImpactLevel`'s 5/15/30/60 kg
 * bands cite no benchmark and carry no denominator, and carbon-methodology.md scopes the number
 * to direct operational emissions rather than an LCA — so there is nothing to grade against.
 */
describe('carbon figures are reported, not graded', () => {
  // The timeline half of this pinned `EnhancedTimelineRow` (deleted 2026-11-07); the shared month
  // timeline shows no carbon figure. The detail modal is where one is still shown.

  it('the detail modal awards every band the same variant', () => {
    const code = codeOf(readFileSync(join(SRC, 'components/Modals/EventDetailsModal.tsx'), 'utf8'));
    expect(code, 'impactBadgeVariantFor must not branch on magnitude').not.toMatch(
      /IMPACT_BADGE_VARIANT\s*\[/
    );
    expect(code).toMatch(/impactBadgeVariantFor\s*=\s*\([^)]*\)\s*=>\s*'neutral'/);
  });
});

/**
 * TONAL GREEN — one hue for the whole event-type system, on BOTH carriers.
 *
 * The recurring failure was never a wrong hue, it was a half-applied rule: seven decorative
 * hues, then two of them neutralised for good reasons, leaving a green badge above a blue ring
 * on the same record. These two assertions make "apply it to all eight families and to both
 * carriers" a thing the suite can check, rather than a thing a comment asks for.
 */
describe('one hue, both carriers', () => {
  it('every family shares ONE badge variant', () => {
    const variants = [...new Set(Object.values(TYPE_BADGE))];
    expect(Object.keys(TYPE_BADGE).length, 'families moved — this would pass vacuously').toBe(8);
    expect(
      variants,
      `families disagree on their badge variant: ${JSON.stringify(TYPE_BADGE)}`
    ).toHaveLength(1);
  });

  // The ring checks that sat here pinned `EnhancedTimelineRow`'s own map (deleted 2026-11-07).
  // The shared month timeline takes its hue from components/Events/categoryTone, a per-category
  // wayfinding palette chosen from rendered options (2026-11-04), guarded by
  // consumerJourneyColourIsMeaning.test.ts.
});
