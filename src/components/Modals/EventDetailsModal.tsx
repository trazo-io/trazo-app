import React, { useState, useEffect, useMemo } from 'react';
import {
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Divider,
  Box,
  SimpleGrid,
  useColorModeValue,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Tooltip,
  Flex,
  Image,
  Grid,
  AspectRatio,
  Center,
  Alert,
  AlertIcon,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import {
  FaEdit,
  FaTrash,
  FaCalendarAlt,
  FaUser,
  FaLeaf,
  FaCertificate,
  FaLayerGroup,
  FaExchangeAlt,
  FaLock,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { useDeleteEventMutation } from 'store/api/historyApi';
import { formatCO2e, getImpactLevel } from '../../utils/carbonDisplayUtils';
import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { CorrectRecordModal } from 'components/Modals/CorrectRecordModal';
import { EventCorrections, EventDocuments } from 'components/Modals/EventRecordTrail';
import { StandardAlert, StandardButton } from 'components/Design/StandardComponents';
import CrewNoteProvenance from './CrewNoteProvenance';
import { eventTypeAppearance } from 'config/events/eventTypeAppearance';
import { eventTitle, subtypeOf as sharedSubtypeOf } from 'config/events/narrative';
import { buyerPageWithheldReasonId } from 'utils/consumerDisplay';
import { buyerVisibleFieldNames } from 'utils/buyerPageVisibility';
import { filterEmptyCustomFields } from 'utils/customFieldsUtils';
import type { CustomField } from 'utils/customFieldsUtils';
import { useIntl } from 'react-intl';
import type { IntlShape } from 'react-intl';
// Event Field Registry (Phase 5 — feature-flagged)
import { useEventFields } from 'src/hooks/useEventFields';
import { RegistryFieldRenderer } from 'src/components/Events/RegistryFieldRenderer';

const USE_FIELD_REGISTRY = import.meta.env.VITE_USE_FIELD_REGISTRY === 'true';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserRole } from 'hooks/useUserRole';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { formatDateFromTimestamp } from 'utils/dateOnly';
import { isNotEstimated, showsInputsBadge } from 'utils/carbonStatus';

// Types
interface Member {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  image?: string;
}

interface Event {
  id: number;
  type: string;
  event_type: number;
  description: string;
  date: string;
  observation?: string;
  created_by: number;
  image?: string;
  name?: string;
  certified?: boolean;
  /** Set on a rolled-up row that stands in for several events; `event_count` is how many. */
  is_summary?: boolean;
  event_count?: number;
  carbon_data?: CarbonCalculationResult;
  album?: {
    id: number;
    images: Array<{
      id: number;
      image: string; // Note: this is 'image' not 'image_url'
      caption?: string;
      created_at?: string;
    }>;
  };
  // Photo verification fields from backend
  verification_level?:
    | 'self_reported'
    | 'photo_documented'
    | 'photo_verified'
    | 'data_verified'
    | 'certified';
  photo_content_flag?: 'not_agricultural' | 'ai_generated' | 'stock_photo' | null;
  // Chemical event fields (stored directly on event object)
  commercial_name?: string;
  volume?: string;
  concentration?: string;
  area?: string;
  way_of_application?: string;
  weather_conditions?: string;
  application_timing?: string;
  target_pest_disease?: string;
  pre_harvest_interval?: number;
  active_ingredient?: string;
  // Production event fields (first-class fields from backend)
  area_covered?: number;
  area_unit?: string;
  yield_quantity?: number;
  yield_unit?: string;
  fuel_consumed?: number;
  fuel_unit?: string;
  equipment_hours?: number;
  transportation_distance?: number;
  transportation_unit?: string;
  production_type?: string;
  production_efficiency?: string;
  // Sprint 3 Epic 3.2: Consumer Trust Fields
  seeds_source?: string;
  water_source?: string;
  extra_data?: {
    // Weather Event specific fields
    lower_temperature?: number;
    way_of_protection?: string;
    highest_temperature?: number;
    duration?: number;
    damage_assessment?: string;
    protection_measures?: string;
    wind_speed?: number;
    precipitation_amount?: number;
    humidity_level?: number;
    crop_impact?: string;
    // Chemical Event specific fields
    commercial_name?: string;
    active_ingredient?: string;
    target_pest_disease?: string;
    application_method?: string;
    area_treated?: number;
    area_unit?: string;
    volume_applied?: number;
    volume_unit?: string;
    weather_conditions?: string;
    application_timing?: string;
    pre_harvest_interval?: number;
    concentration?: string;
    // Production Event specific fields
    area?: number;
    planting_density?: number;
    seed_variety?: string;
    quantityHarvested?: number;
    quality_grade?: string;
    harvest_method?: string;
    waterAmount?: number;
    irrigation_method?: string;
    water_efficiency?: number;
    soil_moisture?: number;
    pruning_type?: string;
    trees_pruned?: number;
    // Equipment Event specific fields
    equipment_type?: string;
    fuel_consumed?: number;
    fuel_unit?: string;
    fuel_type?: string;
    hours_operated?: number;
    area_worked?: number;
    fuel_efficiency?: number;
    operation_efficiency?: string;
    maintenance_type?: string;
    cost?: number;
    next_service?: string;
    // Soil Management specific fields
    ph_value?: number;
    organic_matter?: number;
    nitrogen_level?: number;
    phosphorus_level?: number;
    potassium_level?: number;
    test_laboratory?: string;
    recommendations?: string;
    lime_type?: string;
    application_rate?: number;
    target_ph?: number;
    material_type?: string;
    organic_content?: number;
    carbon_sequestered?: number;
    // Pest Management specific fields
    pests_found?: string;
    pest_count?: number;
    threshold_level?: number;
    action_taken?: string;
    beneficial_species?: string;
    target_pest?: string;
    release_rate?: number;
    effectiveness?: string;
    trap_type?: string;
    threshold?: number;
    action?: string;
    control_agent?: string;
    // Business Event specific fields
    certification_type?: string;
    certifying_body?: string;
    expiry_date?: string;
    certificate_number?: string;
    audit_type?: string;
    auditor?: string;
    result?: string;
    training_topic?: string;
    provider?: string;
    participants?: number;
    skills_gained?: string;
    [key: string]: any; // Allow for other fields
  };
}

interface CarbonCalculationResult {
  co2e: number;
  efficiency_score: number;
  usda_factors_based?: boolean;
  verification_status?: string;
  data_source?: string;
  calculation_method?: string; // Make optional since it can be undefined
  event_type: string;
  timestamp: string;
  cost_analysis?: {
    estimated_cost: number;
    cost_per_co2e: number;
  };
  error?: string;
  usda_factors_used?: boolean;
}

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  members: Member[];
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
  isProductionFinished?: boolean;
  /**
   * Route ids used by Edit and Delete. They default to the CURRENT URL's params, which is
   * right on the parcel timeline but wrong anywhere the route carries no `:parcelId` — the
   * establishment Activities calendar spans every parcel, so `useParams()` there yields
   * `undefined` and Edit would navigate to `/parcel/undefined/event/...`. Callers off the
   * parcel route pass the ids the row already knows.
   */
  farmId?: string;
  parcelId?: string;
  /**
   * Which block this event belongs to. Only worth rendering on a surface that spans more
   * than one parcel; the parcel timeline already answers it with the page around it.
   */
  parcelName?: string;
}

