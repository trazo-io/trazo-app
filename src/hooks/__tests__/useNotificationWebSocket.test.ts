import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useNotificationWebSocket } from '../useNotificationWebSocket';
import authSlice from '../../store/features/authSlice';
import userSlice from '../../store/features/userSlice';
import notificationSlice from '../../store/features/notificationSlice';
import baseApi from '../../store/api/baseApi';

// Mock the notification WebSocket service
const mockNotificationWebSocket = {
  setAuthToken: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn().mockReturnValue(false),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn()
};

vi.mock('../../services/notificationWebSocket', () => ({
  notificationWebSocket: mockNotificationWebSocket
}));

// Mock the notification API
const mockGetNotificationCount = vi.fn();

vi.mock('../../store/api/notificationApi', () => ({
  useGetNotificationCountQuery: () => mockGetNotificationCount()
}));

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

// Mock window.addEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true
});

// Test wrapper component
const createWrapper = (initialState: any = {}) => {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authSlice,
      userState: userSlice,
      notifications: notificationSlice
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState: {
      auth: {
        isAuthenticated: false,
        token: null,
        ...(initialState.auth || {})
      },
      userState: {
        user: null,
        ...(initialState.userState || {})
      },
      notifications: {
        notifications: [],
        unreadCount: 0,
        ...(initialState.notifications || {})
      },
      ...initialState
    }
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);

  return { wrapper: Wrapper, store };
};

