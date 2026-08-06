import React, { useCallback, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Collapse,
  useColorModeValue,
  Flex,
  Tooltip,
  Circle,
  Divider,
  Stack,
  useBreakpointValue,
  Progress,
  SimpleGrid
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaInfoCircle,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaSeedling,
  FaShieldAlt,
  FaGlobeAmericas,
  FaCertificate,
  FaEye,
  FaCamera,
  FaThermometerHalf,
  FaTint,
  FaWind,
  FaFlask,
  FaTractor,
  FaSeedling as FaSeed,
  FaBug,
  FaRulerCombined,
  FaCalendarDay,
  FaCalendarAlt,
  FaLayerGroup,
  FaCloudRain,
  FaClipboardList
} from 'react-icons/fa';
import { MdEco } from 'react-icons/md';
import {
  getConsumerEventDescription,
  localizeConsumerDescription,
  formatEventDate,
  getEventTrustIndicators
} from 'utils/eventDescriptions';
import {
  getEventFieldDisplay,
  localizeFieldValue,
  mergeCustomFieldsIntoDisplay,
  type EventFieldDisplay,
  type FieldDisplayItem
} from 'utils/fieldDisplayUtils';
// Event Field Registry (Phase 5 — feature-flagged)
import { getFieldsForSurface, type ResolvedFieldSet } from 'src/config/events';
// Worker privacy mask for the public QR page — see utils/consumerDisplay.ts
import { maskPerformerName, withUSUnits, formatHarvestDate } from 'utils/consumerDisplay';
import { extractSubtypeCode } from 'utils/eventDataNormalizer';

const USE_FIELD_REGISTRY = import.meta.env.VITE_USE_FIELD_REGISTRY === 'true';
import {
  getVerificationBadgeConfig,
  getVerificationColor,
  type VerificationLevel
} from 'utils/verificationTierHelpers';
import { StandardImageGallery } from 'components/ImageGallery';

/**
 * Colour + noun for the aggregate ("summary mode") card, keyed by two-letter sub-type code.
 *
 * Keyed off `event.subtype`, NOT `event.type` — normalization overwrites `type` with the
 * event family name ('chemical', 'production', …), so the `event.type === 'FE'` comparisons
 * this map replaced were permanently false and every aggregate event rendered its header
 * with no totals underneath. See eventDataNormalizer.extractSubtypeCode.
 */
const SUMMARY_PALETTE: Record<
  string,
  { scheme: string; bg: string; border: string; icon: string; text: string; noun: string }
> = {
  FE: {
    scheme: 'blue',
    bg: 'blue.50',
    border: 'blue.200',
    icon: 'blue.500',
    text: 'blue.600',
    noun: 'Applications'
  },
  FU: {
    scheme: 'purple',
    bg: 'purple.50',
    border: 'purple.200',
    icon: 'purple.500',
    text: 'purple.600',
    noun: 'Applications'
  },
  PE: {
    scheme: 'orange',
    bg: 'orange.50',
    border: 'orange.200',
    icon: 'orange.500',
    text: 'orange.600',
    noun: 'Applications'
  },
  SC: {
    scheme: 'green',
    bg: 'green.50',
    border: 'green.200',
    icon: 'green.500',
    text: 'green.600',
    noun: 'Scouting Trips'
  },
  HA: {
    scheme: 'yellow',
    bg: 'yellow.50',
    border: 'yellow.200',
    icon: 'yellow.600',
    text: 'yellow.700',
    noun: 'Harvests'
  }
};

const SUMMARY_PALETTE_FALLBACK = {
  scheme: 'blue',
  bg: 'gray.50',
  border: 'gray.200',
  icon: 'gray.500',
  text: 'gray.600',
  noun: 'Events'
};

/** Sub-types that have a dedicated `consumer.eventCard.summaryNoun.*` i18n key. */
const SUMMARY_NOUN_SUBTYPES = ['FE', 'FU', 'PE', 'SC'];

/** English fallbacks for the summary badge noun, used when the i18n key is missing. */
const SUMMARY_NOUN_DEFAULTS: Record<string, string> = {
  FE: 'Fertilizer Apps',
  FU: 'Fungicide Apps',
  PE: 'Pesticide Apps',
  SC: 'Scouting Trips'
};

/**
 * Enum value → i18n key for the consumer-visible label maps below.
 *
 * These used to be inline `Record<string, string>` tables of English literals rendered
 * straight into the card. Trazo's consumer page is bilingual (en-US / es-419), so a Spanish
 * shopper saw "Solar-Powered Pump" and "OMRI Listed" untranslated in the middle of an
 * otherwise localized page. Keys must exist in BOTH locale files.
 */
/**
 * `getConsumerEventDescription()` has a fallback pair — consumerImpact + sustainabilityBenefit —
 * for EACH of the eight event families, used whenever a subtype has no specific copy. All
 * sixteen are listed here because all sixteen render as filler:
 *
 *   What This Means For You  — "This agricultural practice follows sustainable farming
 *                               methods to ensure high-quality food production."
 *   Environmental Benefit    — "Part of responsible farming practices that support
 *                               environmental stewardship and long-term agricultural
 *                               sustainability."
 *
 * They say nothing, and they are unqualified general environmental-benefit claims of exactly
 * the kind FTC 16 CFR 260.6 warns about — "sustainable", "responsible" and "stewardship"
 * asserted about, say, an equipment-cleaning record. Rendering nothing is more honest, keeps
 * the card short for a 20-40 second read, and stops the specific copy elsewhere from reading
 * as boilerplate. The farmer's own event name, description and field notes carry the card.
 *
 * This started as just the PRODUCTION pair (2026-07-31). Measuring the DB showed the other
 * seven families were still rendering theirs — the `general` pair alone appears on 60 of the
 * 77 published general events, because 78% of them have no `activity_type` and so never reach
 * a specific branch.
 *
 * BOTH locales are listed because `localizeConsumerDescription` runs BEFORE this check
 * (see the eventInfo memo below), so on an es-419 page the value is already the translation —
 * an English-only match would silently stop suppressing anything in Spanish. Keep these in
 * sync with eventDescriptions.ts and its CONSUMER_DESCRIPTION_ES entries;
 * `consumerFallbackCopy.test.ts` fails if they drift.
 */
const GENERIC_FALLBACK_COPY: readonly string[] = [
  // ---- en-US (eventDescriptions.ts) ----
  // production
  'This agricultural practice follows sustainable farming methods to ensure high-quality food production.',
  'Part of responsible farming practices that support environmental stewardship and long-term agricultural sustainability.',
  // weather
  'Weather is the one thing a farm cannot control, and it is logged here beside everything it can.',
  'Weather monitoring enables precise agricultural decisions that optimize resource use and minimize environmental impact.',
  // chemical
  'What was applied, where and when is on record for this crop.',
  'Part of integrated farming approach that balances productivity with environmental responsibility.',
  // soil
  'This soil management practice supports healthy growing conditions and sustainable farming.',
  'Documented soil management demonstrates commitment to soil health and environmental stewardship.',
  // pest
  'The method used against the pest is on record, alongside the counts that prompted it.',
  'Part of integrated pest management approach that reduces reliance on synthetic pesticides and promotes ecological balance.',
  // general
  'This farm management activity supports efficient operations and sustainable farming practices.',
  'Part of comprehensive farm management that ensures operational efficiency and environmental responsibility.',
  // equipment
  'This equipment operation supports efficient and sustainable farming practices.',
  'Documented equipment operations demonstrate transparent farming practices and operational efficiency.',
  // business
  'Supporting agricultural transparency and sustainability',
  'The document, the issuer and the date are on record for this crop.',
  // ---- es-419 (eventDescriptions.es.ts) ----
  // production
  'Esta práctica agrícola sigue métodos de agricultura sostenible para asegurar una producción de alimentos de alta calidad.',
  'Parte de prácticas agrícolas responsables que apoyan el cuidado ambiental y la sostenibilidad agrícola a largo plazo.',
  // weather
  'El clima es lo único que una finca no puede controlar, y queda registrado aquí junto a todo lo que sí puede.',
  'El monitoreo del clima permite tomar decisiones agrícolas precisas que optimizan el uso de recursos y minimizan el impacto ambiental.',
  // chemical
  'Qué se aplicó, dónde y cuándo queda registrado para este cultivo.',
  'Parte de un enfoque agrícola integrado que equilibra la productividad con la responsabilidad ambiental.',
  // soil
  'Esta práctica de manejo del suelo favorece condiciones de cultivo saludables y la agricultura sostenible.',
  'El manejo del suelo documentado demuestra el compromiso con la salud del suelo y el cuidado del medio ambiente.',
  // pest
  'El método usado contra la plaga queda registrado, junto con los conteos que lo motivaron.',
  'Parte de un enfoque de manejo integrado de plagas que reduce la dependencia de pesticidas sintéticos y promueve el equilibrio ecológico.',
  // general
  'Esta actividad de gestión agrícola respalda operaciones eficientes y prácticas agrícolas sostenibles.',
  'Parte de un manejo integral de la finca que asegura la eficiencia operativa y la responsabilidad ambiental.',
  // equipment
  'Esta operación de equipo respalda prácticas agrícolas eficientes y sostenibles.',
  'Las operaciones de equipo documentadas demuestran prácticas agrícolas transparentes y eficiencia operativa.',
  // business
  'Apoyo a la transparencia y la sostenibilidad agrícola',
  'El documento, el emisor y la fecha quedan registrados para este cultivo.',
  'Contribuye a la agricultura sostenible y al cuidado del medio ambiente'
];

const isGenericCopy = (text?: string | null): boolean => {
  if (!text || !text.trim()) return true;
  return GENERIC_FALLBACK_COPY.includes(text.trim());
};

const ELECTRICITY_SOURCE_KEYS: Record<string, string> = {
  solar: 'consumer.eventCard.electricity.solar',
  wind: 'consumer.eventCard.electricity.wind',
  grid: 'consumer.eventCard.electricity.grid',
  diesel_generator: 'consumer.eventCard.electricity.dieselGenerator',
  mixed: 'consumer.eventCard.electricity.mixed'
};

