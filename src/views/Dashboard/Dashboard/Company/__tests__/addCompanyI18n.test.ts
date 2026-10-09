/**
 * Company onboarding wizard — every user-facing string goes through `intl`.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * 2026-08-25 — `/admin/dashboard/select-company` shipped 33+ hardcoded English strings on the
 * FIRST screen a new farmer sees after signing up. Five `formatMessage` calls in 785 lines.
 *
 * ⛔ The half that no per-string sweep would have found: `companySchema` was a MODULE-LEVEL
 * zod object. Zod carries its own English messages, and a schema built outside the component
 * cannot see the locale — so every validation message the form can produce ("State is
 * required", "Enter a 5-digit ZIP code, e.g. 93257") was English forever, no matter how
 * thoroughly the JSX was translated. The schema is now `buildCompanySchema(intl)`, memoised
 * in the component. This test asserts that shape directly, because the string sweep below
 * cannot see it: zod messages are plain function arguments, not JSX.
 *
 * ⚠️ Anti-vacuity: each assertion is paired with a check that the scan still reads something.
 * A regex that stops matching passes "no offenders" forever.
 */
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../i18n/lang/es-419.json';

const FILE = resolve(__dirname, '..', 'AddCompany.jsx');
const SOURCE = readFileSync(FILE, 'utf8');
const LINES = SOURCE.split('\n');

const EN = enUS as Record<string, string>;
const ES = es419 as Record<string, string>;

/** Every `id: 'company.…'` this file names, wherever it names it. */
const REFERENCED = [...SOURCE.matchAll(/id:\s*'(company\.[^']+)'/g)].map((m) => m[1]);
/** Plus the two ids carried as data on SUSTAINABILITY_GOALS and LEGAL_STRUCTURES. */
const INDIRECT = [...SOURCE.matchAll(/(?:titleId|descriptionId|labelId):\s*'([^']+)'/g)].map(
  (m) => m[1]
);
const ALL_IDS = [...new Set([...REFERENCED, ...INDIRECT])];

describe('AddCompany i18n', () => {
  it('reads the component (guards the guard)', () => {
    expect(SOURCE.length).toBeGreaterThan(20_000);
    // 63 ids after the goals step left (recordkeeping review F-11, 2026-10-07); was > 80.
    expect(ALL_IDS.length).toBeGreaterThan(50);
  });

  it('every id it references exists in BOTH locales', () => {
    // react-intl renders the ID ITSELF when a key is missing, so a typo ships as
    // "company.form.zip.help" printed on the page — it reads as a crash, not a gap.
    const missingEn = ALL_IDS.filter((id) => !(id in EN));
    const missingEs = ALL_IDS.filter((id) => !(id in ES));

    expect(missingEn).toEqual([]);
    expect(missingEs).toEqual([]);
  });

  it('no locale left a company.* string identical to the English one by accident', () => {
    /*
     * Not a hard rule — placeholders like "(555) 123-4567", "12345" and "123 Farm Road" are
     * deliberately identical, and so are proper nouns. This asserts the ones that are PROSE
     * differ, which is what catches a copy-paste that never got translated.
     */
    const identical = ALL_IDS.filter((id) => {
      const en = EN[id];
      const es = ES[id];
      if (typeof en !== 'string' || typeof es !== 'string') return false;
      // Prose = more than three words and at least one letter beyond ASCII-digits/punctuation.
      const isProse = en.trim().split(/\s+/).length > 3 && /[a-z]{4,}/i.test(en);
      return isProse && en === es;
    });

    expect(identical, 'these read as English on a Spanish screen').toEqual([]);
  });

  it('no hardcoded user-facing string survives in the JSX', () => {
    /*
     * The sweep that found the original 33. Scoped to the props and text nodes that actually
     * reach a screen — `value=` is excluded on purpose, because those are WIRE VALUES
     * (`legal_structure`, the goal ids) and translating one would silently migrate data.
     */
    const TEXT_NODE = />\s*([A-Z][A-Za-z0-9 ,'.?!&\-/():…]{3,})\s*</;
    const UI_PROP =
      /\b(placeholder|title|label|aria-label|helpText|helperText|description|subtitle|alt|loadingText)=(["'])([^"']{3,})\2/;

    const offenders = LINES.map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => !line.includes('formatMessage'))
      .filter(({ line }) => TEXT_NODE.test(line) || UI_PROP.test(line))
      .map(({ line, n }) => `${n}: ${line.trim()}`);

    expect(offenders, 'route it through intl.formatMessage').toEqual([]);
  });

  it('the zod schema is built FROM intl, not at module scope', () => {
    /*
     * The defect a string sweep cannot see. `const companySchema = object({...})` at module
     * scope means every validation message is frozen English at import time.
     */
    expect(SOURCE).toContain('const buildCompanySchema = (intl) =>');
    expect(SOURCE).toMatch(/resolver:\s*zodResolver\(React\.useMemo\(\(\) => buildCompanySchema/);
    // Anti-vacuity: the schema must actually resolve ids, not just take intl and ignore it.
    const validationIds = [...SOURCE.matchAll(/id:\s*'(company\.validation\.[^']+)'/g)];
    expect(validationIds.length).toBeGreaterThanOrEqual(12);
  });

  it('wire values are NOT translated', () => {
    /*
     * `legal_structure` is posted to the API. Translating it would orphan every row already
     * stored. (The sustainability goal ids left this list with the goals step, recordkeeping
     * review F-11, 2026-10-07.)
     */
    for (const wire of [
      'sole_proprietorship',
      'partnership',
      'llc',
      'corporation',
      'cooperative',
      'family_farm'
    ]) {
      expect(SOURCE).toContain(`'${wire}'`);
      expect(EN[wire], `${wire} must not be a message key`).toBeUndefined();
    }
  });
});
