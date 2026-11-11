/**
 * The login email changes only with the password and a link (overall review 2026-11, OV-SEC-C03).
 *
 * The profile's email was an ordinary field: one Save moved the account to another mailbox with
 * no password and no notice. Now the field is read-only, "Change email" asks for the new address
 * and the password, and the change applies from the page the link opens, by a click (a mail
 * scanner that fetches the link must not change anyone's login).
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import enUS from '../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../i18n/lang/es-419.json';
import theme from '../../../../../theme/styles';
import ChangeEmailModal from '../ChangeEmailModal';
import ConfirmEmailChange from '../../../../Authentication/ConfirmEmailChange';
import { useConfirmEmailChangeMutation, useRequestEmailChangeMutation } from 'store/api/userApi';

const dispatch = vi.fn();
vi.mock('react-redux', () => ({ useDispatch: () => dispatch }));
vi.mock('store/api/userApi', () => ({
  useRequestEmailChangeMutation: vi.fn(),
  useConfirmEmailChangeMutation: vi.fn()
}));

const EN = enUS as Record<string, string>;
const ES = es419 as Record<string, string>;
const SRC = join(__dirname, '../../../../..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

const wrap = (ui: React.ReactElement, locale: 'en-US' | 'es-419' = 'en-US', path = '/') =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={locale === 'en-US' ? EN : ES}>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

const mutation = (impl: (...args: unknown[]) => Promise<unknown>) => {
  const trigger = vi.fn((...args: unknown[]) => ({ unwrap: () => impl(...args) }));
  return trigger;
};

describe('the profile cannot save a new login email', () => {
  it('shows the email read-only, with Change email beside it', () => {
    const profile = read('views/Dashboard/Dashboard/User/ProfileUser.tsx');
    expect(profile).toMatch(/<StandardInput type="email" isReadOnly \{\.\.\.register\('email'\)\}/);
    expect(profile).toContain('<ChangeEmailModal');
  });
});

describe('Change email', () => {
  beforeEach(() => dispatch.mockReset());

  const fill = async (email: string, password: string) => {
    const inputs = document.querySelectorAll('input');
    await userEvent.type(inputs[0] as HTMLElement, email);
    await userEvent.type(inputs[1] as HTMLElement, password);
  };

  it('sends the new address and the password, then says where the link went', async () => {
    const trigger = mutation(async () => ({ pending_email: 'laurel@newfarm.example' }));
    vi.mocked(useRequestEmailChangeMutation).mockReturnValue([
      trigger,
      { isLoading: false }
    ] as never);
    wrap(<ChangeEmailModal isOpen onClose={vi.fn()} currentEmail="grower@calapooia.example" />);
    await fill('laurel@newfarm.example', 'Blueberry#2026x');
    await userEvent.click(screen.getByRole('button', { name: EN['account.email.submit'] }));
    expect(trigger).toHaveBeenCalledWith({
      newEmail: 'laurel@newfarm.example',
      password: 'Blueberry#2026x'
    });
    expect((await screen.findByTestId('email-change-sent')).textContent).toContain(
      'laurel@newfarm.example'
    );
  });

  it('puts a wrong password on the password field, in the reader’s language', async () => {
    const trigger = mutation(async () => {
      throw { data: { code: 'wrong_password', error: 'That is not your current password.' } };
    });
    vi.mocked(useRequestEmailChangeMutation).mockReturnValue([
      trigger,
      { isLoading: false }
    ] as never);
    wrap(
      <ChangeEmailModal isOpen onClose={vi.fn()} currentEmail="grower@calapooia.example" />,
      'es-419'
    );
    await fill('laurel@newfarm.example', 'nope');
    await userEvent.click(screen.getByRole('button', { name: ES['account.email.submit'] }));
    expect(await screen.findByText(ES['account.email.error.wrongPassword'])).toBeTruthy();
  });
});

describe('the page the link opens', () => {
  beforeEach(() => dispatch.mockReset());

  it('changes nothing until the person presses Confirm', async () => {
    const trigger = mutation(async () => ({ email: 'laurel@newfarm.example' }));
    vi.mocked(useConfirmEmailChangeMutation).mockReturnValue([
      trigger,
      { isLoading: false }
    ] as never);
    wrap(<ConfirmEmailChange />, 'en-US', '/auth/confirm-email-change?token=abc123');
    expect(trigger).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: EN['account.email.confirm.submit'] }));
    expect(trigger).toHaveBeenCalledWith({ token: 'abc123' });
    expect((await screen.findByTestId('email-change-done')).textContent).toContain(
      'laurel@newfarm.example'
    );
    // Every session just ended; this browser's sign-in is dropped too.
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
  });

  it('says plainly when the link no longer works', async () => {
    const trigger = mutation(async () => {
      throw { data: { code: 'invalid_link' } };
    });
    vi.mocked(useConfirmEmailChangeMutation).mockReturnValue([
      trigger,
      { isLoading: false }
    ] as never);
    wrap(<ConfirmEmailChange />, 'en-US', '/auth/confirm-email-change?token=old');
    await userEvent.click(screen.getByRole('button', { name: EN['account.email.confirm.submit'] }));
    expect(await screen.findByTestId('email-change-invalid')).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('is routed outside the signed-out-only routes, so a signed-in browser can open it', () => {
    const app = read('App.tsx');
    const route = app.indexOf('path="/auth/confirm-email-change"');
    expect(route).toBeGreaterThan(-1);
    expect(route).toBeLessThan(app.indexOf('<Route element={<CheckAuth />}>'));
  });
});