/**
 * Impact level as a SEMANTIC badge variant, not a colorScheme.
 *
 * `getImpactLevel()` is a shared utility and answers with a Chakra colorScheme NAME —
 * 'gray' | 'green' | 'blue' | 'yellow' | 'orange'. Three of those name scales
 * `theme/styles.js` does not define, so they resolved to CHAKRA's palettes; and `blue` is
 * reserved for `Alert status="info"` (`.claude/rules/frontend.md`).
 *
 * The reader does not need six colours anyway — the LABEL carries the precision ("Light
 * activity", "Core practice"), the colour only says how much to care. So this collapses to
 * the three steps the app already uses everywhere else: none → low → notable. Monotonic, and
 * every step is a variant `theme/components/badge.js` actually defines.
 *
 * Mapped here rather than in `carbonDisplayUtils` on purpose: that helper has other callers,
 * and repainting a surface this component cannot see is not this change.
 */
/*
 * 2026-08-28: every band is now NEUTRAL, so this is a constant rather than a map.
 *
 * The previous step collapsed five Chakra colorSchemes to three semantic variants, which fixed
 * the foreign-palette and the reserved-blue problems but kept the underlying claim: yellow and
 * orange still mapped to `warning`, so a high-emission event was still being told it was bad.
 *
 * It is not a judgement to make. `getImpactLevel`'s 5/15/30/60 kg bands cite no EPA/USDA
 * benchmark and carry no denominator — no crop, no area — so the only thing they reliably
 * track is how much ground the pass covered. And `carbon-methodology.md` scopes these numbers
 * to DIRECT OPERATIONAL emissions, explicitly not an LCA, which leaves nothing to grade
 * against. Same class as the per-event `efficiency_score` deleted on 2026-08-04.
 *
 * The figure and its label still render; only the verdict is gone.
 */
const impactBadgeVariantFor = (_co2e: number) => 'neutral';

/**
 * The per-family subtype code, wherever this event happens to carry it.
 *
 * The retrieve endpoint answers with the per-type UPDATE serializer, which flattens the
 * subtype onto a differently-named field for every family. One chain, used by both the title
 * resolver and the registry bridge — they were reading different fields, so the modal could
 * title an event one way and render its fields for another subtype entirely.
 */
// `subtypeOf` moved to config/events/narrative.ts (2026-08-29) — the timeline carried two more
// copies of this exact chain, and three copies of one rule is how they start disagreeing.
const subtypeOf = (event: Event): string | undefined =>
  sharedSubtypeOf(event as unknown as Record<string, unknown>);

