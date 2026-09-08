/**
 * Warn at WRITE time when a supplier's name is being typed into the one box that publishes.
 *
 * The server redacts supplier names out of the public note, but only when they match a name the
 * operation actually recorded in a supplier FIELD, and only on an exact word-boundary match. It
 * cannot recognise an abbreviation, a misspelling, or a supplier the farmer never entered
 * anywhere else. That is a real limit, and the honest response is to tell the farmer while they
 * are typing rather than to promise a guarantee the redactor cannot keep.
 *
 * Detection is deliberately narrow, for the same reason `redact_own_vendor_names` is: a general
 * company-name detector would flag crop varieties, place names and the farm's own brand, and a
 * hint that cries wolf is a hint people learn to dismiss.
 */

/** Words too common in farm prose to treat as a supplier match on their own. */
const STOPWORDS = new Set([
  'organic',
  'certified',
  'natural',
  'valley',
  'green',
  'sun',
  'west',
  'north',
  'south',
  'east',
  'coast',
  'hill',
  'hills',
  'creek',
  'river',
  'premium',
  'quality',
  'family',
  'heritage',
  'pacific',
  'california',
  'american',
  'national',
  'united',
  'farm',
  'farms',
  'ranch',
  'supply',
  'seeds',
  'seed'
]);

/** Corporate/industry suffixes to shed when deriving the distinctive part of a name. */
const NOISE =
  /,.*$|\b(inc|llc|ltd|co|corp|company|nursery|nurseries|seeds?|supply|farms?|ranch|orchards?|growers?|brothers|bros)\b\.?/gi;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The forms of a stored supplier name worth looking for inside prose. */
export const supplierNameCandidates = (raw: unknown): string[] => {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const value = raw.trim();
  const candidates = new Set<string>([value]);

  const head = value.split(',')[0].trim();
  if (head.length >= 4) candidates.add(head);

  const stem = value
    .replace(NOISE, '')
    .replace(/[\s,.-]+$/, '')
    .trim();
  if (stem.length >= 4 && (stem.includes(' ') || !STOPWORDS.has(stem.toLowerCase()))) {
    candidates.add(stem);
  }
  return [...candidates].sort((a, b) => b.length - a.length);
};

/**
 * Which of this form's supplier values appear in the public note.
 *
 * @param note           what the farmer has typed into the public note box
 * @param supplierValues the supplier fields on the SAME form (seed supplier, input supplier,
 *                       amendment supplier, beneficial supplier)
 */
export const supplierNamesInPublicNote = (note: unknown, supplierValues: unknown[]): string[] => {
  if (typeof note !== 'string' || !note.trim()) return [];
  const found: string[] = [];
  for (const value of supplierValues) {
    for (const candidate of supplierNameCandidates(value)) {
      // Word boundaries WITHOUT a lookbehind.
      //
      // ⛔ The obvious `(?<!\w)` does not ship here. `vite.config.ts` targets `safari13.1`, and
      // lookbehind assertions need Safari 16.4+ — and a RegExp built from a string at runtime
      // is never transpiled, so it would throw a SyntaxError inside this component's render and
      // take the whole event form down on those browsers. `(^|\W)` is the portable equivalent
      // for a test; the lookAHEAD `(?!\w)` is universally supported and stays.
      //
      // `\b` is not usable either: a candidate can begin or end on punctuation
      // ("Hydra-Gardens Inc."), where `\b` does not match.
      const pattern = new RegExp(`(^|\\W)${escapeRegExp(candidate)}(?!\\w)`, 'i');
      if (pattern.test(note)) {
        found.push(candidate);
        break; // one hit per supplier field is enough to warn about
      }
    }
  }
  return found;
};

export const publicNoteMentionsASupplier = (note: unknown, supplierValues: unknown[]): boolean =>
  supplierNamesInPublicNote(note, supplierValues).length > 0;
