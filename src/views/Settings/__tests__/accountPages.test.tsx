/**
 * Your own account pages: the profile and Change password (2026-11-10).
 *
 * - Change password sat behind AdminGuard, so a Farm Manager or Viewer who pressed "Change
 *   password" on their own profile got "Access restricted". The API acts on request.user only.
 * - The page and its form were English literals, so they stayed English in Spanish; the tips box
 *   promised two-factor sign-in, which Trazo does not have.
 * - A wrong current password came back as the API's English sentence in a toast; it now lands on
 *   the field, in the reader's language.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import theme from '../../../theme/styles';
import { ChangePasswordForm } from '../../../components/Forms/ChangePasswordForm';
import { useChangePasswordMutation } from '../../../store/api/authApi';

vi.mock('../../../store/api/authApi', () => ({ useChangePasswordMutation: vi.fn() }));

const SRC = join(__dirname, '../../..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const EN = enUS as Record<string, string>;
const ES = es419 as Record<string, string>;

const renderForm = (locale: 'en-US' | 'es-419', change = vi.fn()) => {
  vi.mocked(useChangePasswordMutation).mockReturnValue([change, { isLoading: false }] as never);
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={locale === 'en-US' ? EN : ES}>
        <MemoryRouter>
          <ChangePasswordForm userType="producer" />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
  return change;
};

describe('Change password: anyone may change their own', () => {
  it('the route is not behind AdminGuard', () => {
    const app = read('App.tsx');
    const route = app.match(/<Route\s+path="settings\/change-password"[\s\S]*?\/>/)?.[0] ?? '';
    expect(route, 'the change-password route moved').not.toBe('');
    expect(route).not.toContain('AdminGuard');
  });

  it('the page is the form: no tips box, no two-factor promise, no literals', () => {
    const page = read('views/Settings/ChangePassword.tsx').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(page).not.toMatch(/two-factor|Security Tips|Security Settings/i);
    expect(page).not.toMatch(/(title|description)="[^"]+"/);
    expect(page).toContain("'account.backToProfile'");
    expect(page).not.toContain('navigate(-1)');
  });
});

describe('Change password form speaks the reader’s language', () => {
  it('renders Spanish for es-419, with no English left', () => {
    renderForm('es-419');
    expect(screen.getByText(ES['account.password.current'])).toBeTruthy();
    expect(screen.getByText(ES['account.password.new'])).toBeTruthy();
    expect(screen.getByRole('button', { name: ES['account.password.submit'] })).toBeTruthy();
    expect(
      screen.queryByText(/Current Password|New Password|Change Password|Password Requirements/)
    ).toBeNull();
  });

  it('holds no English literals in its source', () => {
    const form = read('components/Forms/ChangePasswordForm.tsx').replace(
      /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
      ''
    );
    expect(form).not.toMatch(
      /(label|placeholder|title|subtitle|helpText|loadingText|message)[=:]\s*['"][A-Z]/
    );
    expect(form).not.toMatch(/>\s*[A-Z][a-z]+( [a-zA-Z]+)+:?\s*</);
  });

  it('puts a wrong current password on the field, translated', async () => {
    const change = vi.fn(() => ({
      unwrap: () => Promise.reject({ data: { error: 'Current password is incorrect' } })
    }));
    renderForm('es-419', change);
    const inputs = document.querySelectorAll('input[type="password"]');
    await userEvent.type(inputs[0] as HTMLElement, 'old-one');
    await userEvent.type(inputs[1] as HTMLElement, 'Blueberry#2026');
    await userEvent.type(inputs[2] as HTMLElement, 'Blueberry#2026');
    await userEvent.click(screen.getByRole('button', { name: ES['account.password.submit'] }));
    await waitFor(() => expect(change).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(ES['account.password.wrongCurrent'])).toBeTruthy();
    expect(screen.queryByText('Current password is incorrect')).toBeNull();
  });

  it('says so in the reader’s language when the two new passwords differ', async () => {
    const change = renderForm('en-US');
    const inputs = document.querySelectorAll('input[type="password"]');
    await userEvent.type(inputs[0] as HTMLElement, 'old-one');
    await userEvent.type(inputs[1] as HTMLElement, 'Blueberry#2026');
    await userEvent.type(inputs[2] as HTMLElement, 'Blueberry#2025');
    await userEvent.click(screen.getByRole('button', { name: EN['account.password.submit'] }));
    expect(await screen.findByText(EN['account.password.mismatch'])).toBeTruthy();
    expect(change).not.toHaveBeenCalled();
  });
});

describe('Your profile', () => {
  it('is a top-level page with no unnamed Back, and its password row links on', () => {
    const profile = read('views/Dashboard/Dashboard/User/ProfileUser.tsx');
    expect(profile).not.toContain('navigate(-1)');
    expect(profile).not.toContain('showBackButton');
    expect(profile).toContain("navigate('/admin/dashboard/settings/change-password')");
  });
});
