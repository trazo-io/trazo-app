/**
 * Verification Tier Helper Functions
 *
 * Provides utility functions for rendering verification tiers across event cards,
 * previews, and consumer displays. Ensures consistent verification badge styling
 * and information across all event verification displays.
 */

import { FaCamera, FaCheck, FaStar, FaInfoCircle } from 'react-icons/fa';

/**
 * Verification tier configuration for consistent UI display
 */
export type VerificationLevel =
  | 'self_reported'
  | 'photo_documented'
  | 'photo_verified'
  | 'data_verified'
  | 'certified';

/**
 * Badge configuration for each verification tier
 */
export interface VerificationBadgeConfig {
  level: VerificationLevel;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: any;
  /**
   * i18n key for the badge text. Resolve with `intl.formatMessage` at the call site — this
   * module is a pure helper and must stay renderer-agnostic (no hook access here).
   */
  labelKey: string;
  /** i18n key for the badge tooltip. Same contract as `labelKey`. */
  tooltipKey: string;
  /**
   * English fallbacks. Kept so a caller that has not been localized yet still renders
   * readable text rather than a raw dotted key, and so `defaultMessage` can be supplied.
   */
  label: string;
  tooltip: string;
  trustScore: number;
}

/**
 * Get complete badge configuration for a verification level
 * Returns: color, icon, text, tooltip, trust score for consistent display
 */
export function getVerificationBadgeConfig(
  level: VerificationLevel | undefined
): VerificationBadgeConfig {
  const configs: Record<VerificationLevel, VerificationBadgeConfig> = {
    self_reported: {
      level: 'self_reported',
      labelKey: 'consumer.eventCard.tier.self_reported',
      tooltipKey: 'consumer.eventCard.tierTooltip.self_reported',
      color: 'gray.600',
      bgColor: 'gray.50',
      borderColor: 'gray.300',
      icon: FaInfoCircle,
      label: 'Self Reported',
      tooltip: 'Event information provided by the farmer. Carbon data calculated based on input.',
      trustScore: 50
    },
    photo_documented: {
      level: 'photo_documented',
      labelKey: 'consumer.eventCard.tier.photo_documented',
      tooltipKey: 'consumer.eventCard.tierTooltip.photo_documented',
      color: 'teal.600',
      bgColor: 'teal.50',
      borderColor: 'teal.300',
      icon: FaCamera,
      label: 'Photo Documented',
      tooltip:
        'Event includes at least 1 photo from the farm. Increases trust in the documented information.',
      trustScore: 65
    },
    photo_verified: {
      level: 'photo_verified',
      labelKey: 'consumer.eventCard.tier.photo_verified',
      tooltipKey: 'consumer.eventCard.tierTooltip.photo_verified',
      color: 'blue.600',
      bgColor: 'blue.50',
      borderColor: 'blue.300',
      icon: FaCamera,
      label: 'Photo Documented',
      tooltip:
        'Event includes 2+ photos with GPS and timestamp metadata. Strong documentation of farming activity.',
      trustScore: 80
    },
    data_verified: {
      level: 'data_verified',
      labelKey: 'consumer.eventCard.tier.data_verified',
      tooltipKey: 'consumer.eventCard.tierTooltip.data_verified',
      color: 'green.600',
      bgColor: 'green.50',
      borderColor: 'green.300',
      icon: FaCheck,
      label: 'Data Documented',
      tooltip:
        'Event documented with multiple photos and metadata. Strong evidence of farming activity.',
      trustScore: 85
    },
    certified: {
      level: 'certified',
      labelKey: 'consumer.eventCard.tier.certified',
      tooltipKey: 'consumer.eventCard.tierTooltip.certified',
      color: 'purple.600',
      bgColor: 'purple.50',
      borderColor: 'purple.300',
      icon: FaStar,
      label: 'Blockchain-Recorded',
      tooltip: 'Event is part of a blockchain-recorded production. Data immutability guaranteed.',
      trustScore: 100
    }
  };

  return configs[level || 'self_reported'];
}

