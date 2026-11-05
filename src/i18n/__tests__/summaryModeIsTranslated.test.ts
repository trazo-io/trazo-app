/**
 * The summary-mode panels speak the user's language (2026-11-04).
 *
 * The harvest, irrigation and grazing summary-mode panels carried hardcoded English titles and
 * descriptions ("Irrigation Summary Mode", "Log multiple irrigations as one summary ..."), and a
 * hardcoded "Active" badge beside each switch, so a Spanish-speaking grower read English in the
 * middle of a translated form. The chemical and pruning panels already used keys.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import en from 'i18n/lang/en-US.json';
import es from 'i18n/lang/es-419.json';

const FORMS = 'src/views/Dashboard/Dashboard/components/forms';
const code = (f: string) =>
  readFileSync(resolve(process.cwd(), FORMS, f), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const KEYS = [
  'events.section.production.harvestSummaryOn',
  'events.section.production.harvestSummaryOff',
  'events.section.production.irrigationSummary',
  'events.section.production.irrigationSummaryOn',
  'events.section.production.irrigationSummaryOff',
  'events.section.soil.grazingSummary',
  'events.section.soil.grazingSummaryOn',
  'events.section.soil.grazingSummaryOff'
];

describe('summary-mode panels are translated', () => {
  it.each(KEYS)('%s exists in both locales, and differs in Spanish', (key) => {
    const e = (en as Record<string, string>)[key];
    const s = (es as Record<string, string>)[key];
    expect(e, `en-US ${key}`).toBeTruthy();
    expect(s, `es-419 ${key}`).toBeTruthy();
    expect(s).not.toBe(e);
  });

  it.each(['ProductionTab.jsx', 'SoilManagementTab.jsx'])(
    '%s renders no hardcoded summary-mode English',
    (f) => {
      const src = code(f);
      expect(src).not.toMatch(/'(Log multiple|Log a whole|Enable to log)[^']*'/);
      expect(src).not.toMatch(/>\s*(Irrigation|Grazing) Summary Mode\s*</);
      // The "Active" badge beside a summary switch: hardcoded, and it only repeated the switch.
      expect(src).not.toMatch(/<Badge[^>]*>\s*Active\s*<\/Badge>/);
      for (const key of KEYS.filter(
        (k) =>
          src.includes(`'${k}'`) ||
          k.includes(f === 'SoilManagementTab.jsx' ? '.soil.' : '.production.')
      )) {
        expect(src, key).toContain(`'${key}'`);
      }
    }
  );
});
