/**
 * The plan page's certifying-agent card states the agent, where it came from, and what the
 * packet does with it — from `packet_agent`, the function the packet's coverage page calls.
 *
 * 🔴 2026-09-10 — before this card a first-year applicant had nowhere to name an agent and no way
 * to learn the packet would speak CCOF's form numbers.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

const updateOSP = vi.fn();

vi.mock('store/api/ospApi', () => ({
  useUpdateOSPMutation: () => [updateOSP, { isLoading: false }]
}));

vi.mock('store/api/certificationApi', () => ({
  useGetCertifyingAgentsQuery: () => ({
    data: [
      {
        slug: 'otco',
        name: 'Oregon Tilth Certified Organic',
        short_name: 'OTCO',
        own_numbering: true
      }
    ],
    isLoading: false,
    isError: false
  })
}));

import OSPCertifyingAgentCard from '../OSPCertifyingAgentCard';

const WSDA = 'Washington State Department of Agriculture';

const osp = (over: Record<string, unknown> = {}) => ({
  id: 57,
  version_number: 2,
  status: 'draft',
  certifier_name: '',
  packet_agent: { name: WSDA, slug: 'wsda', source: 'certificate', own_numbering: true },
  ...over
});

const renderCard = (plan: Record<string, unknown>, isLocked = false) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <OSPCertifyingAgentCard companyId="7" farmId="3" osp={plan as any} isLocked={isLocked} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OSPCertifyingAgentCard', () => {
  beforeEach(() => {
    updateOSP.mockReset();
    updateOSP.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('names the certificate it read the agent from, and the numbering that follows', () => {
    renderCard(osp());
    expect(
      screen.getByText(new RegExp(`Taken from your certificate on file: ${WSDA}`))
    ).toBeTruthy();
    expect(screen.getByText(`The renewal packet is numbered to ${WSDA}'s own forms.`)).toBeTruthy();
  });

  it('says plainly when no record names an agent', () => {
    renderCard(osp({ packet_agent: { name: '', slug: null, source: '', own_numbering: false } }));
    expect(
      screen.getByText(/No certifying agent is named on this plan or on your certificate/)
    ).toBeTruthy();
  });

  it("names an unregistered agent in the fallback line rather than a generic 'your agent'", () => {
    renderCard(
      osp({
        certifier_name: 'Organic Certifiers, Inc.',
        packet_agent: {
          name: 'Organic Certifiers, Inc.',
          slug: 'oci',
          source: 'plan',
          own_numbering: false
        }
      })
    );
    expect(
      screen.getByText(/doesn't carry Organic Certifiers, Inc\.'s form numbers yet/)
    ).toBeTruthy();
  });

  it('saves the picked agent and sends nothing else', async () => {
    renderCard(osp());
    fireEvent.change(screen.getByLabelText('Certifying agent'), {
      target: { value: 'Oregon Tilth Certified Organic' }
    });
    // While the edit is unsaved the card speaks for the NEW choice only.
    expect(screen.queryByText(/Taken from your certificate/)).toBeNull();
    fireEvent.click(screen.getByText('Save agent'));
    await waitFor(() => expect(updateOSP).toHaveBeenCalledTimes(1));
    expect(updateOSP.mock.calls[0][0]).toEqual({
      companyId: '7',
      farmId: '3',
      ospId: 57,
      data: { certifier_name: 'Oregon Tilth Certified Organic' }
    });
  });

  it('offers no picker on a plan that is already with the certifier', () => {
    renderCard(
      osp({
        status: 'submitted',
        certifier_name: WSDA,
        packet_agent: { name: WSDA, slug: 'wsda', source: 'plan', own_numbering: true }
      }),
      true
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText(WSDA)).toBeTruthy();
  });
});
