/**
 * Crop Type Mapping Service
 *
 * Industry best practice for agricultural crop type matching with:
 * - Standardized aliases from USDA and FAO nomenclature
 * - Common name variations and abbreviations
 * - Regional naming differences (US, Latin America, EU)
 * - Fallback hierarchy: exact match → alias match → category match → default
 *
 * References:
 * - USDA NASS Crop Classification
 * - FAO AGROVOC Thesaurus
 * - USDA Plants Database
 */

export interface CropTypeMapping {
  /** Official USDA slug used in database */
  slug: string;
  /** Primary display name */
  primaryName: string;
  /** All recognized aliases including common names, abbreviations, regional names */
  aliases: string[];
  /** Crop category for fallback matching */
  category: string;
  /** Keywords for fuzzy matching */
  keywords: string[];
}

/**
 * Comprehensive crop type mapping based on USDA-verified crop types
 * in the Trazo database (from populate_usda_crop_types.py)
 */
export const CROP_TYPE_MAPPINGS: CropTypeMapping[] = [
  {
    slug: 'citrus_oranges',
    primaryName: 'Citrus',
    aliases: [
      'citrus',
      'oranges',
      'orange',
      'citrus oranges',
      'naranja',
      'naranjas',
      'citricos',
      'cítricos',
      'citrus fruits',
      'orange tree',
      'orange grove',
      'tangerine',
      'tangerines',
      'grapefruit',
      'lemon',
      'lemons',
      'lime',
      'limes',
      'mandarin',
      'mandarins',
      'toronja',
      'limón',
      'limon',
      'lima',
      'mandarina'
    ],
    category: 'tree_fruits',
    keywords: ['citrus', 'orange', 'naranja', 'grove', 'tree']
  },
  {
    slug: 'corn_field',
    primaryName: 'Corn (Field)',
    aliases: [
      'corn',
      'field corn',
      'maize',
      'maíz',
      'maiz',
      'corn field',
      'dent corn',
      'grain corn',
      'elote',
      'choclo'
    ],
    category: 'grains',
    keywords: ['corn', 'maize', 'maiz', 'grain']
  },
  {
    slug: 'soybeans',
    primaryName: 'Soybeans',
    aliases: [
      'soybean',
      'soybeans',
      'soya',
      'soja',
      'soy',
      'soy beans',
      'soya bean',
      'glycine max'
    ],
    category: 'oilseeds',
    keywords: ['soy', 'soja', 'bean']
  },
  {
    slug: 'wheat',
    primaryName: 'Wheat',
    aliases: [
      'wheat',
      'trigo',
      'winter wheat',
      'spring wheat',
      'hard wheat',
      'soft wheat',
      'bread wheat',
      'durum wheat'
    ],
    category: 'grains',
    keywords: ['wheat', 'trigo', 'grain']
  },
  {
    slug: 'cotton',
    primaryName: 'Cotton',
    aliases: ['cotton', 'algodón', 'algodon', 'upland cotton', 'pima cotton', 'cotton plant'],
    category: 'fiber_crops',
    keywords: ['cotton', 'algodon', 'fiber']
  },
  {
    slug: 'walnuts',
    primaryName: 'Walnuts',
    aliases: [
      'walnut',
      'walnuts',
      'english walnut',
      'english walnuts',
      'black walnut',
      'black walnuts',
      'chandler walnut',
      'nuez',
      'nueces',
      'nogal',
      'nogales',
      'juglans regia',
      'juglans nigra',
      'california walnut',
      'persian walnut',
      'walnut orchard',
      'walnut tree'
    ],
    category: 'tree_nuts',
    keywords: ['walnut', 'nuez', 'nogal', 'nut', 'tree', 'juglans', 'chandler']
  },
  {
    slug: 'almonds',
    primaryName: 'Almonds',
    aliases: [
      'almond',
      'almonds',
      'almendra',
      'almendras',
      'almond tree',
      'almond orchard',
      'prunus dulcis'
    ],
    category: 'tree_nuts',
    keywords: ['almond', 'almendra', 'nut', 'tree']
  },
  {
    slug: 'rice',
    primaryName: 'Rice',
    aliases: [
      'rice',
      'arroz',
      'paddy rice',
      'paddy',
      'oryza sativa',
      'long grain rice',
      'short grain rice'
    ],
    category: 'grains',
    keywords: ['rice', 'arroz', 'paddy', 'grain']
  },
  {
    slug: 'tomatoes',
    primaryName: 'Tomatoes',
    aliases: [
      'tomato',
      'tomatoes',
      'tomate',
      'tomates',
      'jitomate',
      'cherry tomato',
      'roma tomato',
      'processing tomato',
      'fresh tomato'
    ],
    category: 'vegetables',
    keywords: ['tomato', 'tomate', 'jitomate']
  },
  {
    slug: 'potatoes',
    primaryName: 'Potatoes',
    aliases: [
      'potato',
      'potatoes',
      'papa',
      'papas',
      'patata',
      'patatas',
      'russet potato',
      'white potato',
      'red potato'
    ],
    category: 'vegetables',
    keywords: ['potato', 'papa', 'patata']
  },
  {
    slug: 'lettuce',
    primaryName: 'Lettuce',
    aliases: [
      'lettuce',
      'lechuga',
      'romaine',
      'iceberg',
      'leaf lettuce',
      'head lettuce',
      'butter lettuce',
      'boston lettuce'
    ],
    category: 'vegetables',
    keywords: ['lettuce', 'lechuga', 'salad', 'leafy']
  },
  {
    slug: 'carrots',
    primaryName: 'Carrots',
    aliases: ['carrot', 'carrots', 'zanahoria', 'zanahorias', 'baby carrots', 'daucus carota'],
    category: 'vegetables',
    keywords: ['carrot', 'zanahoria', 'root']
  },
  {
    slug: 'onions',
    primaryName: 'Onions',
    aliases: [
      'onion',
      'onions',
      'cebolla',
      'cebollas',
      'yellow onion',
      'white onion',
      'red onion',
      'sweet onion',
      'vidalia'
    ],
    category: 'vegetables',
    keywords: ['onion', 'cebolla', 'bulb']
  },
  {
    slug: 'apples',
    primaryName: 'Apples',
    aliases: [
      'apple',
      'apples',
      'manzana',
      'manzanas',
      'apple tree',
      'apple orchard',
      'gala apple',
      'fuji apple',
      'honeycrisp',
      'granny smith'
    ],
    category: 'tree_fruits',
    keywords: ['apple', 'manzana', 'orchard', 'tree']
  },
  {
    slug: 'grapes',
    primaryName: 'Grapes',
    aliases: [
      'grape',
      'grapes',
      'uva',
      'uvas',
      'vineyard',
      'wine grapes',
      'table grapes',
      'raisins',
      'vitis vinifera'
    ],
    category: 'tree_fruits',
    keywords: ['grape', 'uva', 'vine', 'vineyard', 'wine']
  },
  {
    slug: 'strawberries',
    primaryName: 'Strawberries',
    aliases: ['strawberry', 'strawberries', 'fresa', 'fresas', 'frutilla', 'frutillas', 'fragaria'],
    category: 'berries',
    keywords: ['strawberry', 'fresa', 'frutilla', 'berry']
  },
  {
    slug: 'avocados',
    primaryName: 'Avocados',
    aliases: [
      'avocado',
      'avocados',
      'aguacate',
      'aguacates',
      'palta',
      'paltas',
      'hass avocado',
      'persea americana'
    ],
    category: 'tree_fruits',
    keywords: ['avocado', 'aguacate', 'palta', 'tree']
  },
  {
    slug: 'stone_fruit',
    primaryName: 'Stone Fruit',
    aliases: [
      'stone fruit',
      'stone fruits',
      'peach',
      'peaches',
      'nectarine',
      'nectarines',
      'plum',
      'plums',
      'apricot',
      'apricots',
      'cherry',
      'cherries',
      'durazno',
      'duraznos',
      'ciruela',
      'ciruelas',
      'cereza',
      'cerezas',
      'damasco',
      'damascos',
      'albaricoque',
      'melocotón',
      'melocoton',
      'prunus persica',
      'prunus domestica'
    ],
    category: 'tree_fruits',
    keywords: ['peach', 'nectarine', 'plum', 'apricot', 'cherry', 'durazno', 'ciruela', 'stone']
  },
  {
    slug: 'hay_alfalfa',
    primaryName: 'Hay/Alfalfa',
    aliases: [
      'hay',
      'alfalfa',
      'heno',
      'lucerne',
      'timothy hay',
      'grass hay',
      'medicago sativa',
      'forage',
      'fodder'
    ],
    category: 'forage',
    keywords: ['hay', 'alfalfa', 'heno', 'forage', 'fodder']
  },
  {
    slug: 'peanuts',
    primaryName: 'Peanuts',
    aliases: [
      'peanut',
      'peanuts',
      'maní',
      'mani',
      'cacahuate',
      'cacahuetes',
      'groundnut',
      'groundnuts',
      'arachis hypogaea'
    ],
    category: 'oilseeds',
    keywords: ['peanut', 'mani', 'cacahuate', 'groundnut']
  },
  {
    slug: 'mixed_vegetables',
    primaryName: 'Mixed Vegetables',
    aliases: [
      'mixed vegetables',
      'mixed veggies',
      'market garden',
      'vegetable farm',
      'CSA vegetables',
      'garden vegetables',
      'verduras mixtas',
      'huerta',
      'kale',
      'squash',
      'zucchini',
      'peppers',
      'beans',
      'cucumber',
      'cucumbers',
      'beets',
      'chard',
      'herbs',
      'basil',
      'cilantro',
      'eggplant',
      'broccoli',
      'cauliflower',
      'cabbage',
      'peas',
      'radish',
      'turnip',
      'spinach',
      'arugula',
      'collards',
      'mustard greens',
      'calabaza',
      'pimiento',
      'pimientos',
      'pepino',
      'pepinos',
      'berenjena',
      'col',
      'repollo',
      'espinaca',
      'albahaca'
    ],
    category: 'vegetables',
    keywords: ['mixed', 'garden', 'CSA', 'huerta', 'veggies', 'vegetables', 'verduras']
  },
  {
    slug: 'sunflowers',
    primaryName: 'Sunflowers',
    aliases: [
      'sunflower',
      'sunflowers',
      'girasol',
      'girasoles',
      'helianthus',
      'sunflower seed',
      'oil sunflower'
    ],
    category: 'oilseeds',
    keywords: ['sunflower', 'girasol', 'seed', 'oil']
  }
];

