/**
 * Tripwire for the badge-colour class of bug.
 *
 * History: `theme/components/badge.js` hardcoded green in every variant and set
 * `defaultProps.variant: 'brand'`, so `colorScheme` was inert app-wide. The failure is silent
 * and reassuring — the badge still renders, it just says the opposite of what it means — and it
 * shipped the word "Missing" in the success palette on the farm-home headline while ~30 other
 * call sites computed a colour in a ternary whose branches rendered identically.
 *
 * These assertions are about MEANING, not aesthetics: change the greens freely, but a red
 * colorScheme must never resolve to the same pixels as a green one, and a grey pill must never
 * be painted in the page background. Contrast is asserted at the pairing level for the two
 * variants that carry the words a certifier cares about.
 */
import { describe, expect, it } from 'vitest';

// Both theme modules are plain JS, but each now carries a sibling `.d.ts`
// (`components/badge.d.ts`, `styles.d.ts`) added 2026-08-11, so these imports typecheck
// without suppression. Declarations rather than a `.ts` rewrite on purpose: a sibling `.ts`
// becomes a SECOND module for one specifier, which is how Vite and TypeScript came to
// disagree about `store/api/historyApi`.
import { badgeStyles } from '../components/badge';
import { globalStyles } from '../styles';

const variants: Record<string, any> = badgeStyles.components.Badge.variants;
const defaults: Record<string, any> = badgeStyles.components.Badge.defaultProps;

const light = (colorScheme?: string) => ({ colorMode: 'light', colorScheme });

/**
 * Palettes Chakra supplies and `theme/styles.js` does NOT override, so they cannot be read out
 * of the app's own colour object. Transcribed from the computed styles of real rendered badges
 * (the live contrast sweep over the eight producer routes), which is also what makes them safe
 * to assert on: they are what the browser actually paints, not what a doc page says.
 */
const CHAKRA_DEFAULTS: Record<string, string> = {
  'orange.100': '#FEEBC8',
  'orange.800': '#7B341E',
  'yellow.100': '#FEFCBF',
  'yellow.800': '#744210'
};

/** `green.700` -> #2E7D32, using the real palette from theme/styles.js. */
function hex(token: string): string {
  const [palette, step] = token.split('.');
  const value = (globalStyles as any)?.colors?.[palette]?.[step];
  return value ?? CHAKRA_DEFAULTS[token] ?? token;
}

const CHANNEL = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function luminance(color: string): number {
  const raw = color === 'white' ? '#ffffff' : color === 'black' ? '#000000' : hex(color);
  const m = CHANNEL.exec(raw.replace('#', '').padStart(6, '0').slice(-6));
  if (!m) throw new Error(`not a resolvable colour: ${color} -> ${raw}`);
  const [r, g, b] = m.slice(1).map((c) => {
    const s = parseInt(c, 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

describe('Badge theme — colorScheme is not inert', () => {
  it('renders a red colorScheme differently from a green one', () => {
    for (const name of ['brand', 'subtle', 'outline']) {
      const red = JSON.stringify(variants[name](light('red')));
      const green = JSON.stringify(variants[name](light('green')));
      expect(red, `variant "${name}" ignores colorScheme`).not.toEqual(green);
    }
  });

  it('defaults an absent colorScheme to green, not to Chakra’s grey', () => {
    // extendTheme DEEP-MERGES Chakra's own Badge defaultProps, which set colorScheme: 'gray'.
    // Without this override "the author said nothing" is indistinguishable from "the author
    // said grey", and every default badge in the app silently turns grey.
    expect(defaults.colorScheme).toBe('green');
    expect(variants.brand(light(undefined))).toEqual(variants.brand(light('green')));
  });

  it('falls back to green for a colorScheme that is not a real palette', () => {
    // Several call sites compute one at runtime (e.g. `eventConfig.color.split('.')[0]`). An
    // unresolvable palette would paint `rgba(0,0,0,0)` — an invisible pill, the 2026-08-07 bug.
    expect(variants.subtle(light('chartreuse'))).toEqual(variants.subtle(light('green')));
  });
});

describe('Badge theme — legibility', () => {
  it('never paints a grey badge in the page background colour', () => {
    // body bg IS gray.100 (#F8F9FA), so a grey pill built from the generic .100/.800 pairing is
    // an invisible rectangle. Must use the same gray.200 the `neutral` variant uses.
    const grey = variants.subtle(light('gray'));
    expect(grey.bg).toBe('gray.200');
    expect(hex(grey.bg)).not.toBe(hex('gray.100'));
  });

  it('clears AA (4.5:1) on the semantic variants a certifier reads', () => {
    for (const name of ['danger', 'warning', 'neutral']) {
      const s = variants[name](light());
      expect(contrast(s.color, s.bg), `${name} (${s.color} on ${s.bg})`).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  it('clears AA on the solid brand pill', () => {
    // white on green.500 measures 2.78:1. Badge text is 11-12px, so the 3:1 large-text
    // allowance does not apply — this must stay on the darker green.
    const s = variants.brand(light('green'));
    expect(contrast(s.color, s.bg), `brand (${s.color} on ${s.bg})`).toBeGreaterThanOrEqual(4.5);
  });

  it('clears AA on every tinted palette the app actually uses', () => {
    for (const scheme of ['green', 'gray', 'red', 'blue', 'orange', 'yellow', 'purple', 'teal']) {
      const s = variants.subtle(light(scheme));
      // Palettes with no local definition and no transcribed Chakra default cannot be measured
      // here; they are covered by the live-page contrast sweep instead of being asserted blind.
      if (hex(String(s.bg)) === String(s.bg)) continue;
      expect(contrast(s.color, s.bg), `${scheme} (${s.color} on ${s.bg})`).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });
});
