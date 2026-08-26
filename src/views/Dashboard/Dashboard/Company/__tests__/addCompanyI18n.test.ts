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
    expect(ALL_IDS.length).toBeGreaterThan(80);
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

  it('the goal-count alert pluralises through ICU', () => {
    // `${n} Goals Selected` could render "1 Goals Selected", and Spanish needs agreement on
    // both the noun and the participle.
    for (const [locale, catalogue] of [
      ['en-US', EN],
      ['es-419', ES]
    ] as const) {
      const value = catalogue['company.form.alert.goalsSelected.title'];
      expect(value, `${locale} lost the plural`).toMatch(/\{count,\s*plural,/);
      expect(value).toContain('one {');
      expect(value).toContain('other {');
    }
  });

  it('wire values are NOT translated', () => {
    /*
     * `legal_structure` and the sustainability goal ids are posted to the API and read back by
     * `history/services/transparency_response_formatter.py`. Translating one would change what
     * a shopper sees and orphan every row already stored.
     */
    for (const wire of [
      'sole_proprietorship',
      'partnership',
      'llc',
      'corporation',
      'cooperative',
      'family_farm',
      'full_transparency',
      'water_conservation',
      'soil_health',
      'biodiversity',
      'waste_reduction',
      'renewable_energy'
    ]) {
      expect(SOURCE).toContain(`'${wire}'`);
      expect(EN[wire], `${wire} must not be a message key`).toBeUndefined();
    }
  });

  it('goal tiles carry no per-goal colour at all', () => {
    /*
     * The tiles used to hold `color: 'green' | 'blue' | 'orange' | 'purple' | 'teal' |
     * 'yellow'`, three of which this theme does not define — an `orange.*` token silently
     * resolves to CHAKRA's orange (`.claude/rules/frontend.md`).
     *
     * MEASURED, amber could not carry the tile at ANY step (ramp tops out at #E65100):
     *   amber.800 on amber.50 = 2.90:1  (text owes 4.5)
     *   white on amber.700    = 2.70:1  (icon owes 3.0)
     * And a multi-select's hue carries no meaning, which the colour rule forbids outright.
     * So the assertion is not "no foreign palette" — it is "no per-goal palette".
     */
    const goalsBlock = SOURCE.slice(
      SOURCE.indexOf('const SUSTAINABILITY_GOALS'),
      SOURCE.indexOf('function AddCompany')
    );

    expect(goalsBlock.length).toBeGreaterThan(500); // anti-vacuity
    expect(goalsBlock).not.toMatch(/color:\s*'/);
    expect(SOURCE).not.toContain('goal.color');
  });

  it('the goal tile paints glyphs at .700 or darker', () => {
    /*
     * MEASURED on the theme's green ramp:
     *   white on green.500 = 2.78:1 ⛔ (below even the 3.0 non-text floor) — what shipped
     *   green.600 as text  = 4.00:1 ⛔ on green.50 — what shipped
     *   green.800 on green.50 = 7.65 ✓ · white on green.700 = 5.13 ✓ · green.700 on
     *   green.100 = 4.56 ✓ · green.600 border on white = 4.12 ✓ (boundary only)
     */
    const card = SOURCE.slice(
      SOURCE.indexOf('const SustainabilityGoalCard'),
      SOURCE.indexOf('return (\n    <StandardPage')
    );

    expect(card.length).toBeGreaterThan(800); // anti-vacuity

    /*
     * Line-scoped, not regex-over-the-blob. The first version of this check looked for
     * `color={'green.600'` and so missed `color={isSelected ? 'green.600' : 'gray.600'}` —
     * the exact shape the file actually uses, and the exact shape `.claude/rules/frontend.md`
     * warns about: "the colour arrives through a variable, not a literal prop — grep the
     * DECLARATION, not the call site."
     */
    const lines = card.split('\n');
    const paintsGlyphs = (line: string) =>
      /\b(color|bg)=/.test(line) && !/\bborderColor=/.test(line);
    const tooLight = lines
      .filter((line) => paintsGlyphs(line) && /'green\.[56]00'/.test(line))
      .map((line) => line.trim());

    expect(tooLight, 'green.500/600 paint glyphs here; both fail their floor').toEqual([]);
    // And the boundary use IS still expected, so the scan is not passing by finding nothing.
    expect(card).toMatch(/borderColor=\{isSelected \? 'green\.600'/);
    expect(card).toContain('aria-pressed');
  });
});
