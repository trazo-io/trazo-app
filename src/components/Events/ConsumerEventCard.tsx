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
  Link,
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
  FaExternalLinkAlt,
  FaCertificate,
  FaEye,
  FaClock,
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
import { MdEco, MdSecurity, MdOpenInNew } from 'react-icons/md';
import {
  getConsumerEventDescription,
  formatEventDate,
  getSustainabilityImpact,
  getEventTrustIndicators
} from 'utils/eventDescriptions';
import {
  getEventFieldDisplay,
  type EventFieldDisplay,
  type FieldDisplayItem
} from 'utils/fieldDisplayUtils';
import {
  getVerificationBadgeConfig,
  getVerificationColor,
  type VerificationLevel
} from 'utils/verificationTierHelpers';
import { getImpactLevel } from 'utils/carbonDisplayUtils';
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
  isExpanded: controlledExpanded,
  onToggleExpand,
  productionBlockchain
}) => {
  const intl = useIntl();
  const [internalExpanded, setInternalExpanded] = useState(false);
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
  const eventInfo = getConsumerEventDescription(event.description, event);

  const sustainabilityLevel = getSustainabilityImpact(event.description, event);
  // Use shared getImpactLevel for consistent terminology when carbon data is available
  // FIX: Include carbon_impact === 0 so zero-emission events show "None" instead of "LOW IMPACT"
  const carbonImpactLevel = typeof event.carbon_impact === 'number'
    ? getImpactLevel(event.carbon_impact)
    : null;
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
  const displayDate =
    isSummaryEvent && event.date_start && event.date_end
      ? formatDateRange(event.date_start, event.date_end)
      : formattedDate;

  // Get comprehensive field display data based on field display matrix
  const fieldDisplay = getEventFieldDisplay(event);

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
    explorerUrl: productionBlockchain?.tx_hash ? `${explorerBase}/tx/${productionBlockchain.tx_hash}` : '',
    network: productionBlockchain?.network || 'polygon'
  };

  // Photo verification processing (MVP Photo Verification: Use Vision API validation)
  const photoVerification = {
    hasPhotos:
      Boolean(event.album?.images?.length) ||
      (event.type === 'production' && (event.photo_count ?? 0) > 0),
    photoCount: event.album?.images?.length || 0,
    isPhotoVerified: Boolean(event.album?.images?.length && event.album.images?.length >= 1),
    verificationLevel: (() => {
      // MVP Photo Verification: Use the Vision API-validated verification_level
      // Maps tiered verification to visual strength levels
      const verificationLevel = event.verification_level || 'self_reported';
      switch (verificationLevel) {
        case 'certified':
          return 'strong'; // 100% trust - blockchain certified
        case 'data_verified':
          return 'strong'; // 85% trust - auto-verified (weather, equipment)
        case 'photo_verified':
          return 'strong'; // 80% trust - 2+ photos with GPS/timestamp
        case 'photo_documented':
          return 'moderate'; // 65% trust - 1+ photo verified by Vision API
        case 'self_reported':
        default:
          return 'none'; // 50% trust - no photo evidence
      }
    })(),
    trustMessage: (() => {
      // MVP Photo Verification: Use Vision API validation tier descriptions
      const verificationLevel = event.verification_level || 'self_reported';
      const photoCount = event.album?.images?.length || 0;

      switch (verificationLevel) {
        case 'certified':
          return `Blockchain certified (${photoCount} verified image${
            photoCount !== 1 ? 's' : ''
          })`;
        case 'data_verified':
          return 'Cross-referenced (Weather/Equipment data)';
        case 'photo_verified':
          return `Photo verified (${photoCount} verified image${photoCount !== 1 ? 's' : ''})`;
        case 'photo_documented':
          return `Photo documented (${photoCount} verified image${
            photoCount !== 1 ? 's' : ''
          } - AI validated)`;
        case 'self_reported':
        default:
          return 'Text documentation only (no photos)';
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
      case 0: return { icon: FaCloudRain, color: 'blue.500' };
      case 1: return { icon: FaSeedling, color: 'green.500' };
      case 2: return { icon: FaFlask, color: 'orange.500' };
      case 3: return { icon: FaClipboardList, color: 'gray.500' };
      case 4: return { icon: FaTractor, color: 'blue.700' };
      case 5: return { icon: FaLayerGroup, color: 'yellow.700' };
      case 6: return { icon: FaBug, color: 'red.500' };
      case 7: return { icon: FaCertificate, color: 'teal.500' };
      default: return { icon: FaSeedling, color: 'green.500' };
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

  // Sustainability colors: high CO₂e = concern (orange), low = good (green)
  const sustainabilityColors = {
    high: 'orange',
    medium: 'yellow',
    low: 'green'
  };

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

      <HStack align="flex-start" spacing={{ base: 0, md: isGrouped ? 0 : 4 }} position="relative" zIndex={1}>
        {/* Timeline dot - DESKTOP ONLY, hidden when inside a group */}
        <Flex direction="column" align="center" minW="40px" display={{ base: 'none', md: isGrouped ? 'none' : 'flex' }}>
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
                isFirst ? 'white' : verificationLevel === 'ultimate' ? 'green.500' : eventTypeConfig.color
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

          {/* Verification confidence indicator */}
          {blockchainData.confidence > 0 && (
            <Text fontSize="xs" color="gray.500" mt={1} textAlign="center">
              {blockchainData.confidence}% verified
            </Text>
          )}
        </Flex>

        {/* Event card - Full width on mobile */}
        <Box
          flex="1"
          w={{ base: 'full', md: 'auto' }}
          bg={bgColor}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={borderColor}
          overflow="hidden"
          transition="all 0.2s"
          _hover={{ shadow: 'md', transform: 'translateY(-1px)' }}
          mb={{ base: 4, md: 0 }}
        >
          {/* Mobile-Optimized Card Header */}
          <Box p={{ base: 4, md: 4 }}>
            <HStack justify="space-between" align="flex-start" mb={2}>
              <VStack align="start" spacing={1} flex="1">
                <HStack spacing={2} flexWrap="wrap">
                  <Text
                    fontSize={{ base: 'md', md: 'lg' }}
                    fontWeight="bold"
                    color={useColorModeValue('gray.800', 'white')}
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
                      <Icon as={FaLayerGroup} boxSize={2.5} />
                      <Text>
                        {event.event_count || 'Multiple'}{' '}
                        {event.type === 'FE'
                          ? 'Fertilizer Apps'
                          : event.type === 'FU'
                          ? 'Fungicide Apps'
                          : event.type === 'PE'
                          ? 'Pesticide Apps'
                          : event.type === 'SC'
                          ? 'Scouting Trips'
                          : 'Events'}
                      </Text>
                    </Badge>
                  )}
                </HStack>
                {/* Sprint 4: Show date range for summaries, single date for regular events */}
                <HStack spacing={1}>
                  {isSummaryEvent && <Icon as={FaCalendarAlt} boxSize={3} color={mutedColor} />}
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color={mutedColor}>
                    {displayDate}
                  </Text>
                </HStack>
                {/* Sprint 1 Epic 1.4: USDA GAP Traceability - Show who performed the activity */}
                {event.performed_by && (
                  <HStack spacing={1}>
                    <Icon as={FaCheckCircle} boxSize={3} color="green.500" />
                    <Text fontSize={{ base: 'xs', md: 'sm' }} color="green.600" fontWeight="medium">
                      Performed by: {event.performed_by}
                    </Text>
                  </HStack>
                )}
              </VStack>

              {/* Sustainability badge - uses shared getImpactLevel when carbon data available */}
              <Badge
                colorScheme={carbonImpactLevel ? carbonImpactLevel.color : sustainabilityColors[sustainabilityLevel]}
                fontSize="xs"
                px={2}
                py={1}
                borderRadius="full"
              >
                <HStack spacing={1}>
                  <Icon as={MdEco} boxSize={3} />
                  <Text>{carbonImpactLevel ? intl.formatMessage({ id: carbonImpactLevel.level }) : sustainabilityLevel === 'high' ? intl.formatMessage({ id: 'carbon.activityLevel.corePractice' }) : sustainabilityLevel === 'medium' ? intl.formatMessage({ id: 'carbon.activityLevel.standardActivity' }) : intl.formatMessage({ id: 'transparency.supplementary' })}</Text>
                </HStack>
              </Badge>
            </HStack>

            {/* Mobile-Optimized Short Description */}
            <VStack spacing={3} align="stretch" mb={{ base: 4, md: 3 }}>
              <Text
                fontSize={{ base: 'md', md: 'md' }}
                color={useColorModeValue('gray.700', 'gray.300')}
                lineHeight={{ base: '1.6', md: '1.5' }}
              >
                {eventInfo.shortDescription}
              </Text>

              {/* 🌱 TRANSPARENCY-FIRST: Show farmer's actual field notes from observation field only.
                  description contains system-generated text (template names, etc.) and must NOT
                  be shown as "Farmer's Field Notes" — that would be dishonest to consumers. */}
              {event.observation && event.observation.trim() && (
                <Box
                  bg={useColorModeValue('green.50', 'green.900')}
                  border="1px solid"
                  borderColor={useColorModeValue('green.200', 'green.700')}
                  borderRadius="md"
                  p={3}
                >
                  <HStack spacing={2} mb={2}>
                    <Icon as={FaEye} boxSize={3} color="green.500" />
                    <Text fontSize="xs" fontWeight="semibold" color="green.600">
                      Farmer's Field Notes
                    </Text>
                  </HStack>
                  <Text
                    fontSize="sm"
                    color={useColorModeValue('green.800', 'green.100')}
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
                        <Icon as={FaCheckCircle} boxSize={3} />
                        <Text>{indicator}</Text>
                      </HStack>
                    </Badge>
                  ))}
                </HStack>
              )}
              {/* Phase 3: Electricity source trust badge for IR events — solar/wind shown as green trust indicator */}
              {(() => {
                const elecSrc = event.electricity_source ?? (event as any).extra_data?.electricity_source;
                if (!elecSrc) return null;
                const isSustainable = elecSrc === 'solar' || elecSrc === 'wind';
                const elecLabels: Record<string, string> = { solar: 'Solar-Powered Pump', wind: 'Wind-Powered Pump', grid: 'Grid-Powered Pump', diesel_generator: 'Generator-Powered Pump', mixed: 'Mixed Power Sources' };
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
                        <Icon as={isSustainable ? FaWind : FaCheckCircle} boxSize={3} />
                        <Text>{elecLabels[elecSrc] || elecSrc}</Text>
                      </HStack>
                    </Badge>
                  </HStack>
                );
              })()}

              {/* Removed redundant photo verification badge - photos are already mentioned in description and shown in gallery */}

              {/* Enhanced verification badges row */}
              <HStack spacing={2} flexWrap="wrap">
                {/* Blockchain secured badge — production-level verification covers this event */}
                {blockchainData.verified && (
                  <Tooltip
                    label="This event is part of a blockchain-secured production record"
                    placement="top"
                  >
                    <Badge
                      colorScheme="blue"
                      variant="solid"
                      fontSize="xs"
                      px={3}
                      py={1}
                      borderRadius="full"
                      cursor="pointer"
                    >
                      <HStack spacing={1}>
                        <Icon as={FaShieldAlt} boxSize={3} />
                        <Text>BLOCKCHAIN-RECORDED</Text>
                      </HStack>
                    </Badge>
                  </Tooltip>
                )}

                {/* USDA verification badge - REMOVED to avoid duplication with EnhancedTrustIndicators */}
                {/* USDA verification is already shown in the product header via EnhancedTrustIndicators */}

                {/* MVP Photo Verification: Tiered verification badge */}
                {event.verification_level &&
                  (() => {
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
                          <Icon as={config.icon} boxSize={3} />
                          <Text>{config.label}</Text>
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

                {/* High integrity score badge */}
                {blockchainData.integrityScore >= 95 && (
                  <Tooltip
                    label={`Data integrity score: ${blockchainData.integrityScore}%. This indicates extremely high data quality and trustworthiness.`}
                    placement="top"
                  >
                    <Badge
                      colorScheme="purple"
                      variant="solid"
                      fontSize="xs"
                      px={3}
                      py={1}
                      borderRadius="full"
                    >
                      <HStack spacing={1}>
                        <Icon as={FaShieldAlt} boxSize={3} />
                        <Text>HIGH INTEGRITY ({blockchainData.integrityScore}%)</Text>
                      </HStack>
                    </Badge>
                  </Tooltip>
                )}

                {/* Ultimate verification indicator */}
                {verificationLevel === 'ultimate' && (
                  <Badge
                    colorScheme="gold"
                    variant="solid"
                    fontSize="xs"
                    px={3}
                    py={1}
                    borderRadius="full"
                    bg="linear-gradient(45deg, #FFD700, #FFA500)"
                    color="white"
                  >
                    <HStack spacing={1}>
                      <Icon as={MdSecurity} boxSize={3} />
                      <Text fontWeight="bold">ULTIMATE TRUST</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
            </VStack>

            {/* Mobile-Optimized Expand Button */}
            <Button
              size={{ base: 'md', md: 'sm' }}
              variant="ghost"
              colorScheme="green"
              onClick={toggleExpand}
              rightIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              _hover={{ bg: highlightBg }}
              w={{ base: 'full', md: 'auto' }}
              justifyContent={{ base: 'space-between', md: 'flex-start' }}
              minH={{ base: '44px', md: 'auto' }}
              fontSize={{ base: 'md', md: 'sm' }}
              fontWeight="semibold"
            >
              {isExpanded ? 'Show Less Details' : 'See More Details'}
            </Button>
          </Box>

          {/* Expanded content */}
          <Collapse in={isExpanded}>
            <Divider />
            <Box p={{ base: 3, md: 4 }} bg={cardBg}>
              <VStack align="start" spacing={3}>
                {/* Consumer impact */}
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaShieldAlt} color={accentColor} boxSize={4} />
                    <Text fontWeight="semibold" fontSize="sm">
                      What This Means For You
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
                      Environmental Benefit
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
                    bg={useColorModeValue(
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
                    )}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={useColorModeValue(
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
                    )}
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
                                {Number(event.yield_total || event.extra_data?.yield_total).toLocaleString()}{' '}
                                {event.yield_total_unit || event.extra_data?.yield_total_unit || 'lbs'}
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
                                {['kg', 'lbs', 'oz'].includes(event.volume_total_unit || event.extra_data?.volume_total_unit || '') ? 'Total Amount Applied' : 'Total Volume Applied'}
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
                                {['kg', 'lbs', 'oz'].includes(event.volume_unit) ? 'Amount Applied' : 'Volume Applied'}
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
                          {(event.field_area_total || event.area_covered_total || event.extra_data?.field_area_total || event.extra_data?.area_covered_total) && (
                            <Box>
                              <Text fontSize="xs" color="gray.500">
                                Total Area Scouted
                              </Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {event.field_area_total || event.area_covered_total || event.extra_data?.field_area_total || event.extra_data?.area_covered_total}{' '}
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
                        Key Details
                      </Text>
                    </HStack>
                    <SimpleGrid columns={2} spacing={3} pl={6}>
                      {fieldDisplay.immediate.map((field, idx) => {
                        const fuelIcon = getFuelIcon(field.label, event.fuel_type);
                        return (
                          <Box
                            key={idx}
                            p={3}
                            bg={useColorModeValue('green.50', 'green.900')}
                            borderRadius="lg"
                            border="1px solid"
                            borderColor={useColorModeValue('green.200', 'green.700')}
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
                              {field.value}
                            </Text>
                          </Box>
                        );
                      })}
                    </SimpleGrid>
                  </Box>
                )}

                {/* Comprehensive Field Display - SECONDARY Priority Fields */}
                {fieldDisplay.secondary.length > 0 && (
                  <Box>
                    <HStack mb={3}>
                      <Icon as={FaInfoCircle} color="blue.500" boxSize={4} />
                      <Text fontWeight="semibold" fontSize="sm" color="blue.500">
                        Additional Information
                      </Text>
                    </HStack>
                    <VStack align="stretch" spacing={2} pl={6}>
                      {fieldDisplay.secondary.map((field, idx) => {
                        const fuelIcon = getFuelIcon(field.label, event.fuel_type);
                        return (
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
                            <Text fontSize="sm" color={mutedColor} flex="1" textAlign="right">
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
                                {field.value}
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

                {/* Comprehensive Field Display - DETAILS Priority Fields */}
                {fieldDisplay.details.length > 0 && (
                  <Box>
                    <HStack mb={3}>
                      <Icon as={FaEye} color="gray.500" boxSize={4} />
                      <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                        Technical Details
                      </Text>
                    </HStack>
                    <VStack align="stretch" spacing={1} pl={6}>
                      {fieldDisplay.details.map((field, idx) => {
                        const fuelIcon = getFuelIcon(field.label, event.fuel_type);
                        return (
                          <HStack key={idx} justify="space-between" flexWrap="wrap">
                            <HStack spacing={2} minW="120px">
                              {fuelIcon ? (
                                <Text fontSize="xs" color="gray.500">
                                  {fuelIcon}
                                </Text>
                              ) : (
                                <Icon
                                  as={getCategoryIcon(field.category)}
                                  color="gray.500"
                                  boxSize={3}
                                />
                              )}
                              <Text fontSize="xs" color="gray.600">
                                {field.label}:
                              </Text>
                            </HStack>
                            <Text fontSize="xs" color={mutedColor} flex="1" textAlign="right">
                              {field.value}
                            </Text>
                          </HStack>
                        );
                      })}
                    </VStack>
                  </Box>
                )}

                {/* Blockchain Security Section — production-level record */}
                {blockchainData.verified && (
                  <Box>
                    <HStack mb={3}>
                      <Icon as={MdSecurity} color="blue.500" boxSize={5} />
                      <Text fontWeight="bold" fontSize="sm" color="blue.500">
                        Blockchain Security
                      </Text>
                    </HStack>

                    <VStack align="stretch" spacing={3} pl={6}>
                      {/* Transaction details */}
                      {blockchainData.transaction && (
                        <Box>
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="sm" fontWeight="semibold">
                              Production Record
                            </Text>
                            <Link
                              href={blockchainData.explorerUrl}
                              isExternal
                              color="blue.500"
                              fontSize="sm"
                              fontWeight="medium"
                              _hover={{ color: 'blue.600' }}
                            >
                              <HStack spacing={1}>
                                <Icon as={FaEye} boxSize={3} />
                                <Text>View on Explorer</Text>
                                <Icon as={MdOpenInNew} boxSize={3} />
                              </HStack>
                            </Link>
                          </HStack>

                          <VStack align="start" spacing={1}>
                            <Text fontSize="xs" color={mutedColor}>
                              Transaction ID: {blockchainData.transaction.slice(0, 20)}...
                            </Text>
                            {blockchainData.blockNumber > 0 && (
                              <Text fontSize="xs" color={mutedColor}>
                                Block Number: #{blockchainData.blockNumber.toLocaleString()}
                              </Text>
                            )}
                            {blockchainData.timestamp && (
                              <HStack>
                                <Icon as={FaClock} boxSize={3} color="gray.500" />
                                <Text fontSize="xs" color={mutedColor}>
                                  Verified:{' '}
                                  {new Date(blockchainData.timestamp).toLocaleDateString()}
                                </Text>
                              </HStack>
                            )}
                          </VStack>
                        </Box>
                      )}

                      {/* Data integrity score */}
                      {blockchainData.integrityScore > 0 && (
                        <Box
                          p={2}
                          bg={useColorModeValue('green.50', 'green.900')}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={useColorModeValue('green.200', 'green.700')}
                        >
                          <HStack justify="space-between">
                            <HStack>
                              <Icon as={FaShieldAlt} color="green.500" boxSize={4} />
                              <Text fontSize="sm" fontWeight="medium" color="green.600">
                                Documentation Completeness
                              </Text>
                            </HStack>
                            <Badge colorScheme="green" variant="solid">
                              {blockchainData.integrityScore}%
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color="green.600" mt={1}>
                            Measures data completeness of documented practices
                          </Text>
                        </Box>
                      )}

                      {/* Network information */}
                      <HStack spacing={3} fontSize="xs" color={mutedColor}>
                        <HStack>
                          <Icon as={FaInfoCircle} boxSize={3} />
                          <Text>Network: {blockchainData.network === 'polygon' ? 'Polygon' : blockchainData.network === 'polygon_amoy' ? 'Polygon Testnet' : 'Polygon'}</Text>
                        </HStack>
                        <HStack>
                          <Icon as={FaShieldAlt} boxSize={3} />
                          <Text>Tamper-Proof Record</Text>
                        </HStack>
                      </HStack>
                    </VStack>
                  </Box>
                )}

                {/* Photo Gallery using StandardImageGallery */}
                {/* MVP Photo Verification: Only show photos if they passed Vision API validation */}
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
                            name: image.caption || `Farm photo`,
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
                        bg={useColorModeValue('gray.50', 'gray.800')}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={useColorModeValue('gray.200', 'gray.700')}
                      >
                        <HStack spacing={{ base: 3, md: 2 }}>
                          <Icon as={FaShieldAlt} boxSize={{ base: 5, md: 4 }} color="green.500" />
                          <VStack align="start" spacing={0} flex={1}>
                            <Text
                              fontSize={{ base: 'sm', md: 'xs' }}
                              fontWeight="semibold"
                              color="gray.700"
                            >
                              Photo Verification:{' '}
                              {photoVerification.verificationLevel === 'strong'
                                ? 'Excellent'
                                : 'Good'}
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              {photoVerification.photoCount} verified photo
                              {photoVerification.photoCount > 1 ? 's' : ''} from the farm
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