// Helper function to get human-readable event names
const getEventDisplayName = (event: Event, intl: any): string => {
  // If the event has a custom name set, use it for ALL event types
  // Check both top-level name and extra_data (weather uses event_name, pest uses name)
  if (event.name) {
    return event.name;
  }
  if (event.extra_data?.event_name) {
    return event.extra_data.event_name;
  }
  if (event.extra_data?.name) {
    return event.extra_data.name;
  }

  // For chemical events (Type 2), prioritize commercial name from direct field or extra_data
  if (event.event_type === 2) {
    if ((event as any).commercial_name) {
      return (event as any).commercial_name;
    }
    if (event.extra_data?.commercial_name) {
      return event.extra_data.commercial_name;
    }
  }

  // For other event types, map the type to a human-readable name
  const eventTypeMap: Record<string, string> = {
    // Chemical events
    'event.chemical.fertilizer':
      intl.formatMessage({ id: 'event.chemical.fertilizer' }) || 'Fertilizer Application',
    'event.chemical.pesticide':
      intl.formatMessage({ id: 'event.chemical.pesticide' }) || 'Pesticide Application',
    'event.chemical.herbicide':
      intl.formatMessage({ id: 'event.chemical.herbicide' }) || 'Herbicide Application',
    'event.chemical.fungicide':
      intl.formatMessage({ id: 'event.chemical.fungicide' }) || 'Fungicide Application',
    'event.chemical.insecticide':
      intl.formatMessage({ id: 'event.chemical.insecticide' }) || 'Insecticide Application',

    // Weather events
    'event.weather.frost': intl.formatMessage({ id: 'event.weather.frost' }) || 'Frost Event',
    'event.weather.drought': intl.formatMessage({ id: 'event.weather.drought' }) || 'Drought Event',
    'event.weather.hailstorm': intl.formatMessage({ id: 'event.weather.hailstorm' }) || 'Hailstorm',
    'event.weather.high_temperature':
      intl.formatMessage({ id: 'event.weather.high_temperature' }) || 'High Temperature',

    // Equipment events
    'event.equipment.fuel_consumption':
      intl.formatMessage({ id: 'event.equipment.fuel_consumption' }) || 'Fuel Consumption',
    'event.equipment.tractor':
      intl.formatMessage({ id: 'event.equipment.tractor' }) || 'Tractor Operation',
    'event.equipment.harvester':
      intl.formatMessage({ id: 'event.equipment.harvester' }) || 'Harvester Operation',
    'event.equipment.pump': intl.formatMessage({ id: 'event.equipment.pump' }) || 'Pump Operation',
    'event.equipment.other':
      intl.formatMessage({ id: 'event.equipment.other' }) || 'Equipment Operation',

    // Production events
    'event.production.harvest': intl.formatMessage({ id: 'event.production.harvest' }) || 'Harvest',
    'event.production.pruning': intl.formatMessage({ id: 'event.production.pruning' }) || 'Pruning',
    'event.production.planting':
      intl.formatMessage({ id: 'event.production.planting' }) || 'Planting',
    'event.production.irrigation':
      intl.formatMessage({ id: 'event.production.irrigation' }) || 'Irrigation',
    'event.production.harvesting':
      intl.formatMessage({ id: 'event.production.harvesting' }) || 'Harvesting',

    // Soil events
    'event.soil.soil_test': intl.formatMessage({ id: 'event.soil.soil_test' }) || 'Soil Testing',
    'event.soil.preparation':
      intl.formatMessage({ id: 'event.soil.preparation' }) || 'Soil Preparation',
    'event.soil.amendment': intl.formatMessage({ id: 'event.soil.amendment' }) || 'Soil Amendment',

    // Soil events (additional)
    'event.soil.organic_matter_addition':
      intl.formatMessage({ id: 'event.soil.organic_matter_addition' }) || 'Organic Matter Addition',
    'event.soil.cover_crop': intl.formatMessage({ id: 'event.soil.cover_crop' }) || 'Cover Crop',
    'event.soil.composting': intl.formatMessage({ id: 'event.soil.composting' }) || 'Composting',

    // Pest events
    'event.pest.monitoring':
      intl.formatMessage({ id: 'event.pest.monitoring' }) || 'Pest Monitoring',
    'event.pest.control': intl.formatMessage({ id: 'event.pest.control' }) || 'Pest Control',
    'event.pest.prevention':
      intl.formatMessage({ id: 'event.pest.prevention' }) || 'Pest Prevention',
    'event.pest.scouting': intl.formatMessage({ id: 'event.pest.scouting' }) || 'Pest Scouting',
    'event.pest.beneficial_release':
      intl.formatMessage({ id: 'event.pest.beneficial_release' }) || 'Beneficial Insect Release',
    'event.pest.trap_monitoring':
      intl.formatMessage({ id: 'event.pest.trap_monitoring' }) || 'Trap Monitoring',
    'event.pest.pest_identification':
      intl.formatMessage({ id: 'event.pest.pest_identification' }) || 'Pest Identification',
    'event.pest.threshold_assessment':
      intl.formatMessage({ id: 'event.pest.threshold_assessment' }) || 'Threshold Assessment',
    'event.pest.ipm_implementation':
      intl.formatMessage({ id: 'event.pest.ipm_implementation' }) || 'IPM Implementation',

    // Business events
    'event.business.certification':
      intl.formatMessage({ id: 'event.business.certification' }) || 'Business Certification',
    'event.business.compliance':
      intl.formatMessage({ id: 'event.business.compliance' }) || 'Compliance Review',
    'event.business.inspection':
      intl.formatMessage({ id: 'event.business.inspection' }) || 'Business Inspection',

    // Certification events
    'event.certification.inspection':
      intl.formatMessage({ id: 'event.certification.inspection' }) || 'Certification Inspection',
    'event.certification.organic':
      intl.formatMessage({ id: 'event.certification.organic' }) || 'Organic Certification',

    // Cover crop events
    'event.cover_crop.establishment':
      intl.formatMessage({ id: 'event.cover_crop.establishment' }) || 'Cover Crop Establishment',
    'event.cover_crop.termination':
      intl.formatMessage({ id: 'event.cover_crop.termination' }) || 'Cover Crop Termination',

    // Tree/plant events
    'event.tree.planting': intl.formatMessage({ id: 'event.tree.planting' }) || 'Tree Planting',
    'event.plant.establishment':
      intl.formatMessage({ id: 'event.plant.establishment' }) || 'Plant Establishment',

    // Site preparation
    'event.site.preparation':
      intl.formatMessage({ id: 'event.site.preparation' }) || 'Site Preparation',
    'event.site.design': intl.formatMessage({ id: 'event.site.design' }) || 'Site Design',

    // Fertilization programs
    'event.fertilization.program':
      intl.formatMessage({ id: 'event.fertilization.program' }) || 'Fertilization Program',
    'event.fertilization.application':
      intl.formatMessage({ id: 'event.fertilization.application' }) || 'Fertilizer Application',

    // Seeding events
    'event.seeding.wheat': intl.formatMessage({ id: 'event.seeding.wheat' }) || 'Wheat Seeding',
    'event.seeding.cotton': intl.formatMessage({ id: 'event.seeding.cotton' }) || 'Cotton Seeding',

    // Nitrogen application
    'event.nitrogen.application':
      intl.formatMessage({ id: 'event.nitrogen.application' }) || 'Nitrogen Application',

    // Beneficial insect release
    'event.beneficial.insect_release':
      intl.formatMessage({ id: 'event.beneficial.insect_release' }) || 'Beneficial Insect Release',

    // Orchard establishment
    'event.orchard.establishment':
      intl.formatMessage({ id: 'event.orchard.establishment' }) || 'Orchard Establishment',

    // Irrigation management
    'event.irrigation.management':
      intl.formatMessage({ id: 'event.irrigation.management' }) || 'Irrigation Management',

    // Cover crop system
    'event.cover_crop.system':
      intl.formatMessage({ id: 'event.cover_crop.system' }) || 'Cover Crop System',

    // Winter cover crop
    'event.winter.cover_crop':
      intl.formatMessage({ id: 'event.winter.cover_crop' }) || 'Winter Cover Crop',

    // High-density site design
    'event.high_density.site_design':
      intl.formatMessage({ id: 'event.high_density.site_design' }) || 'High-Density Site Design',

    // Organic soil preparation
    'event.organic.soil_preparation':
      intl.formatMessage({ id: 'event.organic.soil_preparation' }) || 'Organic Soil Preparation'
  };

  // Try to get mapped name first
  if (eventTypeMap[event.type]) {
    return eventTypeMap[event.type];
  }

  // Fallback: the type IS a message id for some families ('event.chemical.fertilizer').
  //
  // Ask the catalog whether the key exists instead of calling formatMessage and comparing the
  // answer to the id. The compare-the-echo trick works, but react-intl logs a
  // MISSING_TRANSLATION error on every miss — and the miss is the COMMON case, because the
  // retrieve endpoint mostly ships subtype codes ('MO', 'FE'). That was one console error per
  // modal open, in production, for a lookup that was expected to fail.
  if (intl.messages?.[event.type]) {
    return intl.formatMessage({ id: event.type });
  }

  /**
   * ⛔ NEVER the description, and never a de-dotted `event.type`.
   *
   * This used to `return event.description`, and for any event whose `type` misses the map
   * above — which is most of them, because the retrieve endpoint answers with SUBTYPE CODES
   * ('MO', 'IP', 'FE'), not `event.pest.monitoring` ids — the entire field note became the
   * H1. Seen 2026-08-16: a five-line pest paragraph as the modal title, repeated verbatim in
   * the Field Notes card immediately below it, filling half a phone screen before any
   * information appeared. A title names the KIND of record; the description is the record.
   *
   * `eventTitle()` is the same resolver `activityTitle()` uses for the feed row this modal
   * opens from, so the two can no longer disagree — which is the stated point of
   * `config/events/narrative.ts`.
   */
  return eventTitle(event.event_type, subtypeOf(event), null, intl);
};

const extractEventData = (event: Event) => {
  const eventData = event as any;
  const extraData = eventData.extra_data || {};

  const observation = event.observation || '';
  const durationMatch = observation.match(/(\d+)\s*hour/i);
  const duration = durationMatch ? parseInt(durationMatch[1]) : null;

  let amount: number | null = null;
  let unit: string | null = null;

  // For chemical events (event_type === 2), use structured volume fields
  // instead of regex parsing from description text
  if (event.event_type === 2) {
    const rawAmount =
      eventData.volume_applied ?? eventData.volume ?? extraData.volume_applied ?? null;
    amount = rawAmount !== null && rawAmount !== '' ? parseFloat(rawAmount) : null;
    unit = eventData.volume_unit || extraData.volume_unit || 'L';
  } else if (event.event_type === 0 || event.event_type === 3 || event.event_type === 7) {
    // Weather (0), General (3), and Business (7) events never carry a volume
    // concept. Skip regex parsing from free-text observation — it produced
    // nonsense like "200 lbs" when the farmer's notes mentioned "11,200 lbs"
    // as a yield estimate (the \d+ pattern matched the tail of a comma-
    // separated number). Leave amount/unit null so the Volume Applied card
    // doesn't render.
  } else {
    // For remaining event types, fall back to regex parsing from observation.
    // Require a word boundary before the digits so "11,200 lbs" is NOT
    // misread as "200 lbs" — the number must start fresh, not after a
    // digit/comma.
    const amountMatch = observation.match(/(?:^|[^\d,])(\d+)\s*(kg|lbs?|liters?|l)\b/i);
    amount = amountMatch ? parseInt(amountMatch[1]) : null;
    unit = amountMatch ? amountMatch[2] : null;
  }

  return {
    duration,
    amount,
    unit,
    hasQuantifiableData: duration !== null || amount !== null
  };
};

