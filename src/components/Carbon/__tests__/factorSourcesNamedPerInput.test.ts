/**
 * The consumer's "where the factors come from" card names the source PER INPUT (2026-11-05).
 *
 * `USDACredibilityBadge` renders inside the QR page's carbon section. Until this date it told a
 * shopper "Government-Sourced Emission Factors", "All carbon calculations in Trazo use emission
 * factors published by US government agencies", showed an "EPA/USDA-Sourced" and a green
 * "Government Data" chip, and listed "USDA Agricultural Research Service" as a source.
 *
 * None of it held: phosphorus and potassium factors are Trazo estimates, pesticides and herbicides
 * use academic LCA (`.claude/rules/carbon-methodology.md`), and the "USDA ARS" line is an
 * attribution `trazo-back/carbon/services/verified_emission_factors.py` records as a non-citation.
 * compliance.md forbids the blanket form; provenance is stated per input class.
 */
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const BLANKET = [
  /EPA\/USDA/i,
  /government[- ]sourced/i,
  /government data/i,
  /datos gubernamentales/i,
  /all carbon calculations/i,
  /todos los cálculos/i,
  /Agricultural Research Service/i
];

const card = (messages: Record<string, string>) =>
  Object.entries(messages).filter(([key]) => key.startsWith('app.usdaBadge.'));

describe('the factor-source card states provenance per input, never a blanket claim', () => {
  for (const [name, messages] of [
    ['en-US', enUS],
    ['es-419', es419]
  ] as const) {
    it(`${name}: no blanket provenance`, () => {
      const entries = card(messages as unknown as Record<string, string>);
      expect(entries.length).toBeGreaterThan(10); // not vacuous
      const offenders = entries.filter(([, text]) => BLANKET.some((re) => re.test(text)));
      expect(offenders).toEqual([]);
    });

    it(`${name}: names the estimate and the academic sources`, () => {
      const m = messages as unknown as Record<string, string>;
      expect(m['app.usdaBadge.trazoEstimate']).toBeTruthy();
      expect(m['app.usdaBadge.academicLca']).toMatch(/Audsley/);
    });
  }
});
