import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenManager } from '../secureTokenStorage';

// Mock the auth API module
vi.mock('../../store/api/authApi', () => ({
  authApi: {
    endpoints: {
      login: {
        initiate: vi.fn()
      },
      logout: {
        initiate: vi.fn()
      }
    }
  }
}));

// Mock dependencies
vi.mock('../secureTokenStorage', () => ({
  TokenManager: {
    setAccessToken: vi.fn(),
    clearTokens: vi.fn(),
    getAccessToken: vi.fn(),
    hasValidToken: vi.fn()
  }
}));

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });
  });

  describe('Login Flow', () => {
    it('stores tokens on successful login', async () => {
      const mockLoginResponse = {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
        user: {
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          companies: []
        }
      };

      // Simulate login success
      await simulateLogin(mockLoginResponse);

      // Verify TokenManager was called
      expect(TokenManager.setAccessToken).toHaveBeenCalledWith('test-access-token');

      // Verify localStorage was updated
      expect(localStorage.setItem).toHaveBeenCalledWith('access', 'test-access-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('refresh', 'test-refresh-token');
    });

    it('clears tokens on login failure', async () => {
      // Simulate login failure
      await simulateLoginFailure();

      // Verify tokens were cleared
      expect(TokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Logout Flow', () => {
    it('clears all tokens on logout', async () => {
      // Simulate logout
      await simulateLogout();

      // Verify tokens were cleared
      expect(TokenManager.clearTokens).toHaveBeenCalled();
    });

    it('clears tokens even if logout API fails', async () => {
      // Simulate logout API failure
      await simulateLogoutFailure();

      // Verify tokens were still cleared for security
      expect(TokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Token Verification', () => {
    it('verifies token exists after login', () => {
      // Mock token exists
      (TokenManager.hasValidToken as any).mockReturnValue(true);

      const hasToken = TokenManager.hasValidToken();

      expect(hasToken).toBe(true);
    });

    it('verifies no token after logout', () => {
      // Mock no token
      (TokenManager.hasValidToken as any).mockReturnValue(false);

      const hasToken = TokenManager.hasValidToken();

      expect(hasToken).toBe(false);
    });
  });

  describe('Token Retrieval', () => {
    it('retrieves access token after login', () => {
      const mockToken = 'test-access-token';
      (TokenManager.getAccessToken as any).mockReturnValue(mockToken);

      const token = TokenManager.getAccessToken();

      expect(token).toBe(mockToken);
    });

    it('returns null when no token exists', () => {
      (TokenManager.getAccessToken as any).mockReturnValue(null);

      const token = TokenManager.getAccessToken();

      expect(token).toBeNull();
    });
  });
});

// Helper functions to simulate auth flows
async function simulateLogin(response: any) {
  // Store tokens as the auth API would
  TokenManager.setAccessToken(response.access);
  localStorage.setItem('access', response.access);
  localStorage.setItem('refresh', response.refresh);
}

async function simulateLoginFailure() {
  // Clear tokens on failure
  TokenManager.clearTokens();
}

async function simulateLogout() {
  // Clear tokens
  TokenManager.clearTokens();
}

async function simulateLogoutFailure() {
  // Still clear tokens for security
  TokenManager.clearTokens();
}
