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
import { MdEco, MdSecurity } from 'react-icons/md';
import {
  getConsumerEventDescription,
  localizeConsumerDescription,
  formatEventDate,
  getEventTrustIndicators
} from 'utils/eventDescriptions';
import {
  getEventFieldDisplay,
  localizeFieldValue,
  type EventFieldDisplay,
  type FieldDisplayItem
} from 'utils/fieldDisplayUtils';
// Event Field Registry (Phase 5 — feature-flagged)
import { getFieldsForSurface, type ResolvedFieldSet } from 'src/config/events';
// Worker privacy mask for the public QR page — see utils/consumerDisplay.ts
import { maskPerformerName, withUSUnits, formatHarvestDate } from 'utils/consumerDisplay';

const USE_FIELD_REGISTRY = import.meta.env.VITE_USE_FIELD_REGISTRY === 'true';
import {
  getVerificationBadgeConfig,
  getVerificationColor,
  type VerificationLevel
} from 'utils/verificationTierHelpers';
import { StandardImageGallery } from 'components/ImageGallery';

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
  event: ConsumerEventData;
  isFirst?: boolean;
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
  isFirst = false,
  isLast = false,
  isGrouped = false,
  slim = false,
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

  const fieldDisplayBase: EventFieldDisplay = (() => {
    if (!USE_FIELD_REGISTRY) return legacyFieldDisplay;

    const resolved = getFieldsForSurface(
      (event.event_type as number) ?? 3,
      ((event as any).weather_type ||
        (event as any).production_type ||
        (event as any).chemical_type ||
        (event as any).soil_management_type ||
        (event as any).pest_management_type ||
        (event as any).business_event_type ||
        (event as any).type) as any,
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

    const registryDisplay: EventFieldDisplay = {
      // Exclude title fields from hero→immediate merge — they already render as the card title.
      // 'name' is the primary title; 'commercial_name' is the chemical event fallback title.
      // Other hero fields (pest_type, business_event_type, etc.) are kept in Key Details.
      immediate: toDisplayItems([
        ...resolved.hero.filter((f) => f.name !== 'name' && f.name !== 'commercial_name'),
        ...resolved.immediate
      ]),
      // Exclude observation/observations from secondary — they render verbatim
      // as "Farmer's Field Notes" above. Filter by the registry field NAME
      // (locale-independent); the display label is localized ("Observación" in
      // es-419), so a label-string filter downstream silently misses it.
      secondary: toDisplayItems(
        resolved.secondary.filter((f) => f.name !== 'observation' && f.name !== 'observations')
      ),
      details: toDisplayItems(resolved.details)
    };

    // Use registry fields if they have content; fall back to legacy otherwise
    const hasRegistryFields =
      registryDisplay.immediate.length +
        registryDisplay.secondary.length +
        registryDisplay.details.length >
      0;
    return hasRegistryFields ? registryDisplay : legacyFieldDisplay;
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

  // Critical event types that require photo verification (matches backend logic)
  const requiresPhotoVerification = ['FE', 'PE', 'FU', 'HE', 'PL', 'HA'].includes(event.type);

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
        return FaInfoCircle;
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
  const greenSoftBorder = useColorModeValue('green.100', 'green.800');
  const greenStrongText = useColorModeValue('green.800', 'green.100');
  const greenBorder = useColorModeValue('green.200', 'green.700');
  const neutralSoftBg = useColorModeValue('gray.50', 'gray.800');
  const neutralBorder = useColorModeValue('gray.200', 'gray.700');
  const summaryBg = useColorModeValue(
    event.type === 'FE'
      ? 'blue.50'
      : event.type === 'FU'
      ? 'purple.50'
      : event.type === 'PE'
      ? 'orange.50'
      : event.type === 'SC'
      ? 'green.50'
      : event.type === 'HA'
      ? 'yellow.50'
      : 'gray.50',
    'gray.700'
  );
  const summaryBorder = useColorModeValue(
    event.type === 'FE'
      ? 'blue.200'
      : event.type === 'FU'
      ? 'purple.200'
      : event.type === 'PE'
      ? 'orange.200'
      : event.type === 'SC'
      ? 'green.200'
      : event.type === 'HA'
      ? 'yellow.200'
      : 'gray.200',
    'gray.600'
  );

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
          <Circle
            size={{ base: '40px', md: '48px' }}
            bg={isFirst ? accentColor : bgColor}
            border="3px solid"
            borderColor={
              verificationLevel === 'ultimate'
                ? 'green.400'
                : verificationLevel === 'high'
                ? 'blue.400'
                : accentColor
            }
            position="relative"
            boxShadow={
              verificationLevel === 'ultimate' ? '0 0 20px rgba(72, 187, 120, 0.4)' : 'none'
            }
          >
            <Icon
              as={verificationLevel === 'ultimate' ? MdSecurity : eventTypeConfig.icon}
              boxSize={{ base: 4, md: 5 }}
              color={
                isFirst
                  ? 'white'
                  : verificationLevel === 'ultimate'
                  ? 'green.500'
                  : eventTypeConfig.color
              }
            />

            {/* Certification indicator removed — certification applies at parcel level, not individual events */}

            {/* Blockchain verification indicator */}
            {blockchainData.verified && (
              <Circle
                size="14px"
                bg={verificationLevel === 'ultimate' ? 'blue.500' : 'blue.400'}
                position="absolute"
                bottom="-1px"
                right="-1px"
                border="1px solid white"
              >
                <Icon as={FaShieldAlt} boxSize="8px" color="white" />
              </Circle>
            )}

            {/* EPA/USDA-sourced calculation indicator */}
            {event.usda_factors_used && (
              <Circle
                size="14px"
                bg="green.600"
                position="absolute"
                bottom="-1px"
                left="-1px"
                border="1px solid white"
              >
                <Text fontSize="6px" color="white" fontWeight="bold">
                  SCI
                </Text>
              </Circle>
            )}
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
              {slim && !isExpanded && event.album?.images?.[0]?.image && (
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
                    alt={event.album.images[0].caption || `Photo from ${eventInfo.title}`}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              )}
              <VStack align="start" spacing={1} flex="1">
                <HStack spacing={2} flexWrap="wrap">
                  <Text
                    fontSize={{ base: 'md', md: 'lg' }}
                    fontWeight="bold"
                    color={strongText}
                  >
                    {eventInfo.title}
                  </Text>
                  {/* Sprint 4 & 5: Summary badge for aggregate events with type-specific colors */}
                  {isSummaryEvent && (
                    <Badge
                      colorScheme={
                        event.type === 'FE'
                          ? 'blue'
                          : event.type === 'FU'
                          ? 'purple'
                          : event.type === 'PE'
                          ? 'orange'
                          : event.type === 'SC'
                          ? 'green'
                          : 'blue'
                      }
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
                          id: ['FE', 'FU', 'PE', 'SC'].includes(event.type as string)
                            ? `consumer.eventCard.summaryNoun.${event.type}`
                            : 'consumer.eventCard.summaryNoun.default',
                          defaultMessage:
                            event.type === 'FE'
                              ? 'Fertilizer Apps'
                              : event.type === 'FU'
                              ? 'Fungicide Apps'
                              : event.type === 'PE'
                              ? 'Pesticide Apps'
                              : event.type === 'SC'
                              ? 'Scouting Trips'
                              : 'Events'
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
                {event.performed_by && !slim && (
                  <HStack spacing={1}>
                    <Icon as={FaCheckCircle} aria-hidden="true" boxSize={3} color="green.500" />
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="green.600" fontWeight="medium">
                      {intl.formatMessage(
                        { id: 'consumer.eventCard.performedBy', defaultMessage: 'Performed by: {name}' },
                        { name: maskPerformerName(event.performed_by) }
                      )}
                    </Text>
                  </HStack>
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
              <Text
                fontSize={{ base: 'md', md: 'md' }}
                color={secondaryText}
                lineHeight={{ base: '1.6', md: '1.5' }}
                noOfLines={slim && !isExpanded ? 2 : undefined}
              >
                {eventInfo.shortDescription}
              </Text>

              {/* Inline consumer-impact subhead — TEMPORARILY DISABLED 2026-04-30.
                  Duplicated the "What This Means For You" block in the expanded
                  Collapse and the title/description already conveyed the same
                  consumer framing. Farmer's Field Notes (observation) carries
                  the authentic signal when present. Re-enable if we drop the
                  expanded duplicate or want a fallback when observation is empty.
                  Source: getConsumerEventDescription() in utils/eventDescriptions.ts. */}
              {/* {eventInfo.consumerImpact && eventInfo.consumerImpact.trim() && (
                <HStack
                  spacing={2}
                  align="flex-start"
                  bg={greenSoftBg}
                  border="1px solid"
                  borderColor={greenSoftBorder}
                  borderRadius="md"
                  p={3}
                >
                  <Icon as={FaShieldAlt} color="green.500" boxSize={3} mt="3px" flexShrink={0} />
                  <Text
                    fontSize="sm"
                    color={greenStrongText}
                    lineHeight="1.5"
                    noOfLines={{ base: 3, md: 2 }}
                  >
                    {eventInfo.consumerImpact}
                  </Text>
                </HStack>
              )} */}

              {/* 🌱 TRANSPARENCY-FIRST: Show farmer's actual field notes from observation field only.
                  description contains system-generated text (template names, etc.) and must NOT
                  be shown as "Farmer's Field Notes" — that would be dishonest to consumers. */}
              {event.observation && event.observation.trim() && (!slim || isExpanded) && (
                <Box
                  bg={greenSoftBg}
                  border="1px solid"
                  borderColor={greenBorder}
                  borderRadius="md"
                  p={3}
                >
                  <HStack spacing={2} mb={2}>
                    <Icon as={FaEye} aria-hidden="true" boxSize={3} color="green.500" />
                    <Text fontSize="xs" fontWeight="semibold" color="green.600">
                      {intl.formatMessage({
                        id: 'consumer.eventCard.farmerNotes',
                        defaultMessage: "Farmer's Field Notes"
                      })}
                    </Text>
                  </HStack>
                  <Text
                    fontSize="sm"
                    color={greenStrongText}
                    fontStyle="italic"
                    lineHeight="1.4"
                  >
                    "{event.observation}"
                  </Text>
                </Box>
              )}
            </VStack>

            {/* Enhanced Trust & Verification Indicators */}
            <VStack spacing={2} mb={3} align="stretch">
              {/* Primary trust indicators */}
              {trustIndicators.length > 0 && (
                <HStack spacing={2} flexWrap="wrap">
                  {trustIndicators.map((indicator, idx) => (
                    <Badge
                      key={idx}
                      variant="subtle"
                      colorScheme="blue"
                      fontSize="xs"
                      px={2}
                      py={1}
                    >
                      <HStack spacing={1}>
                        <Icon as={FaCheckCircle} aria-hidden="true" boxSize={3} />
                        <Text>{indicator}</Text>
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
                const elecLabels: Record<string, string> = {
                  solar: 'Solar-Powered Pump',
                  wind: 'Wind-Powered Pump',
                  grid: 'Grid-Powered Pump',
                  diesel_generator: 'Generator-Powered Pump',
                  mixed: 'Mixed Power Sources'
                };
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
                        <Text>{elecLabels[elecSrc] || elecSrc}</Text>
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
                const isChemicalEvent =
                  event.event_type === 2 ||
                  event.type === 'chemical' ||
                  ['FE', 'PE', 'FU', 'HE'].includes(event.type);
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
                const organicLabels: Record<string, string> = {
                  omri_listed: 'OMRI Listed',
                  usda_nop_approved: 'USDA NOP Approved',
                  organic_equivalent: 'Organic Approved',
                  organic_certified: 'Organic Approved',
                  transitional: 'Transitional',
                  yes: 'Organic Approved'
                };
                const hasOrganicStatus = serverInput?.status
                  ? serverInput.status === 'omri_listed' || serverInput.status === 'organic_approved'
                  : organicStatus &&
                    organicStatus !== 'not_organic' &&
                    organicStatus !== 'no' &&
                    organicStatus !== 'not_applicable';
                const organicChipText = serverInput?.label
                  ? serverInput.label
                  : organicLabels[organicStatus] || 'Organic';
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
                        label="This input is approved for organic farming by the listed certification body"
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
                        label="EPA restricted-use product, applied by a licensed applicator under state regulation"
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
                          Restricted use — licensed applicator
                        </Badge>
                      </Tooltip>
                    )}
                    {isChemicalEvent && !hasOrganicStatus && !isRestrictedUse && (
                      <Tooltip
                        label={
                          isUnclassified
                            ? 'A crop input documented by the farmer'
                            : 'A conventional crop input, fully documented by the farmer'
                        }
                        placement="top"
                      >
                        <Badge
                          variant="subtle"
                          colorScheme="gray"
                          fontSize="xs"
                          px={3}
                          py={1}
                          borderRadius="full"
                          cursor="pointer"
                        >
                          {isUnclassified ? 'Input documented' : 'Conventional input · documented'}
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
                      <Tooltip label={config.tooltip} placement="top">
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
                              id: `consumer.eventCard.tier.${config.level}`,
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
                  <HStack spacing={1}>
                    <Icon as={FaCheckCircle} aria-hidden="true" boxSize={3} color="green.500" />
                    <Text fontSize="sm" color="green.600" fontWeight="medium">
                      {intl.formatMessage(
                        { id: 'consumer.eventCard.performedBy', defaultMessage: 'Performed by: {name}' },
                        { name: maskPerformerName(event.performed_by) }
                      )}
                    </Text>
                  </HStack>
                )}
                {/* Consumer impact */}
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaShieldAlt} color={accentColor} boxSize={4} />
                    <Text fontWeight="semibold" fontSize="sm">
                      {intl.formatMessage({
                        id: 'consumer.eventCard.whatThisMeans',
                        defaultMessage: 'What This Means For You'
                      })}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={mutedColor} pl={6}>
                    {eventInfo.consumerImpact}
                  </Text>
                </Box>

                {/* Sustainability benefit */}
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaGlobeAmericas} color="blue.500" boxSize={4} />
                    <Text fontWeight="semibold" fontSize="sm">
                      {intl.formatMessage({
                        id: 'consumer.eventCard.envBenefit',
                        defaultMessage: 'Environmental Benefit'
                      })}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={mutedColor} pl={6}>
                    {eventInfo.sustainabilityBenefit}
                  </Text>
                </Box>

                {/* Sprint 5: Aggregate Event Summary Details */}
                {isSummaryEvent && (
                  <Box
                    p={4}
                    bg={summaryBg}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={summaryBorder}
                  >
                    <HStack mb={3}>
                      <Icon
                        as={FaLayerGroup}
                        color={
                          event.type === 'FE'
                            ? 'blue.500'
                            : event.type === 'FU'
                            ? 'purple.500'
                            : event.type === 'PE'
                            ? 'orange.500'
                            : event.type === 'SC'
                            ? 'green.500'
                            : event.type === 'HA'
                            ? 'yellow.600'
                            : 'gray.500'
                        }
                        boxSize={4}
                      />
                      <Text
                        fontWeight="bold"
                        fontSize="sm"
                        color={
                          event.type === 'FE'
                            ? 'blue.600'
                            : event.type === 'FU'
                            ? 'purple.600'
                            : event.type === 'PE'
                            ? 'orange.600'
                            : event.type === 'SC'
                            ? 'green.600'
                            : event.type === 'HA'
                            ? 'yellow.700'
                            : 'gray.600'
                        }
                      >
                        Aggregate Summary ({event.event_count || 'Multiple'}{' '}
                        {event.type === 'FE'
                          ? 'Applications'
                          : event.type === 'FU'
                          ? 'Applications'
                          : event.type === 'PE'
                          ? 'Applications'
                          : event.type === 'SC'
                          ? 'Scouting Trips'
                          : event.type === 'HA'
                          ? 'Harvests'
                          : 'Events'}
                        )
                      </Text>
                    </HStack>

                    <SimpleGrid columns={2} spacing={3}>
                      {/* Fertilizer aggregate totals */}
                      {event.type === 'FE' && (
                        <>
                          {(event.n_total_kg || event.extra_data?.n_total_kg) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Nitrogen (N)
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.n_total_kg || event.extra_data?.n_total_kg} kg
                              </Text>
                            </Box>
                          )}
                          {(event.p_total_kg || event.extra_data?.p_total_kg) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Phosphorus (P₂O₅)
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.p_total_kg || event.extra_data?.p_total_kg} kg
                              </Text>
                            </Box>
                          )}
                          {(event.k_total_kg || event.extra_data?.k_total_kg) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Potassium (K₂O)
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.k_total_kg || event.extra_data?.k_total_kg} kg
                              </Text>
                            </Box>
                          )}
                        </>
                      )}

                      {/* Fungicide/Pesticide aggregate totals */}
                      {(event.type === 'FU' || event.type === 'PE') && (
                        <>
                          {(event.active_ingredient_total_kg ||
                            event.extra_data?.active_ingredient_total_kg) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Active Ingredient
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
                      {event.type === 'HA' && (
                        <>
                          {(event.yield_total || event.extra_data?.yield_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Yield
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
                      {(event.type === 'FE' || event.type === 'FU' || event.type === 'PE') && (
                        <>
                          {(event.volume_total || event.extra_data?.volume_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                {['kg', 'lbs', 'oz'].includes(
                                  event.volume_total_unit ||
                                    event.extra_data?.volume_total_unit ||
                                    ''
                                )
                                  ? 'Total Amount Applied'
                                  : 'Total Volume Applied'}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.volume_total || event.extra_data?.volume_total}{' '}
                                {event.volume_total_unit ||
                                  event.extra_data?.volume_total_unit ||
                                  'gal'}
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
                                {event.volume_numeric ?? event.volume_applied}{' '}
                                {event.volume_unit || 'gal'}
                              </Text>
                            </Box>
                          )}
                          {(event.area_total || event.extra_data?.area_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Area Treated
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.area_total || event.extra_data?.area_total}{' '}
                                {event.area_total_unit || event.extra_data?.area_total_unit || 'ha'}
                              </Text>
                            </Box>
                          )}
                          {(event.fuel_consumption_total ||
                            event.extra_data?.fuel_consumption_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Fuel Consumed
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
                      {event.type === 'SC' && (
                        <>
                          {(event.field_area_total ||
                            event.area_covered_total ||
                            event.extra_data?.field_area_total ||
                            event.extra_data?.area_covered_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Area Scouted
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.field_area_total ||
                                  event.area_covered_total ||
                                  event.extra_data?.field_area_total ||
                                  event.extra_data?.area_covered_total}{' '}
                                {event.area_unit || event.extra_data?.area_unit || 'ha'}
                              </Text>
                            </Box>
                          )}
                          {(event.travel_distance_total ||
                            event.extra_data?.travel_distance_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Distance Traveled
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.travel_distance_total ||
                                  event.extra_data?.travel_distance_total}{' '}
                                {event.distance_unit || event.extra_data?.distance_unit || 'miles'}
                              </Text>
                            </Box>
                          )}
                          {(event.pest_species_observed ||
                            event.extra_data?.pest_species_observed) && (
                            <Box gridColumn={{ md: 'span 2' }}>
                              <Text fontSize="xs" color="gray.500">
                                Pest Species Observed
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
                                Average Pest Pressure
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
                                🌱 Zero Carbon Impact - Scouting is observational and helps reduce
                                chemical applications
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
                  <Box>
                    <HStack mb={3}>
                      <Icon as={FaRulerCombined} color="green.500" boxSize={4} />
                      <Text fontWeight="bold" fontSize="sm" color="green.500">
                        {intl.formatMessage({
                          id: 'consumer.eventCard.keyDetails',
                          defaultMessage: 'Key Details'
                        })}
                      </Text>
                    </HStack>
                    <SimpleGrid columns={2} spacing={3} pl={6}>
                      {fieldDisplay.immediate.map((field, idx) => {
                        const fuelIcon = getFuelIcon(field.label, event.fuel_type);
                        return (
                          <Box
                            key={idx}
                            p={3}
                            bg={greenSoftBg}
                            borderRadius="lg"
                            border="1px solid"
                            borderColor={greenBorder}
                          >
                            <HStack spacing={2} mb={1}>
                              {fuelIcon ? (
                                <Text fontSize="sm" color="green.600">
                                  {fuelIcon}
                                </Text>
                              ) : (
                                <Icon
                                  as={getCategoryIcon(field.category)}
                                  color="green.600"
                                  boxSize={3}
                                />
                              )}
                              <Text fontSize="xs" fontWeight="bold" color="green.700">
                                {field.label}
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color="green.800" fontWeight="medium">
                              {withUSUnits(field.value)}
                            </Text>
                          </Box>
                        );
                      })}
                    </SimpleGrid>
                  </Box>
                )}

                {/* Comprehensive Field Display - SECONDARY Priority Fields */}
                {fieldDisplay.secondary.length > 0 &&
                  (() => {
                    // Filter out observation — already shown verbatim as
                    // "Farmer's Field Notes" above. The registry filter (by field
                    // name) is primary; here we also drop any secondary field whose
                    // VALUE equals the shown observation. Value-matching is
                    // locale-proof and catches the legacy field path too — the old
                    // label-only check missed the localized "Observación" label.
                    const shownObservation = event.observation?.trim();
                    const filteredSecondary = fieldDisplay.secondary.filter((f) => {
                      const lbl = f.label.toLowerCase();
                      if (lbl === 'observation' || lbl === 'observations') return false;
                      if (shownObservation && String(f.value).trim() === shownObservation) return false;
                      return true;
                    });
                    if (filteredSecondary.length === 0) return null;
                    return (
                      <Box>
                        <HStack mb={3}>
                          <Icon as={FaInfoCircle} color="blue.500" boxSize={4} />
                          <Text fontWeight="semibold" fontSize="sm" color="blue.500">
                            {intl.formatMessage({
                              id: 'consumer.eventCard.additionalInfo',
                              defaultMessage: 'Additional Information'
                            })}
                          </Text>
                        </HStack>
                        <VStack align="stretch" spacing={2} pl={6}>
                          {filteredSecondary.map((field, idx) => {
                            const fuelIcon = getFuelIcon(field.label, event.fuel_type);
                            const isLongText = String(field.value).length > 40;
                            return isLongText ? (
                              <Box key={idx}>
                                <HStack spacing={2} mb={1}>
                                  {fuelIcon ? (
                                    <Text fontSize="sm" color="blue.600">
                                      {fuelIcon}
                                    </Text>
                                  ) : (
                                    <Icon
                                      as={getCategoryIcon(field.category)}
                                      color="blue.600"
                                      boxSize={3}
                                    />
                                  )}
                                  <Text fontSize="sm" fontWeight="medium" color="blue.700">
                                    {field.label}:
                                  </Text>
                                </HStack>
                                <Text fontSize="sm" color={mutedColor} pl={5}>
                                  {field.value}
                                </Text>
                              </Box>
                            ) : (
                              <HStack key={idx} justify="space-between" flexWrap="wrap">
                                <HStack spacing={2} minW="120px">
                                  {fuelIcon ? (
                                    <Text fontSize="sm" color="blue.600">
                                      {fuelIcon}
                                    </Text>
                                  ) : (
                                    <Icon
                                      as={getCategoryIcon(field.category)}
                                      color="blue.600"
                                      boxSize={3}
                                    />
                                  )}
                                  <Text fontSize="sm" fontWeight="medium" color="blue.700">
                                    {field.label}:
                                  </Text>
                                </HStack>
                                <Text fontSize="sm" color={mutedColor}>
                                  {field.value}
                                </Text>
                              </HStack>
                            );
                          })}
                        </VStack>
                      </Box>
                    );
                  })()}

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
                          Application Details
                        </Text>
                      </HStack>

                      {/* Modern grid layout for fields */}
                      <SimpleGrid columns={2} spacing={3} mb={4}>
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
                                Environmental Impact
                              </Text>
                              <Text fontSize="lg" fontWeight="bold" color="green.600">
                                {event.carbon_impact.toFixed(2)} kg CO₂e
                              </Text>
                              <Text fontSize="xs" color="green.600">
                                Carbon footprint data available for sustainability tracking
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
                      size="xs"
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
                          Technical Details ({dedupedDetails.length})
                        </Text>
                      </HStack>
                    </Button>
                    <Collapse in={showTechnical} animateOpacity>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2} pl={6} pt={2}>
                      {dedupedDetails.map((field, idx) => {
                        const fuelIcon = getFuelIcon(field.label, event.fuel_type);
                        return (
                          <HStack key={idx} spacing={2} align="baseline">
                            {fuelIcon ? (
                              <Text fontSize="xs" color="gray.500" flexShrink={0}>
                                {fuelIcon}
                              </Text>
                            ) : (
                              <Icon
                                as={getCategoryIcon(field.category)}
                                color="gray.400"
                                boxSize={3}
                                flexShrink={0}
                                mt={0.5}
                              />
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
                {photoVerification.hasPhotos && event.verification_level !== 'self_reported' && (
                  <Box>
                    <HStack spacing={2} mb={4}>
                      <Icon as={FaCamera} color="green.500" boxSize={{ base: 6, md: 5 }} />
                      <Text fontWeight="bold" fontSize={{ base: 'md', md: 'sm' }} color="green.500">
                        See This Farming Practice
                      </Text>
                    </HStack>

                    <VStack align="stretch" spacing={{ base: 4, md: 3 }} pl={{ base: 0, md: 6 }}>
                      {/* Use StandardImageGallery for consistent experience */}
                      <StandardImageGallery
                        images={
                          event.album?.images?.map((image) => ({
                            id: image.id,
                            image: image.image,
                            name: image.caption || `Photo from ${eventInfo.title}`,
                            description: image.created_at
                              ? `Taken on ${new Date(image.created_at).toLocaleDateString()}`
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

                      {/* Trust indicator */}
                      <Box
                        p={{ base: 3, md: 2 }}
                        bg={neutralSoftBg}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={neutralBorder}
                      >
                        <HStack spacing={{ base: 3, md: 2 }}>
                          <Icon as={FaShieldAlt} boxSize={{ base: 5, md: 4 }} color="green.500" />
                          <VStack align="start" spacing={0} flex={1}>
                            {/* Claim-safe wording (2026-06): "Photo Verification:
                                Excellent" implied independent practice verification;
                                it's an automated content check. Binary, no grades. */}
                            <Text
                              fontSize={{ base: 'sm', md: 'xs' }}
                              fontWeight="semibold"
                              color="gray.700"
                            >
                              Farmer-provided photos
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              {photoVerification.photoCount} photo
                              {photoVerification.photoCount > 1 ? 's' : ''}, AI-checked for
                              authenticity
                            </Text>
                          </VStack>
                        </HStack>
                      </Box>
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
