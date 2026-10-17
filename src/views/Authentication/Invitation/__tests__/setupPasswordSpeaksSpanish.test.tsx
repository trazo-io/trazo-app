/**
 * The pilot grower's first screen speaks their language and describes what they actually get.
 *
 * Pilot rehearsal 2026-10-17: `provision_pilot` prints a link to `/invitation/<code>/setup`
 * (SetupPassword). In es-419 that page was almost all English, and its success screen said
 * "You're now part of the carbon intelligence revolution" and "Carbon tracking enabled". Carbon
 * is a background estimate, not what a pilot buys; the grower gets their farm records and
 * renewal preparation. The "Invalid Invitation" page was English too.
 *
 * Pinned here, for the setup form, the invalid-invitation page and the success screen:
 * - es-419 renders no English sentence from this page (every `auth.invitationSetup.*` English
 *   value, plus the strings that used to be hardcoded);
 * - no surface says "carbon" in either language.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';

let invitationState: { data?: unknown; error?: unknown; isLoading: boolean } = {
  isLoading: false
};
const signup = vi.fn();

vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ invitationCode: 'ABC123' }),
  useSearchParams: () => [new URLSearchParams()],
  useLocation: () => ({ pathname: '/invitation/ABC123/setup' }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>
}));

vi.mock('store/api/invitationApi', () => ({
  useGetInvitationDetailsQuery: () => invitationState,
  useSignupWithInvitationMutation: () => [signup, { isLoading: false }]
}));

vi.mock('store/api/authApi', () => ({
  useSocialAuthMutation: () => [vi.fn(), { isLoading: false }]
}));

const { default: SetupPassword } = await import('../SetupPassword');

const INVITATION = { company_name: 'Astra Orchard', role: 'Farm Manager' };

/** Strings that were hardcoded English on this page before 2026-10-17. */
const OLD_ENGLISH = [
  'Welcome to the Team!',
  'Complete Your Setup',
  'Create your account to join the team',
  'First Name',
  'Last Name',
  'Confirm Password',
  'Complete Setup',
  'I agree to the',
  'Invalid Invitation',
  'This invitation link is invalid or has expired',
  'Go to Homepage',
  'Account Created Successfully!',
  'Welcome to the team!',
  'Access granted to dashboard',
  'Team collaboration ready',
  'Setting up your workspace'
];

const ownEnglish = Object.entries(enUS as Record<string, string>)
  .filter(([key]) => key.startsWith('auth.invitationSetup.'))
  .map(([, value]) => value)
  // A value identical in both locales (none today) would not be English-only.
  .filter((value) => !Object.values(es419 as Record<string, string>).includes(value));

function renderPage(locale: 'en-US' | 'es-419') {
  const messages = (locale === 'en-US' ? enUS : es419) as Record<string, string>;
  return render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={messages}>
        <SetupPassword />
      </IntlProvider>
    </ChakraProvider>
  );
}

function expectNoEnglish(text: string) {
  for (const phrase of [...OLD_ENGLISH, ...ownEnglish]) {
    expect(text, `English on the es-419 page: "${phrase}"`).not.toContain(phrase);
  }
}

/** Fill and submit the form; resolves once the success screen is on screen. */
async function signUpThroughTheForm() {
  const inputs = document.querySelectorAll('input');
  const byName = (name: string) =>
    Array.from(inputs).find((el) => el.getAttribute('name') === name)!;
  fireEvent.input(byName('first_name'), { target: { value: 'Jane' } });
  fireEvent.input(byName('last_name'), { target: { value: 'Grower' } });
  fireEvent.input(byName('password'), { target: { value: 'Orchard#2026xQ' } });
  fireEvent.input(byName('password_confirm'), { target: { value: 'Orchard#2026xQ' } });
  fireEvent.click(byName('acceptTerms'));
  fireEvent.submit(document.querySelector('form')!);
  await waitFor(() => expect(signup).toHaveBeenCalled());
  // The success screen is the one without the form; waiting on that is locale-independent.
  await waitFor(() => expect(document.querySelector('form')).toBeNull());
}

beforeEach(() => {
  invitationState = { data: INVITATION, isLoading: false };
  signup.mockReset();
  signup.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        user: { id: 1, first_name: 'Jane', last_name: 'Grower' },
        company: { id: 7, name: 'Astra Orchard' },
        redirect_to: '/admin/dashboard'
      })
  });
});

describe('invitation setup page in es-419', () => {
  it('setup form: no English, no carbon', () => {
    const { container } = renderPage('es-419');
    const text = container.textContent || '';
    expect(text).toContain('Completa tu configuración');
    expect(text).toContain('Plan del Sistema Orgánico y preparación de la renovación');
    expectNoEnglish(text);
    expect(text).not.toMatch(/carbon|carbono/i);
  });

  it('invalid invitation: no English', () => {
    invitationState = { error: { status: 404 }, isLoading: false };
    const { container } = renderPage('es-419');
    const text = container.textContent || '';
    expect(text).toContain('Esta invitación no es válida');
    expect(text).toContain('Pide uno nuevo a la persona que te invitó.');
    expectNoEnglish(text);
  });

  it('success screen: what the grower gets, in Spanish, never "carbon intelligence"', async () => {
    const { container } = renderPage('es-419');
    await signUpThroughTheForm();
    const text = container.textContent || '';
    expect(text).toContain('Tu cuenta está lista');
    expect(text).toContain('Los registros de temporada de tu finca');
    expect(text).toContain('Plan del Sistema Orgánico y preparación de la renovación');
    expectNoEnglish(text);
    expect(text).not.toMatch(/carbon|carbono/i);
  });
});

describe('invitation setup page in en-US', () => {
  it('success screen names the records and renewal preparation, not carbon', async () => {
    const { container } = renderPage('en-US');
    await signUpThroughTheForm();
    const text = container.textContent || '';
    expect(text).toContain('Your account is ready');
    expect(text).toContain("Your farm's season records");
    expect(text).toContain('Organic System Plan and renewal preparation');
    expect(text).not.toMatch(/carbon/i);
    expect(text).not.toContain('revolution');
  });
});

/** Review of app #129. */
describe('invitation setup page: terms and refused passwords', () => {
  it('keeps the Terms and Privacy links outside the checkbox label', () => {
    renderPage('es-419');
    const links = document.querySelector('[data-testid="setup-terms-links"]');
    expect(links, 'the links row renders').not.toBeNull();
    expect(links!.querySelectorAll('a').length).toBe(2);
    expect(links!.closest('label'), 'a link inside the label never toggles the box').toBeNull();
    const label = document.querySelector('input[name="acceptTerms"]')!.closest('label');
    expect(label!.querySelector('a')).toBeNull();
  });

  it('names the reasons the strength indicator cannot show, in the reader language', async () => {
    const { passwordValidator } = await import('utils/passwordValidation');
    const { weakPasswordReasonId } = await import('../SetupPassword');
    const withName = passwordValidator.validate('Grower#2026xQ', {
      firstName: 'Jane',
      lastName: 'Grower'
    });
    expect(withName.isValid).toBe(false);
    const id = weakPasswordReasonId(withName.errors);
    expect(id).toBe('auth.invitationSetup.weakPassword.personalInfo');
    expect((es419 as Record<string, string>)[id]).toBe(
      'Tu contraseña no puede contener tu nombre.'
    );
    expect(weakPasswordReasonId(['Password is too simple. Try making it longer'])).toBe(
      'auth.invitationSetup.weakPassword.tooSimple'
    );
    expect(weakPasswordReasonId(['Password must contain at least one number'])).toBe(
      'auth.signup.toast.weakPassword.body'
    );
  });
});
