/**
 * Centralized Environment Configuration
 * Following React best practices for environment management
 */

export interface EnvironmentConfig {
  // Core Application
  readonly NODE_ENV: 'development' | 'production' | 'test';
  readonly IS_DEVELOPMENT: boolean;
  readonly IS_PRODUCTION: boolean;
  readonly IS_TEST: boolean;

  // API Configuration
  readonly API_BASE_URL: string;
  readonly API_ROOT_URL: string;
  readonly API_TIMEOUT: number;
  readonly API_RETRY_ATTEMPTS: number;

  // Application URLs
  readonly APP_BASE_URL: string;
  readonly CONSUMER_BASE_URL: string;
  readonly APP_BASE_DOMAIN: string;

  // Authentication
  readonly CSRF_COOKIE_NAME: string;
  readonly CSRF_HEADER_KEY: string;

  // WebSocket
  readonly WS_BASE_URL: string;

  // Features
  readonly ENABLE_DEVTOOLS: boolean;
  readonly ENABLE_ANALYTICS: boolean;
  readonly ENABLE_PERFORMANCE_MONITORING: boolean;
  readonly PAYMENTS_ENABLED: boolean;

  // File Upload
  readonly MAX_FILE_SIZE: number;
  readonly ALLOWED_FILE_TYPES: string[];

  // Pagination
  readonly DEFAULT_PAGE_SIZE: number;
  readonly MAX_PAGE_SIZE: number;
}

/**
 * Validates and transforms environment variables with proper defaults
 */
function createEnvironmentConfig(): EnvironmentConfig {
  const env = import.meta.env;
  const nodeEnv = (env.NODE_ENV || 'development') as 'development' | 'production' | 'test';

  // Determine if we're in development mode
  const isDevelopment = nodeEnv === 'development' || env.DEV === true;
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  // API Configuration with explicit backend URLs (NO PROXY)
  const getApiBaseUrl = (): string => {
    // Always use explicit backend URLs - no proxy dependency
    if (env.VITE_APP_BACKEND_URL) {
      return env.VITE_APP_BACKEND_URL;
    }

    // Environment-specific defaults
    if (isDevelopment) {
      return 'http://localhost:8000/api';
    }

    if (isProduction) {
      return 'https://api.trazo.io/api';
    }

    // Test environment
    return 'http://localhost:8000/api';
  };

  // WebSocket URL configuration
  const getWebSocketBaseUrl = (): string => {
    if (env.VITE_APP_WS_URL) {
      return env.VITE_APP_WS_URL;
    }

    if (isDevelopment) {
      return 'ws://localhost:8000/ws';
    }

    if (isProduction) {
      return 'wss://api.trazo.io/ws';
    }

    return 'ws://localhost:8000/ws';
  };

  return {
    // Core Application
    NODE_ENV: nodeEnv,
    IS_DEVELOPMENT: isDevelopment,
    IS_PRODUCTION: isProduction,
    IS_TEST: isTest,

    // API Configuration - Always explicit URLs
    API_BASE_URL: getApiBaseUrl(),
    API_ROOT_URL: getApiBaseUrl().replace(/\/api$/, ''),
    API_TIMEOUT: parseInt(env.VITE_API_TIMEOUT || '30000', 10),
    API_RETRY_ATTEMPTS: parseInt(env.VITE_API_RETRY_ATTEMPTS || '3', 10),

    // Application URLs
    APP_BASE_URL:
      env.VITE_APP_BASE_URL || (isDevelopment ? 'http://localhost:3000' : 'https://app.trazo.io'),
    CONSUMER_BASE_URL:
      env.VITE_CONSUMER_BASE_URL ||
      (isDevelopment ? 'http://consumer.localhost:3000' : 'https://consumer.trazo.io'),
    APP_BASE_DOMAIN: env.VITE_APP_BASE_DOMAIN || 'trazo.io',

    // Authentication
    CSRF_COOKIE_NAME: env.VITE_APP_CSRF_COOKIE_NAME || 'csrftoken',
    CSRF_HEADER_KEY: 'X-CSRFToken',

    // WebSocket
    WS_BASE_URL: getWebSocketBaseUrl(),

    // Features
    ENABLE_DEVTOOLS: isDevelopment || env.VITE_ENABLE_DEVTOOLS === 'true',
    ENABLE_ANALYTICS: isProduction && env.VITE_ENABLE_ANALYTICS !== 'false',
    ENABLE_PERFORMANCE_MONITORING: env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
    PAYMENTS_ENABLED: env.VITE_APP_PAYMENTS_ENABLED === 'true',

    // File Upload
    MAX_FILE_SIZE: parseInt(env.VITE_MAX_FILE_SIZE || '10485760', 10), // 10MB
    ALLOWED_FILE_TYPES: (
      env.VITE_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,application/pdf'
    ).split(','),

    // Pagination
    DEFAULT_PAGE_SIZE: parseInt(env.VITE_DEFAULT_PAGE_SIZE || '20', 10),
    MAX_PAGE_SIZE: parseInt(env.VITE_MAX_PAGE_SIZE || '100', 10)
  };
}

