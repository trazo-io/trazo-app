/**
 * Token Manager — Cookie-based authentication
 *
 * Authentication tokens are stored as httpOnly cookies by the backend.
 * JavaScript cannot (and should not) access them directly.
 * The browser sends them automatically with every request via credentials: 'include'.
 *
 * This module provides:
 * - Session status checking via the non-httpOnly 'logged_in' cookie
 * - Legacy storage cleanup
 */

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const part = parts.pop();
    return part ? part.split(';').shift() : undefined;
  }
  return undefined;
}

export const TokenManager = {
  /**
   * Check if user has an active session.
   * Uses the non-httpOnly 'logged_in' cookie set by the backend.
   */
  hasActiveSession(): boolean {
    return getCookie('logged_in') === 'true';
  },

  /**
   * Clean up legacy token storage from previous implementation.
   * Call once on app init to remove any tokens from localStorage/sessionStorage.
   */
  cleanupLegacyStorage(): void {
    const keysToRemove = ['access', 'refresh', 'token', 'authToken', 'temp_access_token'];
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },

  // Legacy compatibility methods — these are no-ops now since cookies are
  // managed by the backend. Kept to avoid breaking imports during transition.
  setAccessToken(_token: string): void {
    // No-op: access token is set as httpOnly cookie by the backend
  },

  getAccessToken(): string | null {
    // Cannot read httpOnly cookies from JS — this is by design
    return null;
  },

  setRefreshToken(_token: string): void {
    // No-op: refresh token is set as httpOnly cookie by the backend
  },

  getRefreshToken(): string | null {
    // Cannot read httpOnly cookies from JS — this is by design
    return null;
  },

  clearTokens(): void {
    // httpOnly cookies are cleared by the backend logout endpoint.
    // Clean up any legacy storage that might exist.
    this.cleanupLegacyStorage();
  },

  hasValidToken(): boolean {
    return this.hasActiveSession();
  }
};

export default TokenManager;
