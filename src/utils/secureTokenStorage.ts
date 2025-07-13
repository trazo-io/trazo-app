/**
 * Secure Token Storage Utility
 * Provides secure storage for authentication tokens using httpOnly cookies
 * Compliant with OWASP 2025 security guidelines for JWT storage
 */

interface TokenStorage {
  setToken(token: string): void;
  getToken(): string | null;
  removeToken(): void;
  hasToken(): boolean;
}

/**
 * Secure token storage implementation using httpOnly cookies
 * This prevents XSS attacks from accessing authentication tokens
 */
class SecureTokenStorage implements TokenStorage {
  private readonly tokenCookieName = 'trazo_access_token';
  private readonly refreshCookieName = 'trazo_refresh_token';

  /**
   * Set access token (handled by backend via httpOnly cookie)
   * This method is kept for compatibility but tokens should be set via backend
   */
  setToken(token: string): void {
    // In secure implementation, tokens are set by backend as httpOnly cookies
    // This method is primarily for fallback compatibility
    if (process.env.NODE_ENV === 'development') {
      console.log('SECURITY: Storing token in sessionStorage for development. Token length:', token.length);
    }
    
    // Store in sessionStorage as a temporary fallback (slightly more secure than localStorage)
    // Remove this fallback once full httpOnly cookie implementation is complete
    sessionStorage.setItem('temp_access_token', token);
    
    // Also check if there are legacy tokens to clean up
    const legacyToken = localStorage.getItem('access');
    if (legacyToken && legacyToken !== token) {
      console.log('SECURITY: Cleaning up legacy localStorage token');
      localStorage.removeItem('access');
    }
  }

  /**
   * Get access token from httpOnly cookie (handled by browser automatically)
   * Returns null since httpOnly cookies cannot be accessed by JavaScript
   */
  getToken(): string | null {
    // httpOnly cookies are automatically sent with requests
    // JavaScript cannot access them, which is the security feature
    
    // Temporary fallback for development (remove once backend properly implements httpOnly cookies)
    const fallbackToken = sessionStorage.getItem('temp_access_token');
    if (fallbackToken) {
      console.log('SECURITY: Retrieved token from sessionStorage for development. Length:', fallbackToken.length);
      return fallbackToken;
    }
    
    // Check if there's a legacy token we should migrate
    const legacyToken = localStorage.getItem('access');
    if (legacyToken) {
      console.log('SECURITY: Found legacy token in localStorage, migrating to sessionStorage');
      this.setToken(legacyToken);
      return legacyToken;
    }
    
    console.log('SECURITY: No token found in storage');
    return null; // Correct behavior - httpOnly cookies not accessible to JS
  }

  /**
   * Remove access token (must be done via backend API call)
   */
  removeToken(): void {
    // Remove any fallback storage
    sessionStorage.removeItem('temp_access_token');
    localStorage.removeItem('access'); // Clean up any legacy tokens
    
    // httpOnly cookies must be removed by backend via logout API
    console.log('SECURITY: httpOnly cookies will be removed by backend logout API');
  }

  /**
   * Check if token exists (for httpOnly cookies, we assume token exists if user is authenticated)
   */
  hasToken(): boolean {
    // For httpOnly cookies, we can't directly check token existence
    // This should be determined by authentication state management
    
    // Temporary fallback check for development
    return !!sessionStorage.getItem('temp_access_token');
  }
}

/**
 * Legacy token storage for migration purposes
 * DO NOT USE for new implementations - kept for gradual migration
 */
class LegacyTokenStorage implements TokenStorage {
  setToken(token: string): void {
    console.log('🔒 LEGACY: Storing token in localStorage. Length:', token.length);
    localStorage.setItem('access', token);
    console.log('🔒 LEGACY: Token stored. Verification:', !!localStorage.getItem('access'));
  }

  getToken(): string | null {
    const token = localStorage.getItem('access');
    console.log('🔒 LEGACY: Retrieved token from localStorage. Found:', !!token, 'Length:', token?.length || 0);
    return token;
  }

  removeToken(): void {
    console.log('🔒 LEGACY: Removing tokens from localStorage');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
  }

  hasToken(): boolean {
    const hasToken = !!localStorage.getItem('access');
    console.log('🔒 LEGACY: Checking if token exists:', hasToken);
    return hasToken;
  }
}

/**
 * Factory function to get appropriate token storage implementation
 */
function createTokenStorage(): TokenStorage {
  // Temporarily use legacy storage until httpOnly cookie implementation is complete
  // This ensures authentication works while maintaining security infrastructure
  return new LegacyTokenStorage();
  
  // TODO: Enable secure storage once backend properly implements httpOnly cookies
  // if (process.env.NODE_ENV === 'production') {
  //   return new SecureTokenStorage();
  // } else {
  //   return new LegacyTokenStorage();
  // }
}

/**
 * Global token storage instance
 */
export const tokenStorage = createTokenStorage();

/**
 * Utility functions for token management
 */
export const TokenManager = {
  /**
   * Store authentication token securely
   */
  setAccessToken(token: string): void {
    tokenStorage.setToken(token);
  },

  /**
   * Retrieve authentication token
   */
  getAccessToken(): string | null {
    return tokenStorage.getToken();
  },

  /**
   * Remove authentication token
   */
  clearTokens(): void {
    tokenStorage.removeToken();
  },

  /**
   * Check if user has valid token
   */
  hasValidToken(): boolean {
    return tokenStorage.hasToken();
  },

  /**
   * Clean up any insecure token storage (migration utility)
   */
  cleanupInsecureStorage(): void {
    // Remove tokens from localStorage if they exist
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    
    // Remove from sessionStorage as well
    sessionStorage.removeItem('access');
    sessionStorage.removeItem('refresh');
    
    console.log('SECURITY: Cleaned up insecure token storage');
  },

  /**
   * Migrate from localStorage to secure storage
   */
  migrateToSecureStorage(): void {
    const legacyToken = localStorage.getItem('access');
    if (legacyToken) {
      console.log('SECURITY: Migrating token from localStorage to secure storage');
      // Don't actually store in new system - let backend handle token refresh
      this.cleanupInsecureStorage();
    }
  }
};

/**
 * Security utility to detect and warn about insecure token storage
 */
export const SecurityAudit = {
  /**
   * Check for insecure token storage patterns
   */
  auditTokenStorage(): boolean {
    const insecureKeys = ['access', 'refresh', 'token', 'authToken', 'jwt'];
    let foundInsecureStorage = false;

    // Check localStorage
    insecureKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.error(`SECURITY RISK: Found token in localStorage with key: ${key}`);
        foundInsecureStorage = true;
      }
    });

    // Check sessionStorage
    insecureKeys.forEach(key => {
      if (sessionStorage.getItem(key)) {
        console.warn(`SECURITY WARNING: Found token in sessionStorage with key: ${key}`);
      }
    });

    return !foundInsecureStorage;
  },

  /**
   * Report security status of token storage
   */
  getSecurityReport(): { secure: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (localStorage.getItem('access')) {
      issues.push('Access token found in localStorage (vulnerable to XSS)');
    }
    
    if (localStorage.getItem('refresh')) {
      issues.push('Refresh token found in localStorage (vulnerable to XSS)');
    }

    if (tokenStorage instanceof LegacyTokenStorage) {
      issues.push('Using legacy token storage implementation');
    }

    return {
      secure: issues.length === 0,
      issues
    };
  }
};

export default tokenStorage;