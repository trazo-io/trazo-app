import { config } from 'config/environment';
import { BaseQueryApi } from '@reduxjs/toolkit/dist/query/baseQueryTypes';
import { Mutex } from 'async-mutex';
import { fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { validateRedirectUrl, createSafeRedirectUrl } from 'utils/urlValidator';
import { TokenManager } from 'utils/secureTokenStorage';

// Create a new mutex for handling concurrent requests
const mutex = new Mutex();

/**
 * Utility function to get cookies following browser standards
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

/**
 * Base query configuration with centralized environment management
 */
const baseQuery = fetchBaseQuery({
  baseUrl: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
  credentials: 'include',
  prepareHeaders: (headers) => {
    // Set required headers for AJAX requests
    headers.set('X-Requested-With', 'XMLHttpRequest');
    headers.set('Accept', 'application/json');

    // Get and set CSRF token
    const csrfToken = getCookie(config.CSRF_COOKIE_NAME);
    console.log('🔒 CSRF: Looking for CSRF token. Cookie name:', config.CSRF_COOKIE_NAME, 'Found:', !!csrfToken);
    console.log('🔒 CSRF: All cookies:', document.cookie);
    if (csrfToken) {
      headers.set(config.CSRF_HEADER_KEY, csrfToken);
      console.log('🔒 CSRF: Added CSRF token to headers:', csrfToken.substring(0, 10) + '...');
    } else {
      console.log('🔒 CSRF: No CSRF token found - request may fail CSRF validation');
      console.log('🔒 CSRF: Available cookie names:', document.cookie.split(';').map(c => c.trim().split('=')[0]));
    }

    return headers;
  }
});

/**
 * Enhanced error handling with proper typing
 */
interface ApiErrorData {
  detail?: string;
  code?: string;
  retry_after?: number;
  [key: string]: any;
}

/**
 * Type guard for API errors
 */
function isApiError(error: any): error is FetchBaseQueryError & { data: ApiErrorData } {
  return error && typeof error === 'object' && 'data' in error && error.data;
}

/**
 * Check if current page is an authentication page
 */
function isAuthPage(pathname: string): boolean {
  return pathname.startsWith('/auth/') || pathname.startsWith('/invitation/');
}

/**
 * Check if current page is a protected route
 */
function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith('/admin/') || pathname.startsWith('/dashboard/');
}

/**
 * Handle authentication redirects with secure URL validation
 * SECURITY: Prevents open redirect vulnerabilities
 */
function handleAuthRedirect(currentPath: string): void {
  if (isAuthPage(currentPath)) {
    return; // Don't redirect if already on auth page
  }

  // Validate the current path to prevent open redirect attacks
  const safePath = validateRedirectUrl(currentPath) || '/admin/dashboard';
  const fullCurrentPath = safePath + window.location.search;
  
  // Create secure redirect URL with validated next parameter
  const redirectUrl = isProtectedRoute(safePath)
    ? createSafeRedirectUrl('/auth/signin', fullCurrentPath)
    : '/auth/signin';

  // Use validated URL for redirect
  window.location.href = redirectUrl;
}

/**
 * Handle rate limiting with user-friendly messaging
 */
function handleRateLimit(errorData: ApiErrorData): void {
  const retryAfter = errorData?.retry_after || 60;
  const message =
    errorData?.detail || `Too many requests. Please try again in ${retryAfter} seconds.`;

  // Log for debugging in development
  if (config.IS_DEVELOPMENT) {
    console.error('Rate limit exceeded:', message);
  }

  // Dispatch custom event for notification system
  window.dispatchEvent(
    new CustomEvent('rate-limit-error', {
      detail: { message, retryAfter }
    })
  );
}

/**
 * Attempt to refresh authentication token
 */
async function attemptTokenRefresh(api: BaseQueryApi, extraOptions: any): Promise<boolean> {
  try {
    const refreshResult = await baseQuery(
      {
        url: 'auth/refresh/',
        method: 'POST',
        credentials: 'include'
      },
      api,
      extraOptions
    );

    return !!refreshResult.data;
  } catch (error) {
    if (config.IS_DEVELOPMENT) {
      console.error('Token refresh failed:', error);
    }
    return false;
  }
}

/**
 * Custom fetch base query with enhanced error handling and retry logic
 */
const customFetchBase = async (args: any, api: BaseQueryApi, extraOptions: any): Promise<any> => {
  // Wait for any pending requests to complete
  await mutex.waitForUnlock();

  // SECURITY: Use secure token storage instead of localStorage
  let token = TokenManager.getAccessToken();
  // TEMP DEBUG: Also try direct localStorage access as backup
  if (!token) {
    token = localStorage.getItem('access');
    console.log('🔒 FETCH: Fallback to direct localStorage access. Found:', !!token);
  }
  console.log('🔒 FETCH: Getting token for request to', args.url, 'Token found:', !!token, 'Length:', token?.length || 0);
  if (token) {
    args.headers = { ...args.headers, Authorization: `Bearer ${token}` };
    console.log('🔒 FETCH: Added Authorization header');
  } else {
    console.log('🔒 FETCH: No token found, request will be unauthenticated');
  }

  let result = await baseQuery(args, api, extraOptions);

  // Handle API errors
  if (isApiError(result.error)) {
    const errorData = result.error.data;
    const currentPath = window.location.pathname;
    const status = result.error.status;

    // Handle rate limiting (429)
    if (status === 429) {
      handleRateLimit(errorData);
      return result;
    }

    // Handle authentication errors (401)
    if (status === 401) {
      console.log('🔒 ERROR: 401 Unauthorized for', args.url, 'Error:', errorData);
      
      // Check for specific authentication error messages
      if (errorData?.detail === 'Authentication credentials were not provided.') {
        console.log('🔒 ERROR: Authentication credentials not provided - clearing tokens');
        // SECURITY: Clear any invalid tokens
        TokenManager.clearTokens();
        handleAuthRedirect(currentPath);
        return result;
      }

      // Handle token validation errors
      if (errorData?.code === 'token_not_valid') {
        // Use mutex to prevent multiple refresh attempts
        if (!mutex.isLocked()) {
          const release = await mutex.acquire();

          try {
            const refreshSuccess = await attemptTokenRefresh(api, extraOptions);

            if (refreshSuccess) {
              // Retry the original request
              result = await baseQuery(args, api, extraOptions);
            } else {
              console.log('🔒 ERROR: Token refresh failed - clearing tokens');
              // SECURITY: Clear invalid tokens before redirect
              TokenManager.clearTokens();
              // Refresh failed, redirect to login
              handleAuthRedirect(currentPath);
            }
          } finally {
            release();
          }
        } else {
          // Wait for refresh to complete and retry
          await mutex.waitForUnlock();
          result = await baseQuery(args, api, extraOptions);
        }
      }
    }

    // Handle other HTTP errors
    if (typeof status === 'number' && status >= 500) {
      // Server errors - could implement retry logic here
      if (config.IS_DEVELOPMENT) {
        console.error('Server error:', result.error);
      }
    }
  }

  return result;
};

export default customFetchBase;
