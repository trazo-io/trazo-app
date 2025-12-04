/**
 * URL Validation Utility for Security
 * Prevents open redirect vulnerabilities by validating URLs against allowed domains
 * Compliant with OWASP 2025 security guidelines
 */

// Allowed domains for redirects - update for production
const ALLOWED_DOMAINS = [
  'trazo.com',
  'app.trazo.com',
  'consumer.trazo.com',
  'www.trazo.com',
  // Development domains (remove in production)
  'localhost',
  '127.0.0.1',
  'app.localhost',
  'consumer.localhost'
];

// Additional allowed ports for development
const ALLOWED_PORTS = [3000, 3001, 8000, 8080];

/**
 * Validates a redirect URL to prevent open redirect attacks
 * @param url - The URL to validate
 * @param currentOrigin - Current origin for relative URL resolution (optional)
 * @returns Validated URL or null if invalid
 */
export function validateRedirectUrl(url: string | null, currentOrigin?: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Remove any leading/trailing whitespace
  url = url.trim();

  // Empty string is invalid
  if (!url) {
    return null;
  }

  try {
    // Handle relative URLs (start with /)
    if (url.startsWith('/')) {
      // Additional validation for relative URLs
      if (url.includes('//') || url.includes('\\')) {
        // Prevent protocol-relative URLs and backslash attacks
        return null;
      }

      // Allow only URLs that look like valid paths
      if (!/^\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(url)) {
        return null;
      }

      return url;
    }

    // For absolute URLs, parse and validate
    const parsed = new URL(url, currentOrigin || window.location.origin);

    // Check protocol - only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    // Check if domain is in allowed list
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedDomain = ALLOWED_DOMAINS.some((domain) => {
      // Exact match or subdomain match
      return hostname === domain || hostname.endsWith('.' + domain);
    });

    if (!isAllowedDomain) {
      return null;
    }

    // In development, check port if specified
    if (parsed.port && process.env.NODE_ENV === 'development') {
      const port = parseInt(parsed.port, 10);
      if (!ALLOWED_PORTS.includes(port)) {
        return null;
      }
    }

    return parsed.toString();
  } catch (error) {
    // Invalid URL format
    return null;
  }
}

/**
 * Validates and sanitizes a next parameter from URL search params
 * @param searchParams - URLSearchParams object
 * @param fallbackUrl - Fallback URL if validation fails
 * @returns Validated URL or fallback
 */
export function validateNextParameter(
  searchParams: URLSearchParams,
  fallbackUrl: string = '/'
): string {
  const nextParam = searchParams.get('next');
  const validatedUrl = validateRedirectUrl(nextParam);
  return validatedUrl || fallbackUrl;
}

/**
 * Creates a safe redirect URL with next parameter
 * @param baseUrl - Base URL for the redirect
 * @param nextUrl - Next URL to include as parameter
 * @returns Safe redirect URL
 */
export function createSafeRedirectUrl(baseUrl: string, nextUrl?: string): string {
  if (!nextUrl) {
    return baseUrl;
  }

  const validatedNext = validateRedirectUrl(nextUrl);
  if (!validatedNext) {
    return baseUrl;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}next=${encodeURIComponent(validatedNext)}`;
}

/**
 * Checks if a URL is safe for navigation
 * @param url - URL to check
 * @returns Boolean indicating if URL is safe
 */
export function isSafeUrl(url: string): boolean {
  return validateRedirectUrl(url) !== null;
}

/**
 * Safe navigation function that validates URLs before redirecting
 * @param url - URL to navigate to
 * @param fallbackUrl - Fallback URL if validation fails
 */
export function safeNavigate(url: string, fallbackUrl: string = '/'): void {
  const validatedUrl = validateRedirectUrl(url) || fallbackUrl;
  window.location.href = validatedUrl;
}

/**
 * Configuration for production deployment
 * Call this function to update allowed domains for production
 * @param domains - Array of allowed domains for production
 */
export function setProductionDomains(domains: string[]): void {
  // Clear development domains
  ALLOWED_DOMAINS.length = 0;
  // Add production domains
  ALLOWED_DOMAINS.push(...domains);
}

// Validation regex patterns
export const URL_PATTERNS = {
  // Safe path pattern (no protocol-relative URLs or dangerous characters)
  SAFE_PATH: /^\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/,
  // Domain validation pattern
  DOMAIN:
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/
};
