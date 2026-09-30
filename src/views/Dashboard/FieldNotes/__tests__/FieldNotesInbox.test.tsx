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
  acknowledge: vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
  roster: { data: [] as any[], isLoading: false },
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
  useAcknowledgeFieldNoteMutation: () => [mocks.acknowledge, { isLoading: false }],
  // The real one interpolates config.API_BASE_URL. Kept simple here, but the SHAPE matters: the
  // assertions check the path is a Trazo endpoint rather than the provider's own URL.
  fieldNoteAudioUrl: (publicId: string) => `/api/field-notes/${publicId}/audio/`
}));

/**
 * The page renders the two setup cards as well as the queue, so this module has to be stood in for
 * or their RTK Query hooks run against a store with no api reducer.
 *
 * The CHANNEL answers configured with a number, which is the state these queue assertions care about
 * least and the state a reader of this file would assume: a page where the channel works and the
 * queue is the only thing under test. `crewChannel.test.tsx` covers the states that matter there.
 * The ROSTER answers empty, which is what it does in this test anyway: `companyId` is absent from
 * the store below, so the real component skips its query.
 */
vi.mock('store/api/crewSenderApi', () => ({
  useGetCrewChannelQuery: () => ({
    data: { configured: true, number: '+14155238886', join_phrase: '' },
    isLoading: false,
    isError: false
  }),
  // Steerable, because the setup block's placement depends on it: an empty roster means setup IS
  // the job and renders open, a populated one means it collapses to a header row.
  useGetCrewSendersQuery: () => mocks.roster,
  useCreateCrewSenderMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateCrewSenderMutation: () => [vi.fn(), { isLoading: false }],
  useDeactivateCrewSenderMutation: () => [vi.fn(), { isLoading: false }]
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

/**
 * `companyId` defaults to undefined, which is what the original store held and what most of these
 * tests want: with no company the setup block does not render at all, so the queue assertions are
 * about the queue. The tests that are ABOUT setup pass one in.
 */
function renderInbox(establishments: any[], companyId?: number) {
  const store = configureStore({
    reducer: { company: () => ({ currentCompany: { id: companyId, establishments } }) }
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
    mocks.roster = { data: [], isLoading: false };
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

  it('shows only the last four digits of the sender number', () => {
    renderInbox(ONE_PARCEL);
    expect(screen.getByText(/1234/)).toBeTruthy();
    /*
     * NARROWED FROM `/\+1415/` when the channel card landed, and the narrowing is the point rather
     * than a concession. This assertion is about a CREW MEMBER's number: a note is read by anyone
     * who opens the inbox, the number adds nothing they need, and printing it would put arbitrary
     * personal phone numbers into screenshots and every access log that records a response. The
     * page now also shows TRAZO's own inbound number in full, on purpose, because that is the one
     * fact a supervisor has to relay to their crew. A pattern loose enough to match both stopped
     * being able to tell them apart, and both happen to be +1415 numbers.
     *
     * So this names the sender's number exactly. The companion assertion below pins the other half:
     * the number that IS shown in full is the channel's, and it comes from the channel card.
     */
    expect(screen.queryByText(/\+14155551234/)).toBeNull();
    /*
     * The positive half — that the number shown IN FULL is Trazo's own and not a crew member's —
     * lives in `crewChannel.test.tsx`, where that card is the subject. It cannot live here: the
     * store above holds no company id, so the setup block does not render, which is exactly the
     * state most of these queue tests want.
     */
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

  /*
   * WHY THE BUTTON IS DEAD, BEFORE THE BUTTON. The reason used to render UNDER both buttons, so a
   * reader met a greyed "Log this" first and had to hunt below it. Order is the whole fix, and
   * nothing else in the file would notice it moving back: the sentence is present either way.
   */
  it('gives the reason before the disabled button, not after it', () => {
    renderInbox(TWO_PARCELS);
    const why = screen.getByText(/the block is what a certifier follows/i);
    const logThis = screen.getByRole('button', { name: /Log this/i });

    // DOCUMENT_POSITION_FOLLOWING: `logThis` comes after `why` in document order.
    expect(why.compareDocumentPosition(logThis) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('names the reason from the disabled button, which announces none of its own', () => {
    renderInbox(TWO_PARCELS);
    const logThis = screen.getByRole('button', { name: /Log this/i });
    const describedBy = logThis.getAttribute('aria-describedby');
    expect(describedBy, 'a disabled button states no reason without this').toBeTruthy();
    const target = document.getElementById(describedBy as string);
    expect(target?.textContent).toMatch(/the block is what a certifier follows/i);
  });

  it('drops the aria-describedby once there is nothing left to explain', () => {
    // A description that survives the condition it describes is read out on a button that works.
    renderInbox(ONE_PARCEL);
    const logThis = screen.getByRole('button', { name: /Log this/i });
    expect(logThis.hasAttribute('disabled')).toBe(false);
    expect(logThis.getAttribute('aria-describedby')).toBeNull();
  });

  it('labels both selects, so which one is outstanding does not have to be inferred', () => {
    // The question used to live only in the empty option, so choosing a farm left two unlabelled
    // dropdowns: "Home Ranch" and "Choose the block".
    renderInbox(TWO_PARCELS);
    expect(screen.getByLabelText(/^Farm/)).toBeTruthy();
    expect(screen.getByLabelText(/^Block/)).toBeTruthy();
  });

  it('stamps the arrival to the minute, not the second', () => {
    renderInbox(ONE_PARCEL);
    const line = screen.getByText(/From/);
    // Seconds are noise on a message queue and make a one-line header read as a log entry.
    expect(line.textContent).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
    expect(line.textContent, 'the number must still be masked to its last four').toMatch(/1234/);
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

  it('keeps every failed player visible, not just the last one', () => {
    // From review of #47, confirmed as a real bug: the failure state was one slot shared by every
    // note, so a second failing player silently erased the first note's indicator while that
    // recording was still just as broken. The reader then had no way to tell the first problem was
    // never fixed, which is the silent-drop class this whole surface exists to end.
    mocks.notes = [
      { ...VOICE, public_id: 'aaaa-1111' },
      { ...VOICE, public_id: 'bbbb-2222' }
    ];
    const { container } = renderInbox(ONE_PARCEL);

    const players = container.querySelectorAll('audio');
    expect(players).toHaveLength(2);

    fireEvent.error(players[0]);
    fireEvent.error(players[1]);

    // BOTH, not one. With a single shared slot this reads 1.
    expect(screen.getAllByText(/would not play/i)).toHaveLength(2);
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

  /**
   * The same two states the refused query was already fixed for, which this query then repeated.
   * An empty array means three different things: none on file, not answered yet, and the request
   * failed. Treating all three as "nothing waiting" is how the page came to claim it had accounted
   * for everything, and the strip exists precisely to stop a supervisor concluding a note was lost.
   */
  it('does not claim nothing is waiting while the transcribing list is still loading', () => {
    mocks.notes = [];
    mocks.state = { transcribing: { isLoading: true } };
    renderInbox(ONE_PARCEL);
    expect(screen.queryByText(/Nothing waiting/i)).toBeNull();
  });

  it('says so when the transcribing list cannot be loaded', () => {
    mocks.notes = [];
    mocks.state = { transcribing: { isError: true } };
    renderInbox(ONE_PARCEL);

    expect(screen.queryByText(/Nothing waiting/i)).toBeNull();
    expect(screen.getByText(/cannot account for everything that arrived/i)).toBeTruthy();
  });
});

/**
 * The player's source has to be reachable under the PRODUCTION CSP, and nothing else would catch it.
 *
 * `media-src` falls back to `default-src` when unset, NOT to `connect-src`. The app is served from
 * app.trazo.io and the API from api.trazo.io, so with `default-src 'self'` and no `media-src` the
 * browser blocks the audio and the player fails silently. It works in development because the API is
 * a same-origin `/api` proxy there, which makes this the exact shape of defect that ships.
 */
describe('the production CSP allows the audio to load', () => {
  const csp = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { readFileSync } = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { join } = require('path');
    const toml = readFileSync(join(__dirname, '../../../../../netlify.toml'), 'utf8');
    const line = toml.split('\n').find((l: string) => l.includes('Content-Security-Policy'));
    expect(line, 'no Content-Security-Policy in netlify.toml').toBeTruthy();
    return line as string;
  };

  it('declares media-src, rather than relying on connect-src', () => {
    const directive = /media-src ([^;"]+)/.exec(csp());
    expect(
      directive,
      'media-src is unset, so it falls back to default-src and blocks the player'
    ).toBeTruthy();
    expect(directive?.[1]).toContain('api.trazo.io');
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
    /*
     * BY ROLE, not by label text. This asserted `queryByLabelText(/Choose the farm/i)` and went
     * VACUOUS the moment the selects gained visible labels: "Choose the farm" became the empty
     * OPTION's text and stopped naming the control, so the query matched nothing whether or not a
     * select was rendered, and a farm select reappearing on a refused row would have passed.
     * A role query cannot rot that way, and it covers both selects rather than one.
     */
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    expect(screen.queryByLabelText(/^Farm/)).toBeNull();
    expect(screen.queryByLabelText(/^Block/)).toBeNull();
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

/**
 * The page has to stay usable once a farm has been running for a season.
 *
 * WHAT WAS WRONG, found by the product owner asking whether a farmer with a lot of field notes has
 * to scroll to add a crew number. They did. The setup block rendered LAST, under every waiting note
 * and every refusal, and no list was paged: DRF has no pagination configured, so the endpoint
 * returns every matching note and the page rendered all of them. A note is a card carrying a
 * header, the words, an optional audio player and two 44px selects and two 44px buttons, so twenty
 * of them is a dozen screens before the roster.
 *
 * And the refused list never drained: `discard` answers 409 for anything that is not waiting, so
 * until `acknowledge` shipped every unreadable message stayed on the page for the life of the
 * account. The scroll was the symptom.
 */
describe('the page at scale', () => {
  /**
   * `words` carries the STATUS as well as the index, because both lists are on one page and a
   * shared "mensaje numero 3" makes every text assertion ambiguous about which list it found.
   */
  const manyNotes = (count: number, status = 'pending') =>
    Array.from({ length: count }, (_, i) => ({
      ...NOTE,
      public_id: `note-${status}-${i}`,
      status,
      refusal_reason: status === 'refused' ? 'language_not_supported' : '',
      words: `${status} numero ${i}`
    }));

  beforeEach(() => {
    mocks.navigate.mockClear();
    mocks.acknowledge.mockClear();
    mocks.roster = { data: [], isLoading: false };
  });

  it('renders one page of the queue, not the whole thing', () => {
    mocks.notes = manyNotes(23);
    renderInbox(ONE_PARCEL);
    // PAGE_SIZE is 10: ten cards, so ten "Log this" buttons, not twenty-three.
    expect(screen.getAllByRole('button', { name: /Log this/i })).toHaveLength(10);
    expect(screen.getByText(/pending numero 0/)).toBeTruthy();
    expect(screen.queryByText(/pending numero 10/)).toBeNull();
  });

  it('offers a pager that says how much is there', () => {
    mocks.notes = manyNotes(23);
    renderInbox(ONE_PARCEL);
    // The TOTAL is the point: ten cards with no total reads as ten notes existing. Matched as
    // "of 23" rather than bare /23/, which also hits the timestamps on the cards.
    expect(screen.getByText(/of 23/)).toBeTruthy();
  });

  it('reaches the rest of the queue', () => {
    mocks.notes = manyNotes(23);
    renderInbox(ONE_PARCEL);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/pending numero 10/)).toBeTruthy();
    expect(screen.queryByText(/pending numero 0$/)).toBeNull();
  });

  it('shows no pager at all when everything fits', () => {
    mocks.notes = manyNotes(3);
    renderInbox(ONE_PARCEL);
    // StandardPagination returns null on `total <= pageSize`, which is why this costs a first-time
    // user nothing.
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull();
  });

  it('pages the refused list independently of the queue', () => {
    /*
     * PROVEN BY MOVING ONE AND CHECKING THE OTHER DID NOT. The first version of this test asserted
     * that two "next" buttons exist, which is true under a single shared page number as well, so it
     * proved only that two pagers render. A shared number is the actual defect to catch: paging the
     * queue to find a note would silently scroll refusals somebody was part-way through reading.
     */
    mocks.notes = [...manyNotes(23), ...manyNotes(15, 'refused')];
    renderInbox(ONE_PARCEL);

    const nexts = screen.getAllByRole('button', { name: /next/i });
    expect(nexts, 'both lists overflow one page, so both should offer a pager').toHaveLength(2);

    // The queue's pager is the first in document order, because the queue renders above refusals.
    fireEvent.click(nexts[0]);

    // The queue moved...
    expect(screen.getByText(/pending numero 10/)).toBeTruthy();
    // ...and the refused list did not.
    expect(screen.getByText(/refused numero 0/)).toBeTruthy();
    expect(screen.queryByText(/refused numero 10/)).toBeNull();
  });
});

describe('setup is reachable without scrolling the queue', () => {
  beforeEach(() => {
    mocks.notes = [NOTE];
    mocks.acknowledge.mockClear();
  });

  it('renders setup open and first when no number is registered yet', () => {
    // Setup IS the job at this point, and the queue is empty anyway, so there is nothing to bury.
    mocks.roster = { data: [], isLoading: false };
    const { container } = renderInbox(ONE_PARCEL, 5);
    expect(screen.getByTestId('crew-channel-number')).toBeTruthy();
    // No collapsed header to click past.
    expect(screen.queryByText(/numbers can send to this farm/i)).toBeNull();
    // ABOVE the queue: the channel card appears earlier in the document than the first note.
    const html = container.innerHTML;
    expect(html.indexOf('crew-channel-number')).toBeLessThan(html.indexOf('regamos el bloque 4'));
  });

  it('collapses setup to a header row once a number exists, and says how many', () => {
    mocks.roster = { data: [{ id: 1 }, { id: 2 }, { id: 3 }], isLoading: false };
    renderInbox(ONE_PARCEL, 5);
    // getAllByText: `CollapsibleSection` renders `description` twice, once in the collapsed
    // header and once inside the `Collapse` body, so a single-match query fails on a correct
    // render. Asserting it is PRESENT is the claim; how many copies the component keeps is not.
    expect(screen.getAllByText(/3 numbers can send to this farm/i).length).toBeGreaterThan(0);
    /*
     * COLLAPSED, asserted as the section's own state rather than as the absence of its children.
     *
     * Chakra's `Collapse` animates height to 0 and keeps the children MOUNTED, so the setup cards
     * are in the DOM and take no vertical space. The first version of this test asserted
     * `queryByTestId('crew-channel-number')` was null, which is a claim about mounting that is
     * simply false, and making it true meant passing `unmountOnExit` to the shared component. That
     * broke sixteen tests in `formRenderConformance`, because `CollapsibleSection` has three other
     * callers and all three are `.jsx` activity form tabs that keep registered fields inside
     * collapsed sections. Unmounting them would drop a farmer's entered values on save.
     *
     * So the claim this test can honestly make is the one the page needs: the section is shut, so
     * the queue is not pushed down the screen.
     */
    const header = screen.getByRole('button', { name: /Crew numbers, and where they send/i });
    expect(header.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on a click, without leaving the page', () => {
    mocks.roster = { data: [{ id: 1 }], isLoading: false };
    renderInbox(ONE_PARCEL, 5);
    fireEvent.click(screen.getByText(/Crew numbers, and where they send/i));
    expect(screen.getByTestId('crew-channel-number')).toBeTruthy();
  });

  it('claims nothing about the roster before the request has answered', () => {
    // A SKIPPED or in-flight query reads as `data: []`, and rendering the empty branch on that
    // states the farm has no crew numbers on the evidence of a loading state.
    mocks.roster = { data: [], isLoading: true };
    renderInbox(ONE_PARCEL, 5);
    expect(screen.queryByTestId('crew-channel-number')).toBeNull();
    expect(screen.queryByText(/numbers can send to this farm/i)).toBeNull();
  });
});

describe('a refusal can be cleared', () => {
  beforeEach(() => {
    mocks.acknowledge.mockClear();
    mocks.roster = { data: [], isLoading: false };
  });

  it('offers the only action that clears one, and sends just the id', async () => {
    // THE ONLY WAY A REFUSAL EVER LEAVES THIS PAGE. `discard` answers 409 for anything that is not
    // waiting, so without this the refused list grows for the life of the account.
    mocks.notes = [
      { ...NOTE, public_id: 'ref-1', status: 'refused', refusal_reason: 'language_not_supported' }
    ];
    renderInbox(ONE_PARCEL);
    fireEvent.click(screen.getByRole('button', { name: /Mark as seen/i }));
    await waitFor(() => expect(mocks.acknowledge).toHaveBeenCalledWith('ref-1'));
  });

  it('does not offer it on a waiting note', () => {
    // Acknowledging a waiting note would make a crew member's message disappear without logging it
    // or recording a decision about it.
    mocks.notes = [NOTE];
    renderInbox(ONE_PARCEL);
    expect(screen.queryByRole('button', { name: /Mark as seen/i })).toBeNull();
  });
});
