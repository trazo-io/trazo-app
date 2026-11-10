/**
 * Settings > Team: a company admin removes a member or changes their role (2026-11-10).
 *
 * The API (trazo-back `PATCH|DELETE /companies/<id>/members/<membership_id>/`) says per row
 * whether the caller may do either (`can_manage`). A row renders the role select and Remove only
 * then; everywhere else the role stays text, so the page offers no control the server refuses.
 * Removal goes through a confirm step that names the person and what happens.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import theme from '../../../../theme/styles';
import companyReducer, { setCompany } from '../../../../store/features/companySlice';
import SettingsView from '../index';
import {
  useChangeCompanyMemberRoleMutation,
  useGetCompanyMembersQuery,
  useRemoveCompanyMemberMutation
} from 'store/api/companyApi';

vi.mock('store/api/companyApi', () => ({
  useGetCompanyMembersQuery: vi.fn(() => ({ data: [] })),
  useChangeCompanyMemberRoleMutation: vi.fn(),
  useRemoveCompanyMemberMutation: vi.fn(),
  useRotateCompanyCodeMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateCompanyMutation: vi.fn(() => [vi.fn(), { isLoading: false }])
}));
vi.mock('store/api/userApi', () => ({
  useGetUserRolesQuery: vi.fn(() => ({
    data: [
      { id: 'CA', name: 'Company Admin' },
      { id: 'FM', name: 'Farm Manager' },
      { id: 'VW', name: 'Viewer' }
    ]
  }))
}));
vi.mock('store/api/invitationApi', () => ({
  useSendInvitationMutation: vi.fn(() => [vi.fn(), { isLoading: false }])
}));

const COMPANY = { id: 130, name: 'Brandt Family Farms LLC', invitation_code: 'V1F6WD' };

const member = (
  membershipId: number,
  user: string,
  roleCode: 'CA' | 'FM' | 'VW',
  extra: Record<string, unknown> = {}
) => ({
  id: 130,
  membership_id: membershipId,
  user,
  role: { CA: 'Company Admin', FM: 'Farm Manager', VW: 'Viewer' }[roleCode],
  role_code: roleCode,
  is_you: false,
  is_setup_operator: false,
  can_manage: true,
  establishments_in_charge: [{ name: 'Calapooia Bend Farm' }],
  ...extra
});

const TEAM = [
  member(1, 'Laurel Brandt', 'CA', { is_you: true, can_manage: false }),
  member(2, 'Ana Ruiz', 'FM'),
  member(3, 'Oscar Munoz (Trazo setup)', 'CA', { is_setup_operator: true, can_manage: false })
];

const unwrapping = (impl: () => Promise<unknown>) => vi.fn(() => ({ unwrap: impl }));

let remove: ReturnType<typeof unwrapping>;
let changeRole: ReturnType<typeof unwrapping>;

const renderIn = (locale: 'en-US' | 'es-419' = 'en-US') => {
  const store = configureStore({ reducer: { company: companyReducer } });
  store.dispatch(setCompany(COMPANY as never));
  return render(
    <ChakraProvider theme={theme}>
      <Provider store={store}>
        <IntlProvider
          locale={locale}
          messages={(locale === 'en-US' ? enUS : es419) as Record<string, string>}>
          <SettingsView />
        </IntlProvider>
      </Provider>
    </ChakraProvider>
  );
};

beforeEach(() => {
  remove = unwrapping(() => Promise.resolve(undefined));
  changeRole = unwrapping(() => Promise.resolve({}));
  vi.mocked(useRemoveCompanyMemberMutation).mockReturnValue([
    remove,
    { isLoading: false }
  ] as never);
  vi.mocked(useChangeCompanyMemberRoleMutation).mockReturnValue([
    changeRole,
    { isLoading: false }
  ] as never);
  vi.mocked(useGetCompanyMembersQuery).mockReturnValue({ data: TEAM } as never);
});

describe('Settings > Team: controls only where the API honours them', () => {
  it('gives a manageable row a role select and Remove, and the others plain text', () => {
    renderIn();
    const [you, ana, operator] = screen.getAllByTestId('member-row');

    expect(within(ana).getByRole('combobox', { name: 'Role for Ana Ruiz' })).toBeTruthy();
    expect(within(ana).getByRole('button', { name: 'Remove Ana Ruiz from the team' })).toBeTruthy();

    // Your own row and the setup operator's: no control, the role as text, and why.
    for (const row of [you, operator]) {
      expect(within(row).queryByRole('button')).toBeNull();
      expect(within(row).queryByRole('combobox')).toBeNull();
      expect(within(row).getByText(enUS['app.administrator'])).toBeTruthy();
    }
    expect(within(you).getByText(enUS['settings.team.you'], { exact: false })).toBeTruthy();
    expect(within(operator).getByText(enUS['settings.team.setupOperator'])).toBeTruthy();
  });

  it('renders no control at all for a caller who may manage nobody', () => {
    vi.mocked(useGetCompanyMembersQuery).mockReturnValue({
      data: TEAM.map((m) => ({ ...m, can_manage: false }))
    } as never);
    renderIn();
    for (const row of screen.getAllByTestId('member-row')) {
      expect(within(row).queryByRole('button')).toBeNull();
      expect(within(row).queryByRole('combobox')).toBeNull();
    }
  });
});

describe('Settings > Team: removing someone', () => {
  it('asks first, naming the person and the consequence, and sends nothing until confirmed', async () => {
    renderIn();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ana Ruiz from the team' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Remove Ana Ruiz from the team?')).toBeTruthy();
    expect(
      within(dialog).getByText(
        'Ana Ruiz loses access to Brandt Family Farms LLC and its farms right away. The records they logged stay, under their name. To bring them back, send a new invitation.'
      )
    ).toBeTruthy();
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove from team' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith({ companyId: 130, membershipId: 2 }));
    expect(await screen.findByText('Ana Ruiz is no longer on the team')).toBeTruthy();
  });

  it('Cancel closes the step without removing anyone', async () => {
    renderIn();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ana Ruiz from the team' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(remove).not.toHaveBeenCalled();
  });

  it("words the server's refusal in the reader's language", async () => {
    remove = unwrapping(() => Promise.reject({ status: 400, data: { code: 'last_admin' } }));
    vi.mocked(useRemoveCompanyMemberMutation).mockReturnValue([
      remove,
      { isLoading: false }
    ] as never);
    renderIn('es-419');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar a Ana Ruiz del equipo' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('¿Quitar a Ana Ruiz del equipo?')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar del equipo' }));
    expect(await screen.findByText(es419['settings.team.error.lastAdmin'])).toBeTruthy();
  });
});

describe('Settings > Team: changing a role', () => {
  it('sends the new role for that membership and says what changed', async () => {
    renderIn();
    fireEvent.change(screen.getByRole('combobox', { name: 'Role for Ana Ruiz' }), {
      target: { value: 'VW' }
    });
    await waitFor(() =>
      expect(changeRole).toHaveBeenCalledWith({ companyId: 130, membershipId: 2, role: 'VW' })
    );
    expect(await screen.findByText('Ana Ruiz is now Viewer')).toBeTruthy();
  });
});

describe('Settings > Team: review of #352', () => {
  it('keeps each row disabled until its own role change settles', async () => {
    const settle: Record<number, () => void> = {};
    changeRole = vi.fn(({ membershipId }: { membershipId: number }) => ({
      unwrap: () => new Promise((resolve) => (settle[membershipId] = () => resolve({})))
    })) as never;
    vi.mocked(useChangeCompanyMemberRoleMutation).mockReturnValue([
      changeRole,
      { isLoading: false }
    ] as never);
    vi.mocked(useGetCompanyMembersQuery).mockReturnValue({
      data: [...TEAM, member(4, 'Tomás Herrera', 'VW')]
    } as never);
    renderIn();
    const ana = () => screen.getByRole('combobox', { name: 'Role for Ana Ruiz' });
    const tomas = () => screen.getByRole('combobox', { name: 'Role for Tomás Herrera' });

    fireEvent.change(ana(), { target: { value: 'VW' } });
    await waitFor(() => expect((ana() as HTMLSelectElement).disabled).toBe(true));
    fireEvent.change(tomas(), { target: { value: 'FM' } });
    await waitFor(() => expect((tomas() as HTMLSelectElement).disabled).toBe(true));
    // Starting Tomás's change must not re-enable Ana's row, and Tomás settling first must not
    // re-enable it either.
    expect((ana() as HTMLSelectElement).disabled).toBe(true);
    settle[4]();
    await waitFor(() => expect((tomas() as HTMLSelectElement).disabled).toBe(false));
    expect((ana() as HTMLSelectElement).disabled).toBe(true);
    settle[2]();
    await waitFor(() => expect((ana() as HTMLSelectElement).disabled).toBe(false));
  });

  it('never shows a refusal code it does not know as text', async () => {
    remove = unwrapping(() => Promise.reject({ status: 400, data: { code: 'some_new_rule' } }));
    vi.mocked(useRemoveCompanyMemberMutation).mockReturnValue([
      remove,
      { isLoading: false }
    ] as never);
    renderIn();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ana Ruiz from the team' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove from team' }));
    expect(await screen.findByText(enUS['settings.team.error.generic'])).toBeTruthy();
    expect(screen.queryByText(/some_new_rule/)).toBeNull();
  });

  it('cannot be cancelled once the removal is sent', async () => {
    vi.mocked(useRemoveCompanyMemberMutation).mockReturnValue([
      remove,
      { isLoading: true }
    ] as never);
    renderIn();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ana Ruiz from the team' }));
    const dialog = await screen.findByRole('alertdialog');
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('still offers Remove while the roles catalogue is missing', async () => {
    const { useGetUserRolesQuery } = await import('store/api/userApi');
    vi.mocked(useGetUserRolesQuery).mockReturnValueOnce({ data: undefined } as never);
    renderIn();
    const ana = screen.getAllByTestId('member-row')[1];
    expect(within(ana).queryByRole('combobox')).toBeNull();
    expect(within(ana).getByText(enUS['app.farmManager'])).toBeTruthy();
    expect(within(ana).getByRole('button', { name: 'Remove Ana Ruiz from the team' })).toBeTruthy();
  });
});