/**
 * Get Chakra UI color scheme for verification level
 * Used for badge coloring and styling
 */
export function getVerificationColor(level: VerificationLevel | undefined): string {
  const colorMap: Record<VerificationLevel, string> = {
    self_reported: 'gray',
    photo_documented: 'teal',
    photo_verified: 'blue',
    data_verified: 'green',
    certified: 'purple'
  };
  return colorMap[level || 'self_reported'];
}

/**
 * Get icon component for verification level
 */
export function getVerificationIcon(level: VerificationLevel | undefined): any {
  const iconMap: Record<VerificationLevel, any> = {
    self_reported: FaInfoCircle,
    photo_documented: FaCamera,
    photo_verified: FaCamera,
    data_verified: FaCheck,
    certified: FaStar
  };
  return iconMap[level || 'self_reported'];
}

/**
 * Get human-readable label for verification level
 */
export function getVerificationLabel(level: VerificationLevel | undefined): string {
  const labelMap: Record<VerificationLevel, string> = {
    self_reported: 'Self Reported',
    photo_documented: 'Photo Documented',
    photo_verified: 'Photo Documented',
    data_verified: 'Data Documented',
    certified: 'Blockchain-Recorded'
  };
  return labelMap[level || 'self_reported'];
}

/**
 * Get trust score (0-100) for verification level
 * Used for visual indicators and consumer communication
 */
export function getTrustScore(level: VerificationLevel | undefined): number {
  const scoreMap: Record<VerificationLevel, number> = {
    self_reported: 50,
    photo_documented: 65,
    photo_verified: 80,
    data_verified: 85,
    certified: 100
  };
  return scoreMap[level || 'self_reported'];
}

/**
 * Get consumer-friendly tooltip explaining verification level
 */
export function getVerificationTooltip(level: VerificationLevel | undefined): string {
  return getVerificationBadgeConfig(level).tooltip;
}

/**
 * Determine verification level based on photo count and data completeness
 * Used for EventPreviewModal to show likely verification tier
 *
 * MVP Photo Verification: Now checks if photos have valid agricultural content.
 * Photos with AI-generated, stock, or non-agricultural content downgrade to self_reported.
 *
 * @param photoCount - Number of photos attached
 * @param hasGpsData - Whether event has GPS coordinates
 * @param hasTimestamp - Whether event has timestamp
 * @param eventType - Event type (0-7) for auto-upgrade logic
 * @param hasValidPhotoContent - Whether photos contain valid agricultural content (optional)
 *        If false, verification level downgrades to self_reported
 *        If true or undefined, proceeds with normal verification logic
 */
export function calculatePreviewVerificationLevel(
  photoCount: number,
  hasGpsData: boolean,
  hasTimestamp: boolean,
  eventType?: number,
  hasValidPhotoContent: boolean = true // Default: assume valid for preview
): VerificationLevel {
  // Weather, equipment, soil, business events can auto-upgrade to data_verified
  const autoUpgradeTypes = [0, 4, 5, 7]; // Weather, Equipment, Soil, Business
  const isAutoUpgradeType = eventType !== undefined && autoUpgradeTypes.includes(eventType);

  // MVP Photo Verification: If photos exist but don't have valid agricultural content, downgrade
  if (photoCount > 0 && !hasValidPhotoContent) {
    return 'self_reported';
  }

  if (photoCount === 0) {
    return 'self_reported';
  } else if (photoCount === 1) {
    return 'photo_documented';
  } else if (photoCount >= 2) {
    if (hasGpsData && hasTimestamp) {
      if (isAutoUpgradeType) {
        return 'data_verified';
      }
      return 'photo_verified';
    }
    return 'photo_documented';
  }

  return 'self_reported';
}

/**
 * Format verification tier display text for consumer interfaces
 * Example: "Photo Verified (80% Trust)"
 */
export function formatVerificationDisplay(level: VerificationLevel | undefined): string {
  const config = getVerificationBadgeConfig(level);
  return `${config.label} (${config.trustScore}% Trust)`;
}

