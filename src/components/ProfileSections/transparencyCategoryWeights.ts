/**
 * The 7 transparency-score category weights, single source of truth on the frontend.
 *
 * Must match `history/services/transparency_calculator.py` `_calculate_completeness_score()`
 * exactly (Production 30 / Chemical 20 / Soil 18 / Pest 12 / Business 10 / Weather 5 /
 * General 5 — also documented in the project's CLAUDE.md).
 *
 * Extracted 2026-08-04: this object was defined twice, identically, in
 * `TransparencyDashboard.tsx` and `TransparencyCategoryBreakdown.tsx`. Two copies of a set of
 * numbers that must equal a THIRD copy on the backend is exactly the kind of drift the rest of
 * this sprint spent its time removing — a future reweighting only had to update one of the two
 * and the weight badges shown next to the category bars would have silently stopped matching
 * the score actually being computed.
 */
export const CATEGORY_WEIGHTS: Record<string, number> = {
  production: 30,
  chemical: 20,
  soil: 18,
  pest: 12,
  business: 10,
  weather: 5,
  general: 5
};
