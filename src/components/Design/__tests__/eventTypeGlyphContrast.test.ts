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
    expect(found, 'the maps moved — every assertion here would go vacuous').toBeGreaterThanOrEqual(
      4
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

/**
 * The producer timeline's category Badge must take its colour from the SHARED semantic map,
 * never from the event's decorative accent.
 *
 * The bug (MEASURED 2026-08-28, resolved through the real theme): the Badge derived a PALETTE
 * by string-splitting `eventConfig.color` — `colorScheme={eventConfig.color.split('.')[0]}` —
 * giving seven hues across eight categories, of which orange/yellow/teal/purple are not Trazo
 * scales at all (styles.js declares green/gray/amber/red/blue) and resolved to Chakra's
 * defaults. Contrast passed everywhere; the defect was MEANING. Pest Management rendered
 * #B71C1C on #FFCDD2 and Soil Management #744210 on #FEFCBF, so ordinary logged records read
 * as an error and a warning on a surface a certifier reads. It did not even separate what it
 * decorated: Weather and Equipment both split to `blue`, identical pixels.
 *
 * `config/events/eventTypeAppearance.ts` already owned this decision for the activity feed and
 * the event modal — semantic variants, never per-family hues. This asserts the timeline uses
 * the same one instead of inventing a fourth answer.
 */
describe('timeline category badge renders from the shared semantic map', () => {
  const code = readFileSync(join(SRC, 'components/Tables/EnhancedTimelineRow.tsx'), 'utf8');

  it('imports TYPE_BADGE and drives the badge variant from it', () => {
    expect(code).toMatch(
      /import \{[^}]*TYPE_BADGE[^}]*\} from 'config\/events\/eventTypeAppearance'/
    );
    expect(code, 'the category Badge must read TYPE_BADGE').toMatch(
      /variant=\{TYPE_BADGE\[[^\]]+\]\s*\?\?\s*'neutral'\}/
    );
  });

  it('never derives a Badge palette from the decorative accent', () => {
    // The exact shape of the bug. Any reappearance — here or on a new badge — fails.
    expect(
      codeOf(code),
      'a Badge colorScheme must not be computed from eventConfig.color'
    ).not.toMatch(/colorScheme=\{[^}]*eventConfig\.color/);
  });

  it('carries no banned status hue on a badge — blue and purple are struck by frontend.md', () => {
    const banned = [
      ...codeOf(code).matchAll(/colorScheme="(blue|purple|teal|yellow|orange)"/g)
    ].map((m) => m[1]);
    expect(banned, `found colorScheme literals: ${JSON.stringify(banned)}`).toEqual([]);
  });
});

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

  it('the timeline ring drops red and amber for those two families too', () => {
    // A neutral badge above a red ring would still read as an alert, so the ring is checked
    // separately — EnhancedTimelineRow keeps its own getEventConfig map.
    const code = codeOf(
      readFileSync(join(SRC, 'components/Tables/EnhancedTimelineRow.tsx'), 'utf8')
    );
    for (const [glyph, family] of [
      ['FaBug', 'pest'],
      ['FaFlask', 'inputs']
    ] as const) {
      // Bounded by the entry's own `category:` key rather than a character count — `codeOf`
      // blanks comments to spaces, so a documented entry can push `color:` far down the file.
      const at = code.indexOf(`icon: ${glyph},`);
      expect(at, `${glyph} entry not found — this would pass vacuously`).toBeGreaterThan(-1);
      const end = code.indexOf('category:', at);
      expect(end, `no category: after ${glyph}`).toBeGreaterThan(at);
      const hue = /color: '([a-z]+)\.\d+'/.exec(code.slice(at, end))?.[1];
      expect(hue, `no colour found between ${glyph} and its category`).toBeTruthy();
      expect(['red', 'orange', 'amber'], `${family} ring is "${hue}"`).not.toContain(hue);
    }
  });
});

/**
 * An emissions figure is a measurement, not a performance. `getImpactLevel`'s 5/15/30/60 kg
 * bands cite no benchmark and carry no denominator, and carbon-methodology.md scopes the number
 * to direct operational emissions rather than an LCA — so there is nothing to grade against.
 */
describe('carbon figures are reported, not graded', () => {
  it('the timeline does not interpolate the impact ramp into a colour', () => {
    const code = codeOf(
      readFileSync(join(SRC, 'components/Tables/EnhancedTimelineRow.tsx'), 'utf8')
    );
    expect(code, 'carbon colour must not come from getImpactLevel').not.toMatch(
      /\$\{getImpactLevel\([^)]*\)\.color\}/
    );
  });

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

  it('every timeline ring shares ONE colour token', () => {
    const code = codeOf(
      readFileSync(join(SRC, 'components/Tables/EnhancedTimelineRow.tsx'), 'utf8')
    );
    // Only the entries inside getEventConfig: `color: '<token>',` immediately before `category:`.
    const rings = [...code.matchAll(/color: '([a-z]+\.\d+)',\s*\n\s*category:/g)].map((m) => m[1]);
    expect(rings.length, 'the ring map moved — this would pass vacuously').toBeGreaterThanOrEqual(
      8
    );
    expect([...new Set(rings)], `rings disagree: ${JSON.stringify(rings)}`).toHaveLength(1);
  });

  it('the badge and the ring belong to the SAME hue family', () => {
    // A green chip over a blue ring is the exact defect this pair of rules exists to stop.
    const code = codeOf(
      readFileSync(join(SRC, 'components/Tables/EnhancedTimelineRow.tsx'), 'utf8')
    );
    const ringHue = /color: '([a-z]+)\.\d+',\s*\n\s*category:/.exec(code)?.[1];
    expect(ringHue, 'no ring colour found').toBeTruthy();
    // `subtle` and `brand` both resolve through badge.js defaultProps.colorScheme = green.
    const GREEN_VARIANTS = ['subtle', 'brand'];
    const variant = TYPE_BADGE[1];
    expect(
      GREEN_VARIANTS.includes(variant) ? 'green' : variant,
      `badge variant "${variant}" and ring hue "${ringHue}" are different families`
    ).toBe(ringHue);
  });
});
