/**
 * The field-notes publish notice, proved by RENDERING the real modal.
 *
 * Two things this guards that a unit test of the scanner alone cannot:
 *
 * 1. The notice is WIRED. `scanEventNotes` being correct is worthless if the modal never
 *    calls it, and "the function exists" is exactly the kind of green test that let the
 *    dead title-translation entries pass for months.
 *
 * 2. The notice is ADVISORY. The farmer's words must reach the preview UNCHANGED — this is
 *    the whole product decision behind Phase 4. If someone later "improves" this into a
 *    scrubber, the assertion that the original text still renders is what fails.
 *
 * Registry green ≠ form renders (see formRenderConformance.test.tsx); same principle here.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import { EventPreviewModal } from '../EventPreviewModal';
import enUS from '../../../i18n/lang/en-US.json';

const renderModal = (formData: Record<string, unknown>, activeEventType = 2) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <EventPreviewModal
          isOpen
          onClose={() => undefined}
          activeEventType={activeEventType}
          formData={formData as never}
        />
      </IntlProvider>
    </ChakraProvider>
  );

// A chemical event with enough data for the preview to consider itself usable.
const baseChemical = {
  event_type: 2,
  type: 'FU',
  chemical_type: 'FU',
  commercial_name: 'Kocide 3000',
  date: '2026-02-20',
  area: '85',
  area_unit: 'acres'
};

describe('EventPreviewModal — field-notes publish notice', () => {
  it('always tells the grower the notes are public', () => {
    renderModal({ ...baseChemical, description: 'Routine preventive spray.' });
    expect(screen.getByText(/Your notes will be public/i)).toBeTruthy();
  });

  it('flags the real leak that motivated this (REI in the narrative)', () => {
    // `observation` is where the form's "Observations & Notes" textarea writes, so that is
    // what a grower's note actually looks like in formData.
    renderModal({
      ...baseChemical,
      observation:
        'Preventive anthracnose spray. Full canopy coverage. REI 48 hours posted. ' +
        'Application 1 of 3 for season.'
    });
    // The specific phrase is quoted back so the grower can see what is meant.
    expect(screen.getByText(/REI 48 hours/i)).toBeTruthy();
    expect(screen.getByText(/protect farm workers/i)).toBeTruthy();
  });

  /**
   * 2026-08-01: `eventDataNormalizer` used to copy `description` into `observation` when
   * observation was empty, and ConsumerEventCard renders `observation` in quotation marks,
   * italic, as "Farmer's Field Notes". With 328+ AI templates writing descriptions, that put
   * machine-generated copy on a public page attributed to the grower. Found on the live walnut
   * fixture: `observation` null, yet the card displayed the CFR-citing description as a quote.
   *
   * The scanner still READS description (a template can carry an REI phrase into the record),
   * but description must never be RENDERED as the farmer's words.
   */
  it('scans description for risky phrases without quoting it back as the farmer said it', () => {
    const templateText = 'Preventive anthracnose spray. Full canopy coverage. REI 48 hours posted.';
    renderModal({ ...baseChemical, description: templateText });
    const rendered = document.body.textContent ?? '';

    // Flagged…
    expect(screen.getByText(/protect farm workers/i)).toBeTruthy();
    // …but the description body is not presented as a farmer-authored note.
    expect(rendered).not.toContain('Full canopy coverage');
  });

  it('flags a self-reported score', () => {
    renderModal({
      ...baseChemical,
      description: 'GlobalG.A.P. audit completed. Score: 98.5%.'
    });
    expect(screen.getByText(/self-reported score or grade/i)).toBeTruthy();
  });

  it("NEVER alters the note — the farmer's words reach the preview intact", () => {
    // This is the product decision, asserted: warn, do not scrub.
    const note = 'REI 48 hours posted. Score: 98.5%. Borrowed from Rodriguez Ranch.';
    renderModal({ ...baseChemical, description: note, observation: note });
    // Chakra renders the modal into a portal, so read the document, not the render container.
    const rendered = document.body.textContent ?? '';
    expect(rendered).toContain('REI 48 hours posted');
    expect(rendered).toContain('Score: 98.5%');
    expect(rendered).toContain('Rodriguez Ranch');
  });

  it('shows the standing reminder — never an "all clear" — when nothing is flagged', () => {
    // The scanner is tuned for precision and cannot recognise, e.g., an unfamiliar farm
    // name. Implying the note is safe would be worse than saying nothing.
    renderModal({
      ...baseChemical,
      description: 'Removed 8% canopy volume. Open center maintained for light penetration.'
    });
    expect(screen.getByText(/published as written/i)).toBeTruthy();
    expect(screen.queryByText(/worth a second look/i)).toBeNull();
  });
});
