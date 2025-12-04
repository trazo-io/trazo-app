import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import { useSubscriptionProcessing } from '../useSubscriptionProcessing';
import companySlice from '../../store/features/companySlice';
import baseApi from '../../store/api/baseApi';

// Mock the subscription context
const mockSubscriptionState = {
  isProcessing: false,
  error: null,
  isSessionProcessed: false,
  sessionId: null,
  companyId: null
};

const mockSubscriptionDispatch = vi.fn();

vi.mock('../../contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    state: mockSubscriptionState,
    dispatch: mockSubscriptionDispatch
  })
}));

// Mock the subscription API
const mockCompleteCheckout = vi.fn();

vi.mock('../../store/api/subscriptionApi', () => ({
  useCompleteCheckoutMutation: () => [mockCompleteCheckout, { isLoading: false }]
}));

// Mock toast
const mockToast = vi.fn();

vi.mock('@chakra-ui/react', async () => {
  const actual = (await vi.importActual('@chakra-ui/react')) as any;
  return {
    ...actual,
    useToast: () => mockToast
  };
});

// Mock messages for intl
const messages = {
  'app.subscriptionSuccess': 'Subscription Successful!',
  'app.subscriptionSuccessDescription': 'Your subscription has been activated.',
  'app.subscriptionError': 'Subscription Error'
};

// Test wrapper component
const createWrapper = () => {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      company: companySlice
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware)
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store },
      React.createElement(
        IntlProvider,
        { locale: 'en', messages },
        React.createElement(ChakraProvider, {}, children)
      )
    );

  return { wrapper: Wrapper, store };
};

