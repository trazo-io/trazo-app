/**
 * Run 7 (R7-05): the post-harvest sanitation block told farmers every sanitizer must be
 * "followed by a potable-water rinse step per § 205.272(b)". § 205.605(b) sets conditions per
 * material, and § 205.272 is not where they live. The copy now comes from a locale key that names
 * the listing and says conditions differ by material.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import es419 from 'i18n/lang/es-419.json';

const source = readFileSync(join(__dirname, '..', 'ProductionTab.jsx'), 'utf8');

describe('post-harvest sanitation copy', () => {
  it('no longer states a blanket rinse rule or cites § 205.272(b)', () => {
    expect(source).not.toMatch(/potable-water rinse step per/);
    expect(source).not.toMatch(/followed by a potable-water rinse/);
    expect(source).toMatch(/id: 'events\.production\.sanitation\.intro'/);
  });

  it('says conditions differ by material, in both locales', () => {
    const en = (enUS as Record<string, string>)['events.production.sanitation.intro'];
    const es = (es419 as Record<string, string>)['events.production.sanitation.intro'];
    expect(en).toContain('§ 205.605');
    expect(en).toContain('differ by material');
    expect(en).not.toMatch(/must be followed by|requires? a potable/i);
    expect(es).toContain('§ 205.605');
    expect(es).toContain('varían según el material');
  });
});
