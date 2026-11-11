/**
 * Overall review 2026-11, OV-PK-O01: "Mark all unchanged" let a grower sign an update attesting a
 * section unchanged while the two plan versions differ in it, and the packet's 02s then printed the
 * contradiction. The server now refuses to sign or file such an update, naming each section and
 * what differs (`annual_update_filing.attested_sections_that_differ`). Pinned here: the refusal
 * reaches the grower on the card, section by section, in their language, and stays until the panel
 * closes; it is never a toast reading "[object Object]".
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import esLA from 'i18n/lang/es-419.json';

const refusal = (action: 'sign') => ({
  status: 400,
  data: {
    error: 'Not signed. This update says these sections are unchanged since plan v1, ...',
    detail: 'Not signed. This update says these sections are unchanged since plan v1, ...',
    code: 'attested_unchanged_but_differs',
    action,
    prior_osp_version: 1,
    new_osp_version: 3,
    sections: [
      {
        section: 'recordkeeping_description',
        clause: '(a)(4)',
        label: 'Recordkeeping System',
        differs: ['narrative'],
        modules: []
      },
      {
        section: 'commingling_barriers',
        clause: '(a)(5)',
        label: 'Commingling Prevention',
        differs: ['answers'],
        modules: [
          {
            key: 'g6_0_production',
            code: 'G6.0',
            title: {
              en: 'Organic Production & Split Operations',
              es: 'Producción orgánica y operaciones divididas'
            }
          }
        ]
      }
    ]
  }
});

const rejecting = (action: 'sign') =>
  vi.fn(() => ({ unwrap: () => Promise.reject(refusal(action)) }));
const signUpdate = rejecting('sign');
// Filing is never refused over the attestation (it records what was sent).
const fileUpdate = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

const base = {
  additions: [],
  deletions: [],
  prior_osp: 59,
  prior_osp_version: 1,
  new_osp_version: 3
};
const draft = {
  ...base,
  id: 1,
  reporting_year: 2027,
  revision_number: 1,
  changes_summary: 'Draft row.',
  signed_at: null,
  submitted_at: null,
  is_locked: false,
  sections_unchanged_attestation: { recordkeeping_description: true, commingling_barriers: true }
};
const signed = {
  ...base,
  id: 2,
  reporting_year: 2026,
  revision_number: 2,
  changes_summary: 'Signed row.',
  signed_at: '2026-10-01T10:00:00Z',
  submitted_at: null,
  is_locked: true
};

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [draft, signed] }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [signUpdate, { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [fileUpdate, { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useGetCompanyDetailsReviewQuery: () => ({ data: undefined, isLoading: false }),
  useConfirmCompanyDetailsMutation: () => [vi.fn(), { isLoading: false }],
  FILING_METHODS: ['agent_web_form', 'agent_portal', 'email', 'mail', 'in_person']
}));

import OSPAnnualUpdateCard, { attestationRefusal } from '../OSPAnnualUpdateCard';

const renderCard = (locale = 'en-US', messages: Record<string, string> = enUS) =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={messages}>
        <OSPAnnualUpdateCard
          companyId="1"
          farmId="2"
          planOnFile={{ id: 59, version_number: 1, status: 'active' } as any}
          currentYear={2027}
        />
      </IntlProvider>
    </ChakraProvider>
  );

const row = (text: RegExp) =>
  screen.getByText(text).closest('div[class]')!.parentElement!.parentElement!;

describe('an update attesting a changed section unchanged is refused, and the card says why', () => {
  it('names each section and what differs when signing is refused', async () => {
    renderCard();
    fireEvent.click(within(row(/Draft row\./)).getByRole('button', { name: 'Sign' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign this update' }));
    const box = await screen.findByTestId('annual-attestation-refusal');
    expect(signUpdate).toHaveBeenCalledTimes(1);
    expect(box).toHaveTextContent(
      'Not signed: this update says 2 sections are unchanged since plan v1, but plan v3 differs there.'
    );
    expect(box).toHaveTextContent('§ 205.201(a)(4) Recordkeeping: your own narrative');
    expect(box).toHaveTextContent(
      '§ 205.201(a)(5) Commingling barriers: answers in G6.0 Organic Production & Split Operations'
    );
    expect(box).toHaveTextContent(
      'Edit the update, untick those sections and describe the change in the summary, then sign.'
    );
    expect(document.body.textContent).not.toContain('[object Object]');
    // It stays until the panel closes.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('annual-attestation-refusal')).toBeNull());
  });

  it('speaks Spanish', async () => {
    renderCard('es-419', esLA);
    fireEvent.click(within(row(/Draft row\./)).getByRole('button', { name: 'Firmar' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: (esLA as Record<string, string>)['osp.annual.confirm.sign']
      })
    );
    const box = await screen.findByTestId('annual-attestation-refusal');
    expect(box).toHaveTextContent(
      'No se firmó: esta actualización dice que 2 secciones no cambiaron desde el plan v1'
    );
    expect(box).toHaveTextContent('respuestas en G6.0 Producción orgánica y operaciones divididas');
  });

  it('reads only its own refusal', () => {
    expect(
      attestationRefusal({ status: 409, data: { error: 'Locked', detail: 'Locked' } })
    ).toBeNull();
    expect(attestationRefusal(refusal('sign'))?.sections.length).toBe(2);
  });
});
