/**
 * Social Authentication Utilities for Trazo
 * Handles OAuth flows for Google, Facebook, and Apple Sign In
 */

import { toast } from 'react-toastify';

// Type definitions for social auth
interface SocialAuthCredentials {
  provider: 'google' | 'facebook' | 'apple';
  id_token?: string;
  access_token?: string;
  user_type: number;
  user?: any; // Apple Sign In user data
  invitation_code?: string;
}

interface GoogleAuthResponse {
  credential?: string;
}

interface FacebookAuthResponse {
  authResponse?: {
    accessToken: string;
  };
}

interface AppleAuthResponse {
  authorization?: {
    id_token: string;
  };
  user?: any;
}

type AuthSuccessCallback = (credentials: SocialAuthCredentials) => void;
type AuthErrorCallback = (error: Error) => void;

// OAuth Client IDs - these should be set in environment variables
// In Vite, environment variables must be prefixed with VITE_
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID;

/**
 * Initialize Google OAuth
 */
export const initializeGoogleAuth = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('Google Client ID not configured'));
      return;
    }

    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: resolve,
        cancel_on_tap_outside: false
      });
    } else {
      reject(new Error('Google SDK not loaded'));
    }
  });
};

/**
 * Handle Google Sign In.
 * - Production: uses GIS SDK directly (real domains are valid origins)
 * - Development: uses manual popup with localhost redirect (app.localhost not accepted by Google)
 */
export const handleGoogleSignIn = async (
  onSuccess: AuthSuccessCallback,
  onError: AuthErrorCallback,
  userType: number = 4
): Promise<void> => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured');
    }

    const isDev = import.meta.env.DEV;

    if (!isDev) {
      // Production: use GIS SDK token client (origin is a valid public domain)
      if (!window.google) {
        await loadGoogleSDK();
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: (response: any) => {
          if (response.access_token) {
            onSuccess({
              provider: 'google',
              access_token: response.access_token,
              user_type: userType
            });
          } else {
            onError(new Error('No access token received from Google'));
          }
        },
        error_callback: (error: any) => {
          onError(new Error(error?.message || 'Google sign in failed'));
        }
      });

      tokenClient.requestAccessToken();
      return;
    }

    // Development: manual popup flow via localhost redirect
    const redirectUri = 'http://localhost:3000/auth/google/callback';
    const scope = 'email profile openid';

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scope)}` +
      `&prompt=select_account`;

    const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');

    if (!popup) {
      throw new Error('popup_blocked');
    }

    const handleMessage = (event: MessageEvent) => {
      // SECURITY: Validate message origin to prevent token theft
      const expectedOrigin = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
      if (event.origin !== expectedOrigin) return;

      if (event.data?.type !== 'google-auth-callback') return;

      window.removeEventListener('message', handleMessage);
      clearInterval(checkClosed);

      if (event.data.access_token) {
        onSuccess({
          provider: 'google',
          access_token: event.data.access_token,
          user_type: userType
        });
      } else if (event.data.error) {
        onError(new Error(event.data.error));
      }
    };

    window.addEventListener('message', handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  } catch (error) {
    console.error('Google Sign In error:', error);
    onError(error);
  }
};

/**
 * Handle Facebook Sign In
 */
export const handleFacebookSignIn = async (
  onSuccess: AuthSuccessCallback,
  onError: AuthErrorCallback,
  userType: number = 4
): Promise<void> => {
  try {
    if (!FACEBOOK_APP_ID) {
      throw new Error('Facebook App ID not configured');
    }

    // Load Facebook SDK
    if (!window.FB) {
      await loadFacebookSDK();
    }

    window.FB.login(
      (response) => {
        if (response.authResponse) {
          // Get user access token
          const accessToken = response.authResponse.accessToken;

          onSuccess({
            provider: 'facebook',
            access_token: accessToken,
            user_type: userType
          });
        } else {
          onError(new Error('Facebook login cancelled or failed'));
        }
      },
      {
        scope: 'email,public_profile',
        return_scopes: true
      }
    );
  } catch (error) {
    console.error('Facebook Sign In error:', error);
    onError(error);
  }
};

/**
 * Handle Apple Sign In
 */
export const handleAppleSignIn = async (
  onSuccess: AuthSuccessCallback,
  onError: AuthErrorCallback,
  userType: number = 4
): Promise<void> => {
  try {
    if (!APPLE_CLIENT_ID) {
      throw new Error('Apple Client ID not configured');
    }

    // Load Apple ID SDK
    if (!window.AppleID) {
      await loadAppleSDK();
    }

    const response = await window.AppleID.auth.signIn({
      clientId: APPLE_CLIENT_ID,
      redirectURI: window.location.origin,
      scope: 'name email',
      responseType: 'code id_token',
      responseMode: 'fragment'
    });

    if (response.authorization) {
      onSuccess({
        provider: 'apple',
        id_token: response.authorization.id_token,
        user_type: userType,
        user: response.user // Name data (only provided on first sign-in)
      });
    } else {
      onError(new Error('Apple Sign In failed'));
    }
  } catch (error) {
    console.error('Apple Sign In error:', error);
    onError(error);
  }
};

/**
 * Load Google Identity Services SDK
 */
const loadGoogleSDK = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Load Facebook SDK
 */
const loadFacebookSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Load Apple ID SDK
 */
const loadAppleSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.AppleID) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src =
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Generic error handler for social authentication
 */
export const handleSocialAuthError = (error: Error, provider: string): void => {
  console.error(`${provider} authentication error:`, error);

  let errorMessage = `${provider} sign in failed. Please try again.`;

  if (error.message.includes('not configured')) {
    errorMessage = `${provider} sign in is not properly configured.`;
  } else if (error.message.includes('cancelled')) {
    errorMessage = `${provider} sign in was cancelled.`;
  } else if (error.message.includes('popup_blocked')) {
    errorMessage = 'Please allow popups for social sign in to work.';
  }

  toast.error(errorMessage);
};

/**
 * Check if OAuth environment variables are configured
 */
export const checkSocialAuthConfig = (): { google: boolean; facebook: boolean; apple: boolean } => {
  const config = {
    google: !!GOOGLE_CLIENT_ID,
    facebook: !!FACEBOOK_APP_ID,
    apple: !!APPLE_CLIENT_ID
  };

  console.log('Social Auth Configuration:', config);
  return config;
};
