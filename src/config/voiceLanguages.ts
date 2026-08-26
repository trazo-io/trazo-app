/**
 * App locale → the language codes the two speech backends actually accept.
 *
 * These are THREE different vocabularies and they do not agree, which is why this is a
 * table and not a `.slice(0, 2)`:
 *
 *  - **Deepgram Nova-3** accepts `es-419` verbatim. Spanish landed on Nova-3 in the
 *    2025-09-02 model update as `es` / `es-419`, so the app's own locale is already a
 *    valid code and needs no translation.
 *  - **The Web Speech API** (the fallback when no Deepgram key is configured) takes a
 *    browser BCP-47 tag. Chrome's list has `es-US`, `es-MX`, `es-ES` — it does NOT carry
 *    the `419` UN M.49 region, so passing the app locale straight through would hand the
 *    recogniser a tag it does not know. `es-US` is the right one for a platform sold to
 *    US operations with Spanish-speaking crews.
 *  - **The backend AI parser** keys its GPT prompts by language FAMILY (see
 *    `prompt_key_for` in `carbon/services/ai_voice_processor.py`), so the raw locale is fine.
 *
 * Until 2026-08-25 none of this was wired: `VoiceEventCapture` held the language in a
 * `useState('en-US')` whose setter was never called and whose selector was hidden
 * ("English only" for MVP), so every farmer got English speech-to-text while
 * `trazo-landing/app/page.tsx` and `cog-pro-migration/page.tsx` both advertised
 * "English and Spanish".
 */

export interface VoiceLanguage {
  /** Deepgram Nova-3 `language` query param. */
  deepgram: string;
  /** BCP-47 tag for `SpeechRecognition.lang`. */
  webSpeech: string;
}

export const VOICE_LANGUAGES: Readonly<Record<string, VoiceLanguage>> = {
  'en-US': { deepgram: 'en-US', webSpeech: 'en-US' },
  'es-419': { deepgram: 'es-419', webSpeech: 'es-US' }
};

export const DEFAULT_VOICE_LANGUAGE: VoiceLanguage = VOICE_LANGUAGES['en-US'];

/**
 * Resolve the speech codes for an app locale.
 *
 * Falls back by language family before falling back to English, so a locale added to
 * `i18n-config` later (say `es-MX`) still gets Spanish speech recognition instead of
 * silently reverting the farmer to English — the failure this function exists to end.
 */
export function voiceLanguageFor(locale: string | undefined | null): VoiceLanguage {
  if (!locale) return DEFAULT_VOICE_LANGUAGE;

  const exact = VOICE_LANGUAGES[locale];
  if (exact) return exact;

  const family = locale.split('-')[0].toLowerCase();
  const byFamily = Object.entries(VOICE_LANGUAGES).find(
    ([known]) => known.split('-')[0].toLowerCase() === family
  );
  return byFamily ? byFamily[1] : DEFAULT_VOICE_LANGUAGE;
}
