/**
 * Comprehensive tests for AppSignUp component
 * Tests 2025 UX patterns and Trazo design standards
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import enUS from '../../../../i18n/lang/en-US.json';
import esES from '../../../../i18n/lang/es-419.json';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import AppSignUp from '../AppSignUp';
// 🔴 2026-08-21 — `useSignUpMutation` is imported HERE, statically, and read through
// `vi.mocked` below. It used to be reached with `require('../../../../store/api/authApi')`
// inside the test bodies, and that one call is why this whole file had never run: `require`
// bypasses Vite and hands the specifier to NODE, whose ESM resolver then choked on
// authApi.js's own `import ... from '../../config'` — a directory import Node does not
// support. Every one of these 16 cases died at that line with
// ERR_UNSUPPORTED_DIR_IMPORT, including `validates password strength`.
//
// The 2026-08-19 alias work in vitest.config.ts fixed the same error for the BARE specifiers
// and its comment claims this file among the suites it revived. It did not: an alias cannot
// help a module Vite never sees.
import { authApi, useSignUpMutation } from '../../../../store/api/authApi';
import theme from '../../../../theme/styles';

// Mock config to avoid ES module directory import issues
vi.mock('../../../../config', () => ({
  SIGNUP_URL: '/api/auth/register/',
  LOGIN_URL: '/api/auth/login/',
  USER_DATA_URL: '/api/users/me/',
  VERIFY_EMAIL_URL: '/api/auth/verify-email/',
  SOCIAL_AUTH_URL: '/api/auth/social/',
  PASSWORD_CHANGE_URL: '/api/auth/password/change/',
  PASSWORD_RESET_REQUEST_URL: '/api/auth/password/reset/',
  PASSWORD_RESET_CONFIRM_URL: '/api/auth/password/reset/confirm/'
}));

// Mock the API
vi.mock('../../../../store/api/authApi', () => ({
  authApi: {
    // Real functions, not bare `vi.fn()`s. A `vi.fn()` reducer returns `undefined`, and Redux
    // refuses to initialise a store whose slice reducer does that — which failed all 16 cases
    // identically the moment the file started running at all. A `vi.fn()` middleware is worse:
    // it is silently wrong until something dispatches through it.
    reducer: (state = {}) => state,
    middleware: () => (next: (a: unknown) => unknown) => (action: unknown) => next(action),
    reducerPath: 'authApi',
    endpoints: {
      signUp: {
        initiate: vi.fn()
      }
    }
  },
  // Every hook AppSignUp imports from this module. `useResendVerificationEmailMutation` and
  // `useSocialAuthMutation` were added to the component after this suite was written, and
  // nothing noticed — because the suite has never run. A mock that is missing an export
  // throws at render, so the omission was invisible exactly as long as the file was dark.
  useSignUpMutation: vi.fn(),
  useResendVerificationEmailMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useSocialAuthMutation: vi.fn(() => [vi.fn(), { isLoading: false }])
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: (component: any) => {
    const MotionComponent = ({ children, ...props }: any) => {
      const Component = component;
      return <Component {...props}>{children}</Component>;
    };
    return MotionComponent;
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock react-router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    )
  };
});

// Test store setup
const createTestStore = () =>
  configureStore({
    reducer: {
      [authApi.reducerPath]: authApi.reducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authApi.middleware)
  });

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider theme={theme}>
    <Provider store={createTestStore()}>
      {/* AppSignUp calls `useIntl()`, so the real catalogue has to be here — the same shape
          ConsumerSignIn's suite uses. Without it react-intl throws "Could not find required
          `intl` object" before a single assertion runs, and with a STUB catalogue every
          `getByText` below would be matching invented copy rather than what ships. */}
      <IntlProvider locale="en-US" messages={enUS}>
        <BrowserRouter>{children}</BrowserRouter>
      </IntlProvider>
    </Provider>
  </ChakraProvider>
);

/**
 * A password that satisfies all SIX rules the app enforces (length, upper, lower, number,
 * special, and "no common words or personal information"). The last one is why this cannot
 * contain the fixture names or the email local part.
 */
const VALID_PASSWORD = 'Willamette#2026';

