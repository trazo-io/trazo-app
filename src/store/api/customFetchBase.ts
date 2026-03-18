import { config } from 'config/environment';
import { BaseQueryApi } from '@reduxjs/toolkit/dist/query/baseQueryTypes';
import { Mutex } from 'async-mutex';
import { fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { validateRedirectUrl, createSafeRedirectUrl } from 'utils/urlValidator';

// Mutex prevents concurrent refresh attempts
const mutex = new Mutex();

/**
 * Read a cookie value by name (for non-httpOnly cookies like CSRF and logged_in)
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
 * Base query — uses credentials: 'include' so httpOnly cookies (access, refresh)
 * are sent automatically by the browser. No Authorization header needed.
 */
const baseQuery = fetchBaseQuery({
  baseUrl: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('X-Requested-With', 'XMLHttpRequest');
    headers.set('Accept', 'application/json');

    const csrfToken = getCookie(config.CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set(config.CSRF_HEADER_KEY, csrfToken);
    }

    return headers;
  }
});

interface ApiErrorData {
  detail?: string;
  code?: string;
  retry_after?: number;
  [key: string]: any;
}

function isApiError(error: any): error is FetchBaseQueryError & { data: ApiErrorData } {
  return error && typeof error === 'object' && 'data' in error && error.data;
}

function isAuthPage(pathname: string): boolean {
  return pathname.startsWith('/auth/') || pathname.startsWith('/invitation/');
}

function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith('/admin/') || pathname.startsWith('/dashboard/');
}

function handleAuthRedirect(currentPath: string): void {
  if (isAuthPage(currentPath)) {
    return;
  }

  const safePath = validateRedirectUrl(currentPath) || '/admin/dashboard';
  const fullCurrentPath = safePath + window.location.search;

  const redirectUrl = isProtectedRoute(safePath)
    ? createSafeRedirectUrl('/auth/signin', fullCurrentPath)
    : '/auth/signin';

  window.location.replace(redirectUrl);
}

function handleRateLimit(errorData: ApiErrorData): void {
  const retryAfter = errorData?.retry_after || 60;
  const message =
    errorData?.detail || `Too many requests. Please try again in ${retryAfter} seconds.`;

  if (config.IS_DEVELOPMENT) {
    console.error('Rate limit exceeded:', message);
  }

  window.dispatchEvent(
    new CustomEvent('rate-limit-error', {
      detail: { message, retryAfter }
    })
  );
}

/**
 * Attempt to refresh auth via cookie-based POST endpoint.
 * The browser sends the httpOnly refresh cookie automatically.
 */
async function attemptTokenRefresh(api: BaseQueryApi, extraOptions: any): Promise<boolean> {
  try {
    const refreshResult = await baseQuery(
      {
        url: 'auth/refresh/',
        method: 'POST',
        body: {},
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
 * Check if user has an active session (via non-httpOnly logged_in cookie)
 */
export function hasActiveSession(): boolean {
  return getCookie('logged_in') === 'true';
}

/**
 * Custom fetch base query with cookie-based auth.
 * httpOnly cookies are sent automatically — no token management needed in JS.
 */
const customFetchBase = async (args: any, api: BaseQueryApi, extraOptions: any): Promise<any> => {
  await mutex.waitForUnlock();

  let result = await baseQuery(args, api, extraOptions);

  if (isApiError(result.error)) {
    const errorData = result.error.data;
    const currentPath = window.location.pathname;
    const statusCode = result.error.status;

    // Handle rate limiting (429)
    if (statusCode === 429) {
      handleRateLimit(errorData);
      return result;
    }

    // Handle authentication errors (401) — attempt silent refresh
    if (statusCode === 401 && !args.url?.includes('auth/')) {
      if (!mutex.isLocked()) {
        const release = await mutex.acquire();

        try {
          const refreshSuccess = await attemptTokenRefresh(api, extraOptions);

          if (refreshSuccess) {
            // Retry the original request — new cookies are set by the refresh response
            result = await baseQuery(args, api, extraOptions);
          } else {
            handleAuthRedirect(currentPath);
          }
        } finally {
          release();
        }
      } else {
        // Another request is already refreshing
        await mutex.waitForUnlock();
        result = await baseQuery(args, api, extraOptions);

        // If still 401 after waiting, redirect
        if (isApiError(result.error) && result.error.status === 401) {
          handleAuthRedirect(currentPath);
        }
      }
    }

    // Log server errors in development
    if (typeof statusCode === 'number' && statusCode >= 500) {
      if (config.IS_DEVELOPMENT) {
        console.error('Server error:', result.error);
      }
    }
  }

  return result;
};

export default customFetchBase;
