import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import theme from '../theme';
import { ALERT_ACCENT_SHADE, ALERT_PALETTE } from '../components/alert';

/**
 * The app shipped TWO alert designs until 2026-08-17: `StandardAlert` painted a 4px accent
 * bar, an `lg` radius and a top-aligned icon, while a bare `<Alert>` got Chakra's stock
 * `subtle` — no bar, whatever radius the author typed, and a vertically-CENTRED icon that
 * floats against the SECOND line of any wrapping body. Both rendered on one screen.
 *
 * `theme/components/alert.js` now paints both. This guard defends the two things that make
 * that true, because each fails silently:
 *
 *   1. The theme reads `props.status`, never `props.colorScheme`. Chakra's `alert-context`
 *      maps `status="warning"` to `colorScheme: "orange"`, and the Trazo theme defines
 *      `amber` and NOT `orange` — so a variant trusting `colorScheme` paints warnings in
 *      CHAKRA's orange and nothing errors. Three of the four statuses agree by coincidence,
 *      which is what makes the fourth easy to miss.
 *
 *   2. No call site re-declares a theme-owned property as a STYLE PROP. Style props outrank
 *      theme styles, so a single `<Alert borderRadius="md">` silently opts that one alert out
 *      of the shared look — which is exactly the drift this replaced. 71 openings across 31
 *      files had these removed; this is what notices the 72nd.
 *
 * Verified falsifiable by mutation: changing `subtle` to read `props.colorScheme` fails the
 * warning case; re-adding `borderRadius="md"` to any `<Alert>` fails the source scan.
 */

type Status = keyof typeof ALERT_PALETTE;
const STATUSES = Object.keys(ALERT_PALETTE) as Status[];

const styleFor = (status: Status, variant: 'subtle' | 'left-accent') => {
  const cfg = (theme as any).components?.Alert;
  expect(cfg, 'theme.components.Alert is missing — alertStyles was not registered').toBeTruthy();
  const fn = cfg.variants?.[variant];
  expect(typeof fn, `Alert variant "${variant}" is not a function of props`).toBe('function');
  // Mirrors what alert.cjs passes: BOTH the original status and the colorScheme it derives.
  // Handing over the misleading colorScheme on purpose — a variant that reads it fails here.
  const chakraColorScheme = { info: 'blue', warning: 'orange', success: 'green', error: 'red' }[
    status
  ];
  return fn({ status, colorScheme: chakraColorScheme, theme, colorMode: 'light' });
};

describe('the theme paints every Alert, not just StandardAlert', () => {
  it('registers an Alert entry with both variants', () => {
    const cfg = (theme as any).components?.Alert;
    expect(cfg?.variants?.subtle).toBeTypeOf('function');
    expect(cfg?.variants?.['left-accent']).toBeTypeOf('function');
  });

  it.each(STATUSES)('resolves %s from status, never from Chakra colorScheme', (status) => {
    const styles = styleFor(status, 'subtle');
    const palette = ALERT_PALETTE[status];
    // Assert the VARIABLES, because they are what actually drives the paint: Chakra's
    // baseStyle points bg / icon.color / the accent bar at `var(--alert-bg)` and
    // `var(--alert-fg)`, and `extendTheme` deep-merges, so a variant that set only the
    // concrete properties would leave Chakra's colorScheme-derived vars alive underneath.
    expect(styles.container['--alert-bg']).toBe(`colors.${palette}.50`);
    expect(styles.container['--alert-fg']).toBe(`colors.${palette}.${ALERT_ACCENT_SHADE[status]}`);
    expect(styles.container._dark['--alert-bg']).toBe(`colors.${palette}.900`);
    // …and that the concrete properties do read from them, rather than from a second source.
    expect(styles.container.bg).toBe('var(--alert-bg)');
    expect(styles.container.borderStartColor).toBe('var(--alert-fg)');
    expect(styles.icon.color).toBe('var(--alert-fg)');
  });

  it('never reaches for orange — the theme defines amber and Chakra maps warning to orange', () => {
    for (const status of STATUSES) {
      const rendered = JSON.stringify(styleFor(status, 'subtle'));
      expect(rendered, `${status} leaked a Chakra orange token`).not.toMatch(/orange\./);
    }
    expect(ALERT_PALETTE.warning).toBe('amber');
  });

  it.each(STATUSES)('%s carries the accent bar and a top-aligned icon', (status) => {
    const styles = styleFor(status, 'subtle');
    // The bar is what a bare <Alert> was missing entirely.
    expect(styles.container.borderStartWidth).toBe('4px');
    // Beats the `alignItems: 'center'` hardcoded in alert.cjs, because the theme's
    // `container` is spread AFTER it. Without this the icon floats against line 2.
    expect(styles.container.alignItems).toBe('flex-start');
    expect(styles.container.borderRadius).toBe('lg');
  });

  it.each(STATUSES)('subtle and left-accent are the same look for %s', (status) => {
    expect(styleFor(status, 'subtle')).toEqual(styleFor(status, 'left-accent'));
  });
});

describe('no call site re-declares a theme-owned Alert property', () => {
  /** Properties the theme owns. A style prop for any of them outranks it. */
  const OWNED = [
    'borderRadius',
    'alignItems',
    'bg',
    'backgroundColor',
    'borderLeft',
    'borderLeftColor',
    'borderStartWidth',
    'borderStartColor'
  ];

  const srcRoot = path.resolve(__dirname, '../..');

  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full, out);
      } else if (/\.(tsx|jsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
    return out;
  };

  it('finds no theme-owned style prop on any <Alert>', () => {
    // `\b` matters: it keeps <AlertIcon>, <AlertTitle>, <AlertDescription> and <AlertDialog>
    // out, which are different components with their own legitimate props.
    const openTag = /<Alert\b[^>]*?\/?>/gs;
    const owned = new RegExp(`\\s(?:${OWNED.join('|')})=`);
    const offenders: string[] = [];

    for (const file of walk(srcRoot)) {
      // StandardComponents is where StandardAlert lives; it passes none of these either, but
      // it is the component the rule exists to keep in step, so it is scanned like the rest.
      const src = fs.readFileSync(file, 'utf8');
      if (!src.includes('<Alert')) continue;
      for (const m of src.matchAll(openTag)) {
        if (owned.test(m[0])) {
          offenders.push(`${path.relative(srcRoot, file)}: ${m[0].replace(/\s+/g, ' ').trim()}`);
        }
      }
    }

    expect(
      offenders,
      `These <Alert>s re-declare a property theme/components/alert.js owns. A style prop ` +
        `outranks the theme, so each one silently opts out of the shared look — delete the ` +
        `prop rather than adding it back here:\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });
});
