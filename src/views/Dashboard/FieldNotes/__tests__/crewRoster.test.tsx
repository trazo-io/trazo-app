/**
 * The roster is the setup step that did not exist, and the reason the channel was unusable.
 *
 * The webhook was live, the only way to register a number was staff-only Django admin, and the
 * inbox's empty state told a first-time user that messages would appear when someone on their crew
 * sent one. Nobody outside Trazo could make that happen.
 *
 * WHAT THESE GUARD:
 *
 *   * The FULL number renders. This is the only screen that can fix a typo in it, and a mistyped
 *     number leaves a crew member told they are not registered while their number is visibly on the
 *     list. It is the opposite rule from a field note, which shows only the last four digits.
 *   * A number that cannot send says WHY. Three columns gate `may_send`, so "off" and "they replied
 *     STOP" and "waiting on consent" are three different answers and the supervisor needs the right
 *     one.
 *   * Consent is asserted before anything is saved. A crew member is not a Trazo user and cannot
 *     agree here, so a person at the farm does it under their own name.
 *   * The server's own refusal is shown verbatim. It is the thing that knows whether the number, the
 *     farm or the consent tick was the problem.
 *   * Turning a number off DEACTIVATES. A roster row is the provenance of every note it accepted.
 */
import React from 'react';

import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';

const mocks = vi.hoisted(() => ({
  senders: [] as any[],
  create: vi.fn((_body?: any) => ({ unwrap: () => Promise.resolve({}) })),
  update: vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
  deactivate: vi.fn(() => ({ unwrap: () => Promise.resolve({}) }))
}));

vi.mock('store/api/crewSenderApi', () => ({
  useGetCrewSendersQuery: () => ({ data: mocks.senders, isLoading: false }),
  useCreateCrewSenderMutation: () => [mocks.create, { isLoading: false }],
  useUpdateCrewSenderMutation: () => [mocks.update, { isLoading: false }],
  useDeactivateCrewSenderMutation: () => [mocks.deactivate, { isLoading: false }]
}));

import CrewRoster from '../CrewRoster';

const SENDER = {
  id: 1,
  company: 5,
  establishment: 7,
  phone_e164: '+14155551234',
  display_name: 'Miguel',
  language: 'es-419',
  is_active: true,
  may_send: true,
  consent_attested_at: '2026-09-20T10:00:00Z',
  stopped_at: null,
  first_contact_at: null,
  last_note_at: null,
  created_at: '2026-09-20T10:00:00Z'
};

const FARMS = [{ id: 7, name: 'Home Ranch' }];

/**
 * NO DEFAULT PARAMETER, deliberately. `renderRoster(undefined)` would TRIGGER a default, so a
 * `= 5` here made the no-company test render with a company and pass for the wrong reason: the
 * button it asserted was disabled was actually enabled, and the assertion was what caught it.
 */
const renderRoster = (companyId?: number) =>
  render(
    <IntlProvider locale="en-US" messages={enUS as any}>
      <ChakraProvider>
        <CrewRoster companyId={companyId} farms={FARMS} />
      </ChakraProvider>
    </IntlProvider>
  );

