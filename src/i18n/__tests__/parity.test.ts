import { describe, expect, it } from 'vitest';
import { parse as parseIcu } from '@formatjs/icu-messageformat-parser';
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
    // Parsed, not regexed. The previous /\{(\w+)\s*,/ caught comma-form arguments
    // ({count, plural …}) but missed bare ones ({days}), so a translation that simply
    // dropped "{days}" passed this gate and shipped a sentence with a hole in it.
    // A looser regex is not the fix: inside "{count, plural, one {day} other {days}}" the
    // option body {day} is syntactically identical to an argument reference, so any pattern
    // loose enough to catch {days} also reports day/days and every correct plural fails.
    // Walking the parsed AST is the only way to tell the two apart.
    const extract = (value: string): string => {
      const names = new Set<string>();
      const walkNodes = (nodes: any[]) => {
        for (const node of nodes) {
          // type 0 is a literal; every other node with a string `value` is an argument name.
          if (node.type !== 0 && typeof node.value === 'string') names.add(node.value);
          if (node.options)
            for (const opt of Object.values<any>(node.options)) walkNodes(opt.value);
          if (node.children) walkNodes(node.children);
        }
      };
      walkNodes(parseIcu(value));
      return [...names].sort().join(',');
    };

    const mismatches: string[] = [];
    for (const key of enKeys) {
      if (!esKeys.has(key)) continue;
      const en = extract((enUS as Record<string, string>)[key]);
      const es = extract((es419 as Record<string, string>)[key]);
      if (en !== es) mismatches.push(`${key} (en: ${en || '∅'} vs es: ${es || '∅'})`);
    }
    expect(mismatches, mismatches.slice(0, 10).join(' | ')).toEqual([]);
  });
});
