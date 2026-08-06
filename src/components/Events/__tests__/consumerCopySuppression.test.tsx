/**
 * Suppression must be surgical: hide the eight families' filler, keep every specific sentence.
 *
 * The risk this guards is over-firing. `isGenericCopy` now matches 32 strings (8 families ×
 * 2 fields × 2 locales); one careless addition to that list — or a specific sentence that
 * happens to collide with it — silently removes the best copy on the card, and the card would
 * still look fine to anyone not comparing against the source.
 *
 * Rendering the real ConsumerEventCard is the only way to prove both halves, for the same
 * reason formRenderConformance.test.tsx exists: registry green ≠ card renders.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import { ConsumerEventCard } from '../ConsumerEventCard';
import enUS from '../../../i18n/lang/en-US.json';

const renderCard = (event: Record<string, unknown>) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <ConsumerEventCard event={event as never} isLast />
      </IntlProvider>
    </ChakraProvider>
  );

describe('generic family copy is suppressed', () => {
  it('renders no "What This Means For You" when the copy is the family fallback', () => {
    // `activity_type: 'other'` is the shape that genuinely reaches the general-family
    // fallback ("This farm management activity supports efficient operations and sustainable
    // farming practices."). NOTE: an event with NO activity_type does NOT land here — the
    // description text routes it into the maintenance branch instead, which is why this test
    // pins the value explicitly rather than omitting it.
    renderCard({
      id: 'general_0',
      event_type: 3,
      type: 'general',
      activity_type: 'other',
      name: 'Farm walk',
      description: 'Farm walk',
      date: '2026-05-01T08:00:00Z'
    });
    expect(screen.queryByText(/supports efficient operations/i)).toBeNull();
    expect(screen.queryByText(/Part of comprehensive farm management/i)).toBeNull();
  });
});

describe('specific copy still renders', () => {
  it('keeps the equipment-CLEANING story (the branch added for 40 live events)', () => {
    renderCard({
      id: 'production_0',
      event_type: 1,
      type: 'EM',
      production_type: 'EM',
      equipment_operation_type: 'CL',
      name: 'Post-Pruning Equipment Cleaning',
      description: 'Post-Pruning Equipment Cleaning',
      date: '2026-02-26T08:00:00Z'
    });
    // Asserts the SENTENCE, not a heading: since 2026-08-01 consumerImpact renders in the
    // COLLAPSED card (above the fold) rather than under a "What This Means For You" heading
    // inside the expander, because on most cards it is the only line that answers a
    // shopper's question and a tap was losing it.
    expect(screen.getByText(/nothing carried over from another field/i)).toBeTruthy();
    expect(screen.getByText(/keeps an organic block organic/i)).toBeTruthy();
  });

  it('keeps a long-standing specific sentence (harvest)', () => {
    renderCard({
      id: 'production_1',
      event_type: 1,
      type: 'HA',
      production_type: 'HA',
      name: 'Main Harvest',
      description: 'Main Harvest',
      date: '2026-04-10T08:00:00Z'
    });
    // Phase B split these two fields, which used to be paraphrases of each other
    // ("Crops harvested at peak ripeness for maximum quality and nutrition" /
    // "…to ensure maximum nutritional value and freshness"). They now do different jobs:
    // shortDescription says WHAT HAPPENED, consumerImpact says WHY IT MATTERS to the reader.
    // Asserting both is what stops a future edit collapsing them back into one voice.
    expect(screen.getByText(/picked, weighed and graded/i)).toBeTruthy();
    expect(screen.getByText(/week this fruit came off the block/i)).toBeTruthy();
  });

  it('describes certification WITHOUT asserting an inspection took place', () => {
    // The claim-safety case. `verification_status` is farmer-entered — live data has 18
    // "verified" rows, and those same cards render a "Self-Reported" badge — and Trazo only
    // independently confirms USDA Organic via the Integrity Database match. An earlier draft
    // of this copy said "An outside certifier inspected this farm and its records", which
    // states a third-party audit as fact from self-attested data. That is the overclaim
    // compliance.md exists to prevent, and it would have been worse than the filler it
    // replaced. The copy must ATTRIBUTE ("this farm recorded"), not assert.
    renderCard({
      id: 'business_0',
      event_type: 7,
      type: 'CE',
      business_type: 'certification',
      verification_status: 'verified',
      name: 'GlobalG.A.P. Certification',
      description: 'GlobalG.A.P. Certification',
      date: '2026-02-09T08:00:00Z'
    });
    // 2026-08-01: the description was "Third-party certification validating sustainable
    // farming practices and product quality" — "validating" asserts an outcome from a
    // self-reported record, on a card whose own chip says "Self Reported". It now states what
    // was recorded, and the impact line points at the certificate number a buyer can check.
    expect(screen.getByText(/third-party certification was recorded/i)).toBeTruthy();
    expect(screen.getByText(/certificate number is published here/i)).toBeTruthy();
    expect(screen.queryByText(/certifier inspected this farm/i)).toBeNull();
    expect(screen.queryByText(/validating sustainable farming practices/i)).toBeNull();
    // And it must not resurrect the old unqualified green claim either.
    expect(screen.queryByText(/ensuring quality and environmental standards/i)).toBeNull();
    expect(screen.queryByText(/ensuring environmental protection/i)).toBeNull();
  });

  it('does not repeat the type in a composed business title', () => {
    renderCard({
      id: 'business_1',
      event_type: 7,
      type: 'CE',
      business_type: 'certification',
      description: 'x',
      date: '2026-02-09T08:00:00Z'
    });
    // "Certification Event: Certification" — introduced by the raw-code fix, caught by the
    // es-coverage sweep once it stopped passing the subtype as business_type.
    expect(screen.queryByText(/Certification Event: Certification/i)).toBeNull();
  });

  it('distinguishes equipment CLEANING from other equipment work', () => {
    renderCard({
      id: 'production_2',
      event_type: 1,
      type: 'EM',
      production_type: 'EM',
      equipment_operation_type: 'CA',
      name: 'Sprayer Calibration',
      description: 'Sprayer Calibration',
      date: '2026-04-10T08:00:00Z'
    });
    // Calibration is an accuracy story, not an organic-integrity one.
    expect(screen.getByText(/lands where it should/i)).toBeTruthy();
    expect(screen.queryByText(/nothing carried over/i)).toBeNull();
  });
});