describe('the crew roster', () => {
  beforeEach(() => {
    mocks.create.mockClear();
    mocks.update.mockClear();
    mocks.deactivate.mockClear();
    mocks.senders = [SENDER];
  });

  it('shows the full number, because this is the screen that can fix a typo in it', () => {
    renderRoster(5);
    expect(screen.getByText(/\+14155551234/)).toBeTruthy();
    expect(screen.getByText(/Miguel/)).toBeTruthy();
    expect(screen.getByText(/Home Ranch/)).toBeTruthy();
  });

  it('says a registered number has not sent anything yet, rather than leaving it blank', () => {
    renderRoster(5);
    expect(screen.getByText(/Has not sent anything yet/i)).toBeTruthy();
  });

  it('names why a number cannot send, and the three reasons are different answers', () => {
    mocks.senders = [
      { ...SENDER, id: 1, stopped_at: '2026-09-25T09:00:00Z' },
      { ...SENDER, id: 2, is_active: false, stopped_at: null },
      { ...SENDER, id: 3, consent_attested_at: null, stopped_at: null }
    ];
    renderRoster(5);

    expect(screen.getByText(/They replied STOP/i)).toBeTruthy();
    expect(screen.getByText(/Turned off/i)).toBeTruthy();
    expect(screen.getByText(/Waiting on consent/i)).toBeTruthy();
  });

  it('says nothing can reach the inbox when no number is registered', () => {
    mocks.senders = [];
    renderRoster(5);
    // The honest version of an empty state: it names the consequence, not just the absence.
    expect(screen.getByText(/nothing can reach this inbox/i)).toBeTruthy();
  });

  it('will not save a number until somebody attests consent', () => {
    mocks.senders = [];
    renderRoster(5);
    fireEvent.click(screen.getByRole('button', { name: /Add a number/i }));
    fireEvent.change(screen.getByLabelText(/Phone number with country code/i), {
      target: { value: '+14155559999' }
    });

    // The number alone is not enough: without the stamp the row would be inert anyway.
    expect(screen.getByRole('button', { name: /Add this number/i }).hasAttribute('disabled')).toBe(
      true
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('sends the company, the number and the consent flag once the box is ticked', async () => {
    mocks.senders = [];
    renderRoster(5);
    fireEvent.click(screen.getByRole('button', { name: /Add a number/i }));
    fireEvent.change(screen.getByLabelText(/Phone number with country code/i), {
      target: { value: ' +1 415 555 9999 ' }
    });
    fireEvent.click(screen.getByLabelText(/They agreed/i));
    fireEvent.click(screen.getByRole('button', { name: /Add this number/i }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    const sent = mocks.create.mock.calls[0][0] as any;
    expect(sent.company).toBe(5);
    // Trimmed here, normalised on the server: the webhook compares by exact string equality.
    expect(sent.phone_e164).toBe('+1 415 555 9999');
    expect(sent.consent_attested).toBe(true);
    // Never a client-supplied stamp. The server records who asserted it and when.
    expect(sent).not.toHaveProperty('consent_attested_at');
    expect(sent).not.toHaveProperty('consent_attested_by');
  });

  it("shows the server's own refusal rather than a generic failure", async () => {
    mocks.senders = [];
    mocks.create.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          data: {
            phone_e164: ['Enter the number with its country code, for example +1 415 555 1234.']
          }
        })
    } as any);

    renderRoster(5);
    fireEvent.click(screen.getByRole('button', { name: /Add a number/i }));
    fireEvent.change(screen.getByLabelText(/Phone number with country code/i), {
      target: { value: '5551234' }
    });
    fireEvent.click(screen.getByLabelText(/They agreed/i));
    fireEvent.click(screen.getByRole('button', { name: /Add this number/i }));

    // The server knows whether the number, the farm or the consent tick was the problem. A generic
    // toast would send the supervisor back to guess.
    await waitFor(() =>
      expect(screen.getByText(/Enter the number with its country code/i)).toBeTruthy()
    );
  });

  it('turns a number off by deactivating it, never by deleting the row', () => {
    renderRoster(5);
    fireEvent.click(screen.getByRole('button', { name: /Turn off/i }));
    expect(mocks.deactivate).toHaveBeenCalledWith(1);
  });

  it('turns a deactivated number back on', () => {
    mocks.senders = [{ ...SENDER, is_active: false }];
    renderRoster(5);
    fireEvent.click(screen.getByRole('button', { name: /Turn on/i }));
    expect(mocks.update).toHaveBeenCalledWith({ id: 1, is_active: true });
  });

  it('cannot add anything before the company is known', () => {
    mocks.senders = [];
    renderRoster();
    // A roster row belongs to exactly one company, so there is nothing to add it to yet.
    expect(screen.getByRole('button', { name: /Add a number/i }).hasAttribute('disabled')).toBe(
      true
    );
  });
});
