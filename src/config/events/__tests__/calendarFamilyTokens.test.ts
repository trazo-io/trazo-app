import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import theme from '../../../theme/theme';
import { CALENDAR_FAMILY, TYPE_ICON } from '../eventTypeAppearance';
import { EVENT_TYPE_HUE } from '../../../components/Events/categoryTone';

/**
 * One category palette (2026-11-06): the calendar's chips and the timeline rows (parcel page,
 * Activities list, QR journey) colour a category the same way, palette B in
 * components/Events/categoryTone. Until then the calendar swapped inputs and pest against the
 * timeline (teal inputs here, purple there).
 *
 * These assertions hold the palette to what makes category colour safe: the hues are measured,
 * they never claim a status colour, the coloured categories stay distinct, the record-keeping
 * ones share one neutral, the calendar agrees with categoryTone, and colour is never the only
 * signal (a glyph rides with every hue).
 */

const srgbToLinear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const luminance = (hex: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a 6-digit hex colour: ${hex}`);
  const int = parseInt(m[1], 16);
  const [r, g, b] = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const FAMILY = (theme as unknown as { colors: Record<string, unknown> }).colors.family as Record<
  string,
  { bg: string; fg: string; bgDark: string; fgDark: string }
>;

/** The eight event_type codes the product defines. */
const CODES = [0, 1, 2, 3, 4, 5, 6, 7];

describe('calendar family tokens', () => {
  it('covers every event_type, and every key resolves to a real token', () => {
    // Anti-vacuity: a renamed map or a dropped family would make the loops below scan nothing.
    expect(Object.keys(CALENDAR_FAMILY).map(Number).sort()).toEqual(CODES);
    for (const code of CODES) {
      const key = CALENDAR_FAMILY[code];
      expect(
        FAMILY[key],
        `theme.colors.family.${key} is missing — the chip would render inert`
      ).toBeTruthy();
    }
  });

  it('every family clears 4.5:1 in BOTH colour modes', () => {
    // A chip label is 11px, so it owes the small-text floor, not the 3.0 non-text one.
    const failures: string[] = [];
    for (const code of CODES) {
      const key = CALENDAR_FAMILY[code];
      const t = FAMILY[key];
      const light = contrast(t.fg, t.bg);
      const dark = contrast(t.fgDark, t.bgDark);
      if (light < 4.5) failures.push(`${key} light ${light.toFixed(2)}`);
      if (dark < 4.5) failures.push(`${key} dark ${dark.toFixed(2)}`);
    }
    expect(failures, `families under the 4.5 text floor: ${failures.join(', ')}`).toEqual([]);
  });

  it('no family claims a status colour — red and amber stay spendable', () => {
    /*
     * The whole reason pest came off red and inputs off amber: those two colours have to keep
     * meaning "act on this". A family that borrows one spends it on an ordinary compliant
     * record. Compared by hue against the theme's own red and amber ramps rather than by name,
     * so a lookalike hex cannot sneak in under a different label.
     */
    const colors = (theme as unknown as { colors: Record<string, Record<string, string>> }).colors;
    const reserved = [...Object.values(colors.red), ...Object.values(colors.amber)].map((h) =>
      h.toUpperCase()
    );
    const used: string[] = [];
    for (const code of CODES) {
      const t = FAMILY[CALENDAR_FAMILY[code]];
      for (const v of [t.bg, t.fg, t.bgDark, t.fgDark]) {
        if (reserved.includes(v.toUpperCase())) used.push(`${CALENDAR_FAMILY[code]} → ${v}`);
      }
    }
    expect(used, `a family borrowed a status colour: ${used.join(', ')}`).toEqual([]);
  });

  it('the coloured categories are distinct; the record-keeping ones share one neutral', () => {
    // Two coloured families sharing a fill is the Weather/Equipment defect that made the old
    // seven-hue system fail. General, equipment and business are one gray on purpose (palette B,
    // "farm records"), told apart by glyph and word.
    const NEUTRAL = [3, 4, 7];
    const coloured = CODES.filter((c) => !NEUTRAL.includes(c)).map((c) =>
      FAMILY[CALENDAR_FAMILY[c]].bg.toUpperCase()
    );
    expect(
      new Set(coloured).size,
      `coloured families share a fill: ${JSON.stringify(coloured)}`
    ).toBe(coloured.length);
    expect(new Set(NEUTRAL.map((c) => CALENDAR_FAMILY[c]))).toEqual(new Set(['other']));
  });

  it('the calendar colours each category the way the timeline does (categoryTone)', () => {
    const SAME: Record<string, string> = {
      green: 'production',
      blue: 'sky',
      purple: 'inputs',
      yellow: 'soil',
      teal: 'pest',
      gray: 'other'
    };
    for (const code of CODES) {
      expect(
        CALENDAR_FAMILY[code],
        `event_type ${code}: calendar family disagrees with categoryTone (${EVENT_TYPE_HUE[code]})`
      ).toBe(SAME[EVENT_TYPE_HUE[code]]);
    }
  });

  it('colour is never the only signal — every family also has a glyph', () => {
    for (const code of CODES) {
      expect(TYPE_ICON[code], `event_type ${code} has a hue but no icon`).toBeTruthy();
    }
  });

  it('the calendar chip actually renders the glyph beside the hue', () => {
    // The tokens above are worthless if the chip drops the icon: that is colour-alone status,
    // which frontend.md rules out and which a colour-vision-deficient reader cannot recover.
    const code = readFileSync(
      join(__dirname, '../../../views/Dashboard/Activities/index.tsx'),
      'utf8'
    );
    const at = code.indexOf('familyBg(row.event_type)');
    expect(at, 'the calendar chip no longer uses the family hue').toBeGreaterThan(-1);
    const chip = code.slice(at, at + 700);
    expect(chip, 'the calendar chip renders a hue with no glyph').toMatch(
      /TYPE_ICON\[row\.event_type\]/
    );
  });
});
