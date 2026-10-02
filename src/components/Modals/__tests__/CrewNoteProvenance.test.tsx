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

const mocks = vi.hoisted(() => ({ data: undefined as any }));
vi.mock('store/api/crewNoteApi', () => ({ useGetCrewNoteQuery: () => ({ data: mocks.data }) }));

import CrewNoteProvenance from '../CrewNoteProvenance';

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
  });

  it('renders nothing for a record that did not come from a message', () => {
    mocks.data = { crew_note: null };
    const { container } = renderBlock();
    expect(container.querySelector('[data-testid="crew-note-provenance"]')).toBeNull();
  });
});
