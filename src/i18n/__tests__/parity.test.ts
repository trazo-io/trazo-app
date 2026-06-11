import { describe, expect, it } from 'vitest';
import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

/**
 * Locale parity gate (Phase 5). Both catalogs must carry the exact same key
 * set — a key added to one file only ships untranslated UI (or dead strings).
 * Brought to parity 2026-06-11 (116 missing es keys filled, 61 orphans
 * removed); this test keeps it that way.
 */
describe('i18n locale parity', () => {
  const enKeys = new Set(Object.keys(enUS));
  const esKeys = new Set(Object.keys(es419));

  it('es-419 has every en-US key', () => {
    const missing = [...enKeys].filter((k) => !esKeys.has(k));
    expect(missing, `keys missing from es-419: ${missing.slice(0, 20).join(', ')}`).toEqual([]);
  });

  it('es-419 has no orphan keys absent from en-US', () => {
    const orphans = [...esKeys].filter((k) => !enKeys.has(k));
    expect(orphans, `orphan keys in es-419: ${orphans.slice(0, 20).join(', ')}`).toEqual([]);
  });

  it('ICU arguments match between locales', () => {
    // Comma-form arguments only ({count, plural …}, {pct, number …}) — words
    // inside plural option text ("one {day}") are translatable and excluded.
    const argRe = /\{(\w+)\s*,/g;
    const mismatches: string[] = [];
    for (const key of enKeys) {
      if (!esKeys.has(key)) continue;
      const extract = (s: string) =>
        [...String(s).matchAll(argRe)]
          .map((m) => m[1])
          .sort()
          .join(',');
      const en = extract((enUS as Record<string, string>)[key]);
      const es = extract((es419 as Record<string, string>)[key]);
      if (en !== es) mismatches.push(`${key} (en: ${en || '∅'} vs es: ${es || '∅'})`);
    }
    expect(mismatches, mismatches.slice(0, 10).join(' | ')).toEqual([]);
  });
});
