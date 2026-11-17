/**
 * The certification-type vocabulary lives in FIVE places and must not drift.
 *
 *   1. `certifications/constants.py` → `CERTIFICATION_TYPE_CHOICES`   (Certification model)
 *   2. `src/types/certification.ts` → `CertificationType`             (the TS union)
 *   3. `CertificationManager.tsx`   → `CERTIFICATION_TYPE_OPTIONS`    (what a farmer picks)
 *   4. `history/models.py`          → `BusinessEvent.*CERTIFICATION_TYPE_CHOICES` (a SECOND,
 *      deliberately different vocabulary — the event stores `organic_usda`, the certification
 *      stores `usda_organic`; see `_CERT_TYPE_ALIASES` in claim_authority.py)
 *   5. `BusinessTab-SIMPLIFIED.jsx` → the hand-written `<option>` list for (4)
 *
 * MEASURED 2026-08-27, all three found by reading rather than by any test:
 *   * `korean_organic` was in (1) and in neither (2) nor (3), so a record holding it could
 *     not be represented on edit — the select would fall back to blank and a save would
 *     silently rewrite the operation's certification.
 *   * `ccof` was in (1)(2)(3) and is a certifying AGENT, not a certification. It cost those
 *     operations their Organic Integrity Database verification, which keys on `usda_organic`.
 *   * (5) offered `carbon_neutral` and `sustainable_agriculture`, which
 *     `claim_authority._WITHHELD_CERTIFICATION_TYPES` refuses to publish, and omitted
 *     `kosher`, which (4) has carried since Sprint 2.
 *
 * Which is why this checks BOTH directions on both vocabularies. A one-way check ("every
 * option is valid") passes while half the vocabulary is unreachable.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { historyModelsSource } from '../../../test-utils/backendHistoryModels';

const BACK = join(__dirname, '../../../../../trazo-back');
const CERT_CONSTANTS = join(BACK, 'certifications/constants.py');
const MANAGER = join(__dirname, '../CertificationManager.tsx');
const TYPES = join(__dirname, '../../../types/certification.ts');
const BUSINESS_TAB = join(
  __dirname,
  '../../../views/Dashboard/Dashboard/components/forms/BusinessTab-SIMPLIFIED.jsx'
);

const read = (path: string): string => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw new Error(
      `Cannot read ${path}. This guard compares the form's options against the model's ` +
        `choices, so it needs the trazo-back checkout beside trazo-app.`
    );
  }
};

/**
 * Slugs from a `NAME = [ ("slug", "Label"), ... ]` block in a Python source file.
 *
 * The terminator has to allow leading whitespace: these lists are module-level in
 * `certifications/constants.py` and CLASS ATTRIBUTES in `history/models.py`, so a bare
 * `\n]` finds the first one and misses the second entirely.
 */
