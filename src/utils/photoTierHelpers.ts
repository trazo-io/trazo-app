/**
 * Photo Tier Helpers
 *
 * Maps event subtype codes to photo documentation tiers, mirroring the
 * backend transparency_calculator.py 3-tier photo penalty system.
 *
 * SOURCE OF TRUTH: trazo-back/history/services/transparency_calculator.py
 * Keep PHOTO_TIER_* sets below in sync with the backend constants at
 * transparency_calculator.py:67-92.
 *
 * Backend penalty multipliers (per transparency_calculator.py:278-291):
 *  - Tier 1 (essential):   0.5 multiplier → 50% score penalty without photos
 *  - Tier 2 (recommended): 0.75 multiplier → 25% score penalty without photos
 *  - Tier 3 (optional):    1.0 multiplier → 0% penalty
 */

export type PhotoTier = 'essential' | 'recommended' | 'optional';

// Tier 1 ESSENTIAL: 50% score penalty when no photos attached.
// High consumer interest, prevents gaming, irreplaceable verification.
const PHOTO_TIER_ESSENTIAL: ReadonlySet<string> = new Set([
  'PL',
  'HA', // Planting, Harvest
  'FE',
  'PE',
  'FU',
  'HE', // All Chemical subtypes
  'CC', // Cover Crop
  'BR',
  'PI' // Beneficial Release, Pest Identification
]);

// Tier 2 RECOMMENDED: 25% score penalty when no photos attached.
const PHOTO_TIER_RECOMMENDED: ReadonlySet<string> = new Set([
  'PR',
  'TR',
  'CU', // Pruning, Transplanting, Cultivation
  'ST',
  'OM',
  'CO',
  'GR', // Soil Test, Organic Matter, Composting, Grazing
  'SC',
  'TM',
  'IP' // Scouting, Trap Monitoring, IPM
]);

// Chemical subtypes need 2+ photos (label + application) for full credit.
// Source: transparency_calculator.py:339-341
const CHEMICAL_SUBTYPES_MULTI_PHOTO: ReadonlySet<string> = new Set(['FE', 'PE', 'FU', 'HE']);

/**
 * Get photo tier for an event subtype code.
 * Returns 'optional' for unknown or Tier 3 subtypes (safe default).
 *
 * @param subtype Backend subtype code (e.g., 'PL', 'FE', 'IR')
 */
export const getPhotoTier = (subtype: string | undefined | null): PhotoTier => {
  if (!subtype) return 'optional';
  const normalized = subtype.toUpperCase();
  if (PHOTO_TIER_ESSENTIAL.has(normalized)) return 'essential';
  if (PHOTO_TIER_RECOMMENDED.has(normalized)) return 'recommended';
  return 'optional';
};

/**
 * Get penalty percentage (0, 25, or 50) for a tier.
 * Matches backend transparency_calculator.py multipliers.
 */
export const getTierPenaltyPercent = (tier: PhotoTier): number => {
  switch (tier) {
    case 'essential':
      return 50;
    case 'recommended':
      return 25;
    case 'optional':
      return 0;
  }
};

/**
 * How many photos the user should ideally attach for full credit.
 * Chemical subtypes need 2+ (label + application proof).
 */
export const getRecommendedPhotoCount = (subtype: string | undefined | null): number => {
  if (!subtype) return 1;
  if (CHEMICAL_SUBTYPES_MULTI_PHOTO.has(subtype.toUpperCase())) return 2;
  return 1;
};
