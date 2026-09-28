/**
 * The company join code panel on Settings > Team.
 *
 * A join code gives Viewer access to every farm, so the API now sends it to company admins
 * only (2026-09-28), and an admin can replace it when it has travelled further than intended.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';
import theme from '../../../../theme/styles';
import companyReducer, { setCompany } from '../../../../store/features/companySlice';
import SettingsView from '../index';
import { useRotateCompanyCodeMutation } from 'store/api/companyApi';

vi.mock('store/api/companyApi', () => ({
  useGetCompanyMembersQuery: vi.fn(() => ({ data: [] })),
  useRotateCompanyCodeMutation: vi.fn()
}));
vi.mock('store/api/userApi', () => ({ useGetUserRolesQuery: vi.fn(() => ({ data: [] })) }));
vi.mock('store/api/invitationApi', () => ({
  useSendInvitationMutation: vi.fn(() => [vi.fn(), { isLoading: false }])
}));
vi.mock('../memberRow', () => ({ default: () => null }));
vi.mock('../CompanyInfoTab', () => ({ default: () => null }));

const renderWithCompany = (company: Record<string, unknown>) => {
  const store = configureStore({ reducer: { company: companyReducer } });
  store.dispatch(setCompany(company as never));
  render(
    <ChakraProvider theme={theme}>
      <Provider store={store}>
        <IntlProvider locale="en-US" messages={enUS}>
          <SettingsView />
        </IntlProvider>
      </Provider>
    </ChakraProvider>
  );
  return store;
};

describe('Settings company join code', () => {
  const rotate = vi.fn();

  beforeEach(() => {
    rotate.mockReset();
    vi.mocked(useRotateCompanyCodeMutation).mockReturnValue([rotate, { isLoading: false }] as never);
  });

  it('tells a non-admin that only admins hold the code, and shows no code', () => {
    renderWithCompany({ id: 7, name: 'Loma Orchards', invitation_code: null, establishments: [] });
    expect(
      screen.getByText('Only company admins can see and share the join code.')
    ).toBeInTheDocument();
    expect(screen.queryByText('LOADING...')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate new code' })).not.toBeInTheDocument();
  });

  it('lets an admin replace the code and shows the new one', async () => {
    rotate.mockReturnValue({ unwrap: () => Promise.resolve({ invitation_code: 'NEW234' }) });
    const store = renderWithCompany({
      id: 7,
      name: 'Loma Orchards',
      invitation_code: 'OLD111',
      establishments: []
    });
    expect(screen.getByText('OLD111')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Generate new code' }));

    expect(rotate).toHaveBeenCalledWith({ companyId: 7 });
    await waitFor(() => expect(screen.getByText('NEW234')).toBeInTheDocument());
    expect(screen.queryByText('OLD111')).not.toBeInTheDocument();
    expect(store.getState().company.currentCompany.invitation_code).toBe('NEW234');
  });
});
