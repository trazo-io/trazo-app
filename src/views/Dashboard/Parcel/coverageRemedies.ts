/**
 * Which remedy the 36-month land-history sentence offers for its gaps (7 CFR 205.202(b)).
 *
 * Days before the operation began managing the parcel are a prior manager's to attest. Days
 * inside the operation's own tenure are covered by its own statement ("no prohibited material
 * since I began managing it") or, for a parcel stated currently certified, by the certifying
 * agent's verification of no lapse, which is what the backend counts there.
 *
 * Until 2026-11 the sentence offered a prior-manager affidavit for every gap, including a block
 * the grower had managed and certified since 2012 (overall review, OV-FJ-C05).
 *
 * Dates are ISO strings (YYYY-MM-DD), which compare correctly as strings.
 */
export type CoverageRemedyKey =
  | 'parcelApp.managers.coverage.remedy.priorManager'
  | 'parcelApp.managers.coverage.remedy.ownDeclaration'
  | 'parcelApp.managers.coverage.remedy.ownCertified';

export function coverageRemedyKeys(
  gaps: Array<[string, string]>,
  tenureStart: string | null,
  statedCertified: boolean
): CoverageRemedyKey[] {
  if (gaps.length === 0) return [];
  // No tenure start: nobody can say whose days these are, so the prior-manager route is the
  // only one that can be named. (The wizard asks for the start date first in that case.)
  const beforeTenure = !tenureStart || gaps.some(([start]) => start < tenureStart);
  const withinTenure = !!tenureStart && gaps.some(([, end]) => end >= tenureStart);
  const keys: CoverageRemedyKey[] = [];
  if (beforeTenure) keys.push('parcelApp.managers.coverage.remedy.priorManager');
  if (withinTenure) {
    keys.push(
      statedCertified
        ? 'parcelApp.managers.coverage.remedy.ownCertified'
        : 'parcelApp.managers.coverage.remedy.ownDeclaration'
    );
  }
  return keys;
}
