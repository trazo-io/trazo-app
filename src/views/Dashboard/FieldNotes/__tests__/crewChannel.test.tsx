/**
 * Where does the crew send it? The last setup fact the product never stated (2026-09-30).
 *
 * The roster shipped so a grower could register a number. The consent copy explains what happens to
 * a message. The inbox explains what to do with one. Nothing said the ADDRESS: the empty state
 * promised that anything sent to "your Trazo number" would appear, and that number lived only in the
 * deployment's environment.
 *
 * WHAT THESE GUARD, each one a way this card can mislead rather than help:
 *
 *   * THE JOIN STEP APPEARS WHEN THERE IS ONE. On the Twilio sandbox a sender who has not sent the
 *     join phrase is not delivered AT ALL: no note, no refusal row, nothing on any screen. That is
 *     the worst failure this feature has, because it is indistinguishable from "my crew did not
 *     bother" and the person it blames is the crew.
 *   * AND IT DISAPPEARS WHEN THERE IS NOT. Telling a grower on a registered sender to make their
 *     crew send a join phrase would send them chasing a step that does not exist.
 *   * NOT CONFIGURED IS NOT THE SAME AS FAILED TO LOAD. One is a fact about the account, the other is
 *     a fact about a request. Rendering the first on the evidence of the second states that the
 *     channel is off when the page has no idea, which is the same claim-from-a-loading-state trap
 *     `CrewRoster` documents at its own `answered` flag.
 *   * THE NUMBER IS SELECTABLE, so a phone with no clipboard permission is not a dead end.
 */
import React from 'react';

import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';

const mocks = vi.hoisted(() => ({
  channel: { data: undefined as any, isLoading: false, isError: false }
}));

vi.mock('store/api/crewSenderApi', () => ({
  useGetCrewChannelQuery: () => mocks.channel
}));

import CrewChannel from '../CrewChannel';

const renderCard = () =>
  render(
    <IntlProvider locale="en-US" messages={enUS as any}>
      <ChakraProvider>
        <CrewChannel />
      </ChakraProvider>
    </IntlProvider>
  );

const SANDBOX = { configured: true, number: '+14155238886', join_phrase: 'join pale-tiger' };
const REGISTERED = { configured: true, number: '+15095550101', join_phrase: '' };

