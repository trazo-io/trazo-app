/**
 * Record evidence helpers
 *
 * What an event record CONTAINS, said as a fact — never a grade.
 *
 * Until 2026-09-02 this file was a five-rung trust ladder: `self_reported` (trustScore 50)
 * → `photo_documented` (65) → `photo_verified` (80) → `data_verified` (85) → `certified`
 * (100), each rung with its own colour (gray → teal → blue → green-with-a-tick →
 * purple-with-a-star) and a `formatVerificationDisplay()` that printed
 * `"Photo Documented (80% Trust)"`.
 *
 * That is a self-assigned sustainability grade — the thing EU ECGT 2024/825 (live
 * 2026-09-27) bans and FTC 16 CFR 260.6 treats as an unqualified general claim. It is the
 * same defect the 2026-06 pivot fixed by withholding the transparency score from consumers;
 * the ladder survived because it was expressed as a badge rather than a number. Three
 * specifics made it worse than merely self-graded:
 *
 *  - `photo_documented` and `photo_verified` rendered the SAME words ("Photo Documented") in
 *    DIFFERENT colours, so the grade the words refused to state moved into the palette. That
 *    is the defect already removed from this card's border colour (see the note in
 *    ConsumerEventCard around the retired "SCI" corner badge).
 *  - `data_verified` and `certified` were awarded for `extra_data.blockchain_verified` — a
 *    green tick and a purple "Blockchain-Recorded" star for a feature whose flag is off and
 *    whose add-on is withdrawn, bypassing the server's `may_claim_blockchain` chokepoint.
 *  - teal / blue / purple are not theme tokens (the theme defines `green` and `amber`), so
 *    the ladder's colours resolved to Chakra's defaults — a foreign palette, the same trap
 *    `orange` sets in `.claude/rules/frontend.md`.
 *
 * What replaces it: ONE neutral provenance statement, identical on every event, plus
 * ADDITIVE factual chips the caller renders from facts it already holds — photo count, an
 * OMRI/WSDA catalog match, a certificate number. A count is a fact, so it is styled
 * `neutral`; solid green stays reserved for a real third-party listing, which is the rule
 * the input chips already follow.
 *
 * The server-side authority is `history.services.claim_authority.record_evidence_level`.
 */

/**
 * Values the server may send in `verification_level`.
 *
 * The server now emits only the first two. The retired three stay in the union because rows
 * serialized before 2026-09-02 and any un-migrated caller can still put them on the wire —
 * and because presentation does NOT vary by value, a stale one renders correctly rather than
 * falling through to nothing.
 */
export type VerificationLevel =
  | 'self_reported'
  | 'photo_documented'
  /** @deprecated retired 2026-09-02 — accepted from the wire, never displayed differently. */
  | 'photo_verified'
  /** @deprecated retired 2026-09-02 — see the module note; was a blockchain claim. */
  | 'data_verified'
  /** @deprecated retired 2026-09-02 — see the module note; was a blockchain claim. */
  | 'certified';

/**
 * The one provenance statement every event record carries.
 *
 * i18n keys, not strings: this module is a pure helper with no hook access, so the caller
 * resolves them. The English fallbacks exist so a caller that has not been localized yet
 * renders readable text instead of a raw dotted key.
 */
export interface RecordProvenance {
  labelKey: string;
  tooltipKey: string;
  label: string;
  tooltip: string;
}

/**
 * Provenance of an event record. Takes no argument ON PURPOSE.
 *
 * A function that accepted the tier and ignored it would read like an oversight and invite
 * someone to "restore" the branch. There is no branch: every event on the page is the
 * grower's own record, and saying so once, plainly, is the disclosure FTC 16 CFR 260.6 asks
 * for. Evidence that a particular record holds MORE than that is additive and rendered
 * separately by the caller.
 */
export function getRecordProvenance(): RecordProvenance {
  return {
    labelKey: 'consumer.eventCard.provenance.label',
    tooltipKey: 'consumer.eventCard.provenance.tooltip',
    label: 'Grower record',
    tooltip:
      'Logged by the grower as part of this operation’s own farm records. Trazo publishes the record; it does not inspect the farm.'
  };
}

/**
 * Does this event have photo evidence, for the producer-side preview?
 *
 * Was `calculatePreviewVerificationLevel(photoCount, hasGpsData, hasTimestamp, eventType,
 * hasValidPhotoContent)` — five arguments that picked a rung of the retired ladder, including
 * an `autoUpgradeTypes = [0, 4, 5, 7]` branch that promoted weather, equipment, soil and
 * business events to `data_verified` purely for BEING that type. GPS metadata never belonged
 * in it either: it records where a camera was, not whether the practice happened.
 *
 * The preview must show the farmer exactly what a shopper will see, so it answers the only
 * question the buyer page now asks.
 */
export function calculatePreviewVerificationLevel(
  photoCount: number,
  hasValidPhotoContent: boolean = true
): VerificationLevel {
  return photoCount > 0 && hasValidPhotoContent ? 'photo_documented' : 'self_reported';
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
    return {
      stage: 0,
      eventTypeName: recs.eventType,
      examples: recs.examples.slice(0, 2),
      tierText: ''
    };
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
    return `To verify this ${parts.eventTypeName}, upload photos showing: ${parts.examples.join(
      ', '
    )}`;
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