/**
 * Get color variant string for Chakra UI Badge component
 * Returns 'solid', 'subtle', 'outline' based on verification level
 */
export function getBadgeVariant(
  level: VerificationLevel | undefined
): 'solid' | 'subtle' | 'outline' {
  const variantMap: Record<VerificationLevel, 'solid' | 'subtle' | 'outline'> = {
    self_reported: 'outline',
    photo_documented: 'subtle',
    photo_verified: 'subtle',
    data_verified: 'solid',
    certified: 'solid'
  };
  return variantMap[level || 'self_reported'];
}

/**
 * Validate that a verification level is a valid tier
 */
export function isValidVerificationLevel(level: any): level is VerificationLevel {
  const validLevels: VerificationLevel[] = [
    'self_reported',
    'photo_documented',
    'photo_verified',
    'data_verified',
    'certified'
  ];
  return typeof level === 'string' && validLevels.includes(level as VerificationLevel);
}

/**
 * Get verification progression message for consumer display
 * Shows how photos move an event through verification tiers
 */
export function getVerificationProgressionMessage(
  photoCount: number,
  level: VerificationLevel | undefined
): string {
  if (photoCount === 0) {
    return 'Add photos to verify this event and build consumer trust';
  } else if (photoCount === 1) {
    return '1 photo documented - add more to increase verification strength';
  } else if (photoCount === 2) {
    return '2+ photos verified - strong evidence of farming activity';
  } else {
    return `${photoCount} photos verified - excellent documentation`;
  }
}

/**
 * Get event-type-specific photo recommendations
 * Helps farmers understand exactly what photos to upload for their event
 */
export interface PhotoRecommendation {
  eventType: string;
  examples: string[];
  toAchieveTier: {
    photo_documented: string; // What 1 photo should show
    photo_verified: string; // What 2+ photos should show
  };
  tips: string[];
}