describe('AppSignUp Component', () => {
  const mockSignUp = vi.fn();
  const mockUnwrap = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockReturnValue({ unwrap: mockUnwrap });
    vi.mocked(useSignUpMutation).mockReturnValue([mockSignUp, { isLoading: false }] as never);
  });

  it('renders the signup form with default create company mode', () => {
    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    expect(screen.getByText('Create Business Account')).toBeInTheDocument();
    // Anchored on the form's own title, not the marketing panel: the hero copy has been
    // rewritten twice since this file was written and is not what the case is about.
    expect(screen.getByText('Set up your farm records')).toBeInTheDocument();
    expect(screen.getByText('Create New Company')).toBeInTheDocument();
    expect(screen.getByText('Join Existing Company')).toBeInTheDocument();

    // The title must be a real <h1>, not a <Text> (= <p>). This whole screen returned ZERO
    // for `querySelectorAll('h1,h2,h3,h4')` until 2026-09-07 — heading navigation had nothing
    // to land on and the document stated no topic (WCAG 1.3.1 / 2.4.6, Level A). Asserting
    // the ROLE, not the text, is what stops a future Text/Heading swap from passing.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Set up your farm records'
    );
  });

  it('switches to join company mode when toggle is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    // Click join existing company button
    await user.click(screen.getByText('Join Existing Company'));

    // Should show company code input
    await waitFor(() => {
      expect(screen.getByText('Join Existing Company')).toBeInTheDocument();
      expect(screen.getByText('Company Invitation Code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter 6-character company code')).toBeInTheDocument();
    });
  });

  it('shows company code input only in join mode', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    // Should not show company code input initially
    expect(screen.queryByText('Company Invitation Code')).not.toBeInTheDocument();

    // Switch to join mode
    await user.click(screen.getByText('Join Existing Company'));

    // Should show company code input
    await waitFor(() => {
      expect(screen.getByText('Company Invitation Code')).toBeInTheDocument();
    });

    // Switch back to create mode
    await user.click(screen.getByText('Create New Company'));

    // Should hide company code input
    await waitFor(() => {
      expect(screen.queryByText('Company Invitation Code')).not.toBeInTheDocument();
    });
  });

  it('validates company code format', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    // Switch to join mode
    await user.click(screen.getByText('Join Existing Company'));

    const codeInput = await screen.findByPlaceholderText('Enter 6-character company code');

    // Test invalid formats
    await user.type(codeInput, '123');
    await user.tab(); // Trigger validation

    await waitFor(() => {
      expect(screen.getByText(/Company code must be at least 6 characters/)).toBeInTheDocument();
    });

    // Clear and test valid format
    await user.clear(codeInput);
    await user.type(codeInput, 'TEST123');

    await waitFor(() => {
      expect(screen.getByText('✓ Code format is valid')).toBeInTheDocument();
    });
  });

  it('auto-transforms company code to uppercase', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    await user.click(screen.getByText('Join Existing Company'));
    const codeInput = await screen.findByPlaceholderText('Enter 6-character company code');

    await user.type(codeInput, 'test123');

    expect(codeInput).toHaveValue('TEST123');
  });

  it('filters invalid characters from company code', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    await user.click(screen.getByText('Join Existing Company'));
    const codeInput = await screen.findByPlaceholderText('Enter 6-character company code');

    await user.type(codeInput, 'TEST@#$123');

    expect(codeInput).toHaveValue('TEST123');
  });

  it('validates all required fields', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    // Try to submit without filling fields
    const submitButton = screen.getByText('Create Business Account');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('validates password strength', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    const passwordInput = screen.getByPlaceholderText('Create secure password (8+ characters)');

    // Test weak password
    await user.type(passwordInput, '123');

    await waitFor(() => {
      // The meter grades on a curve — `getStrengthLabel` returns 'Very Weak' below 20 and
      // 'Weak' below 40 — so pinning one word makes the test brittle about the score rather
      // than about the thing under test: that a bad password is SHOWN as bad.
      expect(screen.getByText(/Password strength: (Very Weak|Weak)/)).toBeInTheDocument();
    });

    // A password with an open warning ("contains common words": "pass") is never also called
    // Strong on the same screen (recordkeeping review F-20): one verdict.
    await user.clear(passwordInput);
    await user.type(passwordInput, 'StrongPass123!');

    await waitFor(() => {
      expect(screen.getByText('Password strength: Good')).toBeInTheDocument();
      expect(screen.getByText(/common words/)).toBeInTheDocument();
    });

    // Test strong password, no warning
    await user.clear(passwordInput);
    await user.type(passwordInput, 'Xq7#mLv2!tRz');

    await waitFor(() => {
      expect(screen.getByText('Password strength: Strong')).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    const passwordInput = screen.getByPlaceholderText('Create secure password (8+ characters)');
    const confirmInput = screen.getByPlaceholderText('Confirm your password');

    await user.type(passwordInput, 'password123');
    await user.type(confirmInput, 'differentpass');

    await waitFor(() => {
      expect(screen.getByText('✗ Passwords do not match')).toBeInTheDocument();
    });

    // Fix the confirmation
    await user.clear(confirmInput);
    await user.type(confirmInput, 'password123');

    await waitFor(() => {
      expect(screen.getByText('✓ Passwords match')).toBeInTheDocument();
    });
  });

  it('submits form with correct data for new company', async () => {
    const user = userEvent.setup();
    mockUnwrap.mockResolvedValue({ success: true });

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    // Fill out the form
    await user.type(screen.getByPlaceholderText('First name'), 'John');
    await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Enter business email address'), 'john@test.com');
    await user.type(
      screen.getByPlaceholderText('Create secure password (8+ characters)'),
      VALID_PASSWORD
    );
    await user.type(screen.getByPlaceholderText('Confirm your password'), VALID_PASSWORD);
    await user.click(screen.getByLabelText(/I agree to the Terms of Service/));

    // Submit
    await user.click(screen.getByText('Create Business Account'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        password: VALID_PASSWORD,
        user_type: 'PRODUCER',
        accept_terms: true
      });
    });
  });

  it('submits form with company code for joining existing company', async () => {
    const user = userEvent.setup();
    mockUnwrap.mockResolvedValue({ success: true });

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    // Switch to join mode
    await user.click(screen.getByText('Join Existing Company'));

    // Fill out the form
    await user.type(screen.getByPlaceholderText('First name'), 'Jane');
    await user.type(screen.getByPlaceholderText('Last name'), 'Smith');
    await user.type(screen.getByPlaceholderText('Enter business email address'), 'jane@test.com');
    await user.type(screen.getByPlaceholderText('Enter 6-character company code'), 'TEST123');
    await user.type(
      screen.getByPlaceholderText('Create secure password (8+ characters)'),
      VALID_PASSWORD
    );
    await user.type(screen.getByPlaceholderText('Confirm your password'), VALID_PASSWORD);
    await user.click(screen.getByLabelText(/I agree to the Terms of Service/));

    // Submit
    await user.click(screen.getByText('Join Company'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@test.com',
        password: VALID_PASSWORD,
        user_type: 'PRODUCER',
        accept_terms: true,
        company_code: 'TEST123'
      });
    });
  });

  // The Terms box used to gate only the email form: Google and Facebook created accounts
  // that never agreed to anything, and the server never learned who had ticked it.
  it('keeps social sign-up disabled until the Terms box is ticked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    const google = screen.getByRole('button', { name: 'Continue with Google' });
    expect(google).toBeDisabled();
    expect(screen.getByText(/Tick the Terms box above/)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/I agree to the Terms of Service/));

    expect(google).toBeEnabled();
    expect(screen.queryByText(/Tick the Terms box above/)).not.toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    mockUnwrap.mockRejectedValue({
      data: {
        company_code: ['Invalid company code']
      }
    });

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    // Switch to join mode and fill form
    await user.click(screen.getByText('Join Existing Company'));
    await user.type(screen.getByPlaceholderText('First name'), 'Test');
    await user.type(screen.getByPlaceholderText('Last name'), 'User');
    await user.type(screen.getByPlaceholderText('Enter business email address'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('Enter 6-character company code'), 'INVALID');
    await user.type(
      screen.getByPlaceholderText('Create secure password (8+ characters)'),
      VALID_PASSWORD
    );
    await user.type(screen.getByPlaceholderText('Confirm your password'), VALID_PASSWORD);
    await user.click(screen.getByLabelText(/I agree to the Terms of Service/));

    // Submit
    await user.click(screen.getByText('Join Company'));

    await waitFor(() => {
      expect(screen.getByText('Invalid company code')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();

    // Mock loading state
    vi.mocked(useSignUpMutation).mockReturnValue([mockSignUp, { isLoading: true }] as never);

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    expect(screen.getByText('Creating account...')).toBeInTheDocument();

    // Button should be disabled during loading
    const submitButton = screen.getByText('Creating account...');
    expect(submitButton).toBeDisabled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    const passwordInput = screen.getByPlaceholderText('Create secure password (8+ characters)');
    const toggleButton = passwordInput.parentElement?.querySelector('button');

    expect(passwordInput).toHaveAttribute('type', 'password');

    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  it('follows Trazo design standards', () => {
    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    // Check for green color scheme usage (should use theme colors)
    const createButton = screen.getByText('Create New Company');
    const joinButton = screen.getByText('Join Existing Company');

    // These should have proper styling classes
    expect(createButton).toBeInTheDocument();
    expect(joinButton).toBeInTheDocument();

    // Check for proper typography hierarchy
    expect(screen.getByText('Create Business Account')).toBeInTheDocument();
    // Anchored on the form's own title, not the marketing panel: the hero copy has been
    // rewritten twice since this file was written and is not what the case is about.
    expect(screen.getByText("Set up your farm records")).toBeInTheDocument();
  });

  it('is accessible', async () => {
    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    // Check for proper form labels
    expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Business Email/)).toBeInTheDocument();
    // Exact, not /Password/: both this field and 'Confirm Password' now carry real accessible
    // names, so the loose regex matches two elements and throws.
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/)).toBeInTheDocument();

    // Check for proper ARIA attributes and roles
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();

    // Test keyboard navigation.
    //
    // REACHABILITY, not tab-stop position. This asserted that the very first Tab landed on the
    // First Name input; it now lands on the create-vs-join mode toggle, which sits above the
    // fields and is a legitimate first stop. Pinning the ordinal made the test a description of
    // one layout. What has to hold is that a keyboard user can actually get to the first field
    // — which is what a `tabIndex={-1}`, a focus trap, or an aria-hidden wrapper would break.
    const user = userEvent.setup();
    const firstInput = screen.getByPlaceholderText('First name');

    let reached = false;
    for (let i = 0; i < 10 && !reached; i += 1) {
      await user.tab();
      reached = document.activeElement === firstInput;
    }
    expect(reached, 'First Name is not reachable by keyboard').toBe(true);
  });
});

