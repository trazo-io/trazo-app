import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenManager, SecurityAudit } from '../secureTokenStorage';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

describe('TokenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });

  describe('setAccessToken', () => {
    it('stores access token using legacy storage in localStorage', () => {
      const token = 'test-access-token';

      TokenManager.setAccessToken(token);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('access', 'test-access-token');
      expect(console.log).toHaveBeenCalledWith(
        '🔒 LEGACY: Storing token in localStorage. Length:',
        token.length
      );
    });

    it('logs verification after storing token', () => {
      const token = 'test-access-token';
      localStorageMock.getItem.mockReturnValue(token);

      TokenManager.setAccessToken(token);

      expect(console.log).toHaveBeenCalledWith('🔒 LEGACY: Token stored. Verification:', true);
    });
  });

  describe('getAccessToken', () => {
    it('retrieves access token from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('stored-access-token');

      const token = TokenManager.getAccessToken();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('access');
      expect(token).toBe('stored-access-token');
      expect(console.log).toHaveBeenCalledWith(
        '🔒 LEGACY: Retrieved token from localStorage. Found:',
        true,
        'Length:',
        'stored-access-token'.length
      );
    });

    it('returns null when no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const token = TokenManager.getAccessToken();

      expect(token).toBeNull();
      expect(console.log).toHaveBeenCalledWith(
        '🔒 LEGACY: Retrieved token from localStorage. Found:',
        false,
        'Length:',
        0
      );
    });
  });

  describe('clearTokens', () => {
    it('removes tokens from localStorage', () => {
      TokenManager.clearTokens();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh');
      expect(console.log).toHaveBeenCalledWith('🔒 LEGACY: Removing tokens from localStorage');
    });
  });

  describe('hasValidToken', () => {
    it('returns true when token exists in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('valid-token');

      const hasToken = TokenManager.hasValidToken();

      expect(hasToken).toBe(true);
      expect(console.log).toHaveBeenCalledWith('🔒 LEGACY: Checking if token exists:', true);
    });

    it('returns false when no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const hasToken = TokenManager.hasValidToken();

      expect(hasToken).toBe(false);
      expect(console.log).toHaveBeenCalledWith('🔒 LEGACY: Checking if token exists:', false);
    });
  });

  describe('cleanupInsecureStorage', () => {
    it('removes all token variations from both storages', () => {
      TokenManager.cleanupInsecureStorage();

      // Check localStorage removals
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');

      // Check sessionStorage removals
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('access');
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('refresh');

      expect(console.log).toHaveBeenCalledWith('SECURITY: Cleaned up insecure token storage');
    });
  });

  describe('migrateToSecureStorage', () => {
    it('migrates legacy token and cleans up', () => {
      localStorageMock.getItem.mockReturnValue('legacy-token');

      TokenManager.migrateToSecureStorage();

      expect(console.log).toHaveBeenCalledWith(
        'SECURITY: Migrating token from localStorage to secure storage'
      );
      // Should trigger cleanup
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access');
    });

    it('does nothing when no legacy token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      TokenManager.migrateToSecureStorage();

      expect(console.log).not.toHaveBeenCalledWith(
        'SECURITY: Migrating token from localStorage to secure storage'
      );
    });
  });
});

describe('SecurityAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });

  describe('auditTokenStorage', () => {
    it('returns true when no insecure tokens found', () => {
      const isSecure = SecurityAudit.auditTokenStorage();

      expect(isSecure).toBe(true);
      expect(console.error).not.toHaveBeenCalled();
    });

    it('detects tokens in localStorage as insecure', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'access') return 'insecure-token';
        return null;
      });

      const isSecure = SecurityAudit.auditTokenStorage();

      expect(isSecure).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'SECURITY RISK: Found token in localStorage with key: access'
      );
    });

    it('warns about tokens in sessionStorage', () => {
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'session-token';
        return null;
      });

      SecurityAudit.auditTokenStorage();

      expect(console.warn).toHaveBeenCalledWith(
        'SECURITY WARNING: Found token in sessionStorage with key: token'
      );
    });
  });

  describe('getSecurityReport', () => {
    it('returns secure report when no issues found', () => {
      const report = SecurityAudit.getSecurityReport();

      expect(report.secure).toBe(false); // False because using legacy storage
      expect(report.issues).toContain('Using legacy token storage implementation');
    });

    it('reports access token in localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'access') return 'insecure-access-token';
        return null;
      });

      const report = SecurityAudit.getSecurityReport();

      expect(report.secure).toBe(false);
      expect(report.issues).toContain('Access token found in localStorage (vulnerable to XSS)');
    });

    it('reports refresh token in localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'refresh') return 'insecure-refresh-token';
        return null;
      });

      const report = SecurityAudit.getSecurityReport();

      expect(report.secure).toBe(false);
      expect(report.issues).toContain('Refresh token found in localStorage (vulnerable to XSS)');
    });

    it('reports multiple security issues', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'access') return 'access-token';
        if (key === 'refresh') return 'refresh-token';
        return null;
      });

      const report = SecurityAudit.getSecurityReport();

      expect(report.secure).toBe(false);
      expect(report.issues).toHaveLength(3); // access, refresh, and legacy storage
    });
  });
});
