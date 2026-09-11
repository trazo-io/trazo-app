import type { SpokenLanguage } from 'config/voiceLanguages';

/**
 * The language a farmer chose to SPEAK in, remembered per user on this device.
 *
 * Why a choice at all: recognition is pinned to one language, because detecting it cost accuracy
 * (see DEEPGRAM_AUTO_LANGUAGE), and the app's language is not always the one a person speaks — a
 * crew member reading the English app may dictate in Spanish, and Spanish spoken into the English
 * model comes back EMPTY. Keyboards and dictation apps settle this the same way: a short list of
 * the user's languages, a default, and a visible switch.
 *
 * Device-local, like a keyboard's languages: it follows the person holding the phone, and a shared
 * crew tablet keeps one entry per signed-in user rather than one for the device. Storage can throw
 * (Safari private mode, blocked site data); a preference is a convenience, so every failure reads
 * as "no preference" and the app locale decides.
 */
const KEY_PREFIX = 'trazo.voiceLanguage';

export function voiceLanguagePreferenceKey(userId: string | number | null | undefined): string {
  return `${KEY_PREFIX}.${userId ?? 'anonymous'}`;
}

export function readVoiceLanguagePreference(
  userId: string | number | null | undefined
): SpokenLanguage | null {
  try {
    const stored = window.localStorage.getItem(voiceLanguagePreferenceKey(userId));
    return stored === 'en' || stored === 'es' ? stored : null;
  } catch {
    return null;
  }
}

export function writeVoiceLanguagePreference(
  userId: string | number | null | undefined,
  language: SpokenLanguage
): void {
  try {
    window.localStorage.setItem(voiceLanguagePreferenceKey(userId), language);
  } catch {
    // A convenience, not a record: the switch still works for this session.
  }
}
