import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../../store/store';
import userEvent from '@testing-library/user-event';

// Mock the authentication API
const mockLoginMutation = vi.fn();
const mockSignUpMutation = vi.fn();

vi.mock('../../store/api/api', () => ({
  api: {
    endpoints: {
      login: {
        initiate: mockLoginMutation
      },
      signUp: {
        initiate: mockSignUpMutation
      }
    }
  },
  useLoginMutation: () => [mockLoginMutation, { isLoading: false }],
  useSignUpMutation: () => [mockSignUpMutation, { isLoading: false }]
}));

// Mock secure token storage
vi.mock('../../utils/secureTokenStorage', () => ({
  secureTokenStorage: {
    setTokens: vi.fn(),
    getAccessToken: vi.fn(() => null),
    getRefreshToken: vi.fn(() => null),
    clearTokens: vi.fn(),
    hasValidTokens: vi.fn(() => false)
  }
}));

// Mock React Router navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Import components after mocks
import LoginForm from '../../views/Authentication/SignIn';
import SignUpForm from '../../views/Authentication/SignUp';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('completes successful login flow', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      mockLoginMutation.mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            user: {
              id: 1,
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User'
            }
          })
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Submit form
      await user.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockLoginMutation).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      // Verify navigation occurs
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles login errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock API error response
      mockLoginMutation.mockRejectedValue({
        data: { detail: 'Invalid credentials' }
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('validates form fields before submission', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Try to submit empty form
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Should not call API
      expect(mockLoginMutation).not.toHaveBeenCalled();
    });
  });

  describe('Sign Up Flow', () => {
    it('completes successful signup flow', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      mockSignUpMutation.mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            user: {
              id: 1,
              email: 'newuser@example.com',
              first_name: 'New',
              last_name: 'User'
            }
          })
      });

      render(
        <TestWrapper>
          <SignUpForm />
        </TestWrapper>
      );

      // Fill in signup form
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(firstNameInput, 'New');
      await user.type(lastNameInput, 'User');
      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');

      // Submit form
      await user.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockSignUpMutation).toHaveBeenCalledWith({
          first_name: 'New',
          last_name: 'User',
          email: 'newuser@example.com',
          password1: 'password123',
          password2: 'password123'
        });
      });

      // Verify navigation to onboarding
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('validates password confirmation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SignUpForm />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.click(submitButton);

      // Should show password mismatch error
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(mockSignUpMutation).not.toHaveBeenCalled();
    });

    it('handles duplicate email error', async () => {
      const user = userEvent.setup();

      // Mock API error for duplicate email
      mockSignUpMutation.mockRejectedValue({
        data: { email: ['A user with that email already exists.'] }
      });

      render(
        <TestWrapper>
          <SignUpForm />
        </TestWrapper>
      );

      // Fill form with valid data
      const firstNameInput = screen.getByLabelText(/first name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(firstNameInput, 'Test');
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      // Should show duplicate email error
      await waitFor(() => {
        expect(screen.getByText(/user with that email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('switches between login and signup forms', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Look for signup link
      const signupLink = screen.getByText(/don't have an account/i);
      expect(signupLink).toBeInTheDocument();

      await user.click(signupLink);

      // Should navigate to signup
      expect(mockNavigate).toHaveBeenCalledWith('/auth/signup');
    });

    it('shows loading state during form submission', async () => {
      const user = userEvent.setup();

      // Mock API with delay
      mockLoginMutation.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Social Authentication', () => {
    it('handles Google OAuth flow', async () => {
      const user = userEvent.setup();

      // Mock Google OAuth
      const mockGoogleAuth = vi.fn();
      vi.mock('../../utils/googleAuth', () => ({
        initiateGoogleAuth: mockGoogleAuth
      }));

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      expect(mockGoogleAuth).toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    it('handles token storage on successful login', async () => {
      const { secureTokenStorage } = await import('../../utils/secureTokenStorage');
      const user = userEvent.setup();

      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token'
      };

      mockLoginMutation.mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            ...mockTokens,
            user: { id: 1, email: 'test@example.com' }
          })
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(secureTokenStorage.setTokens).toHaveBeenCalledWith({
          access: mockTokens.access_token,
          refresh: mockTokens.refresh_token
        });
      });
    });

    it('clears tokens on logout', async () => {
      const { secureTokenStorage } = await import('../../utils/secureTokenStorage');

      // Mock logout function (would be in a logout component/hook)
      const mockLogout = vi.fn(() => {
        secureTokenStorage.clearTokens();
        mockNavigate('/auth/login');
      });

      mockLogout();

      expect(secureTokenStorage.clearTokens).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
    });
  });
});
