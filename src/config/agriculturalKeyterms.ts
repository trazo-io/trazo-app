/**
 * Agricultural vocabulary keyterms for Deepgram Nova-3 keyword boosting.
 * These terms are sent as `keyterm` query params to improve transcription
 * accuracy for domain-specific vocabulary that general models struggle with.
 *
 * Deepgram limit: ~500 tokens total across all keyterms.
 */

const COMMON_KEYTERMS = [
  // Fertilizer ratios & types
  'NPK',
  '10-10-10',
  '20-10-5',
  '46-0-0',
  '18-46-0',
  '0-0-60',
  'urea',
  'DAP',
  'potash',
  'ammonium nitrate',
  'ammonium sulfate',
  // Chemicals
  'glyphosate',
  'Roundup',
  'atrazine',
  'chlorpyrifos',
  'pyrethrin',
  'neem oil',
  'copper sulfate',
  // Units & measures
  'hectare',
  'acre',
  'per acre',
  'per hectare',
  'pounds per acre',
  'gallons per acre',
  'liters per hectare',
  'kilograms per hectare',
  // Agricultural activities
  'fertilizer',
  'irrigation',
  'drip irrigation',
  'sprinkler',
  'fungicide',
  'herbicide',
  'pesticide',
  'insecticide',
  'pruning',
  'harvest',
  'planting',
  'transplanting',
  'broadcast',
  'foliar',
  'banded',
  'soil amendment',
  // Equipment
  'tractor',
  'diesel',
  'combine',
  'sprayer'
];

const SPANISH_KEYTERMS = [
  'fertilizante',
  'riego',
  'riego por goteo',
  'goteo',
  'aspersion',
  'fungicida',
  'herbicida',
  'pesticida',
  'insecticida',
  'cosecha',
  'poda',
  'siembra',
  'trasplante',
  'hectarea',
  'por acre',
  'por hectarea',
  'libras por acre',
  'galones por acre',
  'litros por hectarea',
  'kilogramos por hectarea',
  'tractor',
  'diesel',
  'urea',
  'glifosato',
  'sulfato de cobre'
];

const PORTUGUESE_KEYTERMS = [
  'fertilizante',
  'irrigacao',
  'gotejamento',
  'aspersao',
  'fungicida',
  'herbicida',
  'pesticida',
  'inseticida',
  'colheita',
  'poda',
  'plantio',
  'transplante',
  'hectare',
  'por acre',
  'por hectare',
  'libras por acre',
  'litros por hectare',
  'quilogramas por hectare',
  'trator',
  'diesel',
  'ureia',
  'glifosato',
  'sulfato de cobre'
];

/**
 * Returns combined common + language-specific keyterms.
 * Deepgram recommends staying under ~500 tokens total.
 */
export function getKeytermsForLanguage(language: string): string[] {
  const langPrefix = language.toLowerCase().slice(0, 2);

  let languageSpecific: string[] = [];
  if (langPrefix === 'es') {
    languageSpecific = SPANISH_KEYTERMS;
  } else if (langPrefix === 'pt') {
    languageSpecific = PORTUGUESE_KEYTERMS;
  }

  // Deduplicate (some terms overlap across languages)
  return [...new Set([...COMMON_KEYTERMS, ...languageSpecific])];
}
