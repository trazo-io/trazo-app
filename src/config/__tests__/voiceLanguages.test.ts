/**
 * B3 — voice speaks the farmer's language.
 *
 * Until 2026-08-25 `VoiceEventCapture` held its language in a `useState('en-US')` whose
 * setter was never called, with the selector hidden ("English only" for MVP). Every farmer
 * got English speech-to-text while `trazo-landing/app/page.tsx:42` and
 * `cog-pro-migration/page.tsx:53` both advertised "English and Spanish".
 *
 * The trap this pins is that ONE locale needs THREE different codes, and they disagree:
 * Deepgram Nova-3 takes `es-419`, Chrome's Web Speech API has no `419` region, and the
 * backend keys GPT prompts by family. A single passthrough silently reverts somebody to
 * English on at least one of the three.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { locales } from '../../i18n/i18n-config';
import { DEFAULT_VOICE_LANGUAGE, VOICE_LANGUAGES, voiceLanguageFor } from '../voiceLanguages';
import { getKeytermsForLanguage } from '../agriculturalKeyterms';
import enUS from '../../i18n/lang/en-US.json';
import es419 from '../../i18n/lang/es-419.json';

describe('voice language resolution', () => {
  it('covers every locale the app actually ships', () => {
    // The authority is i18n-config, not this table. A locale added there without a voice
    // entry is exactly how "English only" happens again.
    for (const locale of Object.keys(locales)) {
      expect(VOICE_LANGUAGES, `no voice codes for shipped locale ${locale}`).toHaveProperty(locale);
    }
  });

  it('sends Deepgram the Latin-American Spanish code it documents for Nova-3', () => {
    expect(voiceLanguageFor('es-419').deepgram).toBe('es-419');
  });

  it('does NOT send the Web Speech API a 419 region it cannot parse', () => {
    const { webSpeech } = voiceLanguageFor('es-419');
    expect(webSpeech).not.toContain('419');
    expect(webSpeech).toMatch(/^es-[A-Z]{2}$/);
  });

  it('English is unchanged on both backends', () => {
    expect(voiceLanguageFor('en-US')).toEqual({ deepgram: 'en-US', webSpeech: 'en-US' });
  });

  it('an unknown Spanish locale still gets Spanish, not English', () => {
    // The whole point: a new locale must never silently revert speech to English.
    expect(voiceLanguageFor('es-MX').deepgram).toBe('es-419');
    expect(voiceLanguageFor('es').deepgram).toBe('es-419');
  });

  it('falls back to English only for genuinely unknown languages', () => {
    expect(voiceLanguageFor('de-DE')).toEqual(DEFAULT_VOICE_LANGUAGE);
    expect(voiceLanguageFor(undefined)).toEqual(DEFAULT_VOICE_LANGUAGE);
    expect(voiceLanguageFor('')).toEqual(DEFAULT_VOICE_LANGUAGE);
  });

  it('the Deepgram code actually selects the Spanish keyterm boost', () => {
    // getKeytermsForLanguage slices the first two chars, so this only works if the code we
    // hand Deepgram really starts with "es". Spanish keyterms already existed and were
    // unreachable because the language was pinned to en-US.
    const es = getKeytermsForLanguage(voiceLanguageFor('es-419').deepgram);
    const en = getKeytermsForLanguage(voiceLanguageFor('en-US').deepgram);
    expect(es.length).toBeGreaterThan(en.length);
    expect(es).toContain('fertilizante');
  });
});

describe('voice error ids are real, translated messages', () => {
  // The hook returns message ids now, and VoiceEventCapture feeds them straight to
  // `intl.formatMessage`. An id with no key renders as the raw id in a toast in front of
  // the farmer, so the union and the locale files have to agree.
  const ERROR_IDS = ['voice.tokenFailed', 'voice.microphoneBlocked', 'voice.connectionFailed'];

  it('the hook declares exactly these ids', () => {
    const hook = readFileSync(join(__dirname, '../../hooks/useDeepgramTranscription.ts'), 'utf8');
    const union = /export type DeepgramErrorId =([\s\S]*?);/.exec(hook);
    expect(union, 'DeepgramErrorId union not found').toBeTruthy();
    const declared = [...union![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual([...ERROR_IDS].sort());
    // and every one is really assigned somewhere, not just declared
    for (const id of declared) {
      expect(hook, `${id} declared but never set`).toContain(`setError('${id}')`);
    }
  });

  it('every error id has a message in BOTH locales, plus the toast title', () => {
    for (const id of [...ERROR_IDS, 'voice.errorTitle']) {
      expect(enUS, `en-US missing ${id}`).toHaveProperty(id);
      expect(es419, `es-419 missing ${id}`).toHaveProperty(id);
    }
  });
});
