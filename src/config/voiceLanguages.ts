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

/**
 * Deepgram's language-DETECTING mode — OPT-IN (`language_mode: 'multi'` from voice-config).
 *
 * ⛔ NOT the default, and the order the evidence arrived in is the lesson. Direct tests against
 * Deepgram on 2026-09-10 made it look strictly better: Spanish spoken into the English app came
 * back EMPTY when pinned (8 clips of 8) and right under `multi`; "spray de Kocide" became "spray de
 * cocina" under `es-419`. Then the same comparison through the REAL app — Chrome's own capture
 * and encoder — dropped a word from Spanish notes 5 runs in 5, usually the block: "en el bloque
 * norte esta mañana" → "en el bloque esta mañana". Pinned `es-419` was exact 3 in 3. On English it
 * was as good or better ("Entrust" heard 2 in 3, where `en-US` heard "and trusted").
 *
 * A records product cannot default to a mode that silently deletes the block from a spray record,
 * so recognition stays pinned to the app locale. Re-run the in-app A/B when Deepgram ships a new
 * multilingual model before flipping it.
 */
export const DEEPGRAM_AUTO_LANGUAGE = 'multi';

/** The languages the app serves. Deepgram's `multi` detects ten; the parser and the UI speak two. */
export type SpokenLanguage = 'en' | 'es';

/**
 * The locale the parser should read a transcript as — chosen by the language it was SPOKEN in,
 * not the one the app is set to. The backend picks its prompt, its spoken-number table and its
 * fallback keywords by this; a Spanish sentence read with the English prompt loses mappings like
 * "nebulizadora" → air_blast.
 */
export const LOCALE_FOR_SPOKEN: Readonly<Record<SpokenLanguage, string>> = {
  en: 'en-US',
  es: 'es-419'
};

/**
 * The spoken language an app locale implies — what voice listens for until the farmer says
 * otherwise with the panel's language switch.
 */
export function spokenLanguageFor(locale: string | undefined | null): SpokenLanguage {
  return (locale || '').split('-')[0].toLowerCase() === 'es' ? 'es' : 'en';
}

export interface VoiceLanguage {
  /**
   * Deepgram Nova-3 `language` when recognition is pinned to the locale (the server's kill
   * switch), and the keyterm prior under DEEPGRAM_AUTO_LANGUAGE.
   */
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
