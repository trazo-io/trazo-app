/**
 * The record's crew-message provenance block (OSP alignment audit T29): sender, performer and
 * confirmer apart, three times, and nothing for a record that did not come from a message.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const mocks = vi.hoisted(() => ({ data: undefined as any }));
vi.mock('store/api/crewNoteApi', () => ({ useGetCrewNoteQuery: () => ({ data: mocks.data }) }));

import CrewNoteProvenance from '../CrewNoteProvenance';

/** ICU 72+ puts U+202F before AM/PM; compare text, not code points (review of app #81). */
const norm = (s: string | null | undefined) => (s ?? '').replace(/[\u202f\u00a0]/g, ' ');

const NOTE = {
  sender: { display_name: 'Miguel', phone_last4: '1234' },
  kind: 'voice',
  received_at: '2026-09-28T14:02:00Z',
  words: 'regamos el bloque 4',
  words_are_transcript: true,
  language: 'es-419',
  confirmed_by: 'Laurel Brandt',
  confirmed_at: '2026-09-30T09:00:00Z',
  machine_values_applied: [],
  machine_values_offered: 2,
  negation: '',
  server_reading_recorded: true,
  server_matched: ['amendment_product_name'],
  earlier_confirmations: [],
  occurred_at: '2026-09-27T08:00:00Z',
  performer: '',
  applicator: '',
  review: { reviewed: false, reviewer_name: '', review_date: null },
  from_history: true
};

const renderBlock = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <CrewNoteProvenance eventId={7} eventType={3} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('crew-note provenance block', () => {
  beforeEach(() => {
    mocks.data = { crew_note: NOTE };
  });

  it('keeps sender, performer and confirmer apart, and never takes the sender for the performer', () => {
    renderBlock();
    const text = screen.getByTestId('crew-note-provenance').textContent ?? '';
    expect(text).toContain('Voice message from Miguel (number ending 1234)');
    expect(text).toContain('A machine transcript');
    expect(text).toContain(
      'Performer: not recorded. The sender is not assumed to be the performer.'
    );
    expect(text).toContain('Confirmed into this record by Laurel Brandt');
    expect(text).toContain('Stated occurrence:');
    expect(text).toContain('No review recorded.');
    expect(text).not.toMatch(/Performer: Miguel/);
    // A field the registry does not know for this event type is humanised, never printed as the
    // stored key (AC-09).
    expect(text).toContain('(checked by Trazo): Amendment product name');
    expect(text).not.toContain('amendment_product_name');
  });

  it('names stored fields by the form label, in the viewer language, not by their keys', () => {
    mocks.data = {
      crew_note: {
        ...NOTE,
        server_matched: ['commercial_name'],
        machine_values_applied: ['commercial_name']
      }
    };
    const { unmount } = render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <CrewNoteProvenance eventId={7} eventType={2} />
        </IntlProvider>
      </ChakraProvider>
    );
    let text = screen.getByTestId('crew-note-provenance').textContent ?? '';
    expect(text).toContain('Product Name');
    expect(text).not.toContain('commercial_name');
    unmount();
    render(
      <ChakraProvider>
        <IntlProvider locale="es-419" messages={es419 as Record<string, string>}>
          <CrewNoteProvenance eventId={7} eventType={2} />
        </IntlProvider>
      </ChakraProvider>
    );
    text = screen.getByTestId('crew-note-provenance').textContent ?? '';
    expect(text).toContain('Nombre del producto');
    expect(text).not.toContain('commercial_name');
  });

  it('shows the stated occurrence as the record says it, not in the viewer zone', () => {
    // 08:00 under the UTC label is the farm's 08:00 (ADR 011). Reassigning process.env.TZ inside a
    // vitest worker does not move the zone (vitest.config pins America/Los_Angeles at start; review
    // of app #81 and #128), so the zone dependence is proved explicitly: through the worker's zone
    // the same instant reads differently, so a viewer-zone renderer would fail this assertion.
    renderBlock();
    const text = norm(screen.getByTestId('crew-note-provenance').textContent);
    expect(text).toContain('Stated occurrence: Sep 27, 2026, 8:00 AM.');
    const throughViewerZone = norm(
      new Date(NOTE.occurred_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })
    );
    expect(throughViewerZone).not.toBe('8:00 AM');
  });

  it('renders nothing for a record that did not come from a message', () => {
    mocks.data = { crew_note: null };
    const { container } = renderBlock();
    expect(container.querySelector('[data-testid="crew-note-provenance"]')).toBeNull();
  });
});
