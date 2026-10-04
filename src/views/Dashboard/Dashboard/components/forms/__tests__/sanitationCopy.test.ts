/**
 * Run 7 (R7-05): the post-harvest sanitation block told farmers every sanitizer must be followed by
 * a potable-water rinse, citing § 205.272(b), in its intro and again under the rinse switch.
 * § 205.605(b) sets conditions per material, and § 205.272 is not where they live. Both strings now
 * come from locale keys; this guards the sanitation block and the keys against any wording that
 * cites § 205.272 for a rinse or states a rinse as always required (review of app #75: the first
 * guard matched only the exact old phrasing and had no Spanish negative).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import es419 from 'i18n/lang/es-419.json';

const source = readFileSync(join(__dirname, '..', 'ProductionTab.jsx'), 'utf8');
const start = source.indexOf('const sanitizerRecordBlock');
const block = source.slice(start, source.indexOf('name="rinse_step_documented"', start) + 400);

const KEYS = [
  'events.production.sanitation.intro',
  'events.production.sanitation.rinseLabel',
  'events.production.sanitation.rinseHint'
];
// A rinse stated as always required, in either language, or § 205.272 cited at all.
const BLANKET_EN =
  /205\.272|required after|must be followed|followed by a potable|requires? a (potable )?rinse/i;
const BLANKET_ES = /205\.272|obligatori|siempre|debe ir seguid|se requiere un enjuague/i;

describe('post-harvest sanitation copy', () => {
  it('the sanitation block cites § 205.272 for no rinse and renders the locale strings', () => {
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('name="rinse_step_documented"');
    const rendered = block.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*$/gm, '');
    // The heading may cite § 205.272 (contamination prevention); a rinse may not.
    expect(rendered).not.toMatch(/rinse[^\n]*205\.272|205\.272[^\n]*rinse/i);
    expect(rendered).not.toMatch(/Required after sanitizer contact/);
    for (const key of KEYS) expect(rendered).toContain(`id: '${key}'`);
  });

  it('no key states a rinse as always required, in either locale', () => {
    for (const key of KEYS) {
      const en = (enUS as Record<string, string>)[key];
      const es = (es419 as Record<string, string>)[key];
      expect(en, key).toBeTruthy();
      expect(es, key).toBeTruthy();
      expect(en, key).not.toMatch(BLANKET_EN);
      expect(es, key).not.toMatch(BLANKET_ES);
    }
    expect((enUS as Record<string, string>)['events.production.sanitation.intro']).toContain(
      'differ by material'
    );
    expect((es419 as Record<string, string>)['events.production.sanitation.intro']).toContain(
      'varían según el material'
    );
  });

  it('the guard patterns catch the sentences they replaced', () => {
    expect('followed by a potable-water rinse step per § 205.272(b)').toMatch(BLANKET_EN);
    expect('Required after sanitizer contact per § 205.272(b)').toMatch(BLANKET_EN);
    expect('Obligatorio después del contacto con el sanitizante (§ 205.272(b))').toMatch(
      BLANKET_ES
    );
  });
});