export function getPhotoRecommendations(eventType: number | undefined): PhotoRecommendation | null {
  const recommendations: Record<number, PhotoRecommendation> = {
    0: {
      eventType: 'Weather Event',
      examples: [
        'Frost damage on crops or plants',
        'Hail impact on plants or equipment',
        'Drought conditions (brown/stressed plants)',
        'Heavy rain or flooding evidence',
        'Wind damage to crops or structures'
      ],
      toAchieveTier: {
        photo_documented:
          'One clear photo showing the weather impact (frost damage, hail damage, drought stress, etc.)',
        photo_verified:
          '2+ photos from different angles showing the weather event and its impact on the farm'
      },
      tips: [
        'Include date/timestamp in photo if possible',
        'Show plants or crops affected by the weather',
        'Include scale reference (hand, ruler) for damage assessment',
        'Multiple angles strengthen verification'
      ]
    },
    1: {
      eventType: 'Production Activity',
      examples: [
        'Planting activity (seeding equipment, planted rows)',
        'Growth stage documentation (crop at different heights)',
        'Harvesting in progress (equipment collecting crops)',
        'Equipment operation (tractor in field, irrigation running)',
        'Field conditions before/after activity'
      ],
      toAchieveTier: {
        photo_documented:
          'One clear photo of the production activity (planting, harvesting, irrigation, etc.)',
        photo_verified:
          '2+ photos showing different stages or angles of the same production activity'
      },
      tips: [
        'Show equipment in operation, not just parked',
        'Include field context (rows, crop height, size reference)',
        'Time-stamp photos during the activity',
        'Different angles prove the activity actually occurred'
      ]
    },
    2: {
      eventType: 'Chemical Application',
      examples: [
        'Chemical bottle/container label clearly visible',
        'Chemical being mixed or prepared',
        'Application equipment spraying in field',
        'Field after application (wet/covered areas)',
        'Active ingredient name and concentration visible'
      ],
      toAchieveTier: {
        photo_documented:
          'One clear photo showing the chemical container/label or application in progress',
        photo_verified:
          '2+ photos: (1) chemical bottle with label visible, (2) application equipment in use or field after application'
      },
      tips: [
        'Chemical label must be clearly readable (brand, active ingredient)',
        'Show container size for dosage verification',
        'Photo of application equipment being used strengthens verification',
        'Field condition after application shows completion'
      ]
    },
    3: {
      eventType: 'General Activity',
      examples: [
        'Activity being performed (people, tools, equipment visible)',
        'Activity location/context in farm setting',
        'Results of activity (before/after if applicable)',
        'Equipment or tools being used',
        'Team/workers involved in activity'
      ],
      toAchieveTier: {
        photo_documented: 'One photo clearly showing the activity being performed or its results',
        photo_verified:
          '2+ photos showing the activity from different angles or at different stages of completion'
      },
      tips: [
        'Activity should be clearly identifiable in photos',
        'Include farm context (location, surroundings)',
        'People or equipment in photo adds credibility',
        'Sequential photos show progression of work'
      ]
    },
    4: {
      eventType: 'Equipment Operation',
      examples: [
        'Equipment in operation (tractor, harvester, pump running)',
        'Equipment odometer/hour meter reading',
        'Equipment maintenance or repair work',
        'Fuel being added to equipment',
        'Equipment on the farm (with identifying features)'
      ],
      toAchieveTier: {
        photo_documented: 'One photo showing the equipment being operated or maintained',
        photo_verified:
          '2+ photos: (1) equipment in operation, (2) odometer/hour meter or maintenance detail'
      },
      tips: [
        'Clear view of equipment type (brand, model visible)',
        'Operating photo: equipment actively doing work',
        'Hour meter: photo of dashboard/display showing hours',
        'Odometer: clear reading of mileage'
      ]
    },
    5: {
      eventType: 'Soil Management',
      examples: [
        'Soil sample or soil testing being performed',
        'Soil condition (color, texture, structure visible)',
        'Soil testing equipment or kit',
        'Soil amendment materials being applied',
        'Before/after soil condition photos'
      ],
      toAchieveTier: {
        photo_documented: 'One photo showing soil sample, soil testing, or soil condition',
        photo_verified:
          '2+ photos showing: (1) soil sample/testing activity, (2) testing results or soil condition detail'
      },
      tips: [
        'Soil sample: include scale reference (hand, ruler)',
        'Testing: show equipment being used or results displayed',
        'Depth: indicate depth if relevant to testing',
        'Before/after: dramatically improves verification credibility'
      ]
    },
    6: {
      eventType: 'Pest Management',
      examples: [
        'Pest evidence (damage to crops, pest insects visible)',
        'Traps or monitoring equipment in field',
        'Pest identification (close-up of insect or disease)',
        'Scouting activity (person examining crops)',
        'Treatment equipment or beneficial insects being released'
      ],
      toAchieveTier: {
        photo_documented: 'One photo showing pest evidence, trap, or scouting activity',
        photo_verified:
          '2+ photos showing: (1) pest or pest damage, (2) monitoring/treatment equipment or beneficial insects'
      },
      tips: [
        'Pest damage: wide shot showing extent + close-up of damage',
        'Traps: show trap in field location with identifying context',
        'Insects: macro/close-up photo of actual pest',
        'Scouting: person examining plants with farm context'
      ]
    },
    7: {
      eventType: 'Business Activity',
      examples: [
        'Certification document or certificate',
        'Inspection report or inspector on farm',
        'Compliance documentation being reviewed',
        'Third-party verification official seal/stamp',
        'Certification agency representative at farm'
      ],
      toAchieveTier: {
        photo_documented:
          'One photo showing certification document, inspection report, or verification official',
        photo_verified:
          '2+ photos showing: (1) certification document clearly visible, (2) verification official or agency stamp'
      },
      tips: [
        'Document: certificate number and date clearly readable',
        'Inspection: show inspector on farm or inspection documents',
        'Agency stamp: official seal or verification mark visible',
        'Recent dates: current certifications strengthen verification'
      ]
    }
  };

  return recommendations[eventType ?? -1] ?? null;
}

