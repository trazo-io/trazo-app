/**
 * The 36-month land-history sentence names the remedy for WHO managed the land in each gap.
 *
 * Overall review 2026-11, OV-FJ-C05, seen in a browser: a block the grower had managed and
 * certified since 2012 printed "not accounted for: 2023-11-10 to 2026-11-10. A prior-manager
 * affidavit covers it." No prior manager exists for those days; the backend counts the
 * certifier's verification of no lapse there, or, for land not stated certified, the grower's
 * own statement.
 */
import { describe, expect, it } from 'vitest';

import { coverageRemedyKeys } from '../coverageRemedies';
import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';

const PRIOR = 'parcelApp.managers.coverage.remedy.priorManager';
const OWN = 'parcelApp.managers.coverage.remedy.ownDeclaration';
const CERTIFIED = 'parcelApp.managers.coverage.remedy.ownCertified';

describe('coverageRemedyKeys', () => {
  it('a gap inside a certified grower’s own tenure points at the verification, never an affidavit', () => {
    expect(coverageRemedyKeys([['2023-11-10', '2026-11-10']], '2012-03-01', true)).toEqual([
      CERTIFIED
    ]);
  });

  it('a gap inside an uncertified grower’s own tenure points at the grower’s own statement', () => {
    expect(coverageRemedyKeys([['2023-11-10', '2026-11-10']], '2012-03-01', false)).toEqual([OWN]);
  });

  it('a gap before the tenure began is a prior manager’s', () => {
    expect(coverageRemedyKeys([['2023-11-10', '2024-02-28']], '2024-03-01', false)).toEqual([
      PRIOR
    ]);
  });

  it('a gap that spans the tenure start names both remedies', () => {
    expect(coverageRemedyKeys([['2023-11-10', '2026-11-10']], '2025-01-01', false)).toEqual([
      PRIOR,
      OWN
    ]);
  });

  it('no gap, no remedy', () => {
    expect(coverageRemedyKeys([], '2012-03-01', true)).toEqual([]);
  });

  it('every remedy reads in both languages, and the gap sentence no longer carries one', () => {
    for (const key of [PRIOR, OWN, CERTIFIED]) {
      expect((enUS as Record<string, string>)[key]).toBeTruthy();
      expect((es419 as Record<string, string>)[key]).toBeTruthy();
    }
    expect((enUS as Record<string, string>)['parcelApp.managers.coverage.gaps']).not.toMatch(
      /affidavit/i
    );
    expect((es419 as Record<string, string>)['parcelApp.managers.coverage.gaps']).not.toMatch(
      /jurada/i
    );
  });
});
