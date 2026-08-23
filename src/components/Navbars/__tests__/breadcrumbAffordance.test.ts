/**
 * Guard: the breadcrumb paints its link colour on LINKS, and marks the current page as such.
 *
 * OBSERVED 2026-08-22 from a bug report — "I can't get into the farm profile on mobile". The
 * navigation was not broken. The affordance was inverted:
 *
 *   segment           colour       clickable   what the user reads
 *   ─────────────────────────────────────────────────────────────────
 *   Home              gray.400     yes         barely visible (2.68:1 — fails AA as text)
 *   farm name         gray.700     YES         plain text
 *   current parcel    green.700    no          THE LINK
 *
 * `green.700` is the app's link colour everywhere else, and the breadcrumb spent it on the one
 * segment carrying `cursor: default`. So the obvious thing to tap does nothing, and the thing
 * that works looks inert — which reads exactly like broken navigation.
 *
 * Two more defects in the same rows:
 *   - the links were `<a>` with NO href, so they announced as generic elements, could not be
 *     opened in a new tab, long-pressed, or reached the way a link is reached;
 *   - the tap target was 26px against the 44px minimum in `.claude/rules/frontend.md`, at the
 *     very top of the screen where a thumb is least accurate.
 *
 * Asserted against SOURCE: the failure is a colour expression written backwards, and it is
 * invisible until someone tries to navigate on a phone and gives up.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const NAVBAR = join(__dirname, '../AdminNavbar.tsx');
const source = readFileSync(NAVBAR, 'utf8');

/** Blank comments, keeping newlines — the note above quotes the very expression it bans. */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^(\s*)\/\/.*$/gm, '$1');

describe('breadcrumb affordance', () => {
  it('has a breadcrumb to check', () => {
    // Moved or rewritten, every assertion below would pass by matching nothing.
    expect(code, 'AdminNavbar no longer renders a Breadcrumb').toContain('<Breadcrumb');
    expect((code.match(/<BreadcrumbLink/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('never paints the link colour on the current page', () => {
    /*
     * The exact inversion that shipped. `!parcelId` means "the farm IS the current page", so
     * green there is backwards — green belongs on the branch where a parcelId exists and the
     * segment is therefore a link.
     */
    expect(
      code,
      "green.700 on `!parcelId` paints the CURRENT PAGE as a link — the condition is inverted"
    ).not.toMatch(/color=\{!parcelId \? 'green\.700'/);
  });

  it('marks the current page for assistive tech', () => {
    // Two current-page cases: the farm when there is no parcel, and the parcel when there is.
    expect((code.match(/aria-current=/g) ?? []).length, 'no aria-current on any segment')
      .toBeGreaterThanOrEqual(2);
  });

  it('gives every navigating segment a real href', () => {
    // `<a>` with an onClick and no href is not a link — it cannot be opened in a new tab or
    // long-pressed, and it announces as a generic element.
    expect((code.match(/href=/g) ?? []).length, 'breadcrumb links have no href')
      .toBeGreaterThanOrEqual(2);
    // …and the handlers must still preventDefault, or the href would trigger a full page load
    // and throw away the SPA's state.
    expect((code.match(/e\.preventDefault\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the tap target at 44px', () => {
    expect(code, 'CRUMB_TAP_TARGET was removed or renamed').toMatch(
      /const CRUMB_TAP_TARGET = \{[\s\S]*?minH: '44px'/
    );
    // Applied, not merely declared — it is spread onto the segments that are actually tappable.
    expect((code.match(/CRUMB_TAP_TARGET/g) ?? []).length, 'declared but never spread')
      .toBeGreaterThanOrEqual(3);
  });

  it('never uses gray.400 as breadcrumb text', () => {
    /*
     * 2.68:1 on white. Breadcrumb segments are text and owe 4.5.
     *
     * ⚠️ Two ways this token reaches the markup, and the first version of this assertion
     * caught NEITHER — it was mutation-tested and passed a mutation that reinstated the bug:
     *   - `color="gray.400"` — the pattern allowed an optional SINGLE quote only, so the
     *     double-quoted form (which is what JSX actually emits) slipped through;
     *   - `color={secondaryText}` — the shipped form was a VARIABLE, so no colour-literal
     *     pattern could ever have matched it.
     */
    const crumbRegion = code.slice(code.indexOf('<Breadcrumb'));
    expect(crumbRegion, 'gray.400 is 2.68:1 — under the 4.5 that text owes').not.toMatch(
      /color=(\{\s*)?["']?gray\.400["']?/
    );
    expect(
      crumbRegion,
      '`secondaryText` resolves to gray.400 (2.68:1) — name the token so contrast is reviewable'
    ).not.toMatch(/color=\{secondaryText\}/);
  });
});
