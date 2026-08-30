/**
 * The proof-view timeline connector must land ON its nodes.
 *
 * WHY (2026-08-30): the connector's position was four literals — `left: 24px; top: 60px;
 * bottom: -20px` — written against a node whose size lives somewhere else entirely. MEASURED on
 * the rendered page, that put the line 1px right of the node's centre, started it 12px BELOW the
 * node it grows out of, and ran it 4px past the next node. The thread read as detached from the
 * marks it threads, which is the whole point of a timeline.
 *
 * Two of the three numbers are now derived from `TIMELINE_NODE_SIZE` and cannot drift. The
 * third — the gap between cards — is the one value a card cannot see for itself: it belongs to
 * the LIST that stacks the cards. This test is the join between them. If the proof list's
 * spacing changes and `TIMELINE_LIST_GAP_MD` does not, every connector silently stops short of
 * (or runs through) the next node again, and nothing else in the suite would notice: a wrong
 * offset renders perfectly happily.
 *
 * Chakra `spacing={{ md: 4 }}` is 4 × 4px = 16px.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, '../../..');
const CARD = readFileSync(resolve(SRC, 'components/Events/ConsumerEventCard.tsx'), 'utf8');
const JOURNEY = readFileSync(
  resolve(SRC, 'views/Scan/ProductDetail/components/UltraMobileProductionJourney.tsx'),
  'utf8'
);

const CHAKRA_SPACING_UNIT_PX = 4;

describe('proof-view timeline connector', () => {
  it('assumes the same card gap the proof list actually renders', () => {
    const declared = CARD.match(/const TIMELINE_LIST_GAP_MD = (\d+);/);
    expect(declared, 'TIMELINE_LIST_GAP_MD was renamed or removed in ConsumerEventCard').not.toBe(
      null
    );

    // The VStack that stacks the proof cards — the one immediately inside `isProofView && (`.
    const list = JOURNEY.match(/isProofView && \(\s*<VStack spacing=\{\{ base: \d+, md: (\d+) \}\}/);
    expect(
      list,
      'the proof list VStack moved — this test would pass vacuously without it'
    ).not.toBe(null);

    expect(
      Number(declared![1]),
      `the connector runs ${declared![1]}px past its card to reach the next node, but the proof ` +
        `list stacks them ${Number(list![1]) * CHAKRA_SPACING_UNIT_PX}px apart`
    ).toBe(Number(list![1]) * CHAKRA_SPACING_UNIT_PX);
  });

  it('centres the line on the node and starts it at the node’s bottom edge', () => {
    const node = CARD.match(/const TIMELINE_NODE_SIZE = \{ base: (\d+), md: (\d+) \};/);
    const width = CARD.match(/const TIMELINE_LINE_WIDTH = (\d+);/);
    expect(node, 'TIMELINE_NODE_SIZE was renamed or removed').not.toBe(null);
    expect(width, 'TIMELINE_LINE_WIDTH was renamed or removed').not.toBe(null);

    // Both offsets must be COMPUTED from the node, never re-typed as literals.
    expect(
      CARD,
      'the connector`s `left` must be derived from TIMELINE_NODE_SIZE, not hardcoded'
    ).toMatch(/left=\{\{[^}]*TIMELINE_NODE_SIZE\.base - TIMELINE_LINE_WIDTH/s);
    expect(
      CARD,
      'the connector`s `top` must be the node`s bottom edge, i.e. TIMELINE_NODE_SIZE'
    ).toMatch(/top=\{\{ base: `\$\{TIMELINE_NODE_SIZE\.base\}px`, md: `\$\{TIMELINE_NODE_SIZE\.md\}px` \}\}/);

    // And the node itself must be sized from the same constant, or "derived" means nothing.
    expect(CARD, 'the node circle must be sized from TIMELINE_NODE_SIZE').toMatch(
      /<Circle\s+size=\{\{\s*base: `\$\{TIMELINE_NODE_SIZE\.base\}px`/
    );
  });
});
