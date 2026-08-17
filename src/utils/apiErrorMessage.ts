/**
 * One reader for the message a DRF error actually carries.
 *
 * Every catch block that wants to show the user *why* a save failed used to
 * hand-roll its own key list, and each one guessed differently:
 *   - `err.data.missing` only            (OSPModuleWizard)
 *   - `err.data.detail` only             (ParcelApplicationWizard)
 *   - `String(err.data)` -> "[object Object]"  (OSPView)
 * A backend message under any other key was silently dropped, so a 400 that
 * explained itself in full ("This plan is approved and active, so its answers
 * are locked...") reached the farmer as a bare "Could not save your answers".
 *
 * DRF has no single error key: `raise ValidationError({"status": "..."})`
 * answers `{"status": ["..."]}`, `Response({"error": "..."})` answers
 * `{"error": "..."}`, and a serializer answers one entry per field. So rather
 * than guess a key, read them all — preferring the conventional non-field keys,
 * then falling back to whatever else is in the payload.
 */

/** DRF's own non-field keys, in the order they should be preferred. */
const PREFERRED_KEYS = ['detail', 'non_field_errors', 'error', 'status', 'message'] as const;

/** `{"status": ["..."]}` and `{"status": "..."}` are both valid DRF shapes. */
const flatten = (value: unknown): string => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(flatten).filter(Boolean).join(' ');
  if (typeof value === 'object') return '';
  return String(value);
};

/**
 * The human-readable message inside an RTK Query error, or `null` when there
 * is none. Null — never `String(err)` — because a transport failure (offline,
 * CORS, 500 HTML) carries no message worth showing, and the caller's own
 * generic copy is a better thing to display than "[object Object]".
 *
 * @param skipKeys payload keys the caller renders itself (e.g. `missing`,
 *   which the OSP wizard already lists field by field) and so should not
 *   repeat in the toast description.
 */
export const apiErrorMessage = (err: unknown, skipKeys: string[] = []): string | null => {
  const payload = (err as { data?: unknown })?.data;
  if (typeof payload === 'string') return payload.trim() || null;
  if (!payload || typeof payload !== 'object') return null;

  const record = payload as Record<string, unknown>;
  const skip = new Set(skipKeys);

  for (const key of PREFERRED_KEYS) {
    if (skip.has(key)) continue;
    const text = flatten(record[key]).trim();
    if (text) return text;
  }

  // Field errors: prefix each with its field name, since "This field is
  // required." alone does not say which field.
  const rest = Object.entries(record)
    .filter(([key]) => !skip.has(key) && !(PREFERRED_KEYS as readonly string[]).includes(key))
    .map(([key, value]) => {
      const text = flatten(value).trim();
      return text ? `${key}: ${text}` : '';
    })
    .filter(Boolean);

  return rest.length ? rest.join(' ') : null;
};

/** HTTP status of an RTK Query error, when it made it to a response at all. */
export const apiErrorStatus = (err: unknown): number | null => {
  const status = (err as { status?: unknown })?.status;
  return typeof status === 'number' ? status : null;
};
