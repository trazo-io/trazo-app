/**
 * Saved applicators: the list that manages them (2026-11-12).
 *
 * A row per person (name, license, phone, address), with Edit and Remove for an administrator or
 * farm manager and nothing for a viewer, which is what the server enforces. Remove is a
 * deactivation: the row stays, marked, with Restore. Also: the Applicators tab on Company Settings,
 * and the copy in both locales. Pairs with trazo-back company/tests/test_applicators.py.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import theme from '../../../../theme/styles';
import companyReducer, { setCompany } from '../../../../store/features/companySlice';
import ApplicatorRegister from '../ApplicatorRegister';
import ApplicatorsPage from '../ApplicatorsPage';
import SettingsView from '../index';
import {
  useAddApplicatorMutation,
  useDeactivateApplicatorMutation,
  useGetApplicatorsQuery,
  useUpdateApplicatorMutation
} from 'store/api/applicatorApi';
import { useUserRole } from 'hooks/useUserRole';

vi.mock('store/api/applicatorApi', () => ({
  useGetApplicatorsQuery: vi.fn(),
  useAddApplicatorMutation: vi.fn(),
  useUpdateApplicatorMutation: vi.fn(),
  useDeactivateApplicatorMutation: vi.fn()
}));
vi.mock('hooks/useUserRole', () => ({ useUserRole: vi.fn() }));
vi.mock('store/api/companyApi', () => ({
  useGetCompanyMembersQuery: vi.fn(() => ({ data: [] })),
  useChangeCompanyMemberRoleMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useRemoveCompanyMemberMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useRotateCompanyCodeMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateCompanyMutation: vi.fn(() => [vi.fn(), { isLoading: false }])
}));
vi.mock('store/api/userApi', () => ({ useGetUserRolesQuery: vi.fn(() => ({ data: [] })) }));
vi.mock('store/api/invitationApi', () => ({
  useSendInvitationMutation: vi.fn(() => [vi.fn(), { isLoading: false }])
}));

const EN = enUS as Record<string, string>;
const ES = es419 as Record<string, string>;

const ROSA = {
  id: 7,
  full_name: 'Rosa Delgado',
  license_number: 'WA-58213',
  license_state: 'WA',
  address: '12 Orchard Lane, Wenatchee, WA 98801',
  phone: '509-555-0142',
  is_active: true,
  created_at: '2026-11-12T10:00:00Z',
  updated_at: '2026-11-12T10:00:00Z'
};
const BETO = { ...ROSA, id: 8, full_name: 'Beto Ruiz', license_number: '', is_active: false };

const mutation = () => {
  const call = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
  return call;
};

let add: ReturnType<typeof mutation>;
let update: ReturnType<typeof mutation>;
let deactivate: ReturnType<typeof mutation>;

const listReturns = (data: unknown[] | undefined, extra: Record<string, unknown> = {}) =>
  vi.mocked(useGetApplicatorsQuery).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra
  } as unknown as ReturnType<typeof useGetApplicatorsQuery>);

const roleIs = (canWrite: boolean) =>
  vi.mocked(useUserRole).mockReturnValue({
    canWrite,
    isAdmin: canWrite,
    isManager: false,
    isViewer: !canWrite,
    canManageCompany: canWrite,
    isSetupOperator: false,
    role: canWrite ? 'Company Admin' : 'Viewer'
  } as ReturnType<typeof useUserRole>);

const renderIn = (ui: React.ReactElement, locale: 'en-US' | 'es-419' = 'en-US') => {
  const store = configureStore({ reducer: { company: companyReducer } });
  store.dispatch(setCompany({ id: 1, name: 'Fictional Bench Orchards' } as never));
  return render(
    <ChakraProvider theme={theme}>
      <Provider store={store}>
        <MemoryRouter>
          <IntlProvider
            locale={locale}
            messages={(locale === 'en-US' ? EN : ES) as Record<string, string>}>
            {ui}
          </IntlProvider>
        </MemoryRouter>
      </Provider>
    </ChakraProvider>
  );
};

const rows = () => screen.queryAllByTestId('applicator-row');
const input = (name: string) =>
  document.querySelector(`[data-testid="applicator-form"] [name="${name}"]`) as HTMLInputElement;

beforeEach(() => {
  add = mutation();
  update = mutation();
  deactivate = mutation();
  vi.mocked(useAddApplicatorMutation).mockReturnValue([add, { isLoading: false }] as never);
  vi.mocked(useUpdateApplicatorMutation).mockReturnValue([update, { isLoading: false }] as never);
  vi.mocked(useDeactivateApplicatorMutation).mockReturnValue([
    deactivate,
    { isLoading: false }
  ] as never);
  roleIs(true);
});
afterEach(cleanup);

describe('the list', () => {
  it('shows each person as a row, a removed one marked and still listed', () => {
    listReturns([ROSA, BETO]);
    renderIn(<ApplicatorRegister />);
    expect(rows()).toHaveLength(2);
    const rosa = rows()[0];
    expect(rosa.textContent).toContain('Rosa Delgado');
    expect(rosa.textContent).toContain('License WA-58213 (WA)');
    expect(rosa.textContent).toContain('509-555-0142');
    expect(rosa.textContent).toContain(ROSA.address);
    expect(rosa.textContent).not.toContain(EN['settings.applicators.removed']);
    const beto = rows()[1];
    expect(beto.textContent).toContain(EN['settings.applicators.removed']);
    expect(beto.textContent).toContain(EN['settings.applicators.noLicense']);
  });

  it('asks for every saved applicator of the current company, removed ones included', () => {
    listReturns([ROSA]);
    renderIn(<ApplicatorRegister />);
    expect(vi.mocked(useGetApplicatorsQuery).mock.calls[0][0]).toEqual({ companyId: 1 });
  });

  it('says the list is empty only once it has answered', () => {
    listReturns(undefined, { isLoading: true });
    renderIn(<ApplicatorRegister />);
    expect(screen.queryByTestId('applicators-empty')).toBeNull();
    cleanup();
    listReturns([]);
    renderIn(<ApplicatorRegister />);
    expect(screen.getByTestId('applicators-empty').textContent).toBe(
      EN['settings.applicators.empty']
    );
  });

  it('a failed load is not an empty list', () => {
    listReturns(undefined, { isError: true });
    renderIn(<ApplicatorRegister />);
    expect(screen.queryByTestId('applicators-empty')).toBeNull();
    expect(screen.getByText(EN['settings.applicators.loadFailed'])).toBeTruthy();
  });

  it('a viewer reads the list and is offered no control', () => {
    roleIs(false);
    listReturns([ROSA, BETO]);
    renderIn(<ApplicatorRegister />);
    expect(rows()).toHaveLength(2);
    expect(screen.queryByText(EN['settings.applicators.add'])).toBeNull();
    expect(screen.queryByText(EN['settings.applicators.edit'])).toBeNull();
    expect(screen.queryByText(EN['settings.applicators.remove'])).toBeNull();
    expect(screen.queryByText(EN['settings.applicators.restore'])).toBeNull();
  });
});

describe('add, edit, remove', () => {
  it('adds an applicator with what was typed', async () => {
    listReturns([]);
    renderIn(<ApplicatorRegister />);
    fireEvent.click(screen.getByText(EN['settings.applicators.add']));
    fireEvent.change(input('full_name'), { target: { value: 'Rosa Delgado' } });
    fireEvent.change(input('license_number'), { target: { value: 'WA-58213' } });
    fireEvent.change(input('license_state'), { target: { value: 'WA' } });
    fireEvent.change(input('address'), { target: { value: ROSA.address } });
    fireEvent.change(input('phone'), { target: { value: ROSA.phone } });
    fireEvent.click(screen.getByText(EN['settings.applicators.save']));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add).toHaveBeenCalledWith({
      companyId: 1,
      data: {
        full_name: 'Rosa Delgado',
        license_number: 'WA-58213',
        license_state: 'WA',
        address: ROSA.address,
        phone: ROSA.phone
      }
    });
    await waitFor(() => expect(screen.queryByTestId('applicator-form')).toBeNull());
  });

  it('will not save without a name', () => {
    listReturns([]);
    renderIn(<ApplicatorRegister />);
    fireEvent.click(screen.getByText(EN['settings.applicators.add']));
    fireEvent.change(input('phone'), { target: { value: ROSA.phone } });
    const save = screen.getByText(EN['settings.applicators.save']).closest('button')!;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(add).not.toHaveBeenCalled();
  });

  it('edits a row in place, starting from its saved values', async () => {
    listReturns([ROSA]);
    renderIn(<ApplicatorRegister />);
    fireEvent.click(screen.getByLabelText('Edit Rosa Delgado'));
    expect(input('full_name').value).toBe('Rosa Delgado');
    expect(input('license_state').value).toBe('WA');
    fireEvent.change(input('phone'), { target: { value: '509-555-0100' } });
    fireEvent.click(screen.getByText(EN['settings.applicators.save']));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith({
      companyId: 1,
      applicatorId: ROSA.id,
      data: {
        full_name: 'Rosa Delgado',
        license_number: 'WA-58213',
        license_state: 'WA',
        address: ROSA.address,
        phone: '509-555-0100'
      }
    });
  });

  it('remove deactivates, and restore turns the person back on', async () => {
    listReturns([ROSA, BETO]);
    renderIn(<ApplicatorRegister />);
    fireEvent.click(within(rows()[0]).getByText(EN['settings.applicators.remove']));
    await waitFor(() =>
      expect(deactivate).toHaveBeenCalledWith({ companyId: 1, applicatorId: ROSA.id })
    );
    fireEvent.click(within(rows()[1]).getByText(EN['settings.applicators.restore']));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        companyId: 1,
        applicatorId: BETO.id,
        data: { is_active: true }
      })
    );
  });
});

describe('where the list lives', () => {
  it('Company Settings has an Applicators tab beside Team', () => {
    listReturns([ROSA]);
    renderIn(<SettingsView />);
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs[0]).toContain(EN['app.team']);
    expect(tabs[1]).toContain(EN['settings.applicators.title']);
    expect(rows()).toHaveLength(0);
    fireEvent.click(
      screen.getByRole('tab', { name: new RegExp(EN['settings.applicators.title']) })
    );
    expect(rows()).toHaveLength(1);
  });

  it('the page the spray form links to renders the same list for any member', () => {
    roleIs(false);
    listReturns([ROSA]);
    renderIn(<ApplicatorsPage />);
    expect(rows()).toHaveLength(1);
  });
});

describe('the copy', () => {
  const KEYS = Object.keys(EN).filter(
    (key) =>
      key.startsWith('settings.applicators.') || key.startsWith('events.chemical.applicatorPicker.')
  );

  it('every key is in both locales', () => {
    expect(KEYS.length).toBeGreaterThanOrEqual(30);
    for (const key of KEYS) {
      expect(ES[key], key).toBeTruthy();
    }
  });

  it('Spanish is neutral tuteo, says empresa, and no string carries an em dash', () => {
    const emDash = String.fromCharCode(0x2014);
    for (const key of KEYS) {
      expect(ES[key], key).not.toMatch(/\b(usted|su|sus|vos)\b/i);
      expect(ES[key], key).not.toMatch(/compañía|granja/i);
      expect(EN[key], key).not.toContain(emDash);
      expect(ES[key], key).not.toContain(emDash);
    }
  });

  it('renders in Spanish', () => {
    listReturns([ROSA]);
    renderIn(<ApplicatorRegister />, 'es-419');
    expect(screen.getByText('Aplicadores')).toBeTruthy();
    expect(screen.getByText('Agregar aplicador')).toBeTruthy();
  });
});