/**
 * Category-based fallback templates
 * When no exact crop match is found, we can provide generic templates
 * based on the crop category
 */
export const CATEGORY_DEFAULTS: Record<string, string> = {
  tree_fruits: 'citrus_oranges',
  tree_nuts: 'almonds',
  tree_nut: 'walnuts',
  grains: 'wheat',
  vegetables: 'tomatoes',
  berries: 'strawberries',
  oilseeds: 'soybeans',
  fiber_crops: 'cotton',
  forage: 'hay_alfalfa'
};

/**
 * Normalize a crop name for comparison
 * Removes accents, converts to lowercase, trims whitespace
 */
export function normalizeCropName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Find the best matching crop type from the database crop types
 *
 * @param cropName - The crop name to match (can be user input, production name, etc.)
 * @param cropTypes - Array of crop types from the database
 * @returns The matching crop type ID or null if no match found
 *
 * Matching hierarchy:
 * 1. Exact name match (case-insensitive)
 * 2. Slug match
 * 3. Alias match
 * 4. Keyword match
 * 5. Category match
 * 6. Return null (let caller decide fallback)
 */
export function findCropTypeId(
  cropName: string,
  cropTypes: Array<{ id: number; name: string; slug: string; category: string }>
): number | null {
  if (!cropName || !cropTypes || cropTypes.length === 0) {
    return null;
  }

  const normalizedInput = normalizeCropName(cropName);

  // 1. Try exact name match (case-insensitive)
  const exactMatch = cropTypes.find((ct) => normalizeCropName(ct.name) === normalizedInput);
  if (exactMatch) {
    return exactMatch.id;
  }

  // 2. Try slug match
  const slugMatch = cropTypes.find(
    (ct) => normalizeCropName(ct.slug) === normalizedInput.replace(/\s/g, '_')
  );
  if (slugMatch) {
    return slugMatch.id;
  }

  // 3. Try alias match from our mapping
  for (const mapping of CROP_TYPE_MAPPINGS) {
    if (mapping.aliases.some((alias) => normalizeCropName(alias) === normalizedInput)) {
      // Found alias match, now find the crop type by slug
      const cropType = cropTypes.find(
        (ct) => normalizeCropName(ct.slug) === normalizeCropName(mapping.slug)
      );
      if (cropType) {
        return cropType.id;
      }
    }
  }

  // 4. Try keyword match (partial matching)
  for (const mapping of CROP_TYPE_MAPPINGS) {
    if (
      mapping.keywords.some(
        (keyword) =>
          normalizedInput.includes(normalizeCropName(keyword)) ||
          normalizeCropName(keyword).includes(normalizedInput)
      )
    ) {
      const cropType = cropTypes.find(
        (ct) => normalizeCropName(ct.slug) === normalizeCropName(mapping.slug)
      );
      if (cropType) {
        return cropType.id;
      }
    }
  }

  // 5. Try category-based matching
  const categoryMatch = cropTypes.find((ct) =>
    normalizeCropName(ct.category).includes(normalizedInput)
  );
  if (categoryMatch) {
    return categoryMatch.id;
  }

  // 6. No match found - return null
  // The caller should decide whether to use a default or show all templates
  return null;
}