const pyChoices = (source: string, name: string): string[] => {
  // Anchored at a line start, not `indexOf`: a bare substring search for
  // `CERTIFICATION_TYPE_CHOICES = [` matches inside `OFFERED_CERTIFICATION_TYPE_CHOICES = [`
  // and silently parses the wrong list.
  const declaration = new RegExp(`^[ \\t]*${name} = \\[`, 'm').exec(source);
  expect(declaration, `${name} moved or was renamed`).not.toBeNull();
  const start = (declaration as RegExpExecArray).index;
  const closer = /^[ \t]*\]/m.exec(source.slice(start));
  expect(closer, `${name} block is not terminated`).not.toBeNull();
  const block = source.slice(start, start + (closer as RegExpExecArray).index);
  return [...block.matchAll(/\(\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
};

describe('Certification vocabulary — model, TS union and picker agree', () => {
  const backend = pyChoices(read(CERT_CONSTANTS), 'CERTIFICATION_TYPE_CHOICES');

  it('parsed a real vocabulary', () => {
    // Anti-vacuity: every comparison below is trivially true against an empty list.
    expect(backend.length).toBeGreaterThan(10);
    expect(backend).toContain('usda_organic');
  });

  it('the TS union matches the model choices exactly, both directions', () => {
    const union = read(TYPES);
    const block = union.slice(
      union.indexOf('export type CertificationType ='),
      union.indexOf(';', union.indexOf('export type CertificationType ='))
    );
    const declared = [...block.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
    expect([...declared].sort()).toEqual([...backend].sort());
  });

  it('the picker offers every model choice, and nothing the model cannot store', () => {
    const manager = read(MANAGER);
    const start = manager.indexOf('const CERTIFICATION_TYPE_OPTIONS');
    expect(start, 'CERTIFICATION_TYPE_OPTIONS moved or was renamed').toBeGreaterThan(-1);
    const block = manager.slice(start, manager.indexOf('\n];', start));
    const offered = [...block.matchAll(/value:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);
    expect([...offered].sort()).toEqual([...backend].sort());
  });

  it('every option label goes through i18n', () => {
    // These twelve strings were the last hardcoded English in the form, so a Spanish-speaking
    // operator picked their certification from an English list. A `label:` key returning is
    // the shape that regression takes.
    const manager = read(MANAGER);
    const start = manager.indexOf('const CERTIFICATION_TYPE_OPTIONS');
    const block = manager.slice(start, manager.indexOf('\n];', start));
    expect(block).not.toMatch(/\blabel:\s*'/);
    expect([...block.matchAll(/labelId:/g)]).toHaveLength([...block.matchAll(/value:/g)].length);
  });

  it('no certifying agent is offered as a certification type', () => {
    // CCOF, WSDA, Oregon Tilth and the rest ISSUE certifications. The agent goes in
    // `certifier_name` — which is what this same form's placeholder always said.
    for (const agent of ['ccof', 'wsda', 'oregon_tilth', 'pco', 'oeffa', 'mosa', 'qcs']) {
      expect(backend).not.toContain(agent);
    }
  });
});

describe('BusinessEvent vocabulary — model and activity form agree', () => {
  const models = historyModelsSource(BACK);
  const offeredBackend = pyChoices(models, 'OFFERED_CERTIFICATION_TYPE_CHOICES');
  const deprecated = pyChoices(models, 'DEPRECATED_CERTIFICATION_TYPE_CHOICES');

  const formOptions = (): string[] => {
    const tab = read(BUSINESS_TAB);
    const anchor = tab.indexOf('name="certification_type"');
    expect(anchor, 'the certification_type Controller moved').toBeGreaterThan(-1);
    const block = tab.slice(anchor, tab.indexOf('</StandardSelect>', anchor));
    return [...block.matchAll(/<option value="([a-z0-9_]+)"/g)].map((m) => m[1]);
  };

  it('parsed both real vocabularies', () => {
    expect(offeredBackend.length).toBeGreaterThan(8);
    expect(deprecated).toEqual(['carbon_neutral', 'sustainable_agriculture']);
  });

  it('the form offers every offered choice, and nothing else', () => {
    expect([...formOptions()].sort()).toEqual([...offeredBackend].sort());
  });

  it('the form offers no retired type', () => {
    // The regression this exists to stop: both retired values name a claim with no issuing
    // body, and `claim_authority` withholds them from every consumer surface. Offering one
    // asks the farmer to make a claim the product then declines to show.
    for (const retired of deprecated) {
      expect(formOptions()).not.toContain(retired);
    }
  });

  it('a retired type is still DISPLAYABLE, so an old record keeps its label', () => {
    // The field's own choices must stay the UNION. Removing the retired entries from the
    // display vocabulary would make `get_certification_type_display()` print a raw slug into
    // a certifier packet, and § 205.103(b)(2) records have to survive an inspector's
    // trace-back. Asserted against the composition line rather than a parsed list, because
    // that line is exactly what a future edit would delete.
    expect(models).toMatch(
      /^\s*CERTIFICATION_TYPE_CHOICES = OFFERED_CERTIFICATION_TYPE_CHOICES \+ DEPRECATED_CERTIFICATION_TYPE_CHOICES\s*$/m
    );
  });
});
