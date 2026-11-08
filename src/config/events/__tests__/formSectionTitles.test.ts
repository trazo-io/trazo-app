/**
 * Guard: an activity-form section heading names a FIELD GROUP, in the farmer's locale.
 *
 * Two defects travelled together on every one of these headings, and both were visible on
 * one screen: tap the Planting tile, read "Log activity — Planting", then read the first
 * heading inside the form — "Production Activity".
 *
 *   1. THE RETIRED FAMILY VOCABULARY. `EVENT_TYPE_NAMES` is the backend's seven-family
 *      naming ("Production Activity", "Chemical Application", "Soil Management", "Pest
 *      Management"). `config/events/narrative.ts` already forbids rendering it, and
 *      narrative.test.ts pins the timeline and the edit path against it — but nothing
 *      looked at the CREATE form, where four tabs opened with a family name. One record,
 *      two identities: the same defect fixed twice already on sibling surfaces.
 *
 *   2. HARDCODED ENGLISH. All 40 headings were `title="..."` literals. A Spanish-speaking
 *      grower read "Pest Management Event Information" in the middle of a translated form.
 *
 * Fixing only the vocabulary would have left the literals; fixing only the literals would
 * have translated the wrong word into Spanish. This file asserts both, so neither can come
 * back alone.
 *
 * ⚠️ Extraction is BRACE-BALANCED on purpose, not a regex.
 * The title expression comes in five shapes in this directory: a bare literal, a one-line
 * `formatMessage`, a prettier-wrapped `formatMessage` with a `defaultMessage`, a
 * `formatMessage` whose `id` is a ternary, and — SoilManagementTab's soil-test heading —
 * a ternary between two bare LITERALS. A `title=\{[^}]*\}` regex stops at the first `}`
 * and silently drops the wrapped and nested forms; that is exactly how a previous guard in
 * this repo passed while missing the case it was written for. Any string the scanner cannot
 * account for is a failure here, never a skip.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { EVENT_TYPE_NAMES } from '../../../types/standardizedEvents';

const FORMS_DIR = join(__dirname, '../../../views/Dashboard/Dashboard/components/forms');
const LANG_DIR = join(__dirname, '../../../i18n/lang');
const MODAL_PATH = join(__dirname, '../../../components/Modals/EventDetailsModal.tsx');

const EN: Record<string, string> = JSON.parse(readFileSync(join(LANG_DIR, 'en-US.json'), 'utf8'));
const ES: Record<string, string> = JSON.parse(readFileSync(join(LANG_DIR, 'es-419.json'), 'utf8'));

/**
 * Read from EVENT_TYPE_NAMES rather than retyping the eight strings: a family renamed or
 * added there is then covered here without anyone remembering to come back. "Other Farm
 * Activity" is the one extra — the older wording for family 3, still in the wild.
 */
const RETIRED = [...Object.values(EVENT_TYPE_NAMES), 'Other Farm Activity'];

const FORM_FILES = readdirSync(FORMS_DIR).filter((f) => /\.(jsx|tsx)$/.test(f));

/** Each section-component open tag, brace-aware so a nested `}}` cannot end it early. */
function* sectionHeads(src: string): Generator<string> {
  for (const m of src.matchAll(/<(SectionHeader|CollapsibleSection)\b/g)) {
    let depth = 0;
    for (let i = m.index! + m[0].length; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) {
        yield src.slice(m.index!, i + 1);
        break;
      }
    }
  }
}

/** The `title=` value: a quoted literal, or the whole balanced `{…}` expression. */
const titleExpression = (head: string): string | null => {
  const m = /\btitle=/.exec(head);
  if (!m) return null;
  const i = m.index + m[0].length;
  if (head[i] === '"') {
    const j = head.indexOf('"', i + 1);
    return j === -1 ? null : head.slice(i, j + 1);
  }
  if (head[i] !== '{') return null;
  let depth = 0;
  for (let j = i; j < head.length; j++) {
    if (head[j] === '{') depth++;
    else if (head[j] === '}' && --depth === 0) return head.slice(i, j + 1);
  }
  return null;
};

interface Title {
  file: string;
  expr: string;
  /** Every message id the expression can resolve to — a ternary contributes both. */
  keys: string[];
  /** Every bare string in the expression that is NOT a message id: literals, defaultMessage. */
  literals: string[];
}

const titlesInRepo = (): Title[] => {
  const out: Title[] = [];
  for (const file of FORM_FILES) {
    const src = readFileSync(join(FORMS_DIR, file), 'utf8');
    for (const head of sectionHeads(src)) {
      const expr = titleExpression(head);
      if (expr === null) continue;
      const strings = [...expr.matchAll(/['"]([^'"]*)['"]/g)].map((s) => s[1]);
      out.push({
        file,
        expr,
        keys: strings.filter((s) => s in EN),
        literals: strings.filter((s) => !(s in EN))
      });
    }
  }
  return out;
};