/**
 * Get the mapping information for a crop type
 * Useful for displaying crop-specific information
 */
export function getCropTypeMapping(slugOrName: string): CropTypeMapping | null {
  const normalized = normalizeCropName(slugOrName);

  for (const mapping of CROP_TYPE_MAPPINGS) {
    if (
      normalizeCropName(mapping.slug) === normalized ||
      normalizeCropName(mapping.primaryName) === normalized ||
      mapping.aliases.some((alias) => normalizeCropName(alias) === normalized)
    ) {
      return mapping;
    }
  }

  return null;
}

/**
 * Get all supported crop categories
 */
export function getCropCategories(): string[] {
  const categories = new Set(CROP_TYPE_MAPPINGS.map((m) => m.category));
  return Array.from(categories).sort();
}

/**
 * Get crop types by category
 */
export function getCropTypesByCategory(category: string): CropTypeMapping[] {
  return CROP_TYPE_MAPPINGS.filter(
    (m) => normalizeCropName(m.category) === normalizeCropName(category)
  );
}

/**
 * Check if a crop name matches a specific crop type
 */
export function cropNameMatches(cropName: string, targetSlug: string): boolean {
  const mapping = CROP_TYPE_MAPPINGS.find(
    (m) => normalizeCropName(m.slug) === normalizeCropName(targetSlug)
  );

  if (!mapping) return false;

  const normalized = normalizeCropName(cropName);
  return (
    normalizeCropName(mapping.slug) === normalized ||
    normalizeCropName(mapping.primaryName) === normalized ||
    mapping.aliases.some((alias) => normalizeCropName(alias) === normalized)
  );
}
