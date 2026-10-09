/**
 * Repeat-copy suppression on the consumer card.
 *
 * WHY (2026-08-01 editorial review): consumer prose is written per SUBTYPE, so a farm that
 * logs three habitat events in one season got three cards reading the same two sentences
 * verbatim, stacked. Correct, and it looks machine-generated.
 *
 * The list owner (UltraMobileProductionJourney.computeRepeatedCopy) marks the later cards; the
 * card drops the duplicated lines. Two rules are load-bearing and easy to break by accident:
 *
 *  1. Suppression is opt-IN. A card rendered alone, or the first of its kind, keeps everything.
 *  2. The description is only dropped when the farmer's own words take its place IN THE SAME
 *     STATE. Slim chapter cards hide field notes until expanded — suppressing there would leave
 *     a collapsed card with nothing but a title and a date, which is worse than the repetition.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { ConsumerEventCard } from '../ConsumerEventCard';

// The gallery pulls presigned URLs through redux; this suite is about copy suppression, not
// image loading, so stub it rather than stand up a store.
vi.mock('../../ImageGallery/StandardImageGallery', () => ({
  StandardImageGallery: () => <div data-testid="gallery" />,
  default: () => <div data-testid="gallery" />
}));
import enMessages from '../../../i18n/lang/en-US.json';

const BASE_EVENT = {
  id: '1',
  event_type: 6,
  type: 'pest_management',
  pest_management_type: 'TM',
  description: 'Trap check',
  date: '2026-05-01T08:00:00Z',
  observation: 'Codling moth counts still under threshold in blocks 3 and 4.'
};

function renderCard({ event, ...props }: Record<string, unknown>) {
  return render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enMessages as Record<string, string>}>
        <ConsumerEventCard event={{ ...BASE_EVENT, ...(event as object) } as never} {...props} />
      </IntlProvider>
    </ChakraProvider>
  );
}

/** The generated lines for the fixture, read from source so a copy edit cannot stale this. */
const SHORT = 'Pest traps around the block were checked and the counts written down';
const IMPACT = 'You can see how many insects turned up here, and when';

describe('consumer card repeat-copy suppression', () => {
  it('shows both generated lines by default (no suppression flags)', () => {
    renderCard({});
    expect(screen.getByText(new RegExp(SHORT, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(IMPACT, 'i'))).toBeInTheDocument();
  });

  it('drops the impact line when the list marks it a repeat', () => {
    renderCard({ suppressImpactLine: true });
    expect(screen.queryByText(new RegExp(IMPACT, 'i'))).not.toBeInTheDocument();
    // …and keeps the record of what happened.
    expect(screen.getByText(new RegExp(SHORT, 'i'))).toBeInTheDocument();
  });

  it("drops the description when the farmer's own words are visible in its place", () => {
    renderCard({ suppressShortDescription: true });
    expect(screen.queryByText(new RegExp(SHORT, 'i'))).not.toBeInTheDocument();
    expect(screen.getByText(/Codling moth counts still under threshold/)).toBeInTheDocument();
  });

  /**
   * 2026-08-02: the farmer's words now render in the slim chapter card too (clamped), so they
   * stand in for the dropped sentence in BOTH views. This case used to assert the opposite —
   * it existed only because slim hid the notes.
   */
  it('drops the description on a slim collapsed repeat, because the notes now show there', () => {
    renderCard({ suppressShortDescription: true, slim: true, isExpanded: false });
    expect(screen.queryByText(new RegExp(SHORT, 'i'))).not.toBeInTheDocument();
    expect(screen.getByText(/Codling moth counts still under threshold/)).toBeInTheDocument();
  });

  it('KEEPS the description when the event has no field notes to replace it', () => {
    renderCard({ suppressShortDescription: true, event: { observation: '' } });
    expect(screen.getByText(new RegExp(SHORT, 'i'))).toBeInTheDocument();
  });

  /**
   * "Harvest Pass 2 - Peak Season" had no field notes but did have a photo and a title of its
   * own, and still repeated "The crop was picked, weighed and graded" verbatim under Harvest
   * Pass 1. A photo carries a card as well as a quote does.
   */
  it('drops the description on a repeat that has a photo instead of notes', () => {
    renderCard({
      suppressShortDescription: true,
      event: { observation: '', album: { images: [{ id: 1, image: 'https://x/y.jpg' }] } }
    });
    expect(screen.queryByText(new RegExp(SHORT, 'i'))).not.toBeInTheDocument();
  });

  /**
   * The photo allowance must respect the same visibility rule as field notes. The gallery
   * renders in the EXPANDED section, so on a slim collapsed card a photo stands in for
   * nothing — counting it would re-open the title-and-date-only hole.
   */
  it('KEEPS the description on a slim collapsed card with a photo but no notes', () => {
    // The gallery lives in the expanded section, so on a slim collapsed card a photo stands in
    // for nothing. Without the notes there is nothing left to carry the card.
    renderCard({
      suppressShortDescription: true,
      slim: true,
      isExpanded: false,
      event: { observation: '', album: { images: [{ id: 1, image: 'https://x/y.jpg' }] } }
    });
    expect(screen.getByText(new RegExp(SHORT, 'i'))).toBeInTheDocument();
  });
});
