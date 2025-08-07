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
 * Handle Google Sign In
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

    // Load Google Identity Services
    if (!window.google) {
      await loadGoogleSDK();
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) {
          // Extract ID token from response
          onSuccess({
            provider: 'google',
            id_token: response.credential,
            user_type: userType
          });
        } else {
          onError(new Error('No credential received from Google'));
        }
      },
      cancel_on_tap_outside: false
    });

    // Show the Google Sign In prompt
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback to popup
        window.google.accounts.id.renderButton(document.getElementById('g_id_signin'), {
          theme: 'outline',
          size: 'large',
          width: '100%'
        });
      }
    });
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
