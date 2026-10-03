// @vitest-environment jsdom
/**
 * The spoken-language choice is remembered per user on this device — and a storage failure is
 * never an error, only "no preference" (the app locale decides).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readVoiceLanguagePreference,
  voiceLanguagePreferenceKey,
  writeVoiceLanguagePreference
} from '../voiceLanguagePreference';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('voice language preference', () => {
  it('remembers the choice', () => {
    writeVoiceLanguagePreference(42, 'es');
    expect(readVoiceLanguagePreference(42)).toBe('es');
  });

  it('keeps one entry per signed-in user — a shared crew tablet', () => {
    writeVoiceLanguagePreference(42, 'es');
    writeVoiceLanguagePreference(7, 'en');
    expect(readVoiceLanguagePreference(42)).toBe('es');
    expect(readVoiceLanguagePreference(7)).toBe('en');
    expect(voiceLanguagePreferenceKey(42)).not.toBe(voiceLanguagePreferenceKey(7));
  });

  it('has no preference until one is made', () => {
    expect(readVoiceLanguagePreference(42)).toBeNull();
  });

  it('ignores anything that is not a language the app serves', () => {
    // An old value, a hand edit, another app's key: none may become a recognition language.
    for (const junk of ['fr', 'es-419', 'multi', '', 'null']) {
      window.localStorage.setItem(voiceLanguagePreferenceKey(42), junk);
      expect(readVoiceLanguagePreference(42), junk).toBeNull();
    }
  });

  it('treats blocked storage as "no preference", never an error', () => {
    // Safari private mode and blocked site data throw from the accessor itself.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeVoiceLanguagePreference(42, 'es')).not.toThrow();
    expect(readVoiceLanguagePreference(42)).toBeNull();
  });
});
