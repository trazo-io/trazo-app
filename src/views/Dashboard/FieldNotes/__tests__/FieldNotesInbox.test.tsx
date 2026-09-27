/**
 * The inbox hands a note to the wizard. It never turns one into a record itself.
 *
 * THE BLOCK IS CHOSEN BY A PERSON. A note carries a farm at most and never a lot, because the block
 * a certifier traces is not something software should infer from a phone number. So "Log this" stays
 * disabled until somebody picks one, and the prefill only fires when there is exactly one answer.
 *
 * THE WORDS TRAVEL AS AN ID, NEVER AS TEXT. A `?transcript=` parameter would be a prompt-injection
 * vector wearing a link (these words steer the model's `event_type`), and it would put a crew
 * member's sentence into browser history and every access log on the way.
 */
import React from 'react';

import { ChakraProvider } from '@chakra-ui/react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  discard: vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
  notes: [] as any[]
}));

vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('store/api/fieldNoteApi', () => ({
  useGetFieldNotesQuery: () => ({ data: mocks.notes, isLoading: false }),
  useDiscardFieldNoteMutation: () => [mocks.discard, { isLoading: false }]
}));

import FieldNotesInbox from '../index';

const NOTE = {
  public_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  words: 'regamos el bloque 4 esta manana, dos horas',
  sender: { display_name: 'Miguel', phone_last4: '1234' },
  kind: 'text',
  status: 'pending',
  refusal_reason: '',
  received_at: '2026-09-26T14:02:00Z',
  establishment: 7,
  confirmed_at: null,
  fulfilled_by_event_type: null,
  fulfilled_by_id: null
};

function renderInbox(establishments: any[]) {
  const store = configureStore({
    reducer: { company: () => ({ currentCompany: { establishments } }) }
  });
  return render(
    <Provider store={store}>
      <IntlProvider locale="en-US" messages={enUS as any}>
        <ChakraProvider>
          <MemoryRouter>
            <FieldNotesInbox />
          </MemoryRouter>
        </ChakraProvider>
      </IntlProvider>
    </Provider>
  );
}

const ONE_PARCEL = [{ id: 7, name: 'Home Ranch', parcels: [{ id: 42, name: 'Block 4' }] }];
const TWO_PARCELS = [
  {
    id: 7,
    name: 'Home Ranch',
    parcels: [
      { id: 42, name: 'Block 4' },
      { id: 43, name: 'Block 5' }
    ]
  }
];

describe('the field notes inbox', () => {
  beforeEach(() => {
    mocks.navigate.mockClear();
    mocks.discard.mockClear();
    mocks.notes = [NOTE];
  });

  it('shows the sender words verbatim, and not as an editable field', () => {
    renderInbox(ONE_PARCEL);
    expect(screen.getByText(/regamos el bloque 4 esta manana, dos horas/)).toBeTruthy();
    // Evidence of what somebody reported. An input here would let one person rewrite what another
    // is recorded as having said.
    const inputs = screen.queryAllByDisplayValue(/regamos el bloque 4/);
    expect(inputs).toHaveLength(0);
  });

  it('shows only the last four digits of the number', () => {
    renderInbox(ONE_PARCEL);
    expect(screen.getByText(/1234/)).toBeTruthy();
    expect(screen.queryByText(/\+1415/)).toBeNull();
  });

  it('prefills the block ONLY when the farm has exactly one', async () => {
    renderInbox(ONE_PARCEL);
    const logThis = screen.getByRole('button', { name: /Log this/i });
    await waitFor(() => expect(logThis.hasAttribute('disabled')).toBe(false));
  });

  it('refuses to guess the block when the farm has more than one', () => {
    renderInbox(TWO_PARCELS);
    const logThis = screen.getByRole('button', { name: /Log this/i });
    expect(logThis.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/the block is what a certifier follows/i)).toBeTruthy();
  });

  it('navigates with the note id and no transcript in the URL', async () => {
    renderInbox(ONE_PARCEL);
    fireEvent.click(screen.getByRole('button', { name: /Log this/i }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());

    const url = mocks.navigate.mock.calls[0][0] as string;
    expect(url).toBe(`/admin/dashboard/farm/7/parcel/42/event/add?field_note=${NOTE.public_id}`);
    // The words must never ride in the query string.
    expect(url).not.toMatch(/transcript|words|regamos/i);
  });

  it('becomes loggable once a block is chosen', async () => {
    renderInbox(TWO_PARCELS);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: '43' } });
    const logThis = screen.getByRole('button', { name: /Log this/i });
    await waitFor(() => expect(logThis.hasAttribute('disabled')).toBe(false));

    fireEvent.click(logThis);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
    expect(mocks.navigate.mock.calls[0][0]).toContain('/parcel/43/');
  });

  it('does not preselect a farm the caller cannot see', () => {
    // The note names establishment 7, but this caller has a different one. Preselecting it would
    // offer a farm they have no business filing against.
    renderInbox([{ id: 99, name: 'Other Farm', parcels: [{ id: 1, name: 'A' }] }]);
    expect(screen.getByRole('button', { name: /Log this/i }).hasAttribute('disabled')).toBe(true);
  });

  it('says that discarding keeps the note', () => {
    renderInbox(ONE_PARCEL);
    fireEvent.click(screen.getByRole('button', { name: /^Discard$/i }));
    // "we never received it" and "we looked and said no" must stay different answers.
    expect(screen.getByText(/The note is kept with your reason/i)).toBeTruthy();
  });

  it('shows an empty state rather than a bare page', () => {
    mocks.notes = [];
    renderInbox(ONE_PARCEL);
    expect(screen.getByText(/Nothing waiting/i)).toBeTruthy();
  });
});
