/**
 * Accepting an invitation never strands a company (overall review 2026-11, OV-SEC-C11).
 *
 * Accepting moves the invitee out of every other company. The page warned about a transfer in
 * hardcoded English and never said that a sole Company Admin leaves their old company with records
 * and nobody to manage them; the server let it happen. The server now refuses that case (409) and
 * tells the signed-in invitee beforehand (`transfer`). The page names what is left, in English and
 * Spanish, and holds the Accept button when the invitee is the only admin.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';
import esES from '../../../../i18n/lang/es-419.json';

let details: Record<string, unknown> = {};

vi.mock('store/api/invitationApi', () => ({
  useAcceptInvitationMutation: () => [vi.fn(), { isLoading: false }],
  useGetInvitationDetailsQuery: () => ({ data: details, error: undefined, isLoading: false })
}));

vi.mock('react-redux', () => ({
  useSelector: (pick: (state: any) => unknown) =>
    pick({
      auth: { isAuthenticated: true },
      userState: {
        user: { email: 'grower@test.com', companies: [{ id: 8, name: 'Home Orchard' }] }
      }
    })
}));

vi.mock('components/Footer/AuthFooter', () => ({ default: () => null }));

import AcceptInvitation from '../AcceptInvitation';

const base = {
  invitation_code: 'ABC123',
  company_name: 'Advisor Co',
  role: 'Viewer',
  inviter_name: 'Ana Advisor',
  expires_at: '2026-11-25T00:00:00Z',
  invitation_message: ''
};

const page = (locale: 'en-US' | 'es-419' = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enUS : esES) as Record<string, string>}
        onError={() => undefined}>
        <MemoryRouter initialEntries={['/invitation/ABC123']}>
          <Routes>
            <Route path="/invitation/:invitationCode" element={<AcceptInvitation />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

const acceptButton = () => screen.getByRole('button', { name: /Accept Invitation/ });

describe('accepting an invitation as the only company admin', () => {
  it('says the company would be left with no one to manage it, and holds the button', () => {
    details = { ...base, transfer: { leaves: ['Home Orchard'], sole_admin_of: ['Home Orchard'] } };
    page();
    expect(screen.getByTestId('invitation-sole-admin').textContent).toBe(
      'You are the only company admin of Home Orchard. Accepting would leave its records with no one who can manage them. Make another member company admin there, or close that company, before you accept.'
    );
    expect((acceptButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('names the company being left when the invitee is not the only admin', () => {
    details = { ...base, transfer: { leaves: ['Home Orchard'], sole_admin_of: [] } };
    page();
    expect(screen.getByTestId('invitation-transfer').textContent).toContain(
      'Accepting moves you to Advisor Co. You leave Home Orchard and lose access to its records'
    );
    expect(screen.queryByTestId('invitation-sole-admin')).toBeNull();
    expect((acceptButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('speaks of several companies in the plural', () => {
    details = {
      ...base,
      transfer: {
        leaves: ['Home Orchard', 'River Block'],
        sole_admin_of: ['Home Orchard', 'River Block']
      }
    };
    page();
    const text = screen.getByTestId('invitation-sole-admin').textContent || '';
    expect(text).toContain('only company admin of Home Orchard, River Block');
    expect(text).toContain('would leave their records');
    expect(text).toContain('close those companies');
  });

  it('says it in Spanish', () => {
    details = { ...base, transfer: { leaves: ['Home Orchard'], sole_admin_of: ['Home Orchard'] } };
    page('es-419');
    expect(screen.getByText('Cambio de empresa')).toBeTruthy();
    expect(screen.getByTestId('invitation-sole-admin').textContent).toContain(
      'Eres el único administrador de la empresa en Home Orchard'
    );
  });
});