const ORGANIC_STATUS_KEYS: Record<string, string> = {
  omri_listed: 'consumer.eventCard.organic.omriListed',
  usda_nop_approved: 'consumer.eventCard.organic.usdaNopApproved',
  organic_equivalent: 'consumer.eventCard.organic.organicApproved',
  organic_certified: 'consumer.eventCard.organic.organicApproved',
  transitional: 'consumer.eventCard.organic.transitional',
  yes: 'consumer.eventCard.organic.organicApproved'
};

// Comprehensive event interface that includes all possible fields across all event types
interface ConsumerEventData {
  // Base fields (always present)
  id: string;
  type: string;
  title?: string;
  description: string;
  observation?: string;
  date: string;
  event_type?: number;

  // Sprint 1 Epic 1.4: USDA GAP Traceability
  performed_by?: string;

  // Verification and trust indicators
  certified?: boolean;
  blockchain_verified?: boolean;
  blockchain_transaction?: string;
  blockchain_block_number?: number;
  blockchain_explorer_url?: string;
  blockchain_network?: string;
  verification_confidence?: number;
  verification_timestamp?: string;
  data_integrity_score?: number;
  usda_factors_used?: boolean;
  carbon_impact?: number;
  // MVP Photo Verification: Tiered verification levels
  verification_level?:
    | 'self_reported'
    | 'photo_documented'
    | 'photo_verified'
    | 'data_verified'
    | 'certified';
  photo_verified_count?: number;

  // Photo/media data
  photo_count?: number;
  album?: {
    id: string;
    images: Array<{
      id: string;
      image: string;
      caption?: string;
      created_at?: string;
    }>;
  };

  // Chemical event fields
  application_timing?: string;
  area_treated?: number;
  area_numeric?: number; // Phase 3: primary numeric area field
  area_unit?: string;
  concentration?: string;
  npk_ratio?: string;
  active_ingredient?: string;
  application_method?: string;
  target_pest_disease_need?: string;
  volume_applied?: number;
  volume_numeric?: number; // Phase 3: primary numeric volume field
  volume_unit?: string;
  is_fertigation?: boolean | string; // Phase 3: fertigation toggle
  organic_approved?: string; // Organic certification status (omri_listed, usda_nop_approved, etc.)
  chemical_subtype?: string; // Chemical subtype (organic_fertilizer, synthetic_pesticide, etc.)

  // Production event fields
  area_covered?: string | number;
  yield_quantity?: string;
  fuel_consumed?: string | number;
  fuel_type?: string; // Electric, Diesel, Gasoline, etc. - needed for dynamic label
  fuel_unit?: string; // kWh, L, gal - needed for display
  equipment_hours?: string;
  electricity_source?: string; // Phase 3: pump power source for IR events

  // Legacy compatibility fields
  volume?: string;
  area?: string;

  // General activity fields
  activity_type?: string;
  activity_name?: string;
  duration?: string;
  people_involved?: number;

  // ENHANCED: IPCC 2006 Lime Dissolution Fields (PA - Soil Amendment events)
  amendment_type?: string;
  amendment_amount?: string | number;
  amendment_unit?: string;

  // ENHANCED: Tillage Depth for Soil CO2 Flux Calculations (TI events)
  tillage_depth?: string | number;
  tillage_depth_unit?: string;

  // ENHANCED: USDA NASS 2023 Irrigation Fields (IR events)
  irrigation_method?: string;
  irrigation_depth?: string | number;
  irrigation_depth_unit?: string;
  // Phase 3: Irrigation pump fields
  pump_depth_ft?: number;
  water_source?: string;

  // Sprint 4 & 5: Aggregate/Summary Event Support
  // Enables displaying multiple events as a single summary (e.g., "12 irrigations in May-June")
  is_summary?: boolean;
  date_start?: string;
  date_end?: string;
  event_count?: number;
  water_volume_total?: number;
  water_volume_unit?: string;
  yield_total?: number | string;
  yield_total_unit?: string;

  // Sprint 5: Chemical Aggregate Event Fields (Fertilizer, Fungicide, Pesticide)
  n_total_kg?: number;
  p_total_kg?: number;
  k_total_kg?: number;
  active_ingredient_total_kg?: number;
  volume_total?: number;
  volume_total_unit?: string;
  area_total?: number;
  area_total_unit?: string;
  fuel_consumption_total?: number;
  fuel_consumption_unit?: string;

  // Sprint 5: Pest Scouting Aggregate Event Fields
  field_area_total?: number;
  travel_distance_total?: number;
  distance_unit?: string;
  pest_species_observed?: string;
  average_pest_pressure?: string;
  observations_summary?: string;

  // Additional structured data
  extra_data?: {
    [key: string]: any;
  };
}

interface ConsumerEventCardProps {
  /**
   * Consumer copy is written per SUBTYPE, so a list containing three of the same practice
   * repeats the same sentences verbatim on every card. The list owner
   * (UltraMobileProductionJourney.computeRepeatedCopy) marks the later ones; the first
   * occurrence keeps the full treatment. Never set for a card rendered alone.
   */
  suppressImpactLine?: boolean;
  suppressShortDescription?: boolean;
  event: ConsumerEventData;
  isLast?: boolean;
  isGrouped?: boolean;
  /** Phase 2 consumer-chapter variant: collapsed card shows only
      title + date + a clamped meaning line + evidence chips. Performer
      and full field notes live in the expanded state. */
  slim?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  /** Production-level blockchain data to use when individual events lack their own */
  productionBlockchain?: {
    tx_hash?: string;
    verified?: boolean;
    block_number?: number;
    network?: string;
  };
}

