/**
 * A chapter on the consumer journey is ONE card: header, events as rows, "See all" as its last
 * row (2026-11-04, chosen by Oscar from rendered options).
 *
 * It was a header card, then each event as a sibling card, then the "See all" link floating
 * below both, so a chapter read as three loose pieces and a phone screen carried four card
 * edges per chapter. The fix depends on two halves staying wired: the chapter draws the one
 * container, and every event inside renders `flush` (no border, radius or hover lift of its
 * own). Drop either and the cards-in-a-card look comes back without any test noticing a
 * change in content.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const stripComments = (code: string) =>
  code
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const JOURNEY = stripComments(
  read('src/views/Scan/ProductDetail/components/UltraMobileProductionJourney.tsx')
);
const CARD = stripComments(read('src/components/Events/ConsumerEventCard.tsx'));

// The consumer story view: from the chapter map to the full-record button after it.
const STORY = (() => {
  const start = JOURNEY.indexOf('chapterData.map(');
  const end = JOURNEY.indexOf("id: 'consumer.journey.viewFullRecord'", start);
  return start === -1 || end === -1 ? '' : JOURNEY.slice(start, end);
})();

describe('a journey chapter is one card', () => {
  it('finds the chapter block (guards the guard)', () => {
    expect(STORY.length).toBeGreaterThan(1_000);
    expect(STORY).toMatch(/<ConsumerEventCard/);
    expect(STORY).toMatch(/consumer\.journey\.seeAllInChapter/);
  });

  it('draws exactly one container per chapter, the chapter itself', () => {
    expect(STORY.match(/data-testid="journey-chapter"/g)).toHaveLength(1);
    // One rounded, bordered box in the whole chapter block: the header is not its own card.
    expect(STORY.match(/borderRadius="xl"/g)).toHaveLength(1);
  });

  it('renders every event in it as a flush row', () => {
    const cards = STORY.match(/<ConsumerEventCard[\s\S]*?\/>/g) ?? [];
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) expect(c).toMatch(/\bflush\b(?!\s*=\s*\{\s*false)/);
  });

  it('keeps "See all" inside the chapter card, after its rows', () => {
    // The element carrying the chapter test id IS the bordered card (not a bare wrapper
    // around a header card), and the map returns it, so everything after it is inside it.
    const open = STORY.slice(
      STORY.lastIndexOf('<Box', STORY.indexOf('data-testid="journey-chapter"'))
    );
    const tag = open.slice(0, open.indexOf('>') + 1);
    expect(tag).toMatch(/borderWidth="1px"/);
    expect(tag).toMatch(/borderRadius="xl"/);
    const at = STORY.indexOf('data-testid="journey-chapter"');
    expect(STORY.indexOf('<ConsumerEventCard')).toBeGreaterThan(at);
    expect(STORY.indexOf('consumer.journey.seeAllInChapter')).toBeGreaterThan(
      STORY.lastIndexOf('<ConsumerEventCard')
    );
  });

  it('flush really drops the event card border, radius and hover lift', () => {
    expect(CARD).toMatch(/borderRadius=\{flush \? 0 : 'xl'\}/);
    expect(CARD).toMatch(/borderWidth=\{flush \? 0 : '1px'\}/);
    expect(CARD).toMatch(/_hover=\{flush \? undefined :/);
  });
});