describe('the crew channel card', () => {
  beforeEach(() => {
    mocks.channel = { data: SANDBOX, isLoading: false, isError: false };
  });

  it('shows the number a crew sends to, in full', () => {
    renderCard();
    // In full, and deliberately the opposite rule from a note's sender: this is Trazo's own inbound
    // number, not a person's, and it is the one thing a supervisor has to read out to their crew.
    expect(screen.getByTestId('crew-channel-number').textContent).toBe('+14155238886');
  });

  it('leaves the number selectable, so a failed clipboard is not a dead end', () => {
    renderCard();
    // `userSelect: all`. A browser on an insecure origin has no `navigator.clipboard` at all, and the
    // number still has to reach a crew member's handset.
    expect(screen.getByTestId('crew-channel-number')).toHaveStyle({ userSelect: 'all' });
  });

  it('names the three steps in order', () => {
    renderCard();
    const steps = screen.getByRole('list').querySelectorAll('li');
    expect(steps).toHaveLength(3);
    // The ORDER is load-bearing: a crew member who messages before their number is on the roster is
    // refused, and on the sandbox one who messages before joining is not delivered at all.
    expect(steps[0].textContent).toMatch(/Add each person's number/i);
    expect(steps[1].textContent).toMatch(/Save the number above/i);
    expect(steps[2].textContent).toMatch(/They message it/i);
  });

  it('spells out the sandbox join phrase, attached to the step it modifies', () => {
    renderCard();
    const steps = screen.getByRole('list').querySelectorAll('li');
    // On step 2, not as a loose paragraph: saving the number is NOT enough on the sandbox, and a
    // grower reading step 2 as complete is exactly how every message gets dropped upstream.
    expect(steps[1].textContent).toMatch(/join pale-tiger/);
    expect(steps[1].textContent).toMatch(/WhatsApp delivers nothing/i);
  });

  it('warns about the three-day sandbox expiry', () => {
    renderCard();
    // The one thing that makes a WORKING channel stop working with no error anywhere. The roster's
    // "last message" column is how a supervisor spots it, which is why both are on this page.
    expect(screen.getByText(/three days after they join/i)).toBeTruthy();
  });

  it('says nothing about joining on a registered sender', () => {
    mocks.channel = { data: REGISTERED, isLoading: false, isError: false };
    renderCard();
    // Meta's permanent sender has no join step. Telling a grower to make their crew send a phrase
    // would send them chasing something that does not exist.
    expect(screen.queryByText(/First time only/i)).toBeNull();
    expect(screen.queryByText(/three days after they join/i)).toBeNull();
    expect(screen.getByTestId('crew-channel-number').textContent).toBe('+15095550101');
  });

  it('never prints an empty join phrase as a step', () => {
    mocks.channel = {
      data: { configured: true, number: '+15095550101', join_phrase: '' },
      isLoading: false,
      isError: false
    };
    renderCard();
    const steps = screen.getByRole('list').querySelectorAll('li');
    // "each person sends  to that number" reads as a bug and is worse than saying nothing.
    expect(steps[1].textContent).not.toMatch(/sends\s+to that number/);
  });

  it('says the channel is off when it is off, and still points at the roster', () => {
    mocks.channel = {
      data: { configured: false, number: '', join_phrase: '' },
      isLoading: false,
      isError: false
    };
    renderCard();
    // THE STATE PRODUCTION IS IN as of 2026-09-30: no sender number set.
    expect(screen.getByText(/not switched on for this account yet/i)).toBeTruthy();
    // And the roster below is still worth filling in, which is the difference between "not yet" and
    // "do not bother".
    expect(screen.getByText(/they will work the moment it is on/i)).toBeTruthy();
    expect(screen.queryByTestId('crew-channel-number')).toBeNull();
  });

  it('does not claim the channel is off when the request merely failed', () => {
    mocks.channel = { data: undefined, isLoading: false, isError: true };
    renderCard();
    // A fact about a request is not a fact about the account. Asserting the second from the first is
    // the claim-from-a-loading-state trap this page documents in two other places.
    expect(screen.getByText(/could not be loaded/i)).toBeTruthy();
    expect(screen.queryByText(/not switched on for this account yet/i)).toBeNull();
  });

  it('does not claim anything while it is still asking', () => {
    mocks.channel = { data: undefined, isLoading: true, isError: false };
    renderCard();
    expect(screen.queryByText(/not switched on for this account yet/i)).toBeNull();
    expect(screen.queryByText(/could not be loaded/i)).toBeNull();
    expect(screen.queryByTestId('crew-channel-number')).toBeNull();
  });
});

/**
 * The copy that is served has to exist in BOTH locales, because a missing key renders as the bare id
 * in Spanish and is invisible in English. The crew running Trazo in Spanish is the whole audience for
 * this card.
 */
describe('the channel copy is translated', () => {
  it('has every key in both locales', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const dir = join(__dirname, '../../../../i18n/lang');
    const en = JSON.parse(readFileSync(join(dir, 'en-US.json'), 'utf8'));
    const es = JSON.parse(readFileSync(join(dir, 'es-419.json'), 'utf8'));
    const keys = Object.keys(en).filter((k) => k.startsWith('fieldNotes.channel.'));
    // Not zero, or the loop below passes by having nothing to check.
    expect(keys.length).toBeGreaterThan(8);
    for (const key of keys) {
      expect(es[key], `${key} missing from es-419`).toBeTruthy();
      // A Spanish value identical to the English one is an untranslated placeholder, not a
      // translation. Numbers and the join phrase are interpolated, so no legitimate value matches.
      expect(es[key], `${key} is not translated`).not.toBe(en[key]);
    }
  });
});