/** What a grower actually reads, in one locale. */
const rendered = (t: Title, dict: Record<string, string>): string[] => [
  ...t.keys.map((k) => dict[k]).filter(Boolean),
  ...t.literals
];

describe('activity form section titles', () => {
  it('is not vacuous — it sees every section in every tab', () => {
    const titles = titlesInRepo();
    expect(titles.length).toBeGreaterThan(50);
    // Six tabs plus the shared custom-fields form. If a file stops being scanned, the
    // assertions below quietly stop covering it, which is the failure mode this guard
    // exists to avoid in the first place.
    for (const file of [
      'ProductionTab.jsx',
      'ChemicalTab-ENHANCED.jsx',
      'SoilManagementTab.jsx',
      'PestManagementTab.jsx',
      'CustomFieldsForm.tsx'
    ]) {
      expect(
        titles.filter((t) => t.file === file).length,
        `no section titles found in ${file}`
      ).toBeGreaterThan(0);
    }
  });

  it('parses the awkward shapes, not just the easy ones', () => {
    const titles = titlesInRepo();
    // A prettier-wrapped formatMessage carrying a defaultMessage.
    expect(
      titles.some((t) => t.expr.includes('defaultMessage') && t.keys.length === 1),
      'the wrapped formatMessage form is no longer being parsed'
    ).toBe(true);
    // A branching id — one heading, two possible keys. This is the shape that a
    // `title=\{[^}]*\}` regex truncates.
    expect(
      titles.some((t) => t.keys.length > 1),
      'the ternary-id form is no longer being parsed'
    ).toBe(true);
  });

  it('routes every section title through intl, in no file and no shape', () => {
    const hardcoded = titlesInRepo()
      .filter((t) => !t.expr.includes('formatMessage'))
      .map((t) => `${t.file} :: ${t.expr.slice(0, 70)}`);
    expect(
      hardcoded,
      `these section titles render hardcoded English:\n  ${hardcoded.join('\n  ')}`
    ).toEqual([]);
  });

  it('resolves every message id it references', () => {
    const unresolved = titlesInRepo()
      .filter((t) => t.expr.includes('formatMessage') && t.keys.length === 0)
      .map((t) => `${t.file} :: ${t.expr.slice(0, 70)}`);
    expect(
      unresolved,
      `title message ids missing from en-US.json:\n  ${unresolved.join('\n  ')}`
    ).toEqual([]);
  });

  it('keeps every title key in both locales', () => {
    const missing = titlesInRepo()
      .flatMap((t) => t.keys.map((k) => ({ file: t.file, k })))
      .filter(({ k }) => !(k in ES));
    expect(
      missing,
      `title keys present in en-US but not es-419: ${JSON.stringify(missing)}`
    ).toEqual([]);
  });

  it('never names a retired event family', () => {
    // Word-bounded CONTAINMENT, not equality: of the seven that shipped, only one was the
    // bare family name. The rest bolted a word on — "Chemical Application Details", "Pest
    // Management Event Information", "Trust-Building Business Activity" — and an equality
    // check would have waved every one of them through.
    //
    // The boundaries are load-bearing in the other direction too. Family 4 is "Equipment
    // Operation", and SoilManagementTab has a legitimate fuel heading called "Fuel &
    // Equipment Operations": ordinary English, plural, naming the section's contents. A
    // plain `includes` flagged it, and the fix for a false positive is always to loosen the
    // match, never to add the string to an exception list — a list of the last incident is
    // what this guard replaces.
    const offenders: string[] = [];
    for (const t of titlesInRepo()) {
      for (const text of rendered(t, EN)) {
        for (const family of RETIRED) {
          const bounded = new RegExp(`\\b${family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          if (bounded.test(text)) offenders.push(`${t.file} :: "${text}" contains "${family}"`);
        }
      }
    }
    expect(
      offenders,
      `section headings must name a field group, not the backend event family:\n  ${offenders.join(
        '\n  '
      )}`
    ).toEqual([]);
  });

  /**
   * The record modal, which is where the same words come back after the form is saved.
   *
   * Its four headings are plain `<Text fontSize="lg" fontWeight="bold">`, not
   * `SectionHeader`, so adding this file to the directory scan above would have found
   * nothing and quietly reported success — the reason this is a separate, explicit check
   * against the four keys rather than another sweep.
   *
   * What shipped: a heading reading "Event Details" over a box separately labelled "Field
   * Notes", holding one value, positioned two blocks above "Detailed Information" — one
   * section called Details with none in it, another with all of them.
   */
  it('heads the record modal with words that describe what is under them', () => {
    const modal = readFileSync(MODAL_PATH, 'utf8');
    const keys = [
      ...modal.matchAll(/<Text fontSize="lg" fontWeight="bold"[\s\S]{0,120}?id: '([^']+)'/g)
    ].map((m) => m[1]);
    // Five sections: field notes, photos, detailed information, the grower's own custom
    // fields (added 2026-08-31 — the modal had never rendered them), and carbon impact.
    //
    // The count is asserted, not just scanned, because the whole point of this check is that
    // these headings are plain <Text>, not SectionHeader: a sweep would find nothing and pass.
    // A change here should be a deliberate edit by whoever added or removed a section, which
    // is exactly what a hardcoded number forces.
    expect(keys.length, 'the modal heading shape changed and is no longer scanned').toBe(5);
    for (const key of keys) {
      expect(EN[key], `modal heading ${key} missing from en-US`).toBeTruthy();
      expect(ES[key], `modal heading ${key} missing from es-419`).toBeTruthy();
    }
    // "Event" is the backend model's word, not the farmer's — they logged an ACTIVITY.
    const modelWords = keys.filter((k) => /\bEvent\b/.test(EN[k]));
    expect(modelWords, `modal headings still named after the backend model: ${modelWords}`).toEqual(
      []
    );
  });

  it('leaves no orphan for a retired heading key to be revived from', () => {
    // `app.eventDetails` and `app.eventPhotos` were deleted from both locales when their
    // last call sites went. An unused key with the old wording is how the old wording comes
    // back: the next person greps the catalogue, finds "Event Photos", and uses it.
    for (const key of ['app.eventDetails', 'app.eventPhotos']) {
      expect(key in EN, `${key} is retired and must not be re-added to en-US`).toBe(false);
      expect(key in ES, `${key} is retired and must not be re-added to es-419`).toBe(false);
    }
  });

  /**
   * The catalogue-wide rule, and the only one of these assertions that can catch the NEXT
   * surface instead of the last one.
   *
   * The retired family vocabulary has one home:
   *   `events.types.*`      — the registry's own labels. This is where the words are DEFINED.
   * (`transparency.*`, the score breakdown's category names, was the second until 2026-11-08,
   * when the orphaned transparency copy was deleted: nothing rendered it.)
   * Everywhere else, a value naming a family is naming a RECORD, and the record is an
   * activity the farmer chose. That is a rule with a named home, not a list of past
   * incidents — the distinction that makes it worth having.
   *
   * Two things it deliberately permits, both real agronomy rather than the family vocabulary:
   *   - "Integrated Pest Management" (7 CFR 205.206), stripped before matching. IPM is a term
   *     of art that happens to contain family 6's name.
   *   - Sentence case. "Pest management strategy" labels the parcel's
   *     `pest_management_strategy` field and "Soil management type" asks which soil practice;
   *     the app writes FIELD LABELS in sentence case ("Production type", "Field work") and
   *     family names in Title Case, so a case-sensitive match separates them for free.
   *     ⚠️ Do not add an `i` flag to the regex below — it would collapse that distinction and
   *     turn every honest field label into a false positive, which is how a guard gets an
   *     exception list bolted onto it and stops meaning anything.
   */
  it('keeps the retired family vocabulary to its two defined homes', () => {
    const HOMES = /^events\.types\./;
    const offenders: string[] = [];
    for (const [key, value] of Object.entries(EN)) {
      if (typeof value !== 'string' || HOMES.test(key)) continue;
      const probe = value.replace(/Integrated Pest Management/g, '');
      for (const family of RETIRED) {
        const bounded = new RegExp(`\\b${family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (bounded.test(probe)) offenders.push(`${key} = "${value.slice(0, 70)}"`);
      }
    }
    expect(
      offenders,
      `these strings name a retired event family outside events.types.*:\n  ${offenders.join(
        '\n  '
      )}`
    ).toEqual([]);
  });

  it('is not vacuous: the home still holds the vocabulary', () => {
    // If the family labels were ever renamed or removed, the assertion above would pass
    // trivially and stop meaning anything. Prove the words are still somewhere.
    const homed = Object.entries(EN).filter(
      ([k, v]) => /^events\.types\./.test(k) && RETIRED.includes(v as string)
    );
    // Chemical Application, Soil Management, Pest Management.
    expect(homed.length, 'no family label found in events.types.*').toBeGreaterThanOrEqual(3);
  });

  it('checks the Spanish a grower actually reads, not just the key', () => {
    // The English assertion above cannot see a Spanish regression, and there is no canonical
    // Spanish for the retired families to match on. What IS checkable: every key a title
    // resolves to has a non-empty Spanish string that is not just the English copied over.
    // A heading left untranslated is how the hardcoded literals read before this change.
    const untranslated = titlesInRepo()
      .flatMap((t) => t.keys)
      .filter((k) => k.startsWith('events.section.'))
      .filter((k) => !ES[k]?.trim());
    expect(untranslated, `empty es-419 section titles: ${JSON.stringify(untranslated)}`).toEqual(
      []
    );
  });
});