export const ConsumerEventCard: React.FC<ConsumerEventCardProps> = ({
  event,
  isLast = false,
  isGrouped = false,
  slim = false,
  suppressImpactLine = false,
  suppressShortDescription = false,
  isExpanded: controlledExpanded,
  onToggleExpand,
  productionBlockchain
}) => {
  const intl = useIntl();
  const [internalExpanded, setInternalExpanded] = useState(false);
  // Technical Details collapsed by default (Section G item 4) — compliance
  // and metric source values stay one tap away, not in the default read.
  const [showTechnical, setShowTechnical] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const cardRef = useRef<HTMLDivElement>(null);

  // Two-letter sub-type code (FE, HA, SC, …). Normalized events carry it on `subtype`;
  // the helper also covers raw/preview payloads that still use the per-family key. Never
  // branch on `event.type` for a sub-type — it holds the event FAMILY name.
  const eventSubtype = extractSubtypeCode(event);

  const handleToggleExpand = useCallback(() => {
    if (onToggleExpand) {
      // Controlled mode — if collapsing, scroll to card
      if (isExpanded) {
        onToggleExpand();
        requestAnimationFrame(() => {
          cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      } else {
        onToggleExpand();
      }
    } else {
      // Internal mode
      if (internalExpanded) {
        setInternalExpanded(false);
        requestAnimationFrame(() => {
          cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      } else {
        setInternalExpanded(true);
      }
    }
  }, [onToggleExpand, isExpanded, internalExpanded]);

  const toggleExpand = handleToggleExpand;
  const isMobile = useBreakpointValue({ base: true, md: false });
  // Get consumer-friendly description with real event data
  const eventInfo = localizeConsumerDescription(
    getConsumerEventDescription(event.description, event),
    intl.locale
  );

  const trustIndicators = getEventTrustIndicators(event);
  const formattedDate = formatEventDate(event.date);

  // Sprint 4: Format date range for aggregate/summary events
  const formatDateRange = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return formattedDate;
    try {
      // Parse date strings as local time to avoid timezone offset issues
      // "2025-11-01" parsed via new Date() is UTC midnight, which can show as previous day in local tz
      const parseLocalDate = (dateStr: string): Date => {
        if (dateStr.includes('T')) return new Date(dateStr);
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      };
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      const yearOptions: Intl.DateTimeFormatOptions = { ...options, year: 'numeric' };

      // If same year, only show year once at the end
      if (start.getFullYear() === end.getFullYear()) {
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString(
          'en-US',
          yearOptions
        )}`;
      }
      return `${start.toLocaleDateString('en-US', yearOptions)} - ${end.toLocaleDateString(
        'en-US',
        yearOptions
      )}`;
    } catch {
      return formattedDate;
    }
  };

  // Sprint 4: Check if this is a summary event
  const isSummaryEvent = event.is_summary === true;

  const AGGREGATE_TOTAL_FIELDS = [
    'n_total_kg',
    'p_total_kg',
    'k_total_kg',
    'active_ingredient_total_kg',
    'yield_total',
    'volume_total',
    'area_total',
    'fuel_consumption_total',
    'field_area_total',
    'area_covered_total',
    'travel_distance_total',
    'pest_species_observed',
    'average_pest_pressure'
  ] as const;

  const hasAggregateTotals = AGGREGATE_TOTAL_FIELDS.some((field) => {
    const top = (event as Record<string, unknown>)[field];
    const nested = (event.extra_data as Record<string, unknown> | undefined)?.[field];
    return (top ?? nested) != null && (top ?? nested) !== '';
  });

  /**
   * Registry fields the aggregate summary tile already states, so the card does not print the
   * same fact twice. On the live scouting card "Total Area Scouted: 15 ha" sat above
   * "Area Covered: 15 ha", and "Average Pest Pressure: LOW" above "Pressure Level: Low" —
   * four rows carrying two facts.
   *
   * Only applies when the tile is actually rendered; otherwise these are the ONLY place the
   * fact appears and must stay.
   */
  const fieldsCoveredByAggregate: ReadonlySet<string> =
    isSummaryEvent && hasAggregateTotals
      ? new Set(['area_covered', 'area_treated', 'pest_pressure_level'])
      : new Set<string>();

  // Consumer cards spell the date out ("Oct 5, 2024") — "10/5/2024" is
  // ambiguous outside the US and reads machine-y. This component only
  // renders on the consumer page, so it applies in both story and proof.
  const displayDate =
    isSummaryEvent && event.date_start && event.date_end
      ? formatDateRange(event.date_start, event.date_end)
      : formatHarvestDate(event.date, intl.locale) || formattedDate;

  // Get comprehensive field display data based on field display matrix.
  // When VITE_USE_FIELD_REGISTRY=true, the registry's consumer_card surface
  // drives field selection (which fields appear) while keeping the existing
  // rendering style. Registry ResolvedField format is bridged to legacy
  // FieldDisplayItem format so existing JSX works unchanged.
  const legacyFieldDisplay = getEventFieldDisplay(event);

  // Hoisted (2026-08-01) — the field-display build below needs it too, to drop the
  // organic-status row that the chip already covers.
  const isChemicalEvent =
    event.event_type === 2 ||
    event.type === 'chemical' ||
    ['FE', 'PE', 'FU', 'HE'].includes(eventSubtype ?? '');

  const fieldDisplayBase: EventFieldDisplay = (() => {
    if (!USE_FIELD_REGISTRY) return legacyFieldDisplay;

    const resolved = getFieldsForSurface(
      (event.event_type as number) ?? 3,
      eventSubtype as any,
      'consumer_card',
      event as Record<string, unknown>
    );

    // Bridge: convert ResolvedField[] → FieldDisplayItem[] for existing JSX
    const resolveLabel = (labelKey: string, fieldName: string): string => {
      // Try i18n first for accurate labels
      const i18nLabel = intl.formatMessage({ id: labelKey, defaultMessage: '' });
      if (i18nLabel && i18nLabel !== labelKey) return i18nLabel;
      // Fallback: convert camelCase key segment to readable label
      return (
        labelKey
          .split('.')
          .pop()
          ?.replace(/([A-Z])/g, ' $1')
          .replace(/^./, (s: string) => s.toUpperCase())
          .trim() || fieldName
      );
    };
    const toDisplayItems = (fields: typeof resolved.hero): FieldDisplayItem[] =>
      fields.map(
        (f) =>
          ({
            label: resolveLabel(f.labelKey, f.name),
            value: f.formattedValue || '',
            category: f.isCarbonRelevant ? 'carbon' : undefined
          } as FieldDisplayItem)
      );

    // On a chemical event the organic status already renders as a chip at the top of the card
    // ("OMRI Listed" / "Conventional Input · Documented"), which every shopper sees without
    // expanding. Repeating it as a fact row said the same thing twice — chip plus
    // "Approved for organic use: No — conventional input" — inside one card. The chip wins:
    // it is above the fold and it is the vocabulary claim_resolver owns server-side.
    // Only the chemical field is dropped; the soil and pest equivalents
    // (`amendment_organic_approved`, `beneficial_organic_approved`) have NO chip, so their rows
    // are the only place that status appears and must stay.
    const isChipDuplicate = (name: string) =>
      (isChemicalEvent && name === 'organic_approved') || fieldsCoveredByAggregate.has(name);

    const registryDisplay: EventFieldDisplay = {
      // Exclude title fields from hero→immediate merge — they already render as the card title.
      // 'name' is the primary title; 'commercial_name' is the chemical event fallback title.
      // Other hero fields (pest_type, business_event_type, etc.) are kept in Key Details.
      immediate: toDisplayItems([
        ...resolved.hero.filter(
          (f) => f.name !== 'name' && f.name !== 'commercial_name' && !isChipDuplicate(f.name)
        ),
        ...resolved.immediate.filter((f) => !isChipDuplicate(f.name))
      ]),
      // Exclude observation/observations from secondary — they render verbatim
      // as "Farmer's Field Notes" above. Filter by the registry field NAME
      // (locale-independent); the display label is localized ("Observación" in
      // es-419), so a label-string filter downstream silently misses it.
      secondary: toDisplayItems(
        resolved.secondary.filter(
          (f) => f.name !== 'observation' && f.name !== 'observations' && !isChipDuplicate(f.name)
        )
      ),
      details: toDisplayItems(resolved.details.filter((f) => !isChipDuplicate(f.name)))
    };

    // Use registry fields if they have content; fall back to legacy otherwise
    const hasRegistryFields =
      registryDisplay.immediate.length +
        registryDisplay.secondary.length +
        registryDisplay.details.length >
      0;
    // The registry has no notion of farmer-authored custom fields, so they must be merged
    // in explicitly on this path. Without it, any event that resolved even one registry
    // field dropped every custom field the farmer marked consumer-visible — they showed in
    // the producer preview (legacy path) and then silently disappeared on the public page.
    // The legacy branch already merges them inside getEventFieldDisplay().
    return hasRegistryFields
      ? mergeCustomFieldsIntoDisplay(registryDisplay, event)
      : legacyFieldDisplay;
  })();

  // R2 (2026-06-14): localize enum field VALUES to es-419 in one pass so every
  // render spot (Key Details, Additional Information, Technical Details) gets it.
  // Labels already localize via the registry labelKey; numbers/units/free-text and
  // cert program names pass through unchanged.
  const localizeItems = (items: FieldDisplayItem[]): FieldDisplayItem[] =>
    intl.locale.toLowerCase().startsWith('es')
      ? items.map((f) => ({ ...f, value: localizeFieldValue(f.value, intl.locale) }))
      : items;
  const fieldDisplay: EventFieldDisplay = {
    ...fieldDisplayBase,
    immediate: localizeItems(fieldDisplayBase.immediate),
    secondary: localizeItems(fieldDisplayBase.secondary),
    details: localizeItems(fieldDisplayBase.details)
  };

  // Observation is already shown verbatim as "Farmer's Field Notes"; drop any secondary field
  // repeating it. The registry filter (by field name) is primary — this also value-matches, which
  // is locale-proof and catches the legacy field path the old label-only check missed.
  //
  // Hoisted out of the JSX (2026-08-01) so the two fact sections can see each other: the section
  // LABELS only earn their place when there are two groups to tell apart. One group rendered
  // under a header reads as bureaucracy — "Additional Information" over a single row was the
  // worst of it.
  const visibleSecondaryFields = (() => {
    const shownObservation = event.observation?.trim();
    return fieldDisplay.secondary.filter((f) => {
      const lbl = f.label.toLowerCase();
      if (lbl === 'observation' || lbl === 'observations') return false;
      if (shownObservation && String(f.value).trim() === shownObservation) return false;
      return true;
    });
  })();
  // Aggregate tiles compose "value + unit" by hand and so bypassed withUSUnits: the same page
  // that said "49 acres (20 ha)" in Key Details said a bare "15 ha" in the scouting summary.
  // One helper so a tile can never quietly ship metric to a US shopper again.
  const aggValue = (value: unknown, unit: unknown, fallbackUnit: string) => {
    if (value === undefined || value === null || value === '') return null;
    const u = (unit as string) || fallbackUnit;
    return withUSUnits(`${value} ${u}`.trim(), intl.locale);
  };

  // The farmer's own words render in BOTH views (2026-08-02). Slim chapter cards used to hide
  // them until expanded, which meant the single most valuable thing on the card — the only
  // sentence a person actually wrote — was invisible in the view most shoppers ever see. They
  // are clamped to two lines when slim so the list still scans; the clamp advertises that
  // there is more to read rather than concealing that there is anything at all.
  const farmerNotesVisible = Boolean(event.observation && event.observation.trim());
  // What a repeat card still has to show for itself if its duplicated description is dropped.
  // Photos only count while they are actually on screen. The gallery lives in the expanded
  // section, so on a SLIM COLLAPSED card a photo is not standing in for anything — counting it
  // would re-open the hole `farmerNotesVisible` was added to close: a repeat card showing a
  // title, a date, and nothing else.
  const expandedContentVisible = !slim || isExpanded;
  const repeatCardHasOtherContent =
    farmerNotesVisible || (expandedContentVisible && Boolean(event.album?.images?.length));
  const showFactSectionLabels =
    fieldDisplay.immediate.length > 0 && visibleSecondaryFields.length > 0;

  // Blockchain verification is always production-level (one tx covers all events).
  // Individual events don't have their own blockchain transactions.
  const explorerBase = import.meta.env.VITE_POLYGON_EXPLORER_URL || 'https://polygonscan.com';
  const blockchainData = {
    verified: productionBlockchain?.verified || false,
    transaction: productionBlockchain?.tx_hash || '',
    blockNumber: productionBlockchain?.block_number || 0,
    confidence: event.verification_confidence || event.extra_data?.verification_confidence || 0,
    timestamp: event.verification_timestamp || event.extra_data?.verification_timestamp || '',
    integrityScore: event.data_integrity_score || event.extra_data?.data_integrity_score || 0,
    explorerUrl: productionBlockchain?.tx_hash
      ? `${explorerBase}/tx/${productionBlockchain.tx_hash}`
      : '',
    network: productionBlockchain?.network || 'polygon'
  };

  // Photo documentation processing (MVP: photo count + metadata determines documentation tier)
  const photoVerification = {
    hasPhotos:
      Boolean(event.album?.images?.length) ||
      (event.type === 'production' && (event.photo_count ?? 0) > 0),
    photoCount: event.album?.images?.length || 0,
    isPhotoVerified: Boolean(event.album?.images?.length && event.album.images?.length >= 1),
    verificationLevel: (() => {
      // MVP Photo Documentation: Use the backend-calculated verification_level
      // Maps tiered verification to visual strength levels
      const verificationLevel = event.verification_level || 'self_reported';
      switch (verificationLevel) {
        case 'certified':
          return 'strong'; // 100% trust - blockchain-recorded production
        case 'data_verified':
          return 'strong'; // 85% trust - documented with photos + metadata
        case 'photo_verified':
          return 'strong'; // 80% trust - 2+ photos with GPS/timestamp
        case 'photo_documented':
          return 'moderate'; // 65% trust - 1+ photo documented
        case 'self_reported':
        default:
          return 'none'; // 50% trust - no photo evidence
      }
    })(),
    trustMessage: (() => {
      // MVP Photo Documentation: tier descriptions based on photo count + metadata
      const verificationLevel = event.verification_level || 'self_reported';
      const photoCount = event.album?.images?.length || 0;

      switch (verificationLevel) {
        case 'certified':
          return `Blockchain-recorded (${photoCount} photo${photoCount !== 1 ? 's' : ''} included)`;
        case 'data_verified':
          return 'Documented with photo evidence and metadata';
        case 'photo_verified':
          return `Photo documented (${photoCount} photo${
            photoCount !== 1 ? 's' : ''
          } with metadata)`;
        case 'photo_documented':
          return `Photo documented (${photoCount} photo${photoCount !== 1 ? 's' : ''} included)`;
        case 'self_reported':
        default:
          return 'Farmer-reported documentation';
      }
    })()
  };

  // NOTE: a `requiresPhotoVerification` flag used to be computed here from the sub-type.
  // It was never read by any JSX — and it was computed off `event.type`, which holds the
  // family name, so it was permanently false anyway. The photo-tier expectation that
  // actually drives the UI comes from the registry (`getPhotoTier`) via
  // PhotoRecommendationsBox on the producer side. Removed rather than repaired.

  // Trust level based on actual verification (blockchain) and data quality
  const getVerificationLevel = () => {
    const hasBlockchain = blockchainData.verified && blockchainData.transaction;
    const hasUSDAFactors = event.usda_factors_used || event.usda_factors_based;
    const highConfidence = blockchainData.confidence >= 90;

    // Blockchain is actual verification (immutable on-chain record)
    // USDA factors is a methodology indicator, not independent verification
    if (hasBlockchain && highConfidence) return 'ultimate';
    if (hasBlockchain && hasUSDAFactors) return 'high';
    if (hasBlockchain) return 'medium';
    return 'basic';
  };

  const verificationLevel = getVerificationLevel();

  // Unified event type icon/color (matches EnhancedTimelineRow, NewEvent, UltraMobileProductionJourney)
  const getEventTypeIcon = (eventType?: number) => {
    switch (eventType) {
      case 0:
        return { icon: FaCloudRain, color: 'blue.500' };
      case 1:
        return { icon: FaSeedling, color: 'green.500' };
      case 2:
        return { icon: FaFlask, color: 'orange.500' };
      case 3:
        return { icon: FaClipboardList, color: 'gray.500' };
      case 4:
        return { icon: FaTractor, color: 'blue.700' };
      case 5:
        return { icon: FaLayerGroup, color: 'yellow.700' };
      case 6:
        return { icon: FaBug, color: 'red.500' };
      case 7:
        return { icon: FaCertificate, color: 'teal.500' };
      default:
        return { icon: FaSeedling, color: 'green.500' };
    }
  };

  const eventTypeConfig = getEventTypeIcon(event.event_type);

  // Helper function to get icon for field categories
  /**
   * Null for anything without a real category, so the caller can render nothing instead of a
   * row of identical ⓘ bullets (2026-08-01). Registry fields only carry a category when they
   * are carbon-relevant, so on most cards EVERY fact box was getting the same generic icon —
   * decoration that made two facts look like a checklist.
   */
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'weather':
        return FaThermometerHalf;
      case 'application':
        return FaFlask;
      case 'measurement':
        return FaRulerCombined;
      case 'verification':
        return FaCertificate;
      case 'environmental':
        return FaLeaf;
      case 'operational':
        return FaTractor;
      case 'documentation':
        return FaInfoCircle;
      default:
        return null;
    }
  };

  // Helper function to get emoji icon for fuel consumption fields
  const getFuelIcon = (fieldLabel: string, fuelType?: string): string | null => {
    if (
      !fieldLabel.toLowerCase().includes('fuel consumed') &&
      !fieldLabel.toLowerCase().includes('energy consumed')
    ) {
      return null;
    }
    const normalizedFuelType = fuelType?.toLowerCase() || '';
    return normalizedFuelType === 'electric' ? '⚡' : '⛽';
  };

  // Color scheme
  /**
   * Does the aggregate block have anything to show?
   *
   * The tiles inside it are all `subtype + field present` conditionals, and there is no tile
   * branch for several summary subtypes (irrigation among them). The surrounding Box rendered
   * regardless, producing "Aggregate Summary (18 Events)" above an empty grey panel.
   *
   * Field list mirrors the tile conditions below; `aggregateTotals.test` pins them together so
   * adding a tile without adding its field here (or vice versa) fails loudly.
   */

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const accentColor = useColorModeValue('green.500', 'green.400');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const highlightBg = useColorModeValue('green.50', 'gray.700');
  // Hoisted color-mode values. These were previously called inline inside JSX,
  // .map() callbacks and conditional branches — that varies the hook count
  // between renders and triggers React's "change in order of Hooks" warning.
  // Hooks must run unconditionally at the top level, so they live here.
  const strongText = useColorModeValue('gray.800', 'white');
  const secondaryText = useColorModeValue('gray.700', 'gray.300');
  const greenSoftBg = useColorModeValue('green.50', 'green.900');
  const greenStrongText = useColorModeValue('green.800', 'green.100');
  const greenBorder = useColorModeValue('green.200', 'green.700');
  const neutralSoftBg = useColorModeValue('gray.50', 'gray.800');
  const neutralBorder = useColorModeValue('gray.200', 'gray.700');
  const summaryPalette =
    (eventSubtype && SUMMARY_PALETTE[eventSubtype]) || SUMMARY_PALETTE_FALLBACK;
  const summaryBg = useColorModeValue(summaryPalette.bg, 'gray.700');
  const summaryBorder = useColorModeValue(summaryPalette.border, 'gray.600');

  return (
    <Box ref={cardRef} position="relative">
      {/* Timeline connector - DESKTOP ONLY, hidden when inside a group */}
      {!isLast && !isGrouped && (
        <Box
          position="absolute"
          left={{ base: '20px', md: '24px' }}
          top="60px"
          bottom="-20px"
          width="2px"
          bg={borderColor}
          zIndex={0}
          display={{ base: 'none', md: 'block' }}
        />
      )}

      <HStack
        align="flex-start"
        spacing={{ base: 0, md: isGrouped ? 0 : 4 }}
        position="relative"
        zIndex={1}
      >
        {/* Timeline dot - DESKTOP ONLY, hidden when inside a group */}
        <Flex
          direction="column"
          align="center"
          minW="40px"
          display={{ base: 'none', md: isGrouped ? 'none' : 'flex' }}
        >
          {/* A chronological marker, and nothing else (2026-08-02).
              This dot used to carry FIVE encodings with no legend anywhere on the page:
                • filled vs outlined for the first event (arbitrary emphasis),
                • border colour keyed to `verification_level` (green = "ultimate",
                  blue = "high") — a self-graded quality tier, expressed as colour instead
                  of words, which is the same ECGT/FTC problem that got the tiered
                  "Photo Verification: Excellent" badges removed,
                • a shield icon + green glow replacing the event icon at the top tier,
                • a blue corner dot for blockchain — removed as a per-event badge in 2026-06
                  for being production-level noise, and still here as decoration,
                • a green corner badge reading "SCI" in 6px type.
              What survives is what a reader can actually use: where this event sits in the
              sequence, and which kind of event it is. */}
          <Circle
            size={{ base: '40px', md: '48px' }}
            bg={bgColor}
            border="3px solid"
            borderColor={accentColor}
          >
            <Icon
              as={eventTypeConfig.icon}
              boxSize={{ base: 4, md: 5 }}
              color={eventTypeConfig.color}
            />
          </Circle>

          {/* "% verified" confidence indicator removed (2026-06): numeric
              self-created trust percentage on a consumer card, and "verified"
              violates the blockchain wording rule (recorded, never verified). */}
        </Flex>

        {/* Event card - Full width on mobile.
            overflow="clip" (not "hidden"): with the fixed backdrop-filter
            navbar, Chromium skips painting an overflow:hidden ancestor's
            background in the band above the blurred element — the card body
            rendered gray while its text floated on the page background. The
            father journey Card's white used to mask the bug; "clip" keeps the
            same radius clipping on a paint path that doesn't trigger it. */}
        <Box
          flex="1"
          w={{ base: 'full', md: 'auto' }}
          bg={bgColor}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={borderColor}
          overflow="clip"
          transition="all 0.2s"
          _hover={{ shadow: 'md', transform: 'translateY(-1px)' }}
          mb={{ base: 4, md: 0 }}
        >
          {/* Mobile-Optimized Card Header */}
          <Box p={{ base: 4, md: 4 }}>
            <HStack justify="space-between" align="flex-start" mb={2}>
              {/* Thumbnail in BOTH views (2026-08-02). It was slim-only, so the full record —
                  the view a buyer opens — was the one WITHOUT the picture. Hidden once expanded
                  because the gallery below then carries the image at a useful size. */}
              {!isExpanded && event.album?.images?.[0]?.image && (
                <Box
                  flexShrink={0}
                  w="56px"
                  h="56px"
                  borderRadius="lg"
                  overflow="clip"
                  borderWidth="1px"
                  borderColor={borderColor}
                >
                  <img
                    src={event.album.images[0].image}
                    alt={
                      event.album.images[0].caption ||
                      intl.formatMessage(
                        { id: 'consumer.eventCard.photoFrom' },
                        { title: eventInfo.title }
                      )
                    }
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              )}
              <VStack align="start" spacing={1} flex="1">
                <HStack spacing={2} flexWrap="wrap">
                  <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold" color={strongText}>
                    {eventInfo.title}
                  </Text>
                  {/* Sprint 4 & 5: Summary badge for aggregate events with type-specific colors */}
                  {isSummaryEvent && (
                    <Badge
                      colorScheme={summaryPalette.scheme}
                      fontSize="xs"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      <Icon as={FaLayerGroup} aria-hidden="true" boxSize={2.5} />
                      <Text>
                        {event.event_count ||
                          intl.formatMessage({
                            id: 'consumer.eventCard.multiple',
                            defaultMessage: 'Multiple'
                          })}{' '}
                        {intl.formatMessage({
                          id:
                            eventSubtype && SUMMARY_NOUN_SUBTYPES.includes(eventSubtype)
                              ? `consumer.eventCard.summaryNoun.${eventSubtype}`
                              : 'consumer.eventCard.summaryNoun.default',
                          defaultMessage: SUMMARY_NOUN_DEFAULTS[eventSubtype ?? ''] ?? 'Events'
                        })}
                      </Text>
                    </Badge>
                  )}
                </HStack>
                {/* Sprint 4: Show date range for summaries, single date for regular events */}
                <HStack spacing={1}>
                  {isSummaryEvent && (
                    <Icon as={FaCalendarAlt} aria-hidden="true" boxSize={3} color={mutedColor} />
                  )}
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color={mutedColor}>
                    {displayDate}
                  </Text>
                </HStack>
                {/* Worker privacy (2026-06): full names were published on the
                    public QR page ("Performed by: Ana Torres") — a doxing
                    vector when combined with the farm location. Display-layer
                    mask to "Farm team (A.T.)" until a consent-gated
                    `performer_display` field exists (Phase 3). */}
                {/* Styled as metadata, not a badge (2026-08-01). A green check + green
                    bold text reads as "verified" — this is only who did the work, self-reported
                    like everything else on the card. Same weight as the date beside it. */}
                {event.performed_by && !slim && (
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color={mutedColor}>
                    {intl.formatMessage(
                      {
                        id: 'consumer.eventCard.performedBy',
                        defaultMessage: 'Performed by: {name}'
                      },
                      { name: maskPerformerName(event.performed_by) }
                    )}
                  </Text>
                )}
              </VStack>

              {/* Sustainability/"Supplementary" badge removed (2026-06):
                  "Supplementary" / "Standard Activity" / "Core Practice"
                  labels were internal scoring jargon with no consumer
                  meaning, and green coloring implied a quality judgment. */}
            </HStack>

            {/* Mobile-Optimized Short Description — clamped in the slim
                chapter cards so collapsed cards stay one glance tall. */}
            <VStack spacing={3} align="stretch" mb={{ base: 4, md: 3 }}>
              {/* A repeat card drops the duplicated sentence ONLY if something else is left
                  to carry it in the same state — the farmer's own words, or a photo. Slim
                  chapter cards hide field notes until expanded, so suppressing there would
                  leave a collapsed card with nothing but a title and a date, which is worse
                  than the repetition it was fixing.
                  Photos count (2026-08-01, round 2): "Harvest Pass 2 - Peak Season" repeated
                  "The crop was picked, weighed and graded" verbatim under "Harvest Pass 1"
                  because it had no notes — but it had a photo and a title of its own, so the
                  card stands up fine without the sentence. */}
              {!(suppressShortDescription && repeatCardHasOtherContent) && (
                <Text
                  fontSize={{ base: 'md', md: 'md' }}
                  color={secondaryText}
                  lineHeight={{ base: '1.6', md: '1.5' }}
                  noOfLines={slim && !isExpanded ? 2 : undefined}
                >
                  {eventInfo.shortDescription}
                </Text>
              )}

              {/* Inline consumer-impact line — RE-ENABLED 2026-08-01.
                  It was disabled 2026-04-30 for duplicating the expanded "What This Means For
                  You" block, and that was correct AT THE TIME: shortDescription and
                  consumerImpact were paraphrases of each other (harvest said "peak ripeness"
                  in both). Phase B split them — shortDescription now says WHAT HAPPENED and
                  consumerImpact says WHY IT MATTERS TO THE READER — so they no longer repeat.

                  Why above the fold: this is the only line that answers a shopper's actual
                  question, and it sat one tap down. Measured: a typical production has just 5
                  event cards and only 31% carry a photo, so on most cards this line IS the
                  content. A shopper who never expands never saw it.

                  Suppressed via isGenericCopy so a family fallback can never surface here —
                  the same guard the expanded block uses. */}
              {/* Unboxed, deliberately (2026-08-01). This line and the farmer's own words
                  below were BOTH green filled boxes with a green icon — visually identical, so
                  the most human thing on the page read as more system copy. Only one element on
                  the card gets a container now, and it is the farmer's quote. */}
              {!suppressImpactLine && !isGenericCopy(eventInfo.consumerImpact) && (
                <HStack spacing={2} align="flex-start">
                  <Icon as={FaLeaf} color="green.500" boxSize={3} mt="4px" flexShrink={0} />
                  <Text fontSize="sm" color={greenStrongText} lineHeight="1.5">
                    {eventInfo.consumerImpact}
                  </Text>
                </HStack>
              )}
            </VStack>

            {/* Enhanced Trust & Verification Indicators */}
            <VStack spacing={2} mb={3} align="stretch">
              {/* Primary trust indicators */}
              {trustIndicators.length > 0 && (
                <HStack spacing={2} flexWrap="wrap">
                  {/* getEventTrustIndicators returns i18n KEYS, not display text. */}
                  {trustIndicators.map((indicatorKey) => (
                    <Badge
                      key={indicatorKey}
                      variant="subtle"
                      colorScheme="blue"
                      fontSize="xs"
                      px={2}
                      py={1}
                    >
                      <HStack spacing={1}>
                        <Icon as={FaCheckCircle} aria-hidden="true" boxSize={3} />
                        <Text>{intl.formatMessage({ id: indicatorKey })}</Text>
                      </HStack>
                    </Badge>
                  ))}
                </HStack>
              )}
              {/* Phase 3: Electricity source trust badge for IR events — solar/wind shown as green trust indicator */}
              {(() => {
                const elecSrc =
                  event.electricity_source ?? (event as any).extra_data?.electricity_source;
                if (!elecSrc) return null;
                const isSustainable = elecSrc === 'solar' || elecSrc === 'wind';
                const elecKey = ELECTRICITY_SOURCE_KEYS[elecSrc];
                // Unknown source falls back to the raw value rather than blanking the
                // badge — a new backend enum should degrade to something readable.
                const elecLabel = elecKey ? intl.formatMessage({ id: elecKey }) : elecSrc;
                return (
                  <HStack spacing={2}>
                    <Badge
                      variant="subtle"
                      colorScheme={isSustainable ? 'green' : 'gray'}
                      fontSize="xs"
                      px={2}
                      py={1}
                    >
                      <HStack spacing={1}>
                        <Icon
                          as={isSustainable ? FaWind : FaCheckCircle}
                          aria-hidden="true"
                          boxSize={3}
                        />
                        <Text>{elecLabel}</Text>
                      </HStack>
                    </Badge>
                  </HStack>
                );
              })()}

              {/* Crop-input status chips (Phase 2): every input gets an honest
                  status — OMRI/organic-approved (green), restricted-use
                  (amber, framed as professional compliance), or conventional-
                  documented (neutral). Data already public in the payload. */}
              {(() => {
                // Phase 3: the backend now resolves input status server-side
                // (history/services/claim_resolver.resolve_input_status) so
                // the chip vocabulary has one source of truth. The client
                // derivation below stays as fallback for older payloads.
                const serverInput = (event as any).input_status as
                  | { status?: string; label?: string }
                  | undefined;
                const organicStatus =
                  event.organic_approved ?? (event as any).extra_data?.organic_approved;
                const isRestrictedUse = serverInput?.status
                  ? serverInput.status === 'restricted_use'
                  : Boolean(
                      (event as any).restricted_use_pesticide ??
                        (event as any).extra_data?.restricted_use_pesticide
                    );
                const hasOrganicStatus = serverInput?.status
                  ? serverInput.status === 'omri_listed' ||
                    serverInput.status === 'organic_approved'
                  : organicStatus &&
                    organicStatus !== 'not_organic' &&
                    organicStatus !== 'no' &&
                    organicStatus !== 'not_applicable';
                // The server-resolved label wins when present (claim_resolver owns the
                // vocabulary); otherwise localize the enum ourselves.
                const organicStatusKey = ORGANIC_STATUS_KEYS[organicStatus];
                const organicChipText = serverInput?.label
                  ? serverInput.label
                  : intl.formatMessage({
                      id: organicStatusKey ?? 'consumer.eventCard.organic.generic'
                    });
                // Server distinguishes "explicitly conventional" from
                // "farmer didn't classify" — only the former may carry the
                // conventional label (claim-safety: absence of classification
                // is not evidence the input was conventional).
                const isUnclassified = serverInput?.status === 'unclassified';

                if (!hasOrganicStatus && !isRestrictedUse && !isChemicalEvent) return null;

                return (
                  <HStack spacing={2} flexWrap="wrap">
                    {hasOrganicStatus && (
                      <Tooltip
                        label={intl.formatMessage({ id: 'consumer.eventCard.organic.tooltip' })}
                        placement="top"
                      >
                        <Badge
                          variant="solid"
                          colorScheme="green"
                          fontSize="xs"
                          px={3}
                          py={1}
                          borderRadius="full"
                          cursor="pointer"
                        >
                          <HStack spacing={1}>
                            <Icon as={FaLeaf} aria-hidden="true" boxSize={3} />
                            <Text>{organicChipText}</Text>
                          </HStack>
                        </Badge>
                      </Tooltip>
                    )}
                    {isRestrictedUse && (
                      <Tooltip
                        label={intl.formatMessage({
                          id: 'consumer.eventCard.restrictedUse.tooltip'
                        })}
                        placement="top"
                      >
                        <Badge
                          variant="subtle"
                          colorScheme="orange"
                          fontSize="xs"
                          px={3}
                          py={1}
                          borderRadius="full"
                          cursor="pointer"
                        >
                          {intl.formatMessage({ id: 'consumer.eventCard.restrictedUse.badge' })}
                        </Badge>
                      </Tooltip>
                    )}
                    {isChemicalEvent && !hasOrganicStatus && !isRestrictedUse && (
                      <Tooltip
                        label={intl.formatMessage({
                          id: isUnclassified
                            ? 'consumer.eventCard.inputDocumented.tooltip'
                            : 'consumer.eventCard.conventionalDocumented.tooltip'
                        })}
                        placement="top"
                      >
                        {/* Outlined, not `subtle` (2026-08-01). Chakra's subtle gray badge is
                            near-invisible on a white card — on the live page it read as loose
                            bold text next to the pill-shaped green OMRI chip, so the two
                            statuses looked like different KINDS of thing. Same pill shape,
                            neutral colour: equal footing, different verdict. */}
                        <Badge
                          variant="outline"
                          colorScheme="gray"
                          color={secondaryText}
                          bg={neutralSoftBg}
                          boxShadow="none"
                          border="1px solid"
                          borderColor={neutralBorder}
                          fontSize="xs"
                          px={3}
                          py={1}
                          borderRadius="full"
                          cursor="pointer"
                        >
                          {intl.formatMessage({
                            id: isUnclassified
                              ? 'consumer.eventCard.inputDocumented.badge'
                              : 'consumer.eventCard.conventionalDocumented.badge'
                          })}
                        </Badge>
                      </Tooltip>
                    )}
                  </HStack>
                );
              })()}

              {/* Removed redundant photo verification badge - photos are already mentioned in description and shown in gallery */}

              {/* Enhanced verification badges row.
                  Per-event BLOCKCHAIN-RECORDED badge removed (2026-06): the
                  blockchain record is production-level — repeating the same
                  tx as a badge on every one of 20 cards was noise and read
                  as a crypto signal. Record integrity renders once at the
                  Production Journey footer. */}
              <HStack spacing={2} flexWrap="wrap">
                {/* MVP Photo Verification: Tiered verification badge.
                    Slim chapter cards de-wallpaper this: every card carrying
                    the same "Data Documented" chip says nothing. There, the
                    chip renders only when it differentiates — a photo count
                    when photos exist, otherwise nothing (the proof view and
                    expanded state keep the full tier badge). */}
                {event.verification_level &&
                  (() => {
                    const photoCount = event.album?.images?.length ?? 0;
                    if (slim && !isExpanded) {
                      if (photoCount === 0) return null;
                      return (
                        <Badge
                          colorScheme="green"
                          variant="subtle"
                          fontSize="xs"
                          px={3}
                          py={1}
                          borderRadius="full"
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          <Icon as={FaCamera} aria-hidden="true" boxSize={3} />
                          <Text>
                            {intl.formatMessage(
                              {
                                id: 'consumer.eventCard.photoCount',
                                defaultMessage: '{count, plural, one {# photo} other {# photos}}'
                              },
                              { count: photoCount }
                            )}
                          </Text>
                        </Badge>
                      );
                    }
                    const config = getVerificationBadgeConfig(
                      event.verification_level as VerificationLevel
                    );
                    const colorScheme = getVerificationColor(
                      event.verification_level as VerificationLevel
                    );
                    return (
                      <Tooltip
                        label={intl.formatMessage({
                          id: config.tooltipKey,
                          defaultMessage: config.tooltip
                        })}
                        placement="top"
                      >
                        <Badge
                          colorScheme={colorScheme}
                          variant="subtle"
                          fontSize="xs"
                          px={3}
                          py={1}
                          borderRadius="full"
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          <Icon as={config.icon} aria-hidden="true" boxSize={3} />
                          <Text>
                            {intl.formatMessage({
                              id: config.labelKey,
                              defaultMessage: config.label
                            })}
                          </Text>
                          {event.photo_verified_count !== undefined &&
                            event.photo_verified_count > 0 && (
                              <Text fontSize="xs" ml={1}>
                                ({event.photo_verified_count})
                              </Text>
                            )}
                        </Badge>
                      </Tooltip>
                    );
                  })()}

                {/* "HIGH INTEGRITY (98%)" and "ULTIMATE TRUST" badges removed
                    (2026-06): self-created superlative trust labels with no
                    third-party basis — exactly the claim class FTC 16 CFR
                    260.6(d) requires substantiation for. */}
              </HStack>
            </VStack>

            {/* The farmer's own words sit BELOW the evidence chips (2026-08-01). They used to
                come first, which pushed the single most important fact on a chemical card — the
                OMRI/organic chip — under a five-line quote, off the first screen. Chips are
                compact; the quote is the thing worth scrolling to. */}
            {/* 🌱 TRANSPARENCY-FIRST: Show farmer's actual field notes from observation field only.
                  description contains system-generated text (template names, etc.) and must NOT
                  be shown as "Farmer's Field Notes" — that would be dishonest to consumers. */}
            {farmerNotesVisible && (
              <Box
                bg={neutralSoftBg}
                borderLeft="3px solid"
                borderColor="green.400"
                borderRadius="sm"
                px={3}
                py={3}
              >
                <HStack spacing={2} mb={2}>
                  <Icon as={FaEye} aria-hidden="true" boxSize={3} color={mutedColor} />
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={mutedColor}
                    textTransform="uppercase"
                    letterSpacing="0.04em"
                  >
                    {intl.formatMessage({
                      id: 'consumer.eventCard.farmerNotes',
                      defaultMessage: "Farmer's Field Notes"
                    })}
                  </Text>
                </HStack>
                <Text
                  fontSize="sm"
                  color={secondaryText}
                  fontStyle="italic"
                  lineHeight="1.5"
                  noOfLines={slim && !isExpanded ? 2 : undefined}
                >
                  "{event.observation}"
                </Text>
              </Box>
            )}

            {/* Mobile-Optimized Expand Button */}
            <Button
              size={{ base: 'md', md: 'sm' }}
              variant="ghost"
              colorScheme="green"
              onClick={toggleExpand}
              rightIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              aria-expanded={isExpanded}
              _hover={{ bg: highlightBg }}
              w={{ base: 'full', md: 'auto' }}
              justifyContent={{ base: 'space-between', md: 'flex-start' }}
              minH={{ base: '44px', md: 'auto' }}
              fontSize={{ base: 'md', md: 'sm' }}
              fontWeight="semibold"
            >
              {isExpanded
                ? intl.formatMessage({
                    id: 'consumer.eventCard.showLess',
                    defaultMessage: 'Show Less Details'
                  })
                : intl.formatMessage({
                    id: 'consumer.eventCard.seeMore',
                    defaultMessage: 'See More Details'
                  })}
            </Button>
          </Box>

          {/* Expanded content */}
          <Collapse in={isExpanded}>
            <Divider />
            <Box p={{ base: 3, md: 4 }} bg={cardBg}>
              <VStack align="start" spacing={3}>
                {/* Performer — slim cards surface it here instead of the
                    collapsed header (Section G: collapsed = title + date +
                    meaning line + evidence chips only). */}
                {slim && event.performed_by && (
                  <Text fontSize="sm" color={mutedColor}>
                    {intl.formatMessage(
                      {
                        id: 'consumer.eventCard.performedBy',
                        defaultMessage: 'Performed by: {name}'
                      },
                      { name: maskPerformerName(event.performed_by) }
                    )}
                  </Text>
                )}
                {/* `consumerImpact` is NOT repeated here — it now renders above the fold, in
                    the collapsed card, so every shopper sees it whether or not they expand.
                    Showing it in both places is what got the inline version disabled back in
                    2026-04; the fix is to pick one home for it, and the collapsed card is the
                    one that reaches everybody. The expanded section keeps the ENVIRONMENTAL
                    angle below, which is genuinely additional rather than a restatement. */}

                {/* Sustainability benefit — same suppression rule. */}
                {!isGenericCopy(eventInfo.sustainabilityBenefit) && (
                  <Box w="full">
                    {/* Quiet label, matching the fact sections (2026-08-01). Was a blue globe
                        with a bold heading — the last piece of coloured chrome in the expanded
                        card, and blue meant nothing here. */}
                    <Text
                      mb={1}
                      fontSize="xs"
                      fontWeight="semibold"
                      letterSpacing="wide"
                      textTransform="uppercase"
                      color={mutedColor}
                    >
                      {intl.formatMessage({
                        id: 'consumer.eventCard.envBenefit',
                        defaultMessage: 'Environmental Benefit'
                      })}
                    </Text>
                    <Text fontSize="sm" color={secondaryText}>
                      {eventInfo.sustainabilityBenefit}
                    </Text>
                  </Box>
                )}

                {/* Sprint 5: Aggregate Event Summary Details.
                    Gated on hasAggregateTotals — the header used to render unconditionally
                    while every tile inside was data-conditional, so a summary event with no
                    matching totals (irrigation has NO tile branch at all) showed a titled,
                    completely empty grey box on the consumer page. */}
                {isSummaryEvent && hasAggregateTotals && (
                  <Box
                    p={4}
                    bg={summaryBg}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={summaryBorder}
                  >
                    <HStack mb={3}>
                      <Icon as={FaLayerGroup} color={summaryPalette.icon} boxSize={4} />
                      <Text fontWeight="bold" fontSize="sm" color={summaryPalette.text}>
                        {intl.formatMessage(
                          { id: 'consumer.eventCard.agg.header' },
                          {
                            count:
                              event.event_count ||
                              intl.formatMessage({ id: 'consumer.eventCard.multiple' }),
                            // Guarded key lookup: an unlisted sub-type must resolve to the
                            // generic noun rather than requesting a key that does not
                            // exist (react-intl logs a missing-translation error for that,
                            // even when a defaultMessage is supplied).
                            noun: intl.formatMessage({
                              id: `consumer.eventCard.agg.noun.${
                                eventSubtype && eventSubtype in SUMMARY_PALETTE
                                  ? eventSubtype
                                  : 'default'
                              }`
                            })
                          }
                        )}
                      </Text>
                    </HStack>

                    <SimpleGrid columns={{ base: 1, smd: 2 }} spacing={3}>
                      {/* Fertilizer aggregate totals */}
                      {eventSubtype === 'FE' && (
                        <>
                          {(event.n_total_kg || event.extra_data?.n_total_kg) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.totalNitrogen',
                                  defaultMessage: 'Total Nitrogen (N)'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.n_total_kg || event.extra_data?.n_total_kg} kg
                              </Text>
                            </Box>
                          )}
                          {(event.p_total_kg || event.extra_data?.p_total_kg) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.totalPhosphorus',
                                  defaultMessage: 'Total Phosphorus (P₂O₅)'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.p_total_kg || event.extra_data?.p_total_kg} kg
                              </Text>
                            </Box>
                          )}
                          {(event.k_total_kg || event.extra_data?.k_total_kg) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.totalPotassium',
                                  defaultMessage: 'Total Potassium (K₂O)'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.k_total_kg || event.extra_data?.k_total_kg} kg
                              </Text>
                            </Box>
                          )}
                        </>
                      )}

                      {/* Fungicide/Pesticide aggregate totals */}
                      {(eventSubtype === 'FU' || eventSubtype === 'PE') && (
                        <>
                          {(event.active_ingredient_total_kg ||
                            event.extra_data?.active_ingredient_total_kg) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.totalActiveIngredient',
                                  defaultMessage: 'Total Active Ingredient'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.active_ingredient_total_kg ||
                                  event.extra_data?.active_ingredient_total_kg}{' '}
                                kg
                              </Text>
                            </Box>
                          )}
                        </>
                      )}

                      {/* Harvest aggregate totals */}
                      {eventSubtype === 'HA' && (
                        <>
                          {(event.yield_total || event.extra_data?.yield_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.totalYield',
                                  defaultMessage: 'Total Yield'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {Number(
                                  event.yield_total || event.extra_data?.yield_total
                                ).toLocaleString()}{' '}
                                {event.yield_total_unit ||
                                  event.extra_data?.yield_total_unit ||
                                  'lbs'}
                              </Text>
                            </Box>
                          )}
                        </>
                      )}

                      {/* Common chemical aggregate fields */}
                      {(eventSubtype === 'FE' ||
                        eventSubtype === 'FU' ||
                        eventSubtype === 'PE') && (
                        <>
                          {(event.volume_total || event.extra_data?.volume_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {/* A mass unit reads as an "amount", a liquid unit as a
                                    "volume" — saying "volume: 40 kg" is simply wrong. */}
                                {intl.formatMessage({
                                  id: ['kg', 'lbs', 'oz'].includes(
                                    event.volume_total_unit ||
                                      event.extra_data?.volume_total_unit ||
                                      ''
                                  )
                                    ? 'consumer.eventCard.agg.totalAmountApplied'
                                    : 'consumer.eventCard.agg.totalVolumeApplied'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {aggValue(
                                  event.volume_total || event.extra_data?.volume_total,
                                  event.volume_total_unit || event.extra_data?.volume_total_unit,
                                  'gal'
                                )}
                              </Text>
                            </Box>
                          )}
                          {/* Phase 3: Show volume_numeric for individual (non-aggregate) chemical events */}
                          {!event.is_summary && (event.volume_numeric ?? event.volume_applied) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {['kg', 'lbs', 'oz'].includes(event.volume_unit)
                                  ? 'Amount Applied'
                                  : 'Volume Applied'}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {aggValue(
                                  event.volume_numeric ?? event.volume_applied,
                                  event.volume_unit,
                                  'gal'
                                )}
                              </Text>
                            </Box>
                          )}
                          {(event.area_total || event.extra_data?.area_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.totalAreaTreated',
                                  defaultMessage: 'Total Area Treated'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {aggValue(
                                  event.area_total || event.extra_data?.area_total,
                                  event.area_total_unit || event.extra_data?.area_total_unit,
                                  'ha'
                                )}
                              </Text>
                            </Box>
                          )}
                          {(event.fuel_consumption_total ||
                            event.extra_data?.fuel_consumption_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.totalFuelConsumed',
                                  defaultMessage: 'Total Fuel Consumed'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.fuel_consumption_total ||
                                  event.extra_data?.fuel_consumption_total}{' '}
                                {event.fuel_consumption_unit ||
                                  event.extra_data?.fuel_consumption_unit ||
                                  'L'}
                              </Text>
                            </Box>
                          )}
                        </>
                      )}

                      {/* Pest Scouting aggregate fields */}
                      {eventSubtype === 'SC' && (
                        <>
                          {(event.field_area_total ||
                            event.area_covered_total ||
                            event.extra_data?.field_area_total ||
                            event.extra_data?.area_covered_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.totalAreaScouted',
                                  defaultMessage: 'Total Area Scouted'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {aggValue(
                                  event.field_area_total ||
                                    event.area_covered_total ||
                                    event.extra_data?.field_area_total ||
                                    event.extra_data?.area_covered_total,
                                  event.area_unit || event.extra_data?.area_unit,
                                  'ha'
                                )}
                              </Text>
                            </Box>
                          )}
                          {(event.travel_distance_total ||
                            event.extra_data?.travel_distance_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.totalDistanceTraveled',
                                  defaultMessage: 'Total Distance Traveled'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {aggValue(
                                  event.travel_distance_total ||
                                    event.extra_data?.travel_distance_total,
                                  event.distance_unit || event.extra_data?.distance_unit,
                                  'miles'
                                )}
                              </Text>
                            </Box>
                          )}
                          {(event.pest_species_observed ||
                            event.extra_data?.pest_species_observed) && (
                            <Box gridColumn={{ md: 'span 2' }}>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.pestSpeciesObserved',
                                  defaultMessage: 'Pest Species Observed'
                                })}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.pest_species_observed ||
                                  event.extra_data?.pest_species_observed}
                              </Text>
                            </Box>
                          )}
                          {(event.average_pest_pressure ||
                            event.extra_data?.average_pest_pressure) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.averagePestPressure',
                                  defaultMessage: 'Average Pest Pressure'
                                })}
                              </Text>
                              <Badge
                                colorScheme={
                                  (event.average_pest_pressure ||
                                    event.extra_data?.average_pest_pressure) === 'low'
                                    ? 'green'
                                    : (event.average_pest_pressure ||
                                        event.extra_data?.average_pest_pressure) === 'medium'
                                    ? 'yellow'
                                    : 'red'
                                }
                                fontSize="xs"
                              >
                                {(
                                  event.average_pest_pressure ||
                                  event.extra_data?.average_pest_pressure
                                )?.toUpperCase()}
                              </Badge>
                            </Box>
                          )}
                          {/* Note: observations_summary removed — same content as "Farmer's Field Notes" (observation field) */}
                          {/* Zero carbon note for scouting */}
                          <Box gridColumn={{ md: 'span 2' }} mt={2}>
                            <HStack spacing={2}>
                              <Icon as={MdEco} color="green.500" boxSize={4} />
                              <Text fontSize="xs" color="green.600" fontWeight="medium">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.agg.scoutingZeroCarbon'
                                })}
                              </Text>
                            </HStack>
                          </Box>
                        </>
                      )}
                    </SimpleGrid>
                  </Box>
                )}

                {/* 🚨 PREVIEW-DISPLAY EXACT MATCH: Key Details shown when expanded */}
                {/* Comprehensive Field Display - IMMEDIATE Priority Fields (INSIDE collapse) */}
                {fieldDisplay.immediate.length > 0 && (
                  <Box w="full">
                    {/* Quiet section label (2026-08-01). Was a bold green heading with a
                        ruler icon, competing with a blue "Additional Information" heading and
                        a green camera heading on the same card — three colours of chrome
                        around the facts. A small muted label lets the values carry the card.
                        Shown only when a second group exists to tell it apart from. */}
                    {showFactSectionLabels && (
                      <Text
                        mb={2}
                        fontSize="xs"
                        fontWeight="semibold"
                        letterSpacing="wide"
                        textTransform="uppercase"
                        color={mutedColor}
                      >
                        {intl.formatMessage({
                          id: 'consumer.eventCard.keyDetails',
                          defaultMessage: 'Key Details'
                        })}
                      </Text>
                    )}
                    {/* w="full" is load-bearing: the expanded body is a VStack align="start",
                        so without it the fact boxes shrink to their text and sit in a ragged
                        half-width column at 375px. */}
                    <SimpleGrid
                      w="full"
                      /* A single fact must not sit in a half-width column with dead space beside
                         it — that lonely box was the thing that looked unfinished at 768. It
                         also must not stretch 800px wide to hold "85 acres" at 1440, hence the
                         cap, which is above the widest phone so mobile is unaffected. */
                      maxW={fieldDisplay.immediate.length > 1 ? undefined : '360px'}
                      columns={{ base: 1, smd: fieldDisplay.immediate.length > 1 ? 2 : 1 }}
                      spacing={3}
                      pl={showFactSectionLabels ? 6 : 0}
                    >
                      {fieldDisplay.immediate.map((field, idx) => {
                        const fuelIcon = getFuelIcon(field.label, event.fuel_type);
                        const categoryIcon = getCategoryIcon(field.category);
                        return (
                          /* Neutral, not green (2026-08-01). Every fact box was green-on-green,
                             so a plain classification like "Habitat Type: Raptor Perch" carried
                             the same visual weight as an organic-approval signal. Green means
                             something specific on this page; facts are facts. */
                          <Box
                            key={idx}
                            p={3}
                            bg={neutralSoftBg}
                            borderRadius="lg"
                            border="1px solid"
                            borderColor={neutralBorder}
                          >
                            <HStack spacing={2} mb={1}>
                              {fuelIcon ? (
                                <Text fontSize="sm" color={mutedColor}>
                                  {fuelIcon}
                                </Text>
                              ) : (
                                categoryIcon && (
                                  <Icon as={categoryIcon} color={mutedColor} boxSize={3} />
                                )
                              )}
                              <Text fontSize="xs" fontWeight="semibold" color={mutedColor}>
                                {field.label}
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color={secondaryText} fontWeight="semibold">
                              {withUSUnits(field.value, intl.locale)}
                            </Text>
                          </Box>
                        );
                      })}
                    </SimpleGrid>
                  </Box>
                )}

                {/* Comprehensive Field Display - SECONDARY Priority Fields */}
                {visibleSecondaryFields.length > 0 && (
                  <Box w="full">
                    {showFactSectionLabels && (
                      <Text
                        mb={2}
                        fontSize="xs"
                        fontWeight="semibold"
                        letterSpacing="wide"
                        textTransform="uppercase"
                        color={mutedColor}
                      >
                        {intl.formatMessage({
                          id: 'consumer.eventCard.additionalInfo',
                          defaultMessage: 'Additional Information'
                        })}
                      </Text>
                    )}
                    {/* Neutral, not blue (2026-08-01). These rows were blue while the box
                            above them was green, for facts of the same kind — the colour was
                            marking WHICH BUCKET the registry put a field in, which means nothing
                            to a shopper. */}
                    <VStack align="stretch" spacing={2} pl={showFactSectionLabels ? 6 : 0}>
                      {visibleSecondaryFields.map((field, idx) => {
                        const fuelIcon = getFuelIcon(field.label, event.fuel_type);
                        const categoryIcon = getCategoryIcon(field.category);
                        const isLongText = String(field.value).length > 40;
                        return isLongText ? (
                          <Box key={idx}>
                            <HStack spacing={2} mb={1}>
                              {fuelIcon ? (
                                <Text fontSize="sm" color={mutedColor}>
                                  {fuelIcon}
                                </Text>
                              ) : (
                                categoryIcon && (
                                  <Icon as={categoryIcon} color={mutedColor} boxSize={3} />
                                )
                              )}
                              <Text fontSize="sm" fontWeight="medium" color={mutedColor}>
                                {field.label}:
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color={secondaryText} pl={5}>
                              {field.value}
                            </Text>
                          </Box>
                        ) : (
                          /* Definition row, not space-between (2026-08-01): on a wide card the
                             value was flung to the far edge with a canyon of white between it
                             and its own label. */
                          <HStack key={idx} align="baseline" spacing={3} flexWrap="wrap">
                            <HStack spacing={2} minW="140px" flexShrink={0}>
                              {fuelIcon ? (
                                <Text fontSize="sm" color={mutedColor}>
                                  {fuelIcon}
                                </Text>
                              ) : (
                                categoryIcon && (
                                  <Icon as={categoryIcon} color={mutedColor} boxSize={3} />
                                )
                              )}
                              <Text fontSize="sm" fontWeight="medium" color={mutedColor}>
                                {field.label}:
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color={secondaryText} fontWeight="semibold">
                              {field.value}
                            </Text>
                          </HStack>
                        );
                      })}
                    </VStack>
                  </Box>
                )}

                {/* Technical details if available (legacy fallback) */}
                {(event.volume ||
                  event.area ||
                  event.concentration ||
                  event.npk_ratio ||
                  event.active_ingredient ||
                  event.application_method ||
                  event.target_pest_disease_need) &&
                  fieldDisplay.immediate.length === 0 && (
                    <Box>
                      <HStack mb={4} spacing={2}>
                        <Icon as={FaFlask} color="green.500" boxSize={4} />
                        <Text fontWeight="600" fontSize="sm" color="gray.700">
                          {intl.formatMessage({ id: 'consumer.eventCard.applicationDetails' })}
                        </Text>
                      </HStack>

                      {/* Modern grid layout for fields */}
                      <SimpleGrid columns={{ base: 1, smd: 2 }} spacing={3} mb={4}>
                        {(() => {
                          const chemicalFields = getEventFieldDisplay(event);
                          return [
                            ...chemicalFields.immediate,
                            ...chemicalFields.secondary,
                            ...chemicalFields.details
                          ].map((field, index) => (
                            <Box
                              key={index}
                              p={3}
                              bg="gray.50"
                              borderRadius="lg"
                              border="1px solid"
                              borderColor="gray.100"
                              _hover={{ borderColor: 'green.200', bg: 'green.50' }}
                              transition="all 0.2s"
                            >
                              <Text fontSize="xs" fontWeight="500" color="gray.500" mb={1}>
                                {field.label}
                              </Text>
                              <Text fontSize="sm" fontWeight="600" color="gray.700">
                                {localizeFieldValue(field.value, intl.locale)}
                              </Text>
                            </Box>
                          ));
                        })()}
                      </SimpleGrid>

                      {/* Carbon impact with modern styling */}
                      {event.carbon_impact && (
                        <Box
                          p={4}
                          bg="green.50"
                          borderRadius="xl"
                          border="1px solid"
                          borderColor="green.200"
                        >
                          <HStack spacing={3}>
                            <Circle size="40px" bg="green.100">
                              <Icon as={FaGlobeAmericas} color="green.600" boxSize={5} />
                            </Circle>
                            <Box>
                              <Text fontSize="sm" fontWeight="600" color="gray.700">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.environmentalImpact'
                                })}
                              </Text>
                              <Text fontSize="lg" fontWeight="bold" color="green.600">
                                {event.carbon_impact.toFixed(2)} kg CO₂e
                              </Text>
                              <Text fontSize="xs" color="green.600">
                                {intl.formatMessage({
                                  id: 'consumer.eventCard.carbonDataNote'
                                })}
                              </Text>
                            </Box>
                          </HStack>
                        </Box>
                      )}
                    </Box>
                  )}

                {/* Comprehensive Field Display - DETAILS Priority Fields.
                    Deduped against Key Details/Additional Information (the
                    live card showed pH/OM/depth twice) and collapsed behind a
                    toggle by default — auditor-grade values on demand. */}
                {(() => {
                  const shownLabels = new Set(
                    [...fieldDisplay.immediate, ...fieldDisplay.secondary].map((f) =>
                      f.label.toLowerCase()
                    )
                  );
                  const dedupedDetails = fieldDisplay.details.filter(
                    (f) => !shownLabels.has(f.label.toLowerCase())
                  );
                  if (dedupedDetails.length === 0) return null;
                  return (
                    <Box>
                      <Button
                        // D11 — this is a real tap target on the consumer QR page, which is
                        // mobile-first by definition. `xs` renders a 24px-high control, well under
                        // the 44px minimum in the project frontend rules. px stays 0 so the label
                        // keeps its left alignment with the rest of the card.
                        size="sm"
                        minH="44px"
                        variant="ghost"
                        colorScheme="gray"
                        px={0}
                        onClick={() => setShowTechnical((v) => !v)}
                        rightIcon={showTechnical ? <FaChevronUp /> : <FaChevronDown />}
                        aria-expanded={showTechnical}
                      >
                        <HStack spacing={2}>
                          <Icon as={FaEye} color="gray.500" boxSize={4} />
                          <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                            {intl.formatMessage(
                              { id: 'consumer.eventCard.technicalDetails' },
                              { count: dedupedDetails.length }
                            )}
                          </Text>
                        </HStack>
                      </Button>
                      <Collapse in={showTechnical} animateOpacity>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2} pl={6} pt={2}>
                          {dedupedDetails.map((field, idx) => {
                            const fuelIcon = getFuelIcon(field.label, event.fuel_type);
                            const categoryIcon = getCategoryIcon(field.category);
                            return (
                              <HStack key={idx} spacing={2} align="baseline">
                                {fuelIcon ? (
                                  <Text fontSize="xs" color="gray.500" flexShrink={0}>
                                    {fuelIcon}
                                  </Text>
                                ) : (
                                  categoryIcon && (
                                    <Icon
                                      as={categoryIcon}
                                      color="gray.400"
                                      boxSize={3}
                                      flexShrink={0}
                                      mt={0.5}
                                    />
                                  )
                                )}
                                <Text fontSize="xs" color="gray.500" flexShrink={0}>
                                  {field.label}:
                                </Text>
                                <Text fontSize="xs" color="gray.700" fontWeight="medium">
                                  {field.value}
                                </Text>
                              </HStack>
                            );
                          })}
                        </SimpleGrid>
                      </Collapse>
                    </Box>
                  );
                })()}

                {/* Per-event "Blockchain Security" section removed (2026-06):
                    it repeated the SAME production-level transaction inside
                    every expanded card (tx hash, block number, "Tamper-Proof
                    Record") — crypto jargon for shoppers, and "tamper-proof"
                    overclaims (blockchain proves the record is unchanged
                    after sealing, not that it was accurate when submitted).
                    The single production-level record-integrity row lives at
                    the Production Journey footer. */}

                {/* Photo Gallery using StandardImageGallery */}
                {/* MVP Photo Documentation: Show photos attached to this event */}
                {/* Gated on photos alone. It used to also require
                    verification_level !== 'self_reported', but the timeline defaults a
                    missing level to 'self_reported', so real farmer photos were hidden on
                    any event whose level had not been computed. Photos ARE the evidence —
                    withholding them because the event is self-reported inverts the
                    transparency-first rule (log more → show more). */}
                {photoVerification.hasPhotos && (
                  <Box>
                    {/* Photos are the strongest evidence on the card, so they lead rather
                        than sit under a bold heading. Only 31% of events have one, which is
                        exactly why the ones that do should not be buried in chrome. */}
                    <Text
                      mb={2}
                      fontSize="xs"
                      fontWeight="semibold"
                      letterSpacing="wide"
                      textTransform="uppercase"
                      color={mutedColor}
                    >
                      {intl.formatMessage({ id: 'consumer.eventCard.seeThisPractice' })}
                    </Text>

                    <VStack align="stretch" spacing={{ base: 4, md: 3 }} pl={{ base: 0, md: 6 }}>
                      {/* Use StandardImageGallery for consistent experience */}
                      <StandardImageGallery
                        images={
                          event.album?.images?.map((image) => ({
                            id: image.id,
                            image: image.image,
                            name:
                              image.caption ||
                              intl.formatMessage(
                                { id: 'consumer.eventCard.photoFrom' },
                                { title: eventInfo.title }
                              ),
                            description: image.created_at
                              ? intl.formatMessage(
                                  { id: 'consumer.eventCard.photoTakenOn' },
                                  {
                                    date: intl.formatDate(new Date(image.created_at), {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })
                                  }
                                )
                              : undefined
                          })) || []
                        }
                        title=""
                        variant="consumer"
                        enablePreview={true}
                        showImageCount={false}
                        height="180px"
                        borderRadius="lg"
                        showEmptyState={false}
                        maxDisplayImages={6}
                        aspectRatio="4/3"
                        clickable={true}
                      />

                      {/* Provenance caption. Was a bordered, filled panel stacking a
                          "Farmer-provided photos" heading over "N photos, checked for
                          authenticity" — a second box competing with the image itself, for
                          what is often ONE photo. Same two facts, one quiet line under the
                          picture, where a caption belongs.
                          Claim-safe wording retained (2026-06): this is an automated content
                          check, not independent verification of the practice. */}
                      {/* Caption re-voiced 2026-08-02. It read "Farmer-provided photos · N
                          photos, checked for authenticity" under a green shield — two claims we
                          cannot support. We know WHO uploaded the file, not that it depicts this
                          farm; and the automated pass is a content/anti-gaming screen, not an
                          authenticity verification. A green shield made it read as a trust
                          badge, so it is a camera in muted type now: a caption, not a seal. */}
                      <HStack spacing={2} color={mutedColor}>
                        <Icon as={FaCamera} boxSize={3} color={mutedColor} />
                        <Text fontSize="xs">
                          {intl.formatMessage({ id: 'consumer.eventCard.farmerPhotos' })}
                          {' · '}
                          {intl.formatMessage(
                            { id: 'consumer.eventCard.photosAiChecked' },
                            { count: photoVerification.photoCount }
                          )}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                )}
              </VStack>
            </Box>
          </Collapse>
        </Box>
      </HStack>
    </Box>
  );
};

export default ConsumerEventCard;
