/**
 * Person-name validation for signup and profile forms.
 *
 * Trazo's ICP is California specialty-crop agriculture, where Hispanic surnames are
 * the norm. An ASCII-only rule (`/^[A-Za-z\s]+$/`) rejected every accented or
 * punctuated real name — "José", "Muñoz", "O'Brien", "Martínez-Ruiz" — and blocked
 * signup outright with "should only contain letters".
 *
 * The rule below accepts any Unicode letter plus the punctuation that legitimately
 * appears inside names, while still rejecting digits and symbols.
 */

/**
 * Valid person name: starts with a letter, then letters, combining marks, spaces,
 * hyphens, apostrophes (straight or typographic) and periods (for "Jr.", "St.").
 *
 * - `\p{L}`  any Unicode letter (á, ñ, ü, ø, 李 ...)
 * - `\p{M}`  combining marks, so decomposed forms ("n" + U+0303) also pass
 */
export const PERSON_NAME_PATTERN = /^\p{L}[\p{L}\p{M}\s'’\-.]*$/u;

/** Max length accepted by the backend serializer (`users/serializers.py`). */
export const PERSON_NAME_MAX_LENGTH = 128;

/**
 * Test whether a string is an acceptable person name.
 * @param value - Raw input from a name field
 */
export function isValidPersonName(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= PERSON_NAME_MAX_LENGTH &&
    PERSON_NAME_PATTERN.test(trimmed)
  );
}
