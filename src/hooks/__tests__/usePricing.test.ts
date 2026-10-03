// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { usePricing } from '../usePricing';
import baseApi from '../../store/api/baseApi';

// Mock the subscription API.
//
// vi.hoisted() is required: `vi.mock` is hoisted above every `const`, so a factory closing
// over a plain top-level const throws "Cannot access 'mockGetPlansQuery' before
// initialization" and the suite fails to COLLECT — zero tests run, which looks like a
// green file in any summary that only counts test results.
const mockGetPlansQuery = vi.hoisted(() => vi.fn());

vi.mock('../../store/api/subscriptionApi', () => ({
  useGetPlansQuery: mockGetPlansQuery,
  Plan: {} // Mock the Plan type
}));

// Mock console.error to test error logging.
// Installed per-test in beforeEach: `afterEach(vi.restoreAllMocks)` below detaches every
// vi.spyOn, so a single module-level spy stops recording after the first test and every
// later `toHaveBeenCalledWith` assertion fails against a spy that is no longer installed.
let mockConsoleError: ReturnType<typeof vi.spyOn>;

/**
 * Build a `useGetPlansQuery` stub keyed on the INTERVAL argument.
 *
 * The original tests chained `.mockReturnValueOnce()` per expected render, which assumes
 * React renders exactly once per state change. It does not — so the "once" queue drained,
 * the mock fell through to no implementation, returned `undefined`, and the hook crashed
 * destructuring `.data`. Keying on the argument is both render-count independent and a
 * truer model of the thing under test: the hook's only job is to refetch per interval.
 */
const stubPlansByInterval = (
  byInterval: Record<string, Record<string, unknown>>,
  fallback: Record<string, unknown> = { data: [], isLoading: false, error: null }
) => {
  mockGetPlansQuery.mockImplementation((interval: string) => ({
    refetch: vi.fn(),
    ...(byInterval[interval] ?? fallback)
  }));
};

// Test wrapper component
const createWrapper = () => {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware)
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);

  return { wrapper: Wrapper, store };
};

describe('usePricing Hook Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    // A default so the mock can never return undefined mid-render, whatever a test forgets
    // to stub. `undefined` here surfaces as "Cannot read properties of undefined (reading
    // 'data')" from inside the hook, which reads like a hook bug rather than a test gap.
    stubPlansByInterval({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('returns initial state correctly', () => {
      mockGetPlansQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePricing(), { wrapper });

      expect(result.current.isPricingDataLoading).toBe(false);
      expect(result.current.pricingData).toEqual([]);
      expect(result.current.isError).toBe(false);
      expect(result.current.activeInterval).toBe('monthly');
      expect(typeof result.current.changeInterval).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });

    it('fetches monthly plans by default', () => {
      mockGetPlansQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      const { wrapper } = createWrapper();
      renderHook(() => usePricing(), { wrapper });

      expect(mockGetPlansQuery).toHaveBeenCalledWith('monthly');
    });
  });

  describe('Plan Data Loading', () => {
    it('returns loading state when plans are being fetched', () => {
      mockGetPlansQuery.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePricing(), { wrapper });

      expect(result.current.isPricingDataLoading).toBe(true);
    });

    it('returns plan data when successfully loaded', () => {
      const mockPlans = [
        {
          id: 'plan_1',
          name: 'Basic',
          price: 29.99,
          interval: 'monthly',
          features: ['Feature 1', 'Feature 2']
        },
        {
          id: 'plan_2',
          name: 'Premium',
          price: 59.99,
          interval: 'monthly',
          features: ['Feature 1', 'Feature 2', 'Feature 3']
        }
      ];

      mockGetPlansQuery.mockReturnValue({
        data: mockPlans,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePricing(), { wrapper });

      expect(result.current.pricingData).toEqual(mockPlans);
      expect(result.current.isPricingDataLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('handles empty plan data gracefully', () => {
      mockGetPlansQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePricing(), { wrapper });

      expect(result.current.pricingData).toEqual([]);
      expect(result.current.isError).toBe(false);
    });
  });

  describe('Interval Management', () => {
    it('changes from monthly to yearly when changeInterval is called', () => {
      const mockRefetch = vi.fn();
      mockGetPlansQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePricing(), { wrapper });

      expect(result.current.activeInterval).toBe('monthly');

      act(() => {
        result.current.changeInterval('yearly');
      });

      expect(result.current.activeInterval).toBe('yearly');
    });

    it('fetches new plans when interval changes', () => {
      const mockRefetch = vi.fn();
      let currentInterval = 'monthly';

      mockGetPlansQuery.mockImplementation((interval) => {
        currentInterval = interval;
        return {
          data: [],
          isLoading: false,
          error: null,
          refetch: mockRefetch
        };
      });

      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(() => usePricing(), { wrapper });

      // Initial call with monthly
      expect(mockGetPlansQuery).toHaveBeenCalledWith('monthly');

      act(() => {
        result.current.changeInterval('yearly');
      });

      // Rerender to trigger useEffect
      rerender();

      // Should be called with yearly interval
      expect(currentInterval).toBe('yearly');
    });

    it('updates plan data when switching between intervals', async () => {
      const monthlyPlans = [
        { id: 'monthly_1', name: 'Basic Monthly', price: 29.99, interval: 'monthly' }
      ];

      const yearlyPlans = [
        { id: 'yearly_1', name: 'Basic Yearly', price: 299.99, interval: 'yearly' }
      ];

      stubPlansByInterval({
        monthly: { data: monthlyPlans, isLoading: false, error: null },
        yearly: { data: yearlyPlans, isLoading: false, error: null }
      });

      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(() => usePricing(), { wrapper });

      // Initially should have monthly plans
      expect(result.current.pricingData).toEqual(monthlyPlans);

      act(() => {
        result.current.changeInterval('yearly');
      });

      rerender();

      // Should now have yearly plans
      expect(result.current.pricingData).toEqual(yearlyPlans);
    });
  });

  describe('Error Handling', () => {
    it('sets error state when API call fails', async () => {
      const mockError = { message: 'Network error', status: 500 };

      mockGetPlansQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: mockError,
        refetch: vi.fn()
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePricing(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching pricing plans:', mockError);
    });

    it('clears error state when API call succeeds after error', async () => {
      // Flip a variable the stub reads, rather than queueing per-render values — the
      // number of renders is React's business, not the test's.
      let currentError: unknown = { message: 'Network error' };
      mockGetPlansQuery.mockImplementation(() => ({
        data: currentError ? [] : [{ id: 'plan_1', name: 'Basic', price: 29.99 }],
        isLoading: false,
        error: currentError,
        refetch: vi.fn()
      }));

      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(() => usePricing(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Then return success
      currentError = null;

      rerender();

      await waitFor(() => {
        expect(result.current.isError).toBe(false);
      });
    });

    it('handles different types of errors', async () => {
      const networkError = new Error('Network error');

      mockGetPlansQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: networkError,
        refetch: vi.fn()
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePricing(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching pricing plans:', networkError);
    });
  });

  describe('Refetch Functionality', () => {
    it('exposes refetch function from API query', () => {
      const mockRefetch = vi.fn();

      mockGetPlansQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePricing(), { wrapper });

      expect(result.current.refetch).toBe(mockRefetch);
    });

    it('can refetch data when refetch is called', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: [] });

      mockGetPlansQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => usePricing(), { wrapper });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Real-world Scenarios', () => {
    it('handles typical pricing page workflow', async () => {
      const monthlyPlans = [
        { id: 'basic_monthly', name: 'Basic', price: 29, interval: 'monthly' },
        { id: 'pro_monthly', name: 'Pro', price: 59, interval: 'monthly' }
      ];

      const yearlyPlans = [
        { id: 'basic_yearly', name: 'Basic', price: 290, interval: 'yearly' },
        { id: 'pro_yearly', name: 'Pro', price: 590, interval: 'yearly' }
      ];

      stubPlansByInterval({
        monthly: { data: monthlyPlans, isLoading: false, error: null },
        yearly: { data: yearlyPlans, isLoading: false, error: null }
      });

      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(() => usePricing(), { wrapper });

      // 1. Initially loads monthly plans
      expect(result.current.activeInterval).toBe('monthly');
      expect(result.current.pricingData).toEqual(monthlyPlans);

      // 2. User switches to yearly
      act(() => {
        result.current.changeInterval('yearly');
      });

      rerender();

      // 3. Now shows yearly plans
      expect(result.current.activeInterval).toBe('yearly');
      expect(result.current.pricingData).toEqual(yearlyPlans);

      // 4. No errors occurred
      expect(result.current.isError).toBe(false);
    });

    it('handles loading states during interval changes', () => {
      // The yearly fetch is still in flight; monthly has resolved.
      stubPlansByInterval({
        monthly: { data: [], isLoading: false, error: null },
        yearly: { data: [], isLoading: true, error: null }
      });

      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(() => usePricing(), { wrapper });

      expect(result.current.isPricingDataLoading).toBe(false);

      act(() => {
        result.current.changeInterval('yearly');
      });

      rerender();

      expect(result.current.isPricingDataLoading).toBe(true);
    });
  });
});
