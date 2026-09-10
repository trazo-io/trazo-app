import { describe, expect, it } from 'vitest';
import theme from '../theme';

/**
 * Chakra fills a checked `colorScheme="green"` control with green.500 (#4CAF50) and draws a
 * white tick on it — 2.78:1, under the 3.0 floor WCAG 1.4.11 sets for a meaningful graphic.
 * Badge, Button and Progress were each corrected for this; Checkbox had no override at all, so
 * every checked box in the app rendered the failing pair.
 *
 * This asserts the RESOLVED theme rather than the source file, so deleting the import from
 * theme.ts fails here too — the way `badgeVariants.test.ts` guards its own override.
 */
const resolve = (component: string, colorMode: 'light' | 'dark' = 'light') => {
  const baseStyle = (theme as any).components?.[component]?.baseStyle;
  expect(typeof baseStyle, `${component} has no baseStyle override registered`).toBe('function');
  return baseStyle({ colorScheme: 'green', colorMode, theme });
};

describe('checked control contrast', () => {
  it.each(['Checkbox', 'Radio'])('%s fills with green.700, never green.500', (component) => {
    const checked = resolve(component).control._checked;
    expect(checked.bg).toBe('green.700');
    expect(checked.borderColor).toBe('green.700');
  });

  it('Switch fills its track with green.700', () => {
    expect(resolve('Switch').track._checked.bg).toBe('green.700');
  });

  it('the indeterminate state is corrected too, not just the checked one', () => {
    expect(resolve('Checkbox').control._indeterminate.bg).toBe('green.700');
  });

  it('hover DARKENS — green.600 would drop a checked box from 5.13 to 4.12', () => {
    const hover = resolve('Checkbox').control._checked._hover;
    expect(hover.bg).toBe('green.800');
    expect(hover.borderColor).toBe('green.800');
  });

  it('dark mode uses the lighter ramp, whose paired icon colour is gray.900', () => {
    expect(resolve('Checkbox', 'dark').control._checked.bg).toBe('green.300');
  });

  it.each(['Checkbox', 'Radio', 'Switch'])(
    '%s defaults to the green colorScheme — Chakra supplies blue otherwise, so the fallback never fired',
    (component) => {
      // MEASURED 2026-09-09: checked radios rendered rgb(25,118,210) (blue.700) on the wizards.
      // `props.colorScheme || 'green'` cannot rescue a prop Chakra always passes; only
      // defaultProps can. This test reads what the THEME declares, not what a caller supplies.
      expect((theme as any).components[component].defaultProps?.colorScheme).toBe('green');
    }
  );

  it('respects an explicit non-green colorScheme rather than hardcoding green', () => {
    const baseStyle = (theme as any).components.Checkbox.baseStyle;
    const checked = baseStyle({ colorScheme: 'red', colorMode: 'light', theme }).control._checked;
    expect(checked.bg).toBe('red.700');
  });
});
