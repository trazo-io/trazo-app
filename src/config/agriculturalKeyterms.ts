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
  // Conventional chemicals. KEPT DELIBERATELY even though this is an organic product: a
  // grower dictates these when recording a DRIFT or contamination incident from a neighbour
  // (§ 205.202(b)), and a garbled prohibited-substance name in that record is worse than a
  // garbled permitted one. They are here to be transcribed, not to be applied.
  'glyphosate',
  'Roundup',
  'atrazine',
  'chlorpyrifos',
  'pyrethrin',
  'neem oil',
  'copper sulfate',
  // ORGANIC MATERIALS — added 2026-08-28.
  //
  // This list previously boosted glyphosate, Roundup, atrazine, DAP and ammonium nitrate and
  // NOT ONE material an organic operation actually applies. An organic recordkeeping product
  // was teaching its recogniser the vocabulary of the farming its users are certified not to
  // do — the same wrong-domain assumption that put Osmocote Plus 15-9-12 in the April demo
  // video. Brand names with alphanumeric suffixes ("Kocide 3000-O") are exactly what a
  // general model mangles, and they are what gets dictated in the block.
  //
  // Sourced from the § 205.601 entries and OMRI listings already seeded on the showcase farm.
  'OMRI',
  'OMRI Listed',
  'National List',
  'Kocide',
  'Kocide 3000-O',
  'copper hydroxide',
  'Entrust',
  'Entrust SC',
  'spinosad',
  'Bacillus thuringiensis',
  'Bt',
  'kaolin clay',
  'Surround WP',
  'horticultural oil',
  'lime sulfur',
  'potassium bicarbonate',
  'insecticidal soap',
  'feather meal',
  'fish emulsion',
  "Neptune's Harvest",
  'compost tea',
  'gypsum',
  'pheromone',
  'mating disruption',
  'Trichogramma',
  'beneficials',
  // Orchard operations and targets
  'air-blast',
  'airblast',
  'hull split',
  'walnut blight',
  'navel orangeworm',
  'codling moth',
  'degree day',
  'buffer zone',
  're-entry interval',
  'pre-harvest interval',
  'REI',
  'PHI',
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
  'sulfato de cobre',
  // Materiales orgánicos — 2026-08-28, same correction as the English list. The crew logging
  // in Spanish applies the same § 205.601 materials the packet prints in English.
  'OMRI',
  'Lista Nacional',
  'hidróxido de cobre',
  'espinosad',
  'aceite hortícola',
  'azufre',
  'jabón insecticida',
  'harina de plumas',
  'emulsión de pescado',
  'té de compost',
  'feromona',
  'confusión sexual',
  'zona de amortiguamiento',
  'intervalo de reingreso',
  'nebulizadora',
  'apertura de ruezno',
  'tizón del nogal',
  'gusano de la nuez'
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