/**
 * The pieces of the photo-guidance sentence, unformatted.
 *
 * The sentence used to be assembled here with template literals, which made it untranslatable:
 * a locale dictionary can only map whole strings, and these are composed at runtime from an
 * event-type name plus a list of examples. Returning the PARTS lets the caller build the
 * sentence from an ICU message, so word order and punctuation follow the locale rather than
 * English. Callers that just want English can use getPhotoGuidanceText below.
 */
export interface PhotoGuidanceParts {
  /** 0 = nothing uploaded yet, 1 = one photo, 2 = two or more. */
  stage: 0 | 1 | 2;
  /** Localisable event-type name, e.g. "Production Activity". */
  eventTypeName: string;
  /** First two examples, each independently localisable. */
  examples: string[];
  /** The tier sentence for the current photo count, localisable. */
  tierText: string;
}

export function getPhotoGuidanceParts(
  eventType: number | undefined,
  photoCount: number
): PhotoGuidanceParts | null {
  const recs = getPhotoRecommendations(eventType);
  if (!recs) return null;

  if (photoCount === 0) {
    return { stage: 0, eventTypeName: recs.eventType, examples: recs.examples.slice(0, 2), tierText: '' };
  }
  if (photoCount === 1) {
    return {
      stage: 1,
      eventTypeName: recs.eventType,
      examples: [],
      tierText: recs.toAchieveTier.photo_documented
    };
  }
  return {
    stage: 2,
    eventTypeName: recs.eventType,
    examples: [],
    tierText: recs.toAchieveTier.photo_verified
  };
}

/**
 * English-only convenience wrapper, kept for callers that render without an `intl`.
 */
export function getPhotoGuidanceText(eventType: number | undefined, photoCount: number): string {
  const parts = getPhotoGuidanceParts(eventType, photoCount);
  if (!parts) return '';

  if (parts.stage === 0) {
    return `To verify this ${parts.eventTypeName}, upload photos showing: ${parts.examples.join(', ')}`;
  }
  if (parts.stage === 1) {
    return `${parts.tierText} Add another photo from a different angle for stronger verification.`;
  }
  return `${parts.tierText} Excellent documentation for this activity!`;
}

/**
 * Subtype-specific photo recommendations for granular guidance
 * Currently supports Production event subtypes (PL, HA, IR, PR, TR, EQ)
 */
export interface SubtypePhotoRecommendation {
  subtypeCode: string;
  subtypeName: string;
  guidanceText: string;
  examples: string[];
  tips?: string[];
}

/**
 * Production event subtype photo recommendations
 * Maps to ProductionTab.jsx PRODUCTION_TYPE_OPTIONS
 */
