// @vitest-environment jsdom
/**
 * Tokens must stay OUT of JavaScript-readable storage.
 *
 * WHY THIS FILE WAS REWRITTEN (2026-08-19)
 * ----------------------------------------
 * The previous version tested the opposite contract. It asserted that `setAccessToken('x')`
 * writes `'access'` into localStorage and that `getAccessToken()` reads it back — the
 * behaviour of the pre-cookie implementation. `secureTokenStorage.ts` was rewritten for the
 * httpOnly-cookie architecture CLAUDE.md describes ("Pure httpOnly cookie-based JWT. Frontend
 * never touches tokens in JS"), so those seventeen tests had been failing ever since, and
 * `SecurityAudit` — which the file imported — no longer exists, so the import took the whole
 * suite down with it.
 *
 * The tempting reading is "stale tests, delete them". That loses something: a red test here
 * was the only remaining record that storing a JWT in localStorage is a defect. Making the old
 * file green would have required REINTRODUCING the vulnerability, and deleting it silently
 * would leave nothing to notice if someone did.
 *
 * So the assertions are inverted rather than removed. Each one now pins the property that
 * replaced it: the getters return null, the setters write nothing anywhere, and the cleanup
 * path removes anything a previous build left behind. If a future change puts a token back
 * into web storage, this file fails — which is what the old one was for, pointed the right way.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { TokenManager } from '../secureTokenStorage';

/** Keys the legacy implementation used, and the ones cleanup must reach. */
const LEGACY_KEYS = ['access', 'refresh', 'token', 'authToken', 'temp_access_token'];

describe('TokenManager: tokens never enter JavaScript-readable storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Expire any cookie a previous test set.
    document.cookie = 'logged_in=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  describe('the setters are no-ops', () => {
    it('setAccessToken writes nothing to either storage', () => {
      TokenManager.setAccessToken('a-real-looking-jwt');
      expect(Object.keys(localStorage)).toEqual([]);
      expect(Object.keys(sessionStorage)).toEqual([]);
    });

    it('setRefreshToken writes nothing to either storage', () => {
      TokenManager.setRefreshToken('a-real-looking-refresh-token');
      expect(Object.keys(localStorage)).toEqual([]);
      expect(Object.keys(sessionStorage)).toEqual([]);
    });

    it('does not smuggle the value in under some other key', () => {
      // The assertions above would pass if a setter wrote to a key we did not think of only
      // when storage was otherwise non-empty. Seed it, then prove the token is absent by
      // VALUE rather than by key name.
      localStorage.setItem('unrelated', 'x');
      TokenManager.setAccessToken('sentinel-token-value');
      const stored = [
        ...Object.keys(localStorage).map((k) => localStorage.getItem(k)),
        ...Object.keys(sessionStorage).map((k) => sessionStorage.getItem(k))
      ];
      expect(stored).not.toContain('sentinel-token-value');
    });
  });

  describe('the getters cannot read a token', () => {
    it('getAccessToken returns null — httpOnly cookies are unreadable from JS by design', () => {
      expect(TokenManager.getAccessToken()).toBeNull();
    });

    it('getRefreshToken returns null', () => {
      expect(TokenManager.getRefreshToken()).toBeNull();
    });

    it('still returns null when a legacy token is sitting in storage', () => {
      // The getter must not become a back door to whatever an older build left behind.
      localStorage.setItem('access', 'left-over-from-a-previous-implementation');
      expect(TokenManager.getAccessToken()).toBeNull();
    });
  });

  describe('session detection uses the non-httpOnly logged_in cookie', () => {
    it('hasActiveSession is true when logged_in=true', () => {
      document.cookie = 'logged_in=true; path=/';
      expect(TokenManager.hasActiveSession()).toBe(true);
    });

    it('hasActiveSession is false with no cookie', () => {
      expect(TokenManager.hasActiveSession()).toBe(false);
    });

    it('hasActiveSession is false when the cookie says anything else', () => {
      document.cookie = 'logged_in=false; path=/';
      expect(TokenManager.hasActiveSession()).toBe(false);
    });

    it('hasValidToken tracks the session rather than any stored value', () => {
      localStorage.setItem('access', 'a-token');
      expect(TokenManager.hasValidToken()).toBe(false);
      document.cookie = 'logged_in=true; path=/';
      expect(TokenManager.hasValidToken()).toBe(true);
    });
  });

  describe('legacy cleanup', () => {
    it('removes every legacy key from both storages', () => {
      LEGACY_KEYS.forEach((k) => {
        localStorage.setItem(k, 'stale');
        sessionStorage.setItem(k, 'stale');
      });
      TokenManager.cleanupLegacyStorage();
      LEGACY_KEYS.forEach((k) => {
        expect(localStorage.getItem(k), `${k} survived cleanup in localStorage`).toBeNull();
        expect(sessionStorage.getItem(k), `${k} survived cleanup in sessionStorage`).toBeNull();
      });
    });

    it('leaves unrelated keys alone', () => {
      localStorage.setItem('trazo_locale', 'es-419');
      TokenManager.cleanupLegacyStorage();
      expect(localStorage.getItem('trazo_locale')).toBe('es-419');
    });

    it('clearTokens also clears legacy storage', () => {
      localStorage.setItem('access', 'stale');
      TokenManager.clearTokens();
      expect(localStorage.getItem('access')).toBeNull();
    });
  });
});
