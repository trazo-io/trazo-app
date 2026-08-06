/**
 * Every registry label key must exist in BOTH locale catalogues.
 *
 * WHY (2026-08-02): `consumerLabelKey: 'events.consumer.fields.temperatureControl'` and
 * `'events.consumer.fields.contaminationIncident'` were added to the registry and the matching
 * i18n entries were never written. Nothing failed. `resolveLabel` in ConsumerEventCard falls
 * back to de-camelCasing the key, so both fields rendered "Temperature Control" and
 * "Contamination Incident" — the exact producer wording the relabel existed to replace — and
 * rendered it in ENGLISH on the Spanish page.
 *
 * The i18n parity gate could not catch it: parity only checks en↔es symmetry, and a key missing
 * from BOTH files is symmetric. That is `feedback_i18n_parity_blindspot`, and this is the second
 * time it has bitten. The fix is to check the direction parity cannot: registry → catalogue.
 *
 * `labelKey` is checked too, not just `consumerLabelKey` — a producer-facing label silently
 * falling back to a de-camelCased identifier is a smaller problem, but the same one.
 */
import { describe, expect, it } from 'vitest';
import { getRegistryEntry } from '../index';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const EVENT_TYPES = [
  { name: 'weather', code: 0 },
  { name: 'production', code: 1 },
  { name: 'chemical', code: 2 },
  { name: 'general', code: 3 },
  { name: 'equipment', code: 4 },
  { name: 'soil_management', code: 5 },
  { name: 'pest_management', code: 6 },
  { name: 'business', code: 7 }
];

const en = enUS as Record<string, string>;
const es = es419 as Record<string, string>;

interface MissingKey {
  where: string;
  key: string;
  locales: string[];
}

const missing: MissingKey[] = [];
let checked = 0;

for (const { name, code } of EVENT_TYPES) {
  const entry = getRegistryEntry(code as never) as unknown as
    | { fields?: Array<Record<string, unknown>> }
    | undefined;

  for (const field of entry?.fields ?? []) {
    for (const prop of ['labelKey', 'consumerLabelKey'] as const) {
      const key = field[prop];
      if (typeof key !== 'string' || !key) continue;
      checked++;
      const absent: string[] = [];
      if (!(key in en)) absent.push('en-US');
      if (!(key in es)) absent.push('es-419');
      if (absent.length) {
        missing.push({ where: `${name}/${String(field.name)}.${prop}`, key, locales: absent });
      }
    }
  }
}

describe('registry label keys resolve in both locales', () => {
  it('checked a meaningful number of keys (guards the harness)', () => {
    expect(checked).toBeGreaterThan(150);
  });

  it('has no key missing from a catalogue', () => {
    const report = missing.map(
      (m) => `  • ${m.where}\n      "${m.key}" missing from: ${m.locales.join(', ')}`
    );
    expect(
      report,
      `\nA registry label key does not exist in the i18n catalogue, so the field renders a\n` +
        `de-camelCased fallback of the key itself — producer wording on a consumer surface, and\n` +
        `English on the Spanish page:\n\n${report.join('\n')}\n\n` +
        `Add the key to BOTH src/i18n/lang/en-US.json and es-419.json.\n`
    ).toEqual([]);
  });
});