const PRODUCTION_SUBTYPE_RECOMMENDATIONS: Record<string, SubtypePhotoRecommendation> = {
  PL: {
    subtypeCode: 'PL',
    subtypeName: 'Planting',
    guidanceText:
      'Capture seeding equipment in operation and planted rows showing seed placement. Photos should document the establishment of new crops with visible planting patterns.',
    examples: [
      'Seeding equipment actively planting (not parked)',
      'Freshly planted rows showing seed spacing',
      'Close-up of seed placement in soil'
    ],
    tips: [
      'Show seeding equipment actively working in the field',
      'Include wide shots of planted rows showing pattern'
    ]
  },
  HA: {
    subtypeCode: 'HA',
    subtypeName: 'Harvesting',
    guidanceText:
      'Document harvesting equipment collecting crops and harvested product. Show the active collection process and crop condition at harvest time.',
    examples: [
      'Harvester equipment actively collecting crops',
      'Harvested product in bins or containers',
      'Field condition during harvest showing crop maturity'
    ],
    tips: [
      'Capture harvester in operation, not parked',
      'Show harvested product quantity for yield verification'
    ]
  },
  IR: {
    subtypeCode: 'IR',
    subtypeName: 'Irrigation',
    guidanceText:
      'Capture irrigation equipment in operation and water being applied to crops. Show active water delivery with visible spray patterns or water flow.',
    examples: [
      'Irrigation system actively running (sprinklers, drip lines)',
      'Water being applied to crops with visible moisture',
      'Irrigation pump or control system showing operation'
    ],
    tips: [
      'Show water actively flowing or spraying',
      'Include irrigation timer or pump hour meter if available'
    ]
  },
  PR: {
    subtypeCode: 'PR',
    subtypeName: 'Pruning/Trimming',
    guidanceText:
      'Document pruning work in progress and plant condition before/after trimming. Show the maintenance activity improving plant structure and health.',
    examples: [
      'Worker actively pruning or trimming plants',
      'Before/after comparison showing pruned branches',
      'Pruning tools and removed plant material'
    ],
    tips: [
      'Before/after shots dramatically improve verification',
      'Show removed branches/material to document work completion'
    ]
  },
  TR: {
    subtypeCode: 'TR',
    subtypeName: 'Transplanting',
    guidanceText:
      'Capture seedlings being moved and transplanted plants in new locations. Document careful handling and proper plant establishment.',
    examples: [
      'Seedlings being prepared for transplanting',
      'Worker transplanting plants with visible roots',
      'Newly transplanted rows showing spacing pattern'
    ],
    tips: [
      'Show seedling root systems for transparency',
      'Document transplanting technique and spacing'
    ]
  },
  // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
  // Keeping both EQ and EM for backward compatibility
  EM: {
    subtypeCode: 'EM',
    subtypeName: 'Equipment Maintenance',
    guidanceText:
      'Document equipment maintenance, repair work, or operation verification. Show maintenance activity with visible equipment components or hour meter readings.',
    examples: [
      'Maintenance or repair work being performed on equipment',
      'Equipment hour meter or odometer reading clearly visible',
      'Equipment in operation showing active use'
    ],
    tips: [
      'Hour meter readings provide strong verification',
      'Show maintenance parts or fluids being replaced'
    ]
  },
  // Backward compatibility: Keep EQ for old data (points to same config as EM)
  EQ: {
    subtypeCode: 'EQ',
    subtypeName: 'Equipment Operations (Legacy)',
    guidanceText:
      'Document equipment maintenance, repair work, or operation verification. Show maintenance activity with visible equipment components or hour meter readings.',
    examples: [
      'Maintenance or repair work being performed on equipment',
      'Equipment hour meter or odometer reading clearly visible',
      'Equipment in operation showing active use'
    ],
    tips: [
      'Hour meter readings provide strong verification',
      'Show maintenance parts or fluids being replaced'
      // Removed: an internal note about EQ being a legacy code was sitting in this list, so a
      // farmer photographing a repair was shown "Note: EQ is legacy code, new events use EM"
      // as if it were photography advice.
    ]
  }
};

/**
 * Get subtype-specific photo recommendations
 * @param eventType - Event type number (0-7)
 * @param subtype - Subtype code (e.g., 'PL', 'HA' for Production events)
 * @returns SubtypePhotoRecommendation or null if not found
 */
export function getSubtypePhotoRecommendations(
  eventType: number | undefined,
  subtype: string | undefined
): SubtypePhotoRecommendation | null {
  // Currently only Production events (type 1) have subtype recommendations
  if (eventType !== 1 || !subtype) {
    return null;
  }

  return PRODUCTION_SUBTYPE_RECOMMENDATIONS[subtype] ?? null;
}

/**
 * Enhanced photo recommendations supporting subtypes
 * Falls back to event-level recommendations if no subtype provided
 */
export function getEnhancedPhotoRecommendations(
  eventType: number | undefined,
  subtype?: string | undefined
): PhotoRecommendation | SubtypePhotoRecommendation | null {
  // Try subtype-specific first
  const subtypeRec = getSubtypePhotoRecommendations(eventType, subtype);
  if (subtypeRec) {
    return subtypeRec;
  }

  // Fall back to event-level recommendations
  return getPhotoRecommendations(eventType);
}