/**
 * Render event-specific fields, via the Event Field Registry (src/config/events/).
 *
 * The registry is the single source of truth for which fields appear on which surface, how
 * they are formatted, and which are withheld for FTC/ECGT reasons.
 *
 * A legacy branch used to sit here behind `VITE_USE_FIELD_REGISTRY`, calling
 * `getEventFieldDisplay()` from fieldDisplayUtils.ts, and its own comment said it "will be
 * removed once registry rendering is validated". The flag has been `true` in every env file —
 * .env.development, .env.local, .env.production and .env.example — so that branch had not run
 * anywhere in a long time. It was still costing a full field-extraction pass on every render
 * in ConsumerEventCard, where the call was made unconditionally and then discarded.
 */
const renderSharedEventFields = (
  event: Event,
  cardBg: string,
  textColor: string,
  intl: IntlShape
) => <RegistryFieldRendererBridge event={event} cardBg={cardBg} textColor={textColor} />;

/**
 * The grower's own custom fields, on the grower's own record view.
 *
 * Styling mirrors RegistryFieldRenderer's `FieldItem` deliberately — same Box, same label and
 * value treatment — so a custom field is indistinguishable from a standard one, which is the
 * stated contract in customFieldsUtils (`mergeCustomFieldsWithEventDisplay`: "no visual
 * distinction"). It cannot reuse that component because a custom field has no `labelKey`.
 */
