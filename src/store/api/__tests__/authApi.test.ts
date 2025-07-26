import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useLoginMutation, useLogoutMutation } from '../authApi'
import baseApi from '../baseApi'
import authSlice from '../../features/authSlice'
import userSlice from '../../features/userSlice'
import companySlice from '../../features/companySlice'
import { TokenManager } from '../../../utils/secureTokenStorage'

// Mock the TokenManager
vi.mock('../../../utils/secureTokenStorage', () => ({
  TokenManager: {
    setAccessToken: vi.fn(),
    clearTokens: vi.fn(),
    getAccessToken: vi.fn(),
    hasValidToken: vi.fn()
  }
}))

// Mock fetch for RTK Query
global.fetch = vi.fn()

// Test wrapper with store
const createWrapper = () => {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authSlice,
      user: userSlice,
      company: companySlice
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware)
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
  const wrapper = Wrapper

  return { wrapper, store }
}

describe('authApi Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }
    Object.defineProperty(window, 'localStorage', { 
      value: localStorageMock,
      writable: true 
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useLoginMutation', () => {
    it('successfully logs in and stores tokens', async () => {
      const mockResponse = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          companies: []
        }
      }

      // Mock successful fetch response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useLoginMutation(), { wrapper })

      // Trigger login
      const loginPromise = result.current[0]({
        email: 'test@example.com',
        password: 'password123'
      })

      await waitFor(() => {
        expect(result.current[1].isLoading).toBe(true)
      })

      const response = await loginPromise

      // Verify tokens were stored
      expect(TokenManager.setAccessToken).toHaveBeenCalledWith('test-access-token')
      expect(localStorage.setItem).toHaveBeenCalledWith('access', 'test-access-token')
      expect(localStorage.setItem).toHaveBeenCalledWith('refresh', 'test-refresh-token')

      // Verify response
      expect(response.data).toEqual(mockResponse)
    })

    it('handles login failure and clears tokens', async () => {
      // Mock failed fetch response
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useLoginMutation(), { wrapper })

      try {
        await result.current[0]({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      } catch (error) {
        // Expected to throw
      }

      // Verify tokens were cleared on failure
      await waitFor(() => {
        expect(TokenManager.clearTokens).toHaveBeenCalled()
      })
    })

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
      }

      const mockCompanyResponse = {
        id: 123,
        name: 'Test Company',
        description: 'A test company'
      }

      // Mock successful login response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      // Mock company fetch response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompanyResponse
      })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useLoginMutation(), { wrapper })

      await result.current[0]({
        email: 'test@example.com',
        password: 'password123'
      })

      // Wait for company data to be fetched
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      // Verify both API calls were made
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login/'),
        expect.any(Object)
      )
    })
  })

  describe('useLogoutMutation', () => {
    it('successfully logs out and clears tokens', async () => {
      // Mock successful logout response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detail: 'Logged out successfully' })
      })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useLogoutMutation(), { wrapper })

      await result.current[0]()

      // Verify tokens were cleared
      expect(TokenManager.clearTokens).toHaveBeenCalled()
    })

    it('clears tokens even if logout API fails', async () => {
      // Mock failed logout response
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useLogoutMutation(), { wrapper })

      try {
        await result.current[0]()
      } catch (error) {
        // Expected to fail
      }

      // Verify tokens were still cleared for security
      await waitFor(() => {
        expect(TokenManager.clearTokens).toHaveBeenCalled()
      })
    })
  })

  describe('Token Storage Integration', () => {
    it('stores tokens in correct order during login', async () => {
      const mockResponse = {
        access: 'access-token',
        refresh: 'refresh-token',
        user: {
          id: 1,
          email: 'test@example.com',
          companies: []
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useLoginMutation(), { wrapper })

      await result.current[0]({
        email: 'test@example.com',
        password: 'password123'
      })

      // Verify token storage order
      const calls = (TokenManager.setAccessToken as any).mock.calls
      expect(calls[0][0]).toBe('access-token')

      // Verify localStorage was also updated
      expect(localStorage.setItem).toHaveBeenCalledWith('access', 'access-token')
      expect(localStorage.setItem).toHaveBeenCalledWith('refresh', 'refresh-token')
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useLoginMutation(), { wrapper })

      const [login, { isError, error }] = result.current

      try {
        await login({ email: 'test@example.com', password: 'password123' })
      } catch (err) {
        // Expected error
      }

      await waitFor(() => {
        expect(result.current[1].isError).toBe(true)
      })
    })

    it('handles server validation errors', async () => {
      const mockErrorResponse = {
        non_field_errors: ['Invalid credentials']
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse
      })

      const { wrapper } = createWrapper()
      const { result } = renderHook(() => useLoginMutation(), { wrapper })

      try {
        await result.current[0]({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      } catch (error: any) {
        expect(error.data).toEqual(mockErrorResponse)
      }
    })
  })
})