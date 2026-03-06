/**
 * Shared carbon display utility functions.
 *
 * These are extracted from CarbonImpactPreview so that EventDetailsModal
 * (and any future consumer) can format carbon data identically.
 */

/**
 * Smart-round a CO₂e amount for display.
 *
 *  0      → "0"
 *  < 0.1  → "< 0.1"
 *  < 1    → two decimals  (e.g. "0.45")
 *  < 10   → one decimal   (e.g. "5.2")
 *  >= 10  → integer       (e.g. "12")
 */
export function formatCO2e(amount: number): string {
  if (amount === 0) return '0';
  if (amount < 0.1) return '< 0.1';
  if (amount < 1) return amount.toFixed(2);
  if (amount < 10) return amount.toFixed(1);
  return Math.round(amount).toString();
}

/**
 * Return an activity-level label and Chakra colorScheme for a given CO₂e value.
 * Uses transparency-first language (activity classification, not impact judgment).
 */
export function getImpactLevel(co2e: number): { level: string; color: string } {
  if (co2e === 0) return { level: 'carbon.activityLevel.minimal', color: 'gray' };
  if (co2e <= 5) return { level: 'carbon.activityLevel.lightActivity', color: 'green' };
  if (co2e <= 15) return { level: 'carbon.activityLevel.standardActivity', color: 'blue' };
  if (co2e <= 30) return { level: 'carbon.activityLevel.activePractice', color: 'yellow' };
  if (co2e <= 60) return { level: 'carbon.activityLevel.corePractice', color: 'orange' };
  return { level: 'carbon.activityLevel.majorActivity', color: 'orange' };
}

/**
 * Return a Chakra colorScheme string for an efficiency score (0-100).
 */
export function getCarbonScoreColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}
