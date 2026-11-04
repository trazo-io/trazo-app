/**
 * Regression guards for StandardCard's header and the two margin props.
 *
 * 59 files render StandardCard and 24 render StandardAlert. Both grew props during the
 * OSP standards pass with no coverage at all, and every failure mode below is one that
 * already happened at least once in this codebase:
 *
 *   1. INERT PROPS. StandardCard destructures a fixed list and never spreads the rest, so
 *      `mt={4}` reached no DOM node for as long as it had been written — silently dropped
 *      at every call site, in the same family as `Badge colorScheme` and `StandardCard
 *      variant`. The margin tests below fail if either prop stops reaching the element.
 *
 *   2. NO SEMANTIC HEADING. Ten OSP cards hand-rolled `<Text fontWeight="bold">` because
 *      `title` could not carry their icon, leaving a ten-section compliance page whose only
 *      heading was the page <h1>. `title` must render an <h3>, or that regresses quietly.
 *
 *   3. A WRAPPER NOBODY ASKED FOR. The first version of `titleIcon` wrapped the heading in
 *      an HStack whenever a title was set — icon or not. That makes the heading a flex item
 *      at all 59 call sites, and a flex item defaults to `min-width: auto`: it refuses to
 *      shrink below its longest word, so a long title on a narrow card overflows instead of
 *      wrapping. jsdom does no layout, so this is guarded structurally: no icon, no wrapper.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
// Relative, not the `theme/*` tsconfig alias — vitest.config.ts does not map that one.
import theme from '../../../theme/theme';
import { StandardAlert, StandardCard } from '../StandardComponents';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ChakraProvider theme={theme}>{ui}</ChakraProvider>);

/** Depth of a node from the container — the proxy for "an extra wrapper appeared". */
const depthOf = (el: Element, root: Element) => {
  let d = 0;
  for (let e: Element | null = el; e && e !== root; e = e.parentElement) d++;
  return d;
};

describe('StandardCard — header', () => {
  it('renders `title` as a real <h3>, not styled body text', () => {
    renderWithTheme(<StandardCard title="Approved inputs">body</StandardCard>);
    const h = screen.getByRole('heading', { level: 3 });
    expect(h).toHaveTextContent('Approved inputs');
  });

  it('renders `titleIcon` beside the title and hides it from screen readers', () => {
    const { container } = renderWithTheme(
      <StandardCard title="Approved inputs" titleIcon={<svg data-testid="glyph" />}>
        body
      </StandardCard>
    );
    // The glyph repeats the title; "image Approved inputs" is worse than the title alone.
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
    expect(hidden!.querySelector('svg')).not.toBeNull();
  });

  it('adds NO wrapper around the heading when there is no icon', () => {
    const { container: withIcon } = renderWithTheme(
      <StandardCard title="T" titleIcon={<svg />}>
        body
      </StandardCard>
    );
    const { container: plain } = renderWithTheme(<StandardCard title="T">body</StandardCard>);

    const deep = depthOf(withIcon.querySelector('h3')!, withIcon);
    const shallow = depthOf(plain.querySelector('h3')!, plain);
    // Without an icon the heading must sit one level higher — i.e. it is NOT a flex item.
    expect(shallow).toBeLessThan(deep);
  });

  it('renders `subtitle` and `headerAction` when given', () => {
    renderWithTheme(
      <StandardCard title="T" subtitle="7 CFR 205.201(a)(2)" headerAction={<span>badge</span>}>
        body
      </StandardCard>
    );
    expect(screen.getByText('7 CFR 205.201(a)(2)')).toBeInTheDocument();
    expect(screen.getByText('badge')).toBeInTheDocument();
  });
});

describe('StandardCard / StandardAlert — margin props are not inert', () => {
  // Emotion emits a different generated class when a style prop actually reaches the
  // element. Identical classes mean the prop was destructured away and dropped, which is
  // exactly how `mt` behaved before it was added to the prop list.
  it('`mt` reaches the card', () => {
    const { container: withMt } = renderWithTheme(<StandardCard mt={4}>x</StandardCard>);
    const { container: none } = renderWithTheme(<StandardCard>x</StandardCard>);
    expect(withMt.firstElementChild!.className).not.toBe(none.firstElementChild!.className);
  });

  it('`mb` reaches the card', () => {
    const { container: a } = renderWithTheme(<StandardCard mb={0}>x</StandardCard>);
    const { container: b } = renderWithTheme(<StandardCard mb={6}>x</StandardCard>);
    expect(a.firstElementChild!.className).not.toBe(b.firstElementChild!.className);
  });

  it('`mb` reaches the alert — the prop that let the OSP page adopt it at all', () => {
    const { container: a } = renderWithTheme(
      <StandardAlert status="info" mb={0} description="x" />
    );
    const { container: b } = renderWithTheme(<StandardAlert status="info" description="x" />);
    expect(a.firstElementChild!.className).not.toBe(b.firstElementChild!.className);
  });

  it('StandardAlert still renders children beside its description', () => {
    renderWithTheme(
      <StandardAlert status="info" description="explanation">
        <button type="button">action</button>
      </StandardAlert>
    );
    expect(screen.getByText('explanation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'action' })).toBeInTheDocument();
  });
});
