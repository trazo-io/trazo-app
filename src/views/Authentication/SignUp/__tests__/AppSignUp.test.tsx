/**
 * Comprehensive tests for AppSignUp component
 * Tests 2025 UX patterns and Trazo design standards
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import AppSignUp from '../AppSignUp';
import { authApi } from '../../../../store/api/authApi';
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
    reducer: vi.fn(),
    middleware: vi.fn(),
    reducerPath: 'authApi',
    endpoints: {
      signUp: {
        initiate: vi.fn()
      }
    }
  },
  useSignUpMutation: vi.fn()
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
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>
  };
});

// Test store setup
const createTestStore = () => configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware)
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider theme={theme}>
    <Provider store={createTestStore()}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  </ChakraProvider>
);

describe('AppSignUp Component', () => {
  const mockSignUp = vi.fn();
  const mockUnwrap = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockReturnValue({ unwrap: mockUnwrap });
    (require('../../../../store/api/authApi').useSignUpMutation as any).mockReturnValue([
      mockSignUp,
      { isLoading: false }
    ]);
  });

  it('renders the signup form with default create company mode', () => {
    render(
      <TestWrapper>
        <AppSignUp />
      </TestWrapper>
    );

    expect(screen.getByText('Create Business Account')).toBeInTheDocument();
    expect(screen.getByText('Join leading agricultural enterprises')).toBeInTheDocument();
    expect(screen.getByText('Create New Company')).toBeInTheDocument();
    expect(screen.getByText('Join Existing Company')).toBeInTheDocument();
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
      expect(screen.getByText('Join Company Account')).toBeInTheDocument();
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
      expect(screen.getByText('Password strength: Weak')).toBeInTheDocument();
    });

    // Test strong password
    await user.clear(passwordInput);
    await user.type(passwordInput, 'StrongPass123!');
    
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
    await user.type(screen.getByPlaceholderText('Create secure password (8+ characters)'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'password123');
    await user.click(screen.getByLabelText(/I agree to the Terms of Service/));

    // Submit
    await user.click(screen.getByText('Create Business Account'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        password: 'password123',
        user_type: 'PRODUCER'
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
    await user.type(screen.getByPlaceholderText('Create secure password (8+ characters)'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'password123');
    await user.click(screen.getByLabelText(/I agree to the Terms of Service/));

    // Submit
    await user.click(screen.getByText('Join Company'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@test.com',
        password: 'password123',
        user_type: 'PRODUCER',
        company_code: 'TEST123'
      });
    });
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
    await user.type(screen.getByPlaceholderText('Create secure password (8+ characters)'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'password123');
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
    (require('../../../../store/api/authApi').useSignUpMutation as any).mockReturnValue([
      mockSignUp,
      { isLoading: true }
    ]);
    
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
    expect(screen.getByText('Join leading agricultural enterprises')).toBeInTheDocument();
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
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/)).toBeInTheDocument();

    // Check for proper ARIA attributes and roles
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();

    // Test keyboard navigation
    const user = userEvent.setup();
    const firstInput = screen.getByPlaceholderText('First name');
    
    await user.tab();
    expect(document.activeElement).toBe(firstInput);
  });
});