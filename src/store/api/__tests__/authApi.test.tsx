import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useLoginMutation, useLogoutMutation } from '../authApi';
import baseApi from '../baseApi';
import authSlice from '../../features/authSlice';
import userSlice from '../../features/userSlice';
import companySlice from '../../features/companySlice';
import { TokenManager } from '../../../utils/secureTokenStorage';

// Mock the TokenManager
vi.mock('../../../utils/secureTokenStorage', () => ({
  TokenManager: {
    setAccessToken: vi.fn(),
    clearTokens: vi.fn(),
    // Added 2026-08-04: authApi calls this on login/refresh to erase tokens a
    // pre-httpOnly-cookie session left in localStorage. It was missing from the
    // mock, so the call hit `undefined` — invisible while this whole file was
    // failing to parse and collecting zero tests.
    cleanupLegacyStorage: vi.fn(),
    getAccessToken: vi.fn(),
    hasValidToken: vi.fn()
  }
}));

// Mock fetch for RTK Query
global.fetch = vi.fn();

// Test wrapper with store
const createWrapper = () => {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authSlice,
      user: userSlice,
      company: companySlice
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware)
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const wrapper = Wrapper;

  return { wrapper, store };
};

/**
 * ⚠️ SKIPPED — the HTTP mocking in this file has never worked. Do not un-skip
 * without replacing it; see below.
 *
 * History (2026-08-04): this file was named `.ts` while containing JSX, so
 * vitest could not parse it and collected ZERO tests. It reported no failure,
 * so nobody noticed. Renaming it to `.tsx` made it run for the first time —
 * 3 of 8 failed immediately.
 *
 * Investigating those 3 showed the other 5 were passing for the wrong reason.
 * `global.fetch = vi.fn()` is assigned at module scope, but ES imports are
 * hoisted, so `customFetchBase.ts` has already evaluated
 * `fetchBaseQuery({...})` and captured the REAL `fetch` by then. Verified
 * directly: driving customFetchBase after assigning the mock leaves
 * `fetch.mock.calls.length === 0`.
 *
 * So every request here hits jsdom's real fetch and fails. Tests asserting an
 * error state "passed"; tests asserting a success path failed. None of them
 * exercised what they claim to.
 *
 * To restore real coverage, intercept at the network layer (MSW) or give
 * `fetchBaseQuery` an injectable `fetchFn`. Assigning `global.fetch` cannot
 * work with this module structure.
 *
 * The httpOnly-cookie security property these tests were rewritten to pin —
 * "the frontend never stores a token in JS-readable storage" — is worth
 * keeping. It needs a harness that actually reaches the code.
 */
describe.skip('authApi Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useLoginMutation', () => {
    /**
     * ⚠️ This file could not be parsed until 2026-08-04 — it was named `.ts`
     * while containing JSX, so vitest collected ZERO tests from it and the
     * suite reported no failure. Everything below had never executed.
     *
     * When it finally ran, four tests failed because they asserted the
     * PRE-COOKIE auth architecture: `TokenManager.setAccessToken(...)` and
     * `localStorage.setItem('access', ...)`. Trazo moved to pure httpOnly
     * cookie JWTs — `authApi.js` says so explicitly: "Tokens are set as
     * httpOnly cookies by the backend. No need to store them in JS."
     *
     * The tests were stale, not the code. Rewritten to pin the CURRENT
     * security contract, which is the more valuable assertion: the frontend
     * must never hold a token in JS-readable storage. If someone reintroduces
     * localStorage token handling, this now fails.
     */
    it('does NOT store tokens in JS-readable storage — httpOnly cookies only', async () => {
      const mockResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          companies: []
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      await result.current[0]({
        email: 'test@example.com',
        password: 'password123'
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // The security property. Tokens live in httpOnly cookies the browser
      // manages; JS must never see or persist them.
      expect(TokenManager.setAccessToken).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalledWith('access', expect.anything());
      expect(localStorage.setItem).not.toHaveBeenCalledWith('refresh', expect.anything());
    });

    it('surfaces a login failure without writing any token state', async () => {
      // Was "handles login failure and clears tokens", asserting
      // TokenManager.clearTokens() on a failed LOGIN. That never happened:
      // clearTokens is called by the LOGOUT mutation (authApi.js), and login
      // failure has no token state to clear because none is ever written.
      // Assert what the code actually guarantees instead.
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      try {
        await result.current[0]({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      } catch {
        // RTK Query surfaces the error on the hook result, not by throwing.
      }

      await waitFor(() => {
        expect(result.current[1].isError).toBe(true);
      });
      expect(TokenManager.setAccessToken).not.toHaveBeenCalled();
    });

    it('handles login with company data', async () => {
      const mockResponse = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          companies: [{ id: 123, name: 'Test Company' }]
        }
      };

      const mockCompanyResponse = {
        id: 123,
        name: 'Test Company',
        description: 'A test company'
      };

      // Mock successful login response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // Mock company fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompanyResponse
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      await result.current[0]({
        email: 'test@example.com',
        password: 'password123'
      });

      // Wait for company data to be fetched
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Verify both API calls were made
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login/'),
        expect.any(Object)
      );
    });
  });

  describe('useLogoutMutation', () => {
    it('successfully logs out and clears tokens', async () => {
      // Mock successful logout response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detail: 'Logged out successfully' })
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLogoutMutation(), { wrapper });

      await result.current[0]();

      // Verify tokens were cleared
      expect(TokenManager.clearTokens).toHaveBeenCalled();
    });

    it('clears tokens even if logout API fails', async () => {
      // Mock failed logout response
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLogoutMutation(), { wrapper });

      try {
        await result.current[0]();
      } catch (error) {
        // Expected to fail
      }

      // Verify tokens were still cleared for security
      await waitFor(() => {
        expect(TokenManager.clearTokens).toHaveBeenCalled();
      });
    });
  });

  describe('Token Storage Integration', () => {
    it('purges legacy client-side token storage on login', async () => {
      // Was "stores tokens in correct order during login", reading
      // `TokenManager.setAccessToken.mock.calls[0][0]` — undefined under cookie
      // auth, hence "Cannot read properties of undefined (reading '0')".
      //
      // The real behaviour on login is the opposite: authApi calls
      // `cleanupLegacyStorage()` to ERASE any tokens left in localStorage by a
      // pre-cookie session. That migration path is worth pinning — a user who
      // logged in before the cookie switch still has tokens sitting in
      // localStorage until this runs.
      const mockResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          companies: []
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      await result.current[0]({
        email: 'test@example.com',
        password: 'password123'
      });

      await waitFor(() => {
        expect(TokenManager.cleanupLegacyStorage).toHaveBeenCalled();
      });
      expect(TokenManager.setAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      const [login, { isError, error }] = result.current;

      try {
        await login({ email: 'test@example.com', password: 'password123' });
      } catch (err) {
        // Expected error
      }

      await waitFor(() => {
        expect(result.current[1].isError).toBe(true);
      });
    });

    it('handles server validation errors', async () => {
      const mockErrorResponse = {
        non_field_errors: ['Invalid credentials']
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      try {
        await result.current[0]({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      } catch (error: any) {
        expect(error.data).toEqual(mockErrorResponse);
      }
    });
  });
});
