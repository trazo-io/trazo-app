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
  notes: [] as any[],
  /** Per-status query state, so the two requests can be made to settle independently. */
  state: {} as Record<string, { isLoading?: boolean; isError?: boolean }>
}));

vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

/**
 * The mock FILTERS BY STATUS, because the endpoint does (`?status=` in fieldnotes/views.py) and the
 * page now asks it twice: once for the queue, once for refusals. A mock that ignored its argument
 * returned every note to both calls, so one note rendered in both sections and the queue
 * assertions failed on "found multiple elements" rather than on anything real. A stub that answers
 * differently from the server it stands in for is a test that cannot be trusted either way.
 *
 * It also answers per status for loading and error, because the two requests settle INDEPENDENTLY
 * and a mock that resolved them together could not express the case that matters: the queue
 * answering empty while the refusals are still in flight, or failed.
 */
vi.mock('store/api/fieldNoteApi', () => ({
  useGetFieldNotesQuery: (args: any) => {
    const status = args?.status;
    const state = mocks.state[status] ?? {};
    return {
      // An errored request yields no data, the way RTK Query leaves it.
      data: state.isError ? undefined : mocks.notes.filter((note) => note.status === status),
      isLoading: Boolean(state.isLoading),
      isError: Boolean(state.isError)
    };
  },
  useDiscardFieldNoteMutation: () => [mocks.discard, { isLoading: false }],
  // The real one interpolates config.API_BASE_URL. Kept simple here, but the SHAPE matters: the
  // assertions check the path is a Trazo endpoint rather than the provider's own URL.
  fieldNoteAudioUrl: (publicId: string) => `/api/field-notes/${publicId}/audio/`
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
    mocks.state = {};
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

/**
 * A note that could not be read must still be visible, because today that is MOST of them.
 *
 * `providers/twilio.py` classifies any audio as `kind="voice"` and `fieldnotes/views.py` writes a
 * non-text note as REFUSED with `voice_not_enabled`, since ASR is not wired. The page asked only for
 * pending notes, nothing creates a notification, and no refusal copy existed, so a crew voice note
 * reached the database and appeared on no surface in the product. The sender believes they filed
 * something; the farm sees nothing. `fieldnotes/models.py` already promises these rows stay visible.
 */
/**
 * A voice note is words a MACHINE wrote down, and the surface has to say so and let somebody check.
 *
 * ASR dropping a negation ("I applied nothing in block 4") is undetectable by anyone who was not the
 * speaker, and on this channel the speaker is never the person who confirms. That asymmetry is the
 * whole reason playback exists: in the in-app voice flow the farmer speaks and the farmer confirms,
 * so they would catch it themselves.
 */
describe('a voice note', () => {
  const VOICE = {
    ...NOTE,
    public_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    kind: 'voice',
    body_text: '',
    words: 'regamos el bloque 4 esta manana, dos horas',
    transcript: 'regamos el bloque 4 esta manana, dos horas',
    transcript_language: 'es-419',
    audio_deleted_at: null
  };

  beforeEach(() => {
    mocks.state = {};
  });

  it('offers a player and says the words were written down automatically', () => {
    mocks.notes = [VOICE];
    const { container } = renderInbox(ONE_PARCEL);

    // The qualifier sits next to the claim, not once per page.
    expect(screen.getByText(/written down automatically/i)).toBeTruthy();
    const player = container.querySelector('audio');
    expect(player, 'a voice note rendered no way to listen').toBeTruthy();
    // Proxied through Trazo, never the provider's own URL: the recording is not in Trazo storage and
    // a provider link would carry no Trazo authorisation for whoever it reached.
    expect(player?.getAttribute('src')).toContain(`/field-notes/${VOICE.public_id}/audio/`);
    expect(player?.getAttribute('src')).not.toContain('twilio');
  });

  it('tells the reader to listen for a negation specifically', () => {
    // The failure mode is not generic inaccuracy; it is a dropped "no", which reads as a perfectly
    // coherent sentence describing work that never happened.
    mocks.notes = [VOICE];
    renderInbox(ONE_PARCEL);
    expect(screen.getByText(/especially a/i).textContent).toMatch(/no/i);
  });

  it('says the recording is gone rather than showing a broken player', () => {
    mocks.notes = [{ ...VOICE, audio_deleted_at: '2026-09-28T12:00:00Z' }];
    const { container } = renderInbox(ONE_PARCEL);

    expect(container.querySelector('audio')).toBeNull();
    expect(screen.getByText(/recording was deleted/i)).toBeTruthy();
    // The words survive the recording, which is the point of deleting it.
    expect(screen.getByText(/regamos el bloque 4/)).toBeTruthy();
  });

  it('shows no player and no transcript notice for a note somebody typed', () => {
    mocks.notes = [NOTE];
    const { container } = renderInbox(ONE_PARCEL);

    expect(container.querySelector('audio')).toBeNull();
    expect(screen.queryByText(/written down automatically/i)).toBeNull();
  });
});

/**
 * A note still being read is neither waiting nor refused, and saying nothing about it is the one
 * option that is clearly wrong: a supervisor who looks thirty seconds after a crew member sent a
 * voice note and sees an empty queue concludes the message was lost.
 */
describe('a note still being read', () => {
  const TRANSCRIBING = {
    ...NOTE,
    public_id: 'cccccccc-dddd-eeee-ffff-000000000000',
    kind: 'voice',
    body_text: '',
    words: '',
    status: 'transcribing'
  };

  beforeEach(() => {
    mocks.state = {};
  });

  it('is announced, and offers nothing to log', () => {
    mocks.notes = [TRANSCRIBING];
    renderInbox(ONE_PARCEL);

    expect(screen.getByText(/being read/i)).toBeTruthy();
    // Nothing to log: there are no words yet.
    expect(screen.queryByRole('button', { name: /Log this/i })).toBeNull();
  });

  it('does not let the page claim nothing is waiting', () => {
    mocks.notes = [TRANSCRIBING];
    renderInbox(ONE_PARCEL);
    expect(screen.queryByText(/Nothing waiting/i)).toBeNull();
  });

  it('stays out of the queue it cannot be logged from', () => {
    mocks.notes = [TRANSCRIBING, { ...NOTE, status: 'pending' }];
    renderInbox(ONE_PARCEL);
    expect(screen.getAllByRole('button', { name: /Log this/i })).toHaveLength(1);
  });
});

describe('notes that could not be read', () => {
  const REFUSED_VOICE = {
    ...NOTE,
    public_id: 'ffffffff-0000-4000-8000-000000000001',
    words: '',
    kind: 'voice',
    status: 'refused',
    refusal_reason: 'voice_not_enabled'
  };

  beforeEach(() => {
    mocks.navigate.mockClear();
    mocks.state = {};
  });

  it('shows a refused voice note, with the reason, and offers no way to log it', () => {
    mocks.notes = [REFUSED_VOICE];
    renderInbox(ONE_PARCEL);

    expect(screen.getByText(/Could not be read/i)).toBeTruthy();
    expect(screen.getByText(/Voice notes are not read yet/i)).toBeTruthy();
    // Nothing to log, so no button, no farm select and no block select on this row.
    expect(screen.queryByRole('button', { name: /Log this/i })).toBeNull();
    expect(screen.queryByLabelText(/Choose the farm/i)).toBeNull();
  });

  it('renders copy for an unrecognised reason instead of leaking the raw key', () => {
    // `refusal_reason` is a plain CharField with no choices, so the server can grow a fourth value
    // before its copy ships. react-intl's fallback for a missing id is the id itself, and
    // "voice_not_enabled" is not something to show a farmer.
    mocks.notes = [{ ...REFUSED_VOICE, refusal_reason: 'some_new_reason_from_the_server' }];
    renderInbox(ONE_PARCEL);

    expect(screen.getByText(/Trazo could not read this message/i)).toBeTruthy();
    expect(screen.queryByText(/some_new_reason_from_the_server/)).toBeNull();
    expect(screen.queryByText(/fieldNotes\.refused/)).toBeNull();
  });

  it('does not say "nothing waiting" over a refusal the operator needs to read', () => {
    mocks.notes = [REFUSED_VOICE];
    renderInbox(ONE_PARCEL);
    expect(screen.queryByText(/Nothing waiting/i)).toBeNull();
  });

  /**
   * The two requests settle independently, and `[]` is the default for `refused`, so an empty array
   * means three different things: none on file, not answered yet, or the request failed. Treating
   * all three as "nothing waiting" is how the page came to claim it had accounted for everything
   * when it had not.
   */
  it('does not claim "nothing waiting" while the refusals are still loading', () => {
    // The cold-load order: the queue is dispatched first and answers empty first.
    mocks.notes = [];
    mocks.state = { refused: { isLoading: true } };
    renderInbox(ONE_PARCEL);
    expect(screen.queryByText(/Nothing waiting/i)).toBeNull();
  });

  it('says so when the refusals cannot be loaded, rather than reporting an empty inbox', () => {
    // The permanent version of the same bug: on an error `refused` never becomes anything but [],
    // so the empty state would have stood for the rest of the session.
    mocks.notes = [];
    mocks.state = { refused: { isError: true } };
    renderInbox(ONE_PARCEL);

    expect(screen.queryByText(/Nothing waiting/i)).toBeNull();
    expect(screen.getByText(/cannot account for everything that arrived/i)).toBeTruthy();
  });

  it('still renders the queue when only the refusals fail', () => {
    // One list failing is no reason to withhold the other.
    mocks.notes = [NOTE];
    mocks.state = { refused: { isError: true } };
    renderInbox(ONE_PARCEL);
    expect(screen.getAllByRole('button', { name: /Log this/i })).toHaveLength(1);
  });

  it('keeps a refused note out of the queue it cannot be logged from', () => {
    // Belt and braces on the page's own filtering: the queue section is driven by the pending
    // query, so a refused note must not appear among the cards that carry a "Log this".
    mocks.notes = [REFUSED_VOICE, { ...NOTE, status: 'pending' }];
    renderInbox(ONE_PARCEL);
    expect(screen.getAllByRole('button', { name: /Log this/i })).toHaveLength(1);
  });
});
