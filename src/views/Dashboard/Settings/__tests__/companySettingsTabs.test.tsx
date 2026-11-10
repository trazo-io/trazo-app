/**
 * Company Settings, both tabs, as rows (2026-11-09).
 *
 * Team: the members table put the role and an actions menu in columns three and four, off
 * screen on a phone, and the menu's Edit and Delete did nothing (`onClick={() => {}}`; the API
 * has no endpoint for either). Members are now rows: name, farms, role. No control the page
 * cannot honour.
 *
 * Company information: four cards of icon + uppercase label fields became one card of label /
 * value rows, and it no longer prints the sign-up "sustainability goals" (retired by
 * recordkeeping review F-11 on 2026-10-07, still shown here as green leaf chips).
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import theme from '../../../../theme/styles';
import companyReducer, { setCompany } from '../../../../store/features/companySlice';
import SettingsView from '../index';
import CompanyInfoTab from '../CompanyInfoTab';
import { useGetCompanyMembersQuery } from 'store/api/companyApi';

vi.mock('store/api/companyApi', () => ({
  useGetCompanyMembersQuery: vi.fn(() => ({ data: [] })),
  useRotateCompanyCodeMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateCompanyMutation: vi.fn(() => [vi.fn(), { isLoading: false }])
}));
vi.mock('store/api/userApi', () => ({ useGetUserRolesQuery: vi.fn(() => ({ data: [] })) }));
vi.mock('store/api/invitationApi', () => ({
  useSendInvitationMutation: vi.fn(() => [vi.fn(), { isLoading: false }])
}));

const COMPANY = {
  id: 130,
  name: 'Brandt Family Farms LLC',
  tradename: 'Calapooia Bend Farm',
  contact_email: 'office@calapooiabend.example',
  industry: 'crop_production',
  primary_commodities: 'fruits_tree',
  legal_structure: 'llc',
  certifications: 'USDA Organic',
  is_active: true,
  subscription_plan: { name: 'Pilot' },
  invitation_code: 'V1F6WD',
  sustainability_metadata: {
    sustainability_goals: ['full_transparency', 'soil_health', 'biodiversity']
  }
};

const member = (user: string, role: string, farms: string[] = ['Calapooia Bend Farm']) => ({
  id: 130,
  user,
  role,
  establishments_in_charge: farms.map((name) => ({ name }))
});

const renderIn = (ui: React.ReactElement, locale: 'en-US' | 'es-419' = 'en-US') => {
  const store = configureStore({ reducer: { company: companyReducer } });
  store.dispatch(setCompany(COMPANY as never));
  return render(
    <ChakraProvider theme={theme}>
      <Provider store={store}>
        <IntlProvider
          locale={locale}
          messages={(locale === 'en-US' ? enUS : es419) as Record<string, string>}>
          {ui}
        </IntlProvider>
      </Provider>
    </ChakraProvider>
  );
};

describe('Settings > Team: members are rows', () => {
  it('shows name, farms and role on one row, with no table and no dead menu', () => {
    vi.mocked(useGetCompanyMembersQuery).mockReturnValue({
      data: [member('Laurel Brandt', 'Company Admin'), member('Ana Ruiz', 'Viewer', [])]
    } as never);
    renderIn(<SettingsView />);

    const rows = screen.getAllByTestId('member-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Laurel Brandt')).toBeTruthy();
    expect(within(rows[0]).getByText('Calapooia Bend Farm')).toBeTruthy();
    expect(within(rows[0]).getByText(enUS['app.administrator'])).toBeTruthy();
    expect(within(rows[1]).getByText(enUS['app.noEstablishmentsAssigned'])).toBeTruthy();
    expect(within(rows[1]).getByText(enUS['app.viewerRole'])).toBeTruthy();

    expect(screen.queryByRole('table')).toBeNull();
    // Edit and Delete did nothing; nothing on a row may offer them.
    for (const row of rows) expect(within(row).queryByRole('button')).toBeNull();
    expect(screen.getByText('2 members')).toBeTruthy();
  });

  it('offers search only once the team is long enough to need it', () => {
    vi.mocked(useGetCompanyMembersQuery).mockReturnValue({
      data: Array.from({ length: 8 }, (_, i) => member(`Person ${i}`, 'Viewer'))
    } as never);
    const { unmount } = renderIn(<SettingsView />);
    expect(screen.queryByPlaceholderText(enUS['settings.searchMembers'])).toBeNull();
    unmount();

    vi.mocked(useGetCompanyMembersQuery).mockReturnValue({
      data: Array.from({ length: 9 }, (_, i) => member(`Person ${i}`, 'Viewer'))
    } as never);
    renderIn(<SettingsView />);
    expect(screen.getByPlaceholderText(enUS['settings.searchMembers'])).toBeTruthy();
  });

  it('counts members in Spanish too', () => {
    vi.mocked(useGetCompanyMembersQuery).mockReturnValue({
      data: [member('Laurel Brandt', 'Company Admin')]
    } as never);
    renderIn(<SettingsView />, 'es-419');
    expect(screen.getByText('1 miembro')).toBeTruthy();
    expect(screen.getByText(es419['app.administrator'])).toBeTruthy();
  });
});

describe('Settings > Company information', () => {
  it('does not print the retired sign-up goals, even when they are stored (F-11)', () => {
    renderIn(<CompanyInfoTab />);
    expect(screen.getByText('Brandt Family Farms LLC')).toBeTruthy();
    for (const goal of [
      'Full Farming Transparency',
      'Soil Health Focus',
      'Biodiversity Protection',
      'full_transparency'
    ]) {
      expect(screen.queryByText(goal)).toBeNull();
    }
    expect(screen.queryByText(/sustainability goals/i)).toBeNull();
  });

  it('labels stored values instead of printing the slug or the other language', () => {
    renderIn(<CompanyInfoTab />);
    expect(screen.getByText(enUS['company.industry.crop_production'])).toBeTruthy();
    expect(screen.queryByText('crop_production')).toBeNull();
    expect(screen.getByText(enUS['company.commodity.fruits_tree'])).toBeTruthy();
    expect(screen.queryByText('Frutas de Árbol')).toBeNull();
    expect(screen.getByText('Calapooia Bend Farm · Pilot plan')).toBeTruthy();
  });

  it('prints the typed certifications as text, not as green chips', () => {
    renderIn(<CompanyInfoTab />);
    const cert = screen.getByText('USDA Organic');
    expect(cert.closest('.chakra-badge')).toBeNull();
    expect(document.querySelectorAll('.chakra-badge')).toHaveLength(0);
  });
});