/**
 * Run 8b R1: the Spanish sign-up still printed English. "Or sign up with" was a JSX literal
 * (the key guards read the catalogues and cannot see one), and so were the join-code help and
 * the whole "Check your email" state a new grower lands on after submitting. This renders the
 * real es-419 catalogue and reads the page text, so a literal that slips back in is caught.
 */
describe('AppSignUp in Spanish (es-419)', () => {
  const mockSignUp = vi.fn();
  const mockUnwrap = vi.fn();

  const EsWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ChakraProvider theme={theme}>
      <Provider store={createTestStore()}>
        <IntlProvider locale="es-419" messages={esES}>
          <BrowserRouter>{children}</BrowserRouter>
        </IntlProvider>
      </Provider>
    </ChakraProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockReturnValue({ unwrap: mockUnwrap });
    vi.mocked(useSignUpMutation).mockReturnValue([mockSignUp, { isLoading: false }] as never);
  });

  it('says "O regístrate con", not "Or sign up with"', () => {
    render(
      <EsWrapper>
        <AppSignUp />
      </EsWrapper>
    );

    expect(document.body.textContent).not.toContain('Or sign up with');
    expect(document.body.textContent).toContain('O regístrate con');
  });

  it('shows the join-code field and its help in Spanish', async () => {
    const user = userEvent.setup();
    render(
      <EsWrapper>
        <AppSignUp />
      </EsWrapper>
    );

    await user.click(screen.getByText('Unirme a una empresa'));
    await user.type(
      await screen.findByPlaceholderText('Ingresa el código de empresa de 6 caracteres'),
      'TEST123'
    );

    await waitFor(() => {
      expect(screen.getByText('Código de invitación de la empresa')).toBeInTheDocument();
      expect(screen.getByText(/El formato del código es válido/)).toBeInTheDocument();
    });
    const text = document.body.textContent ?? '';
    for (const english of [
      'Company Invitation Code',
      'Get this code from your company admin',
      'Code format is valid',
      'Validating company code'
    ]) {
      expect(text, `English left on the Spanish join form: ${english}`).not.toContain(english);
    }
  });

  it('shows the "check your email" state in Spanish after sign-up', async () => {
    const user = userEvent.setup();
    mockUnwrap.mockResolvedValue({ success: true });

    render(
      <EsWrapper>
        <AppSignUp />
      </EsWrapper>
    );

    await user.type(screen.getByPlaceholderText('Nombre'), 'Juana');
    await user.type(screen.getByPlaceholderText('Apellido'), 'Pérez');
    await user.type(
      screen.getByPlaceholderText('Ingresa el correo electrónico de tu empresa'),
      'juana@test.com'
    );
    await user.type(
      screen.getByPlaceholderText('Crea una contraseña segura (8+ caracteres)'),
      VALID_PASSWORD
    );
    await user.type(screen.getByPlaceholderText('Confirma tu contraseña'), VALID_PASSWORD);
    await user.click(screen.getByLabelText(/Acepto los/));
    await user.click(screen.getByText('Crear cuenta de empresa'));

    // Wait for the state to swap (the back button is the first thing it renders).
    await screen.findByText('Volver al registro');
    const text = document.body.textContent ?? '';
    for (const english of [
      'Check your email',
      "We've sent a verification email",
      'Click the link in the email',
      'Resend email',
      "Didn't receive the email",
      'contact support'
    ]) {
      expect(text, `English left on the Spanish verification state: ${english}`).not.toContain(
        english
      );
    }

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Revisa tu correo');
    expect(
      screen.getByText('Te enviamos un correo de verificación para empezar.')
    ).toBeInTheDocument();
    expect(screen.getByText('Reenviar correo')).toBeInTheDocument();
  });
});