describe('useSubscriptionProcessing Hook Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    Object.assign(mockSubscriptionState, {
      isProcessing: false,
      error: null,
      isSessionProcessed: false,
      sessionId: null,
      companyId: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Hook Functionality', () => {
    it('returns correct initial state and functions', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSubscriptionProcessing(), { wrapper });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSessionProcessed).toBe(false);
      expect(typeof result.current.processSubscription).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('accepts callback props correctly', () => {
      const mockOnSuccess = vi.fn();
      const mockOnError = vi.fn();

      const { wrapper } = createWrapper();

      expect(() => {
        renderHook(
          () =>
            useSubscriptionProcessing({
              onSuccess: mockOnSuccess,
              onError: mockOnError
            }),
          { wrapper }
        );
      }).not.toThrow();
    });
  });

  describe('Successful Subscription Processing', () => {
    it('processes subscription successfully with company data', async () => {
      const mockCompanyData = {
        id: 123,
        name: 'Test Company',
        subscription_status: 'active'
      };

      const mockResult = {
        success: true,
        company: mockCompanyData,
        subscription: {
          id: 'sub_123',
          status: 'active'
        }
      };

      mockCompleteCheckout.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockResult)
      });

      const mockOnSuccess = vi.fn();
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(
        () =>
          useSubscriptionProcessing({
            onSuccess: mockOnSuccess
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.processSubscription('session_123', 'company_456');
      });

      // Verify API call
      expect(mockCompleteCheckout).toHaveBeenCalledWith({
        session_id: 'session_123',
        company_id: 'company_456'
      });

      // Verify context dispatches
      expect(mockSubscriptionDispatch).toHaveBeenCalledWith({
        type: 'START_PROCESSING',
        payload: { sessionId: 'session_123', companyId: 'company_456' }
      });
      expect(mockSubscriptionDispatch).toHaveBeenCalledWith({
        type: 'MARK_SESSION_PROCESSED'
      });

      // Verify Redux dispatch
      const state = store.getState();
      expect(state.company.currentCompany).toEqual(mockCompanyData);

      // Verify success toast
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Subscription Successful!',
        description: 'Your subscription has been activated.',
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      // Verify success callback
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('processes subscription successfully without company data', async () => {
      const mockResult = {
        success: true,
        subscription: {
          id: 'sub_123',
          status: 'active'
        }
      };

      mockCompleteCheckout.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockResult)
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSubscriptionProcessing(), { wrapper });

      await act(async () => {
        await result.current.processSubscription('session_123', 'company_456');
      });

      // Should still mark as processed
      expect(mockSubscriptionDispatch).toHaveBeenCalledWith({
        type: 'MARK_SESSION_PROCESSED'
      });

      // Should show success toast
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('handles API success=false response', async () => {
      const mockResult = {
        success: false,
        error: 'Payment processing failed'
      };

      mockCompleteCheckout.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockResult)
      });

      const mockOnError = vi.fn();
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useSubscriptionProcessing({
            onError: mockOnError
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.processSubscription('session_123', 'company_456');
      });

      // Verify error dispatch
      expect(mockSubscriptionDispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        payload: 'Payment processing failed'
      });

      // Verify error toast
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Subscription Error',
        description: 'Payment processing failed',
        status: 'error',
        duration: 5000,
        isClosable: true
      });

      // Verify error callback
      expect(mockOnError).toHaveBeenCalled();
    });

    it('handles API rejection with structured error', async () => {
      const mockError = {
        data: {
          error: 'Invalid session ID'
        }
      };

      mockCompleteCheckout.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(mockError)
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSubscriptionProcessing(), { wrapper });

      await act(async () => {
        await result.current.processSubscription('invalid_session', 'company_456');
      });

      expect(mockSubscriptionDispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        payload: 'Invalid session ID'
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Invalid session ID',
          status: 'error'
        })
      );
    });

    it('handles API rejection with error message', async () => {
      const mockError = new Error('Network error');

      mockCompleteCheckout.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(mockError)
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSubscriptionProcessing(), { wrapper });

      await act(async () => {
        await result.current.processSubscription('session_123', 'company_456');
      });

      expect(mockSubscriptionDispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        payload: 'Network error'
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Network error',
          status: 'error'
        })
      );
    });

    it('handles unknown errors gracefully', async () => {
      const mockError = { unknown: 'error' };

      mockCompleteCheckout.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(mockError)
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSubscriptionProcessing(), { wrapper });

      await act(async () => {
        await result.current.processSubscription('session_123', 'company_456');
      });

      expect(mockSubscriptionDispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        payload: 'Unknown error occurred'
      });
    });
  });

  describe('Reset Functionality', () => {
    it('calls reset dispatch when reset is called', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSubscriptionProcessing(), { wrapper });

      act(() => {
        result.current.reset();
      });

      expect(mockSubscriptionDispatch).toHaveBeenCalledWith({
        type: 'RESET'
      });
    });
  });

  describe('State Management Integration', () => {
    it('reflects subscription context state changes', () => {
      // Mock processing state
      Object.assign(mockSubscriptionState, {
        isProcessing: true,
        error: 'Some error',
        isSessionProcessed: true
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSubscriptionProcessing(), { wrapper });

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.error).toBe('Some error');
      expect(result.current.isSessionProcessed).toBe(true);
    });
  });

  describe('Real-world Workflow Scenarios', () => {
    it('handles complete Stripe checkout workflow', async () => {
      const mockCompanyData = {
        id: 123,
        name: 'Acme Corp',
        subscription_status: 'active',
        plan: 'premium'
      };

      const mockResult = {
        success: true,
        company: mockCompanyData,
        subscription: {
          id: 'sub_stripe_123',
          status: 'active',
          current_period_end: '2024-12-31'
        }
      };

      mockCompleteCheckout.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockResult)
      });

      const mockOnSuccess = vi.fn();
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(
        () =>
          useSubscriptionProcessing({
            onSuccess: mockOnSuccess
          }),
        { wrapper }
      );

      // Simulate the full workflow
      await act(async () => {
        await result.current.processSubscription('cs_stripe_session_123', '123');
      });

      // Verify complete workflow
      expect(mockSubscriptionDispatch).toHaveBeenCalledTimes(2); // START_PROCESSING + MARK_SESSION_PROCESSED
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success'
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();

      // Verify company was set in Redux
      const finalState = store.getState();
      expect(finalState.company.currentCompany).toEqual(mockCompanyData);
    });

    it('handles subscription upgrade workflow', async () => {
      const mockUpgradeResult = {
        success: true,
        company: {
          id: 123,
          name: 'Existing Company',
          subscription_status: 'active',
          plan: 'enterprise'
        }
      };

      mockCompleteCheckout.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockUpgradeResult)
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSubscriptionProcessing(), { wrapper });

      await act(async () => {
        await result.current.processSubscription('upgrade_session_123', '123');
      });

      expect(mockCompleteCheckout).toHaveBeenCalledWith({
        session_id: 'upgrade_session_123',
        company_id: '123'
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Subscription Successful!',
          status: 'success'
        })
      );
    });

    it('handles payment failure workflow', async () => {
      const mockError = {
        data: {
          error: 'Your card was declined. Please try a different payment method.'
        }
      };

      mockCompleteCheckout.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(mockError)
      });

      const mockOnError = vi.fn();
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          useSubscriptionProcessing({
            onError: mockOnError
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.processSubscription('failed_session_123', '123');
      });

      expect(mockSubscriptionDispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        payload: 'Your card was declined. Please try a different payment method.'
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Your card was declined. Please try a different payment method.',
          status: 'error'
        })
      );

      expect(mockOnError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('Callback Dependencies', () => {
    it('memoizes processSubscription callback correctly', () => {
      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(() => useSubscriptionProcessing(), { wrapper });

      const firstCallback = result.current.processSubscription;

      rerender();

      const secondCallback = result.current.processSubscription;

      // Should be the same reference due to useCallback
      expect(firstCallback).toBe(secondCallback);
    });

    it('updates callback when dependencies change', () => {
      const firstOnSuccess = vi.fn();
      const secondOnSuccess = vi.fn();

      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(
        ({ onSuccess }) => useSubscriptionProcessing({ onSuccess }),
        {
          wrapper,
          initialProps: { onSuccess: firstOnSuccess }
        }
      );

      const firstCallback = result.current.processSubscription;

      rerender({ onSuccess: secondOnSuccess });

      const secondCallback = result.current.processSubscription;

      // Should be different reference when dependencies change
      expect(firstCallback).not.toBe(secondCallback);
    });
  });
});