/**
 * Singleton environment configuration
 * Ensures consistent configuration across the application
 */
export const config: EnvironmentConfig = createEnvironmentConfig();

/**
 * Environment-specific utilities
 */
export const env = {
  /**
   * Check if we're in development mode
   */
  isDevelopment: () => config.IS_DEVELOPMENT,

  /**
   * Check if we're in production mode
   */
  isProduction: () => config.IS_PRODUCTION,

  /**
   * Check if we're in test mode
   */
  isTest: () => config.IS_TEST,

  /**
   * Get API URL for a given endpoint
   * Always returns full URL - no proxy dependency
   */
  getApiUrl: (endpoint: string) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${config.API_BASE_URL}/${cleanEndpoint}`;
  },

  /**
   * Get WebSocket URL for a given endpoint
   */
  getWebSocketUrl: (endpoint: string) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${config.WS_BASE_URL}/${cleanEndpoint}`;
  },

  /**
   * Get app URL for a given path
   */
  getAppUrl: (path: string) => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${config.APP_BASE_URL}/${cleanPath}`;
  },

  /**
   * Validate file upload
   */
  validateFile: (file: File): { isValid: boolean; error?: string } => {
    if (file.size > config.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum limit of ${config.MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    if (!config.ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${
          file.type
        } is not allowed. Allowed types: ${config.ALLOWED_FILE_TYPES.join(', ')}`
      };
    }

    return { isValid: true };
  }
};

/**
 * Development-only utilities
 */
export const devUtils = {
  /**
   * Log configuration in development mode
   */
  logConfig: () => {
    if (config.IS_DEVELOPMENT) {
      console.group('🔧 Environment Configuration');
      console.log('Environment:', config.NODE_ENV);
      console.log('API Base URL:', config.API_BASE_URL);
      console.log('App Base URL:', config.APP_BASE_URL);
      console.log('WebSocket URL:', config.WS_BASE_URL);
      console.log('DevTools Enabled:', config.ENABLE_DEVTOOLS);
      console.log('🚨 Using direct backend URLs (no proxy)');
      console.groupEnd();
    }
  },

  /**
   * Assert environment requirements
   */
  assertEnvironment: () => {
    if (config.IS_DEVELOPMENT) {
      // Add development-specific assertions
      if (!config.API_BASE_URL) {
        console.warn('⚠️ API_BASE_URL is not configured');
      }

      // Warn about CORS requirements
      if (config.API_BASE_URL.includes('localhost:8000')) {
        console.info('💡 Make sure Django CORS is configured for localhost:3000');
      }
    }
  }
};

// Initialize development utilities
if (config.IS_DEVELOPMENT) {
  devUtils.logConfig();
  devUtils.assertEnvironment();
}

export default config;
