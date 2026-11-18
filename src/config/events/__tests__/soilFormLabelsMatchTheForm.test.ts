/**
 * `soilFormLabelKey` is what a refused save calls a soil field, so it must be the label the form
 * renders for that field (review of app #435: "Cantidad instalada" on screen, "Estructuras
 * instaladas" in the toast). Reads the form and compares.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { SOIL_FORM_LABEL_KEYS, soilFormLabelKey } from '../soilFormLabels';

const FORM = readFileSync(
  resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms/SoilManagementTab.jsx'),
  'utf8'
);

/** field -> the label keys the form renders on the StandardField that registers it. */
const rendered = (): Map<string, Set<string>> => {
  const out = new Map<string, Set<string>>();
  const field =
    /<StandardField\b(?:(?!<StandardField\b)[\s\S])*?label=\{intl\.formatMessage\(\{ id: '(events\.soil\.form\.label\.[^']+)' \}\)\}/g;
  for (const m of FORM.matchAll(field)) {
    const end = FORM.indexOf('</StandardField>', (m.index ?? 0) + m[0].length);
    const block = FORM.slice((m.index ?? 0) + m[0].length, end);
    const name = block.match(/register\(\s*'([a-z0-9_]+)'|name="([a-z0-9_]+)"/);
    const f = name?.[1] || name?.[2];
    if (!f) continue;
    out.set(f, (out.get(f) ?? new Set()).add(m[1]));
  }
  return out;
};

describe('the toast names a soil field the way the form does', () => {
  it('reads the form (guards the guard)', () => {
    expect(rendered().size).toBeGreaterThan(25);
  });

  it('has, for every field the form labels, the key the form renders', () => {
    for (const [f, keys] of rendered()) {
      const known = new Set(
        [
          SOIL_FORM_LABEL_KEYS[f],
          ...['PA', 'OM', 'CC', 'CO', 'NS'].map((s) => soilFormLabelKey(f, s))
        ].filter(Boolean)
      );
      for (const key of keys) expect(known.has(key), `${f}: ${key}`).toBe(true);
    }
  });

  it('only names keys the form renders, in both locales', () => {
    for (const key of Object.values(SOIL_FORM_LABEL_KEYS)) {
      expect(FORM, key).toContain(`'${key}'`);
      expect((enUS as Record<string, string>)[key], key).toBeTruthy();
      expect((es419 as Record<string, string>)[key], key).toBeTruthy();
    }
  });

  it('words a nesting structure and an amendment depth by subtype', () => {
    expect(soilFormLabelKey('habitat_structure_count', 'NS')).toBe(
      'events.soil.form.label.numberInstalled'
    );
    expect(soilFormLabelKey('habitat_type', 'NS')).toBe('events.soil.form.label.structureType');
    expect(soilFormLabelKey('habitat_type', 'HD')).toBe('events.soil.form.label.habitatType');
    expect(soilFormLabelKey('depth', 'OM')).toBe('events.soil.form.label.applicationDepth');
    expect(soilFormLabelKey('depth', 'TI')).toBe('events.soil.form.label.workingDepth');
    expect(soilFormLabelKey('not_a_soil_field', 'OM')).toBeNull();
  });
});
