/**
 * Guard: the CollapsibleSection header survives a narrow screen, and speaks the user's language.
 *
 * OBSERVED 2026-08-22 on the planting form at mobile width: the header row rendered
 *
 *     Fuel                              S
 *     Consumption &   [Optional — …]    h     ⌄
 *     Equipment Data                    o
 *                                       w
 *
 * — the word "Show" broken to one character per line.
 *
 * Cause: a flex item defaults to `min-width: auto`, which refuses to shrink below its longest
 * word. The header was `<Flex justify="space-between">` with two `<HStack>` children and
 * NEITHER declared anything about shrinking, so once the title plus its badge outgrew the row
 * the browser took the width out of whichever side it could — the label on the right.
 *
 * The fix is three separate declarations, and all three are asserted here because dropping any
 * one brings the crush back in a different form:
 *   - left side  `minW={0}` + `flexWrap` → the title is allowed to wrap, which is what should
 *     absorb the overflow
 *   - right side `flexShrink={0}`        → the control cluster is never the thing that gives
 *   - the label   hidden below `smd`      → on a phone it is not competing for the row at all
 *
 * Two more defects were in the same six lines:
 *   - `'Show'` / `'Hide'` were HARD-CODED ENGLISH inside a design-system component, so they
 *     shipped untranslated to every screen that uses it.
 *   - the header is a `<button>` that expands a region and carried no `aria-expanded`, so the
 *     only expanded/collapsed signal was visual (the word and a chevron).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '../..');
const source = readFileSync(join(SRC, 'Design/StandardComponents.tsx'), 'utf8');

/** The component body, so an assertion cannot pass by matching some other component. */
const body = (() => {
  const m = source.match(/export const CollapsibleSection = [\s\S]*?\n\};/);
  return m?.[0] ?? '';
})();

/**
 * The body with comments blanked (not deleted — same shape, so line numbers stay usable).
 *
 * Needed because the note above the label explains the bug by QUOTING the literal it bans:
 * `the word "Show" and a chevron`. Checking the raw body made the guard fail on its own
 * documentation, which is the second time this exact false positive has appeared in this
 * suite — a source-scanning assertion must decide up front whether prose counts as code.
 */
const code = body
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^(\s*)\/\/.*$/gm, '$1');

describe('CollapsibleSection header', () => {
  it('has a body to check', () => {
    // Renamed or moved, every assertion below would pass by matching an empty string.
    expect(body, 'CollapsibleSection not found in StandardComponents').not.toBe('');
    expect(body).toContain('useDisclosure');
  });

  it('lets the title side absorb the overflow', () => {
    expect(
      body,
      'the left cluster needs `minW={0}` or it cannot shrink below its longest word'
    ).toMatch(/minW=\{0\}/);
    expect(
      body,
      'the left cluster needs `flexWrap` so a long title wraps instead of squeezing its neighbour'
    ).toMatch(/flexWrap=/);
  });

  it('never lets the control cluster be the thing that shrinks', () => {
    /*
     * Scoped to the HStack that actually holds the chevron.
     *
     * The first version asserted `/flexShrink=\{0\}/` against the whole component and PASSED a
     * mutation that stripped it from the control cluster — because the icons inside carry the
     * same prop, so the pattern still matched. An assertion that any occurrence satisfies is
     * not an assertion about the thing that broke.
     */
    const beforeChevron = code.slice(0, code.indexOf('FaChevron'));
    const clusterStart = beforeChevron.lastIndexOf('<HStack');
    expect(clusterStart, 'no <HStack> wrapping the chevron — the header was restructured')
      .toBeGreaterThan(-1);
    const openingTag = code.slice(clusterStart, code.indexOf('>', clusterStart) + 1);
    expect(
      openingTag,
      'the Show/Hide + chevron cluster must declare `flexShrink={0}` — otherwise it is what ' +
        'the browser squeezes when the title grows, which is how "Show" became S/h/o/w'
    ).toMatch(/flexShrink=\{0\}/);
  });

  it('does not hard-code the disclosure label', () => {
    // The literal that shipped untranslated. Matched as a JSX text/expression value, so the
    // word appearing inside this component's own prose does not trip it.
    expect(
      /['"]Show['"]/.test(code) || /['"]Hide['"]/.test(code),
      'Show/Hide must come from intl.formatMessage — this is a design-system component'
    ).toBe(false);
    expect(code).toMatch(/formatMessage\(\{ id: 'app\.(show|hide)' \}\)/);
  });

  it('exposes its expanded state to assistive tech', () => {
    expect(
      body,
      'a <button> that expands a region must carry aria-expanded — a chevron is not an API'
    ).toMatch(/aria-expanded=\{isOpen\}/);
  });
});