const CustomFieldsBlock: React.FC<{
  event: Event;
  cardBg: string;
  textColor: string;
  headingColor: string;
}> = ({ event, cardBg, textColor, headingColor }) => {
  const intl = useIntl();
  // BOTH shapes, per the precedent in utils/fieldDisplayUtils.ts:750 — "eventDataNormalizer
  // saves to event.custom_fields (for preview); backend data may have
  // event.extra_data.custom_fields". MEASURED 2026-08-31: `/api/histories/<id>/public_history/`
  // and the carbon `complete` endpoint both put them ONLY in `extra_data`, so reading the top
  // level alone renders this block on the production page (whose event is pre-promoted) and
  // silently nothing on TrackList and ActivityDetailModal, which pass the API event straight
  // through. That is the same silent-drop this block was added to fix.
  const raw = event as unknown as {
    custom_fields?: CustomField[];
    extra_data?: { custom_fields?: CustomField[] };
  };
  // `||`, not `??`: an empty top-level array is not an answer, and `??` would accept it and
  // never look in extra_data. Matches utils/fieldDisplayUtils.ts, which uses `||` here.
  const fields = filterEmptyCustomFields(raw.custom_fields || raw.extra_data?.custom_fields);
  if (fields.length === 0) return null;

  return (
    <>
      <Divider />
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4} color={headingColor}>
          {intl.formatMessage({ id: 'events.section.additionalInfo' })}
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {fields.map((field) => (
            <Box key={field.id || field.label} p={4} bg={cardBg} borderRadius="lg">
              <HStack spacing={1} mb={1}>
                <Text fontSize="sm" color="gray.500">
                  {field.label}
                </Text>
                {/* Same authority the registry fields use: a custom field reaches the buyer
                    page when the grower marked it `consumer` (getCustomFieldsForConsumerCard
                    filters on exactly this), so the badge is not a second opinion. */}
                {field.visibility === 'consumer' && (
                  <Badge
                    colorScheme="green"
                    fontSize="11px"
                    variant="subtle"
                    title={intl.formatMessage({ id: 'producer.event.fieldOnBuyerPageHelp' })}>
                    {intl.formatMessage({ id: 'producer.event.buyerPageBadge' })}
                  </Badge>
                )}
              </HStack>
              <Text fontWeight="medium" color={textColor} whiteSpace="pre-wrap">
                {String(field.value)}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    </>
  );
};

/**
 * Bridge component: wraps useEventFields hook (hooks can't be called conditionally).
 * This component only renders when VITE_USE_FIELD_REGISTRY=true.
 */
const RegistryFieldRendererBridge: React.FC<{
  event: Event;
  cardBg: string;
  textColor: string;
}> = ({ event, cardBg, textColor }) => {
  const eventData = event as Record<string, unknown>;
  const eventType = (eventData.event_type as number) ?? 3; // default to general
  const subtype = subtypeOf(event);

  const { fields, hasFields } = useEventFields({
    eventType: eventType as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    subtype: subtype as any,
    surface: 'modal',
    event: eventData
  });

  // Which of these fields a shopper actually gets — same three authorities the real
  // consumer pipeline uses (see utils/buyerPageVisibility). This modal is producer-only
  // (its route sits behind auth), so the annotation never reaches a consumer surface.
  const buyerVisibleFields = useMemo(
    () => buyerVisibleFieldNames(eventType, subtype, eventData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventType, subtype, event]
  );

  if (!hasFields) return null;

  return (
    <RegistryFieldRenderer
      fields={fields}
      variant="modal"
      cardBg={cardBg}
      textColor={textColor}
      buyerVisibleFields={buyerVisibleFields}
    />
  );
};

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  members,
  onEventUpdated,
  onEventDeleted,
  isProductionFinished = false,
  farmId: farmIdProp,
  parcelId: parcelIdProp,
  parcelName
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const toast = useToast();
  const { canWrite } = useUserRole();
  const { currentCompany } = useSelector((state: RootState) => state.company);

  // Route ids: an explicit prop wins over the URL, so this modal works on surfaces whose
  // route has no `:parcelId` (see the prop docs).
  const { farmId: routeFarmId, parcelId: routeParcelId } = useParams<{
    farmId: string;
    parcelId: string;
  }>();
  const farmId = farmIdProp ?? routeFarmId;
  const parcelId = parcelIdProp ?? routeParcelId;

  // Theme colors. ALL of them resolve here, above the `if (!event) return null` below —
  // two `useColorModeValue` calls used to sit inside the JSX, i.e. after that early return,
  // which is a rules-of-hooks violation. It happens not to crash (Chakra's hook is
  // `useContext`-based and `useContext` takes no slot in the fiber's hook list), and that is
  // luck, not design: swapping in any stateful hook there would break the component the first
  // time `event` flipped from null.
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  // Icon-chip tokens for the header glyph — see `config/events/eventTypeAppearance`.
  const appearance = eventTypeAppearance(event?.event_type);
  const chipBg = useColorModeValue(appearance.chip.bg[0], appearance.chip.bg[1]);
  const chipFg = useColorModeValue(appearance.chip.fg[0], appearance.chip.fg[1]);

  // State for carbon data - now using embedded data
  const [carbonData, setCarbonData] = useState<CarbonCalculationResult | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Delete confirmation modal
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isCorrectOpen, onOpen: onCorrectOpen, onClose: onCorrectClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // API hooks - only need delete now
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();

  // Load carbon data when modal opens - now uses embedded data
  useEffect(() => {
    if (isOpen && event) {
      // Zero-emission event types: Weather (0), General/Other Farm Activity (3), Business (7)
      // These are observational/administrative events that produce no direct emissions
      const isZeroEmissionType =
        event.event_type === 0 || event.event_type === 3 || event.event_type === 7;
      if (isZeroEmissionType) {
        const typeLabels: Record<number, string> = { 0: 'weather', 3: 'general', 7: 'business' };
        setCarbonData({
          co2e: 0,
          efficiency_score: 100,
          usda_factors_based: false,
          verification_status: 'verified',
          data_source: `${typeLabels[event.event_type]}_transparency`,
          calculation_method: `${typeLabels[event.event_type]}_transparency`,
          event_type: typeLabels[event.event_type] || 'general',
          timestamp: new Date().toISOString()
        });
        setDataLoaded(true);
      } else if (event.carbon_data) {
        setCarbonData(event.carbon_data);
        setDataLoaded(true);
      } else {
        // Fallback for events without embedded carbon data
        setCarbonData({
          co2e: 0,
          efficiency_score: 50.0,
          usda_factors_based: false,
          verification_status: 'estimated',
          data_source: 'Unknown',
          calculation_method: 'embedded_data_unavailable',
          event_type: 'unknown',
          timestamp: new Date().toISOString(),
          error: 'Carbon data not available in event response'
        });
        setDataLoaded(true);
      }
    }
  }, [isOpen, event]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCarbonData(null);
      setDataLoaded(false);
    }
  }, [isOpen]);

  if (!event) return null;

  const eventData = extractEventData(event);
  const operator = members.find((member) => member.id === event.created_by);

  const handleEdit = () => {
    navigate(
      `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/event/${event.id}/change?event_type=${event.event_type}`
    );
    onClose();
  };

  const handleDelete = () => {
    if (!currentCompany || !farmId || !event) return;

    deleteEvent({
      companyId: currentCompany.id.toString(),
      farmId: farmId,
      eventId: event.id.toString(),
      eventType: event.event_type.toString()
    })
      .unwrap()
      .then(() => {
        toast({
          title: intl.formatMessage({ id: 'eventDetails.deleted.title' }),
          description: intl.formatMessage({ id: 'eventDetails.deleted.description' }),
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        onDeleteClose();
        onClose();
        onEventDeleted?.();
      })
      .catch((error: any) => {
        console.error('Failed to delete event:', error);
        toast({
          title: intl.formatMessage({ id: 'eventDetails.deleteFailed.title' }),
          description: intl.formatMessage({ id: 'eventDetails.deleteFailed.description' }),
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      });
  };

  const sharedFields = renderSharedEventFields(event, cardBg, textColor, intl);
  const impactBadgeVariant = impactBadgeVariantFor(carbonData?.co2e ?? 0);

  /**
   * Footer.
   *
   * Three things changed and all three were showing in the 2026-08-16 screenshot:
   *
   * 1. Delete rendered GREEN. `colorScheme="red" variant="outline"` was inert — the theme's
   *    outline variant hardcoded green — so the destructive action wore the brand/success
   *    colour and only turned red on hover, from the inline `_hover` that used to be here.
   *    `theme/components/button.js` now honours colorScheme, so that inline override is gone
   *    with it; Delete is `ghost` + red, which is the weight a destructive secondary should
   *    carry next to a primary.
   * 2. Edit Event was BLUE. Primary fill is green.700 (`.claude/rules/frontend.md`).
   * 3. Delete sat directly against Edit, same size, same row — an accidental-click zone. The
   *    dismiss/destructive pair now share the left and the primary owns the right, and below
   *    `md` the whole thing STACKS. Measured need for the stack: at 375px a single row has
   *    351px for ~342px of English labels, and the Spanish labels this screen actually
   *    renders come to ~400px.
   *
   * ⚠️ THE STACK ORDER IS LOAD-BEARING, and I got it wrong first (`column-reverse`, seen in
   * the 2026-08-16 phone screenshot). Reversing put Edit Event on top and left DELETE as the
   * bottom-most control — the single easiest target in the thumb arc, on a phone, for the one
   * action that destroys a certifier record. On a bottom sheet the PRIMARY owns the bottom
   * edge; destructive sits above it and off to the side. `column` + `order` gives that
   * without changing the DOM order, so the tab sequence still runs Close → Delete → Edit.
   */
  const footer = (
    <Flex
      w="full"
      direction={{ base: 'column', md: 'row' }}
      justify="space-between"
      align={{ base: 'stretch', md: 'center' }}
      gap={3}>
      <HStack spacing={2} justify={{ base: 'space-between', md: 'flex-start' }}>
        <Button
          variant="ghost"
          colorScheme="gray"
          onClick={onClose}
          size={{ base: 'md', md: 'lg' }}>
          {intl.formatMessage({ id: 'app.close' })}
        </Button>

        {/* "Log this again" (2026-08-25): repetition is the real logging cost — a
            spray program is the same record eight times with a new date. Opens the
            add form prefilled from THIS record (date reset, photos not copied).
            Works from finished seasons too: the new record lands on the parcel's
            open season, or the no-open-season door asks where it belongs. */}
        {canWrite && farmId && parcelId && event?.id != null && event?.event_type != null && (
          <Button
            variant="ghost"
            colorScheme="green"
            onClick={() => {
              onClose();
              navigate(
                `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/event/add` +
                  `?repeat=${event.id}&event_type=${event.event_type}`
              );
            }}
            size={{ base: 'md', md: 'lg' }}>
            {intl.formatMessage({ id: 'eventDetails.logAgain' })}
          </Button>
        )}

        {!isProductionFinished && canWrite && (
          <Button
            leftIcon={<FaTrash />}
            colorScheme="red"
            variant="ghost"
            onClick={onDeleteOpen}
            size={{ base: 'md', md: 'lg' }}
            isLoading={isDeleting}
            loadingText={intl.formatMessage({ id: 'eventDetails.deleting' })}>
            {intl.formatMessage({ id: 'app.delete' })}
          </Button>
        )}
      </HStack>

      {isProductionFinished ? (
        /* Locked, but not a dead end. Saying only "this is locked" is where the farmer
           gives up or emails support; the one thing they can still do belongs right
           here, next to the reason they cannot do the other thing. */
        <VStack spacing={2} bg="gray.100" px={4} py={3} borderRadius="lg">
          <HStack spacing={2} justify="center">
            <Icon as={FaLock} boxSize={4} color="gray.600" />
            <Text fontSize="sm" color="gray.700" fontWeight="medium">
              {intl.formatMessage({ id: 'eventDetails.eventLocked' })}
            </Text>
          </HStack>
          {canWrite && (
            <StandardButton
              variant="outline"
              size="sm"
              leftIcon={<FaExchangeAlt />}
              onClick={onCorrectOpen}>
              {intl.formatMessage({ id: 'eventDetails.correctRecord' })}
            </StandardButton>
          )}
        </VStack>
      ) : canWrite ? (
        <Button
          leftIcon={<FaEdit />}
          colorScheme="green"
          variant="solid"
          onClick={handleEdit}
          size={{ base: 'md', md: 'lg' }}
          // Full-width on a phone: a bottom-sheet primary that is not full-width reads as one
          // of several equal options rather than as the thing to do.
          w={{ base: 'full', md: 'auto' }}>
          {intl.formatMessage({ id: 'eventDetails.editEvent' })}
        </Button>
      ) : null}
    </Flex>
  );

  const header = (
    <VStack align="start" spacing={3}>
      <HStack spacing={3} align="start">
        <Box p={3} borderRadius="lg" bg={chipBg} flexShrink={0}>
          <Icon as={appearance.icon} boxSize={6} color={chipFg} />
        </Box>
        <VStack align="start" spacing={1}>
          <Text fontSize="xl" fontWeight="bold" color={textColor}>
            {getEventDisplayName(event, intl)}
          </Text>
          <HStack spacing={2}>
            {/* Same variant and the same words the activity row used, so opening a record
                does not rename its own category — see `config/events/eventTypeAppearance`. */}
            <Badge variant={appearance.badgeVariant} fontSize="xs">
              {intl.formatMessage({ id: appearance.labelKey })}
            </Badge>
            {(event.is_summary === true ||
              event.extra_data?.is_summary === true ||
              event.extra_data?.is_summary === 'true') && (
              <Badge variant="neutral" fontSize="xs" display="flex" alignItems="center" gap={1}>
                <Icon as={FaLayerGroup} boxSize={3} />
                {intl.formatMessage(
                  { id: 'eventDetails.summaryCount' },
                  { count: Number(event.event_count ?? event.extra_data?.event_count ?? 0) }
                )}
              </Badge>
            )}
          </HStack>
        </VStack>
      </HStack>

      {/* Wrap, not HStack: four meta items at 375px overflowed a row that could not break.
          `Wrap` also supplies the row gap an HStack has no concept of. */}
      <Wrap spacingX={6} spacingY={2} color="gray.600" fontSize="sm">
        <WrapItem>
          <HStack spacing={2}>
            <Icon as={FaCalendarAlt} boxSize={4} />
            <Text>
              {event.extra_data?.date_start && event.extra_data?.date_end
                ? `${formatDateFromTimestamp(event.extra_data.date_start, intl.locale)} - ${formatDateFromTimestamp(
                    event.extra_data.date_end,
                    intl.locale
                  )}`
                : formatDateFromTimestamp(event.date, intl.locale)}
            </Text>
          </HStack>
        </WrapItem>
        {parcelName && (
          <WrapItem>
            <HStack spacing={2}>
              <Icon as={FaMapMarkerAlt} boxSize={4} />
              <Text>{parcelName}</Text>
            </HStack>
          </WrapItem>
        )}
        {operator && (
          <WrapItem>
            <HStack spacing={2}>
              <Icon as={FaUser} boxSize={4} />
              <Text>{operator.full_name}</Text>
            </HStack>
          </WrapItem>
        )}
        {event.certified && (
          <WrapItem>
            <HStack spacing={2}>
              {/* green.700, not green.500: 2.78:1 fails AA as text and even the 3:1 icon
                  floor. `.claude/rules/frontend.md` → "if it renders glyphs, it is green.700". */}
              <Icon as={MdVerified} boxSize={4} color="green.700" />
              <Text color="green.700" fontWeight="medium">
                {intl.formatMessage({ id: 'eventDetails.certified' })}
              </Text>
            </HStack>
          </WrapItem>
        )}
      </Wrap>
    </VStack>
  );

  return (
    <>
      <ResponsiveModal isOpen={isOpen} onClose={onClose} size="4xl" header={header} footer={footer}>
        <VStack spacing={6} align="stretch">
          {/* Buyer-page visibility, stated up front. Certifier-only subtypes (BU/SS/EM/TP)
              never reach the anonymous payload; everything else publishes, with the
              buyer-visible fields marked individually by the field renderer below. */}
          {(() => {
            const reasonId = buyerPageWithheldReasonId(event as Record<string, unknown>);
            if (reasonId) {
              return (
                <StandardAlert
                  status="info"
                  title={intl.formatMessage({ id: 'events.certifierOnly.title' })}
                  description={intl.formatMessage({ id: reasonId })}
                />
              );
            }

            return (
              <Text fontSize="xs" color="gray.500">
                {intl.formatMessage({ id: 'producer.event.buyerPageFieldsHint' })}
              </Text>
            );
          })()}
          {/* Zero-emissions note, DEMOTED from a second info box to one muted line
              (2026-08-27). Two stacked banners opened every certifier-only record's
              modal, both ending in "it's for your certifier" — banner fatigue that
              devalued the visibility notice above, and the "Why this record matters"
              title promised a compliance story while the body explained emissions
              accounting. The fact survives as a caption where a carbon number would
              otherwise appear; on certifier-only records it is dropped entirely —
              the notice above already carries the certifier-reads-the-season story. */}
          {carbonData &&
            !carbonData.error &&
            !isNotEstimated(carbonData) &&
            carbonData.co2e === 0 &&
            !buyerPageWithheldReasonId(event as Record<string, unknown>) && (
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'event.recordValue.zeroEmissions' })}
              </Text>
            )}

          {/* The farmer's own note.
              Was headed "Event Details" over a box separately labelled "Field Notes" — a
              heading, a sublabel and one paragraph, three layers of chrome over a single
              value. "Event" is also the backend model's word, and the heading sat two
              blocks above "Detailed Information", which is where every registry field
              actually renders: one section called Details containing none, another
              containing all of them. One heading, named for what is under it. */}
          {/* Where the record came from, when a crew message is its source (audit T29). */}
          <CrewNoteProvenance eventId={event.id} eventType={event.event_type} />

          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
              {intl.formatMessage({ id: 'app.fieldNotes' })}
            </Text>

            {/* Full width — farmer observations are usually long paragraphs and look
                cramped in a 50% cell. */}
            <VStack spacing={4} align="stretch">
              <Box p={4} bg={cardBg} borderRadius="lg">
                <Text fontWeight="medium" whiteSpace="pre-wrap">
                  {/*
                    The farmer's own note. `description` is system-generated and rendered here it
                    masqueraded as field notes, so it is a fallback for LEGACY rows only, whose note
                    genuinely lives there.
                    
                    THE FALLBACK NOW SKIPS A GENERATED PLACEHOLDER, and the reason is new: an event
                    confirmed from a crew field note has an intentionally EMPTY observation, because
                    the sender's words must not be republished as the grower's own. Every one of
                    those hit this fallback and printed the placeholder the backend stores to satisfy
                    a non-blank column, so the modal showed "Production activity: Irrigation" under a
                    heading that says Field Notes. The old comment's premise, that reaching the
                    fallback means a legacy note, stopped being true the day that flow shipped.
                  */}
                  {(() => {
                    // Through `unknown`: the compiler asks for it, and the two direct casts already
                    // in this file are two of its standing errors. Copying them would make a third.
                    const row = event as unknown as Record<string, unknown>;
                    const observation = String(row.observation ?? '').trim();
                    if (observation) return observation;

                    const description = String(event.description ?? '').trim();
                    if (!description) return intl.formatMessage({ id: 'events.noFieldNotes' });

                    // `ensure_event_description` stores the event's own name when the notes box is
                    // left empty, because the column is non-blank. A description equal to the name is
                    // therefore a PLACEHOLDER, not prose. The `: name` suffix catches the older
                    // "<Type activity>: <name>" shape still stored on every row written before the
                    // generator stopped prefixing the internal type.
                    //
                    // ⚠️ KNOWN LIMITATION, accepted deliberately. A LEGACY row with no `observation`
                    // whose note happens to be exactly the event name (a farmer who typed just
                    // "Irrigation" back when description was the only notes field) is
                    // indistinguishable from a placeholder and is suppressed with them. Nothing in
                    // the row separates the two.
                    //
                    // The trade runs this way on purpose: today every event confirmed from a crew
                    // voice note has an empty observation by design, so NOT suppressing means a
                    // machine string presented as the farmer's words on every one of them, on a
                    // record a certifier reads. A one-word legacy note is rarer and far less costly,
                    // and it is still on the record, just not shown in this box.
                    const name = String(row.name ?? '').trim();
                    if (name && (description === name || description.endsWith(`: ${name}`))) {
                      return intl.formatMessage({ id: 'events.noFieldNotes' });
                    }
                    return description;
                  })()}
                </Text>
              </Box>

              {/* Duration and volume_applied are both handled by the
                      registry in "Detailed Information" below (Bug Pattern #5). */}
            </VStack>
          </Box>

          {/* Album Images Section */}
          {event.album && event.album.images && event.album.images.length > 0 && (
            <>
              <Divider />
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                  {intl.formatMessage({ id: 'events.wizard.step.photos' })}
                </Text>
                {/* Photo content warning for flagged AI/stock photos */}
                {event.photo_content_flag && (
                  <Alert status="warning" mb={4} fontSize="sm">
                    <AlertIcon boxSize={4} />
                    <Box>
                      <Text fontWeight="medium">
                        {intl.formatMessage({
                          id:
                            event.photo_content_flag === 'ai_generated'
                              ? 'event.photoFlag.aiGenerated'
                              : event.photo_content_flag === 'stock_photo'
                              ? 'event.photoFlag.stockPhoto'
                              : 'event.photoFlag.notAgricultural'
                        })}
                      </Text>
                      <Text color="gray.600" mt={1}>
                        {intl.formatMessage({ id: 'event.photoFlag.replaceWithFieldPhoto' })}
                      </Text>
                    </Box>
                  </Alert>
                )}
                <Grid
                  templateColumns={{
                    base: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(4, 1fr)'
                  }}
                  gap={4}>
                  {event.album.images.map((image, index) => (
                    <Box key={image.id || index}>
                      <AspectRatio ratio={1}>
                        <Image
                          src={image.image}
                          alt={intl.formatMessage(
                            { id: 'eventDetails.photoAlt' },
                            { index: index + 1 }
                          )}
                          borderRadius="lg"
                          objectFit="cover"
                          border="1px"
                          borderColor={borderColor}
                          cursor="pointer"
                          transition="all 0.2s"
                          _hover={{
                            transform: 'scale(1.05)',
                            boxShadow: 'lg'
                          }}
                          onError={(e) => {
                            console.error('Image failed to load:', image.image, e);
                          }}
                          fallback={
                            <Center
                              h="100%"
                              bg={cardBg}
                              borderRadius="lg"
                              border="1px"
                              borderColor={borderColor}
                              flexDirection="column"
                              gap={2}>
                              <Box fontSize="2xl">📷</Box>
                              <Text fontSize="xs" color="gray.500" textAlign="center">
                                {intl.formatMessage({ id: 'eventDetails.imageUnavailable' })}
                              </Text>
                            </Center>
                          }
                        />
                      </AspectRatio>
                    </Box>
                  ))}
                </Grid>
              </Box>
            </>
          )}

          {/* Specific Event Fields Section. Built once and reused — this used to call
                  the renderer twice, once as a truthiness test and once for real. */}
          {sharedFields && (
            <>
              <Divider />
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                  {intl.formatMessage({ id: 'eventDetails.detailedInformation' })}
                </Text>
                {sharedFields}
              </Box>
            </>
          )}

          {/*
            🔴 2026-08-31 — the grower's OWN custom fields were the one thing this modal did
            not show. `grep -n custom_fields` on this file returned nothing: ConsumerEventCard
            merges them, EventPreviewModal merges them, the certifier packet prints every one —
            and the producer's full-record view, the surface whose entire job is showing a
            record back, dropped them. A farmer who added "Nursery certificate number" saw it on
            the buyer page and nowhere in their own records.

            Rendered here rather than inside RegistryFieldRenderer because the display registry
            has no notion of a farmer-authored field (ConsumerEventCard says the same and merges
            them on its own path): there is no labelKey to resolve — the label IS the grower's
            text, so passing it through the registry's i18n resolver would both mangle it
            ("pH reading" -> "p H reading") and log a missing-translation error per field.

            ALL visibilities, unlike the consumer path which filters to `consumer`. This is the
            producer's own record; the badge says which ones a shopper also gets.
          */}
          <CustomFieldsBlock
            event={event}
            cardBg={cardBg}
            textColor={textColor}
            headingColor={textColor}
          />

          {/* Pilot rehearsal 2026-10: a corrected record showed only its corrected value here,
              and a document could not be tied to the record at all. Both are read-only. A
              rolled-up summary row stands in for several events and has no single trail. */}
          {!event.is_summary && (
            <>
              <EventCorrections
                eventId={event.id}
                eventType={event.event_type}
                enabled={canWrite}
                headingColor={textColor}
                cardBg={cardBg}
              />
              <EventDocuments
                companyId={currentCompany?.id}
                farmId={farmId}
                eventId={event.id}
                eventType={event.event_type}
                headingColor={textColor}
                cardBg={cardBg}
              />
            </>
          )}

          <Divider />

          {/* Carbon Impact Section - matches CarbonImpactPreview format */}
          {carbonData && !carbonData.error && (
            <Box p={4} bg={cardBg} borderRadius="lg" border="1px" borderColor={borderColor}>
              <HStack justify="space-between" align="center" mb={3}>
                <HStack spacing={2}>
                  {/* green.700: a leaf that means "this section is about carbon" is a
                          meaningful glyph, and green.500 is 2.78:1. */}
                  <Icon as={FaLeaf} color="green.700" boxSize={4} />
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    {intl.formatMessage({ id: 'eventDetails.carbonImpact' })}
                  </Text>
                </HStack>
                {showsInputsBadge(carbonData) && (
                  <Tooltip label={intl.formatMessage({ id: 'carbon.badge.epaUsdaTooltip' })}>
                    {/* A sourcing note is a FACT, not a status — `neutral`, per
                            `.claude/rules/frontend.md`. It was `colorScheme="blue"`, and blue
                            belongs to `Alert status="info"` and nothing else. */}
                    <Badge variant="neutral" fontSize="xs">
                      <HStack spacing={1}>
                        <Icon as={FaCertificate} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'carbon.badge.epaUsdaSourced' })}</Text>
                      </HStack>
                    </Badge>
                  </Tooltip>
                )}
              </HStack>

              {/* Weather/zero-emission events. The "why this record matters" note that
                      used to live here is now a StandardAlert at the TOP of the body — see
                      the comment there. */}
              {/* ⛔ NO EFFICIENCY SCORE. Removed 2026-08-16, and this is the note that
                  stops it coming back a seventh time.

                  This card used to end with "<n> /100 — Efficiency Score" plus a
                  threshold-coloured progress bar. Three separate reasons, any one of which
                  would be enough:

                  1. The number was frequently FABRICATED HERE, not measured. The effect
                     above hardcodes `efficiency_score: 100` for event types 0/3/7 and `50.0`
                     for the no-carbon-data fallback. A season-planning note was being awarded
                     a perfect 100/100 by a frontend constant.
                  2. It is a self-authored 0–100 grade on the grower's own record, rendered on
                     a producer record screen — the exact shape `noScoreOnProducerRecords`
                     exists to keep off these surfaces, threshold-derived colour ladder and
                     all. See `[[producer-score-retired-2026-08-11]]`: backend KPI, zero UI.
                  3. It answers nothing a grower asked. The question these screens serve is
                     "am I ready for my renewal inspection".

                  The guard did not catch it for a year because the label was a hardcoded
                  English string, which matches none of its patterns; translating it to
                  `eventDetails.efficiencyScore` is what finally tripped the message-id rule.

                  What stays is the FACT — kg CO₂e and its impact level. Those are measured,
                  and neither is a verdict on the season.

                  ⚠️ Still live in `components/Events/CarbonImpactPreview.tsx` and
                  `components/Events/EnhancedEventDetailModal.tsx`, both as hardcoded English,
                  both therefore invisible to the guard. */}
              {isNotEstimated(carbonData) ? (
                // Run 8 (R8-04): no figure, and why, instead of a 0.
                <Text fontSize="md" color="gray.700">
                  {intl.formatMessage({ id: 'carbon.notEstimated' })}
                </Text>
              ) : (
              <HStack justify="space-between" align="center">
                <VStack spacing={0} align="start">
                  <HStack spacing={2}>
                    <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                      {formatCO2e(carbonData.co2e)}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      kg CO₂e
                    </Text>
                    {/* One branch for both cases: zero IS impact level 0, so read the label
                        from the same helper rather than hardcoding an English "None" that no
                        locale could translate. */}
                    <Badge variant={impactBadgeVariant} fontSize="xs">
                      {intl.formatMessage({ id: getImpactLevel(carbonData.co2e).level })}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.600">
                    {intl.formatMessage({
                      id:
                        carbonData.co2e === 0
                          ? 'eventDetails.noDirectEmissions'
                          : 'eventDetails.carbonEstimate'
                    })}
                  </Text>
                </VStack>
              </HStack>
              )}
            </Box>
          )}
        </VStack>
      </ResponsiveModal>

      {/* Correcting a value on a filed record. Mounted here rather than inside the
          locked banner so it survives the details modal's own scroll container. */}
      <CorrectRecordModal
        isOpen={isCorrectOpen}
        onClose={onCorrectClose}
        eventId={event?.id}
        eventType={event?.event_type}
        onCorrected={onEventUpdated}
      />

      {/* Modern Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered>
        <AlertDialogOverlay bg="blackAlpha.400">
          <AlertDialogContent borderRadius="xl" p={2} mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" pb={4}>
              <HStack spacing={3}>
                <Box p={2} borderRadius="lg" bg="red.50">
                  {/* red.700 (4.36:1 on red.50), not red.500 (3.22:1) — a glyph inside a
                      tinted chip owes the 3:1 non-text floor and should not be scraping it. */}
                  <Icon as={FaTrash} boxSize={5} color="red.700" />
                </Box>
                <Text>{intl.formatMessage({ id: 'eventDetails.deleteConfirm.title' })}</Text>
              </HStack>
            </AlertDialogHeader>

            <AlertDialogBody pb={6}>
              <VStack align="start" spacing={3}>
                <Text color="gray.700">
                  {intl.formatMessage({ id: 'eventDetails.deleteConfirm.body' })}
                </Text>
                <Box p={3} bg="red.50" borderRadius="lg" w="full">
                  <Text fontSize="sm" color="red.700" fontWeight="medium">
                    {intl.formatMessage({ id: 'eventDetails.deleteConfirm.removesTitle' })}
                  </Text>
                  {/* red.900, not red.600. red.600 on red.50 is 3.70:1 and this is body text
                      at 14px, which owes 4.5:1 — the same call `badge.js` makes for its
                      `danger` variant. red.900 is 5.75:1. */}
                  <VStack align="start" spacing={1} mt={2} fontSize="sm" color="red.900">
                    <Text>
                      • {intl.formatMessage({ id: 'eventDetails.deleteConfirm.removesDetails' })}
                    </Text>
                    <Text>
                      • {intl.formatMessage({ id: 'eventDetails.deleteConfirm.removesCarbon' })}
                    </Text>
                    <Text>
                      • {intl.formatMessage({ id: 'eventDetails.deleteConfirm.removesQr' })}
                    </Text>
                  </VStack>
                </Box>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter pt={4}>
              <HStack spacing={3} w="full" justify="flex-end">
                <Button ref={cancelRef} onClick={onDeleteClose} variant="ghost" colorScheme="gray">
                  {intl.formatMessage({ id: 'app.cancel' })}
                </Button>
                {/* `variant="solid"` is not optional here. Without it the button falls to
                    `defaultProps.variant: 'brand'`, which is green-locked because it IS the
                    brand mark — so the CONFIRM-DELETE button rendered green, the same defect
                    as the Delete button in the footer. `solid` + red resolves to red.700
                    (4.98:1 under white); Chakra's stock red.500 is 3.76:1 and fails AA. */}
                <Button
                  colorScheme="red"
                  variant="solid"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                  loadingText={intl.formatMessage({ id: 'eventDetails.deleting' })}>
                  {intl.formatMessage({ id: 'eventDetails.deleteConfirm.confirm' })}
                </Button>
              </HStack>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
