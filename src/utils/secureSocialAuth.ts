/**
 * Secure Social Authentication Utilities for Trazo
 * Implements secure OAuth flows compliant with OWASP 2025 guidelines
 * SECURITY: Moves sensitive OAuth configuration to backend
 */

import { toast } from 'react-toastify';

/**
 * Social authentication providers
 */
export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple'
}

/**
 * Social authentication result interface
 */
interface SocialAuthResult {
  success: boolean;
  provider: SocialProvider;
  authCode?: string;
  token?: string;
  error?: string;
}

/**
 * OAuth configuration interface (for backend validation)
 */
interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
  state: string;
}

/**
 * SECURITY: Generate secure random state parameter for CSRF protection
 */
function generateSecureState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * SECURITY: Validate redirect URI to prevent open redirects
 */
function validateRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    const allowedDomains = [
      'trazo.com',
      'app.trazo.com',
      'consumer.trazo.com',
      'localhost' // Only for development
    ];
    
    return allowedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Secure social authentication manager
 */
export class SecureSocialAuth {
  private static instance: SecureSocialAuth;
  private stateStorage = new Map<string, { provider: SocialProvider; timestamp: number }>();
  private readonly STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    // Clean up expired states periodically
    setInterval(() => this.cleanupExpiredStates(), 5 * 60 * 1000);
  }

  public static getInstance(): SecureSocialAuth {
    if (!SecureSocialAuth.instance) {
      SecureSocialAuth.instance = new SecureSocialAuth();
    }
    return SecureSocialAuth.instance;
  }

  /**
   * Clean up expired state parameters
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.stateStorage.entries()) {
      if (now - data.timestamp > this.STATE_EXPIRY) {
        this.stateStorage.delete(state);
      }
    }
  }

  /**
   * SECURITY: Get OAuth configuration from backend (not frontend environment)
   */
  private async getOAuthConfig(provider: SocialProvider): Promise<OAuthConfig> {
    try {
      const response = await fetch('/api/auth/oauth-config/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ provider }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to get OAuth config: ${response.statusText}`);
      }

      const config = await response.json();
      
      // Validate the redirect URI for security
      if (!validateRedirectUri(config.redirectUri)) {
        throw new Error('Invalid redirect URI received from backend');
      }

      return config;
    } catch (error) {
      console.error('Failed to get OAuth configuration:', error);
      throw new Error('OAuth configuration unavailable');
    }
  }

  /**
   * SECURITY: Validate OAuth state parameter to prevent CSRF
   */
  private validateState(state: string, provider: SocialProvider): boolean {
    const storedData = this.stateStorage.get(state);
    if (!storedData) {
      console.error('SECURITY: Invalid or expired OAuth state parameter');
      return false;
    }

    if (storedData.provider !== provider) {
      console.error('SECURITY: OAuth state provider mismatch');
      return false;
    }

    if (Date.now() - storedData.timestamp > this.STATE_EXPIRY) {
      console.error('SECURITY: Expired OAuth state parameter');
      this.stateStorage.delete(state);
      return false;
    }

    // State is valid, remove it to prevent reuse
    this.stateStorage.delete(state);
    return true;
  }

  /**
   * Initiate Google OAuth flow with security measures
   */
  public async initiateGoogleAuth(): Promise<SocialAuthResult> {
    try {
      const config = await this.getOAuthConfig(SocialProvider.GOOGLE);
      const state = generateSecureState();
      
      // Store state for validation
      this.stateStorage.set(state, {
        provider: SocialProvider.GOOGLE,
        timestamp: Date.now()
      });

      // SECURITY: Use backend-provided configuration
      const authUrl = new URL('https://accounts.google.com/oauth/authorize');
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirectUri);
      authUrl.searchParams.set('scope', config.scope.join(' '));
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      // SECURITY: Open in popup to maintain control
      const popup = window.open(
        authUrl.toString(),
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            resolve({
              success: false,
              provider: SocialProvider.GOOGLE,
              error: 'User cancelled authentication'
            });
          }
        }, 1000);

        // Listen for OAuth callback
        window.addEventListener('message', (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'OAUTH_SUCCESS') {
            clearInterval(checkClosed);
            popup?.close();
            
            if (this.validateState(event.data.state, SocialProvider.GOOGLE)) {
              resolve({
                success: true,
                provider: SocialProvider.GOOGLE,
                authCode: event.data.code
              });
            } else {
              resolve({
                success: false,
                provider: SocialProvider.GOOGLE,
                error: 'Invalid OAuth state'
              });
            }
          }
        }, { once: true });
      });

    } catch (error) {
      console.error('Google OAuth initialization failed:', error);
      return {
        success: false,
        provider: SocialProvider.GOOGLE,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process social authentication callback securely
   */
  public async processSocialCallback(
    provider: SocialProvider,
    authCode: string,
    state: string
  ): Promise<SocialAuthResult> {
    try {
      // Validate state parameter
      if (!this.validateState(state, provider)) {
        throw new Error('Invalid OAuth state parameter');
      }

      // Send authorization code to backend for token exchange
      const response = await fetch('/api/auth/social/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          provider,
          authorization_code: authCode,
          state
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Social authentication failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        provider,
        token: result.access_token
      };

    } catch (error) {
      console.error('Social authentication callback failed:', error);
      return {
        success: false,
        provider,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }
}

/**
 * DEPRECATED: Legacy social auth functions
 * These are kept for backward compatibility but should not be used in new code
 */

/**
 * @deprecated Use SecureSocialAuth.getInstance().initiateGoogleAuth() instead
 */
export const initializeGoogleAuth = (): Promise<SocialAuthResult> => {
  console.warn('DEPRECATED: Use SecureSocialAuth for new implementations');
  return SecureSocialAuth.getInstance().initiateGoogleAuth();
};

/**
 * Security utility to detect and remove insecure OAuth configurations
 */
export const OAuthSecurityAudit = {
  /**
   * Check for insecure OAuth client secrets in frontend
   */
  auditOAuthSecurity(): { secure: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for client secrets in environment variables
    const dangerousEnvVars = [
      'VITE_GOOGLE_CLIENT_SECRET',
      'VITE_FACEBOOK_CLIENT_SECRET',
      'VITE_APPLE_CLIENT_SECRET',
      'REACT_APP_GOOGLE_CLIENT_SECRET',
      'REACT_APP_FACEBOOK_CLIENT_SECRET'
    ];

    dangerousEnvVars.forEach(varName => {
      if (import.meta.env[varName]) {
        issues.push(`CRITICAL: Client secret found in environment variable: ${varName}`);
      }
    });

    // Check for hardcoded secrets in localStorage/sessionStorage
    const secretKeys = ['client_secret', 'oauth_secret', 'app_secret'];
    secretKeys.forEach(key => {
      if (localStorage.getItem(key) || sessionStorage.getItem(key)) {
        issues.push(`CRITICAL: OAuth secret found in browser storage: ${key}`);
      }
    });

    return {
      secure: issues.length === 0,
      issues
    };
  },

  /**
   * Clean up any insecure OAuth data
   */
  cleanupInsecureOAuth(): void {
    // Remove any client secrets from storage
    const keysToRemove = [
      'client_secret',
      'oauth_secret',
      'app_secret',
      'google_client_secret',
      'facebook_client_secret',
      'apple_client_secret'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    console.log('SECURITY: Cleaned up insecure OAuth data');
  }
};

/**
 * Default export for the secure social authentication instance
 */
export default SecureSocialAuth.getInstance();