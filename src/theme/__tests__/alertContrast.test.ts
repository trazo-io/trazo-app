import { describe, expect, it } from 'vitest';
import theme from '../theme';
import {
  ALERT_PALETTE,
  ALERT_ACCENT_SHADE,
  GUIDANCE_NOTE_TOKENS
} from 'components/Design/StandardComponents';

/**
 * StandardAlert used to interpolate the SEMANTIC STATUS into a colour token —
 * `bg={`${status}.50`}` produced "success.50", "info.50", "warning.50". `styles.js` defines
 * green / red / amber / blue and no such scales, so Chakra emitted the literal string, the
 * browser dropped the declaration, and both `bg` and `borderLeftColor` were silently inert
 * across all 34 call sites. Nothing failed; the component just rendered Chakra's stock
 * left-accent forever. Same class as the inert `Badge colorScheme`.
 *
 * Three things are guarded here, because fixing only one lets the others back in:
 *   1. every palette name RESOLVES to a real scale in the theme (the inert-token bug),
 *   2. the resolved icon/accent hex clears WCAG 1.4.11's 3.0:1 non-text floor against the
 *      `.50` ground it is actually painted on, and
 *   3. GuidanceNote — the neutral sibling — borrows no status hue and stays legible.
 *
 * Every assertion reads an object the COMPONENT RENDERS FROM (`ALERT_PALETTE`,
 * `ALERT_ACCENT_SHADE`, `GUIDANCE_NOTE_TOKENS`), never a colour the test names itself.
 * Verified falsifiable by mutation: repointing `GUIDANCE_NOTE_TOKENS.bar` at `green.500`
 * fails both the hue test and the contrast test. Residual gap, accepted: a future edit
 * could hardcode a colour in the JSX and bypass these objects entirely — keep the colours
 * in the token objects.
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

/** Reads the RESOLVED theme, so renaming or deleting a scale fails here. */
const token = (palette: string, shade: string): string => {
  const scale = (theme as any).colors?.[palette];
  expect(scale, `theme.colors.${palette} does not exist — token would render inert`).toBeTruthy();
  const hex = scale[shade];
  expect(typeof hex, `theme.colors.${palette}.${shade} is missing`).toBe('string');
  return hex;
};

const STATUSES = Object.keys(ALERT_PALETTE) as Array<keyof typeof ALERT_PALETTE>;

describe('StandardAlert palette resolves to real theme scales', () => {
  it('covers every status the component accepts, with no gaps between the two maps', () => {
    // Copy before sorting — `.sort()` mutates, and STATUSES is the array `it.each` below
    // iterates. (Harmless today only because it.each captures at collection time.)
    expect([...STATUSES].sort()).toEqual(['error', 'info', 'success', 'warning']);
    expect(Object.keys(ALERT_ACCENT_SHADE).sort()).toEqual([...STATUSES].sort());
  });

  it.each(STATUSES)('%s maps to a palette that exists (never the status name itself)', (status) => {
    const palette = ALERT_PALETTE[status];
    expect(
      (theme as any).colors[status],
      `"${status}" is being used AS a colour scale — that is the inert-token bug`
    ).toBeUndefined();
    expect(token(palette, '50')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(token(palette, ALERT_ACCENT_SHADE[status])).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('warning uses the theme amber, not the inherited Chakra orange', () => {
    // `orange` IS resolvable — Chakra's own scale survives the theme merge, which is exactly
    // the trap: an `orange.*` token renders fine and silently paints a foreign accent
    // (#DD6B20) next to Trazo's amber (#FF9800). Resolvable is not the same as ours.
    expect(ALERT_PALETTE.warning).toBe('amber');
    expect((theme as any).colors.amber['500']).toBe('#FF9800');
    expect((theme as any).colors.orange['500']).not.toBe((theme as any).colors.amber['500']);
  });
});

describe('StandardAlert icon and accent clear the 3.0:1 non-text floor', () => {
  it.each(STATUSES)('%s icon/accent on its own .50 ground', (status) => {
    const palette = ALERT_PALETTE[status];
    const ground = token(palette, '50');
    const accent = token(palette, ALERT_ACCENT_SHADE[status]);
    expect(contrast(accent, ground)).toBeGreaterThanOrEqual(3.0);
  });

  // Not every status was broken at stock `.500` — red measures 3.22 and already cleared.
  // Naming the three that did fail keeps this honest; a blanket "all of them fail" claim
  // was the first thing this file got wrong.
  it.each(['success', 'warning', 'info'] as const)(
    '%s would FAIL at Chakra stock .500 — this is what the shade map buys',
    (status) => {
      const palette = ALERT_PALETTE[status];
      expect(contrast(token(palette, '500'), token(palette, '50'))).toBeLessThan(3.0);
    }
  );

  it('amber clears ONLY at 900 — every lower rung of that ramp fails', () => {
    const ground = token('amber', '50');
    for (const shade of ['500', '600', '700', '800']) {
      expect(contrast(token('amber', shade), ground), `amber.${shade}`).toBeLessThan(3.0);
    }
    expect(contrast(token('amber', '900'), ground)).toBeGreaterThanOrEqual(3.0);
  });
});

describe('GuidanceNote stays neutral and legible', () => {
  // These read GUIDANCE_NOTE_TOKENS — the object the component renders from — so they fail
  // if the JSX is repainted. An earlier draft asserted `gray.500 !== green.500`, which is
  // true forever no matter what GuidanceNote does: a guard naming its own colours is the
  // same nothing-burger as a theme test that passes itself the colorScheme.
  const resolve = (role: keyof typeof GUIDANCE_NOTE_TOKENS) => {
    const [palette, shade] = GUIDANCE_NOTE_TOKENS[role].split('.');
    return token(palette, shade);
  };

  it('bar and icon clear the 3.0 non-text floor against the note ground', () => {
    const ground = resolve('ground');
    expect(contrast(resolve('bar'), ground)).toBeGreaterThanOrEqual(3.0);
    expect(contrast(resolve('icon'), ground)).toBeGreaterThanOrEqual(3.0);
  });

  it('body text clears the 4.5 text floor on that ground', () => {
    expect(contrast(resolve('text'), resolve('ground'))).toBeGreaterThanOrEqual(4.5);
  });

  it('borrows NO status hue — guidance is not a status', () => {
    // The bug being fixed was `status="success"` used to obtain a green box. Any palette
    // that carries meaning elsewhere is banned here, whatever shade.
    const statusPalettes = Object.values(ALERT_PALETTE);
    for (const [role, value] of Object.entries(GUIDANCE_NOTE_TOKENS)) {
      const palette = value.split('.')[0];
      expect(
        statusPalettes,
        `GuidanceNote.${role} uses the status palette "${palette}"`
      ).not.toContain(palette);
    }
  });
});