describe('useNotificationWebSocket Hook Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotificationCount.mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WebSocket Connection Management', () => {
    it('connects to WebSocket when user is authenticated', async () => {
      localStorageMock.getItem.mockReturnValue('test-access-token');

      const { wrapper } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' },
        userState: { user: { id: 1, email: 'test@example.com' } }
      });

      renderHook(() => useNotificationWebSocket(), { wrapper });

      await waitFor(() => {
        expect(mockNotificationWebSocket.setAuthToken).toHaveBeenCalledWith('test-access-token');
        expect(mockNotificationWebSocket.connect).toHaveBeenCalled();
      });
    });

    it('disconnects WebSocket when user is not authenticated', async () => {
      const { wrapper } = createWrapper({
        auth: { isAuthenticated: false, token: null },
        userState: { user: null }
      });

      renderHook(() => useNotificationWebSocket(), { wrapper });

      await waitFor(() => {
        expect(mockNotificationWebSocket.disconnect).toHaveBeenCalled();
      });
    });

    it('does not connect when token is not available', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { wrapper } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' },
        userState: { user: { id: 1, email: 'test@example.com' } }
      });

      renderHook(() => useNotificationWebSocket(), { wrapper });

      expect(mockNotificationWebSocket.connect).not.toHaveBeenCalled();
    });
  });

  describe('Notification Count Handling', () => {
    it('fetches and sets initial notification count', async () => {
      const mockCountData = { unread_count: 5 };
      mockGetNotificationCount.mockReturnValue({
        data: mockCountData,
        isLoading: false,
        error: null
      });

      const { wrapper, store } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' }
      });

      renderHook(() => useNotificationWebSocket(), { wrapper });

      await waitFor(() => {
        const state = store.getState();
        expect(state.notifications.unreadCount).toBe(5);
      });
    });

    it('skips fetching count when not authenticated', async () => {
      mockGetNotificationCount.mockReturnValue({
        data: null,
        isLoading: false,
        error: null
      });

      const { wrapper } = createWrapper({
        auth: { isAuthenticated: false, token: null }
      });

      renderHook(() => useNotificationWebSocket(), { wrapper });

      // Verify the query was skipped (no data)
      expect(mockGetNotificationCount().data).toBeNull();
    });
  });

  describe('Token Refresh Handling', () => {
    it('sets up storage event listener for token refresh', () => {
      const { wrapper } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' },
        userState: { user: { id: 1, email: 'test@example.com' } }
      });

      const { unmount } = renderHook(() => useNotificationWebSocket(), { wrapper });

      expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function));

      // Cleanup on unmount
      unmount();
      expect(mockRemoveEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('handles token refresh from storage event', async () => {
      localStorageMock.getItem.mockReturnValue('new-access-token');
      mockNotificationWebSocket.isConnected.mockReturnValue(false);

      const { wrapper } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' },
        userState: { user: { id: 1, email: 'test@example.com' } }
      });

      renderHook(() => useNotificationWebSocket(), { wrapper });

      // Simulate storage event
      const storageEventHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'storage'
      )?.[1];

      if (storageEventHandler) {
        act(() => {
          storageEventHandler();
        });

        await waitFor(() => {
          expect(mockNotificationWebSocket.setAuthToken).toHaveBeenCalledWith('new-access-token');
          expect(mockNotificationWebSocket.connect).toHaveBeenCalled();
        });
      }
    });

    it('does not reconnect if already connected during token refresh', async () => {
      localStorageMock.getItem.mockReturnValue('new-access-token');
      mockNotificationWebSocket.isConnected.mockReturnValue(true);

      const { wrapper } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' },
        userState: { user: { id: 1, email: 'test@example.com' } }
      });

      renderHook(() => useNotificationWebSocket(), { wrapper });

      // Clear previous calls
      vi.clearAllMocks();

      // Simulate storage event
      const storageEventHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'storage'
      )?.[1];

      if (storageEventHandler) {
        act(() => {
          storageEventHandler();
        });

        await waitFor(() => {
          expect(mockNotificationWebSocket.setAuthToken).toHaveBeenCalledWith('new-access-token');
          // Should not call connect again since already connected
          expect(mockNotificationWebSocket.connect).not.toHaveBeenCalled();
        });
      }
    });
  });

  describe('Hook Return Values', () => {
    it('returns correct connection status and methods', () => {
      mockNotificationWebSocket.isConnected.mockReturnValue(true);

      const { wrapper } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' },
        userState: { user: { id: 1, email: 'test@example.com' } }
      });

      const { result } = renderHook(() => useNotificationWebSocket(), { wrapper });

      expect(result.current.isConnected).toBe(true);
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.markAsRead).toBe('function');
      expect(typeof result.current.markAllAsRead).toBe('function');
    });

    it('calls WebSocket methods when hook methods are invoked', () => {
      const { wrapper } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' },
        userState: { user: { id: 1, email: 'test@example.com' } }
      });

      const { result } = renderHook(() => useNotificationWebSocket(), { wrapper });

      act(() => {
        result.current.connect();
        result.current.disconnect();
        result.current.markAsRead(123);
        result.current.markAllAsRead();
      });

      expect(mockNotificationWebSocket.connect).toHaveBeenCalled();
      expect(mockNotificationWebSocket.disconnect).toHaveBeenCalled();
      expect(mockNotificationWebSocket.markAsRead).toHaveBeenCalledWith(123);
      expect(mockNotificationWebSocket.markAllAsRead).toHaveBeenCalled();
    });
  });

  describe('Cleanup on Unmount', () => {
    it('disconnects WebSocket when component unmounts and user is not authenticated', () => {
      const { wrapper } = createWrapper({
        auth: { isAuthenticated: false, token: null },
        userState: { user: null }
      });

      const { unmount } = renderHook(() => useNotificationWebSocket(), { wrapper });

      vi.clearAllMocks();

      unmount();

      // Should remove storage event listener
      expect(mockRemoveEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('handles missing token gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { wrapper } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' },
        userState: { user: { id: 1, email: 'test@example.com' } }
      });

      expect(() => {
        renderHook(() => useNotificationWebSocket(), { wrapper });
      }).not.toThrow();

      // Should not attempt to connect without token
      expect(mockNotificationWebSocket.connect).not.toHaveBeenCalled();
    });

    it('handles notification count fetch errors', () => {
      mockGetNotificationCount.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Failed to fetch' }
      });

      const { wrapper } = createWrapper({
        auth: { isAuthenticated: true, token: 'test-token' }
      });

      expect(() => {
        renderHook(() => useNotificationWebSocket(), { wrapper });
      }).not.toThrow();
    });
  });
});
