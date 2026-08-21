/**
 * Guard: the Education topic content stays inside the design system.
 *
 * This directory drifted furthest of anything in the app, and for a structural reason —
 * `EducationTopicDetail.tsx` is ~3,400 lines of hand-authored JSX, one block per topic, built
 * from raw Chakra primitives. Nothing it renders comes from StandardCard / SectionHeader /
 * StandardAlert, so none of the design-system fixes reach it. Every topic therefore restyles
 * itself, and MEASURED on 2026-08-21 that produced:
 *
 *   - `yellow.600` (#FDD835) on two <Heading>s — 1.40:1 on white. Not "low contrast": unreadable.
 *   - `orange.600` (#FB8C00) — 2.37:1 — on a heading and on the carbon table's "higher
 *     emissions" figure, i.e. on a number a farmer is meant to compare.
 *   - `green.500` on 7 icons (2.78, under the 3.0 non-text floor).
 *   - `blue.600` on 7 external source links (3.68, under the 4.5 text floor).
 *   - 21 emoji used as icons beside 147 real <Icon> components — two icon languages on one
 *     page, rendering differently per OS and injecting red/blue/orange into a green palette.
 *
 * These assertions are deliberately about the SOURCE rather than the render: the file has no
 * single component to mount, and the failure mode is an author typing a colour, not a
 * component misbehaving. Catch it where it is written.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const EDU_DIR = join(__dirname, '..');

const sourceFiles = () =>
  readdirSync(EDU_DIR)
    .filter((f) => /\.(tsx|ts)$/.test(f))
    .map((f) => ({ file: f, src: readFileSync(join(EDU_DIR, f), 'utf8') }));

/** Emoji ranges plus the dingbats/arrows blocks these pages actually used. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;

/**
 * Colours that may appear on a glyph in this directory.
 * `green.600` is absent on purpose — it is the palette's BOUNDARY green (4.12), fine for a
 * border and wrong for a label, and the rest of the app renders section icons at green.700.
 */
const ALLOWED_GLYPH_COLOURS = new Set([
  'green.700',
  'green.800',
  'gray.500',
  'gray.600',
  'gray.700',
  'gray.800',
  'gray.900',
  'red.700',
  'white'
]);

describe('Education content follows the design system', () => {
  it('renders no emoji as iconography', () => {
    const offenders = sourceFiles().flatMap(({ file, src }) => {
      const found = src.match(EMOJI) ?? [];
      return found.length
        ? [{ file, count: found.length, chars: [...new Set(found)].join(' ') }]
        : [];
    });
    expect(
      offenders,
      `Use the icon set, not emoji — emoji are multicoloured by definition and render per-OS:\n${JSON.stringify(
        offenders,
        null,
        2
      )}`
    ).toEqual([]);
  });

  it('puts no unreadable or off-palette colour on a glyph', () => {
    const offenders: { file: string; line: number; colour: string; snippet: string }[] = [];
    for (const { file, src } of sourceFiles()) {
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        const m = line.match(/(?<![a-zA-Z])color="([a-zA-Z]+\.[0-9]+)"/);
        if (m && !ALLOWED_GLYPH_COLOURS.has(m[1])) {
          offenders.push({ file, line: i + 1, colour: m[1], snippet: line.trim().slice(0, 70) });
        }
      });
    }
    expect(
      offenders,
      `Off-palette or sub-threshold glyph colour. MEASURED on white: yellow.600 1.40, ` +
        `orange.600 2.37, green.500 2.78, blue.600 3.68, green.600 4.12 (boundary only). ` +
        `Text owes 4.5, a non-text glyph owes 3.0:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });

  it('has a non-vacuous corpus to check', () => {
    // If the topic file is ever split or renamed, the two assertions above would pass by
    // finding nothing. Fail loudly instead.
    const files = sourceFiles();
    const totalColourProps = files.reduce(
      (n, { src }) => n + (src.match(/(?<![a-zA-Z])color="[a-zA-Z]+\.[0-9]+"/g) ?? []).length,
      0
    );
    expect(files.length).toBeGreaterThan(2);
    expect(totalColourProps).toBeGreaterThan(50);
  });
  /**
   * Icons must MEAN something.
   *
   * MEASURED 2026-08-21, before this was enforced: 146 icons across 12 topics.
   * - `FaCheckCircle` x59, of which 57 were LIST BULLETS. A checkmark says done/verified, and
   *   Trazo spends it on readiness checks and OSP completion — so an educational page was
   *   showing "success" 57 times where nothing had succeeded, devaluing it everywhere it means
   *   something. Same failure as a badge on every card: mark everything, mark nothing.
   * - 58 section-heading icons drawn from THIRTY distinct glyphs — a sticker sheet, not a
   *   system — including `FaPlayCircle` on a topic with no video, i.e. a false affordance.
   *
   * What survives is what earns its place: one glyph per TOPIC (they distinguish cards in the
   * hub grid), the activity glyphs that mirror the app's own activity picker, and
   * `FaExternalLinkAlt` inside a Link, which is a real affordance.
   */
  it('does not use an icon as a list bullet', () => {
    const offenders: { file: string; line: number; glyph: string }[] = [];
    for (const { file, src } of sourceFiles()) {
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        const m = line.match(/<Icon as=\{(Fa[A-Za-z]+)\}/);
        if (!m || m[1] === 'FaExternalLinkAlt') return;
        // Size is what separates the two cases, and it is unambiguous. An inline marker beside
        // copy is ~16-20px (no boxSize, or 5-6). An EMPTY-STATE illustration is 32px+ and is a
        // legitimate pattern — the first version of this guard flagged the "no results" FaBook
        // at boxSize={12} as a bullet, which it plainly is not.
        const boxSize = Number((line.match(/boxSize=\{(\d+)\}/) ?? [])[1] ?? 5);
        if (boxSize >= 8) return;
        // a small glyph whose very next element is a <Text> or <Heading> is decorating copy
        const next = (lines[i + 1] ?? '').trim();
        if (/^<(Text|Heading)\b/.test(next)) {
          offenders.push({ file, line: i + 1, glyph: m[1] });
        }
      });
    }
    expect(
      offenders,
      `An icon before a Text/Heading is a bullet or a heading ornament. Bold lead-ins already ` +
        `structure these rows; the topic's own \`icon:\` already marks the section:\n${JSON.stringify(
          offenders,
          null,
          2
        )}`
    ).toEqual([]);
  });

  it('never spends the completion checkmark on decoration', () => {
    const offenders = sourceFiles().flatMap(({ file, src }) => {
      const n = (src.match(/FaCheckCircle/g) ?? []).length;
      return n ? [{ file, count: n }] : [];
    });
    expect(
      offenders,
      `FaCheckCircle means done/verified — it belongs to readiness checks and OSP completion, ` +
        `not to educational copy:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });
});
