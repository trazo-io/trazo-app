import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Circle,
  Collapse,
  Heading,
  useColorModeValue,
  Flex,
  Stack,
  useBreakpointValue,
  Divider,
  Tooltip,
  StatGroup,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  SimpleGrid,
  Image,
  AspectRatio
} from '@chakra-ui/react';
import EnhancedEventDetailModal from 'components/Events/EnhancedEventDetailModal';
import {
  FaWater,
  FaBolt,
  FaSeedling,
  FaLeaf,
  FaTractor,
  FaChevronDown,
  FaChevronUp,
  FaCalendarAlt,
  FaCertificate,
  FaFlask,
  FaShieldAlt,
  FaRecycle,
  FaGlobeAmericas,
  FaDollarSign,
  FaCheckCircle,
  FaExclamationCircle,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaBalanceScale,
  FaBug,
  FaClipboard,
  FaCloudRain,
  FaTint,
  FaClipboardList,
  FaLayerGroup
} from 'react-icons/fa';
import { MdTimeline, MdAgriculture } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { buyerPageWithheldReasonId } from 'utils/consumerDisplay';
import { useParams, useSearchParams } from 'react-router-dom';

// Anchor the viewport at the journey section. Two-stage on purpose: the view
// switch suspends/reloads content ABOVE the journey (carbon explainer chunk,
// photo gallery images), so a single immediate scroll lands correctly and is
// then pushed ~1700px off as that content settles. The second pass re-anchors
// after the layout has stabilized.
const anchorJourneySection = () => {
  const anchor = () =>
    document
      .querySelector('[data-journey-root]')
      ?.scrollIntoView({ behavior: 'auto', block: 'start' });
  anchor();
  setTimeout(anchor, 350);
  setTimeout(() => {
    document
      .querySelector('[data-journey-root]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 700);
};
import { format, parseISO } from 'date-fns';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { ConsumerEventCard } from 'components/Events/ConsumerEventCard';
import { STATUS_TONE_TOKENS } from 'components/Design/StandardComponents';
import { getConsumerEventDescription, localizeConsumerDescription } from 'utils/eventDescriptions';
import { PhotoDocumentationTooltip } from 'components/Education/EducationalTooltip';
import type { VerificationLevel } from 'utils/verificationTierHelpers';

// Buyer documentation CTA — proof view only, lazy so the story view (the
// default consumer landing) doesn't pay for the form chunk.
const BuyerDocRequestCTA = React.lazy(
  () => import('components/BuyerDocRequest/BuyerDocRequestCTA')
);

// The buyer-docs endpoint only accepts the production PUBLIC UUID, so the id
// handed to the CTA still has to be shape-checked.
//
// ⚠️ UUID shape is NOT an audience test and never was. This guard used to be
// the ONLY thing keeping the buyer surfaces off the producer dashboard, on the
// belief that "the farmer dashboard route reuses the same param name for the
// internal numeric id". It does not: HistoryCard navigates to
// /admin/dashboard/farm/:farmId/parcel/:parcelId/production/<public_id>, so the
// regex passed and both buyer CTAs rendered inside the producer's own
// Production Profile. Audience is now an explicit prop — see `audience` below.
const PUBLIC_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AlbumImage {
  id: number;
  image: string;
  caption: string;
  created_at: string;
}

interface Album {
  id: number;
  images: AlbumImage[];
}

interface CarbonCalculation {
  co2e: number;
  efficiency_score: number;
  usda_factors_used: boolean;
  calculation_method?: string;
  verification_confidence?: 'high' | 'medium' | 'low';
  cost_analysis?: {
    estimated_cost: number;
    cost_per_co2e: number;
  };
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  observation?: string;
  date: string;
  certified: boolean;
  index?: number;
  volume?: string;
  concentration?: string;
  area?: string;
  equipment?: string;
  // NEW ACTIVITY FIELDS for complete transparency
  activity_type?: string;
  activity_name?: string;
  duration?: string;
  people_involved?: number;
  carbon_data?: CarbonCalculation;
  blockchain_verified?: boolean;
  blockchain_transaction?: string;
  blockchain_block_number?: number;
  blockchain_explorer_url?: string;
  blockchain_network?: string;
  verification_confidence?: number;
  verification_timestamp?: string;
  data_integrity_score?: number;
  usda_factors_used?: boolean;
  /** What the record contains, from the server. See `utils/verificationTierHelpers.ts`. */
  verification_level?: VerificationLevel;
  extra_data?: {
    blockchain_verified?: boolean;
    blockchain_transaction?: string;
    blockchain_block_number?: number;
    verification_confidence?: number;
    verification_timestamp?: string;
    data_integrity_score?: number;
    [key: string]: any;
  };
  album?: Album;
}

interface UltraMobileProductionJourneyProps {
  events: TimelineEvent[];
  /**
   * WHO is reading this journey. REQUIRED — no default, because a default is
   * what silently put the buyer CTAs on the farmer's own dashboard.
   *
   * - `'consumer'` — the public product page (consumer.<host>/production/:uuid).
   *   Buyer-facing conversion surfaces render.
   * - `'producer'` — the farmer's Production Profile, which mounts this
   *   component as a PREVIEW of the consumer journey. Surfaces that address a
   *   visiting buyer ("Buyer or retailer? …", the doc-request form) are
   *   suppressed: the farm is not its own buyer, and the producer's way to
   *   reach a buyer is the "Copy buyer link" action on ProfileProduction.
   */
  audience: 'consumer' | 'producer';
  /**
   * Producer-only: open the correction sheet for one event. Called with the event's REAL
   * database id and family code, which the payload carries as `record_id` / `event_type` for
   * the owner only (PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS).
   *
   * Absent on the consumer page, so no per-event tooling renders there.
   */
  onCorrectEvent?: (recordId: number, eventType: number) => void;
  /**
   * Producer surfaces: open the full field-by-field record (the detail modal with
   * buyer-page visibility marked). Receives the raw timeline event.
   */
  onViewEvent?: (event: any) => void;
  productionId?: string;
  /** Production-level blockchain verification data */
  productionBlockchain?: {
    tx_hash?: string;
    verified?: boolean;
    block_number?: number;
    network?: string;
  };
  /**
   * Backend-computed organic input summary (`standard_view.organic_summary`).
   * REQUIRED for the "All inputs organic-approved" chip: it is the same
   * classification that drives the certification narrative in ProductDetail,
   * derived from `claim_resolver.ORGANIC_APPROVED_VALUES` server-side. The chip
   * must never re-derive this locally — see the note on `allInputsOrganic` below.
   */
  organicSummary?: {
    has_input_data?: boolean;
    total_chemical_inputs?: number;
    organic_approved_inputs?: number;
    all_inputs_organic?: boolean;
  } | null;
}

export const UltraMobileProductionJourney: React.FC<UltraMobileProductionJourneyProps> = ({
  events,
  audience,
  onCorrectEvent,
  onViewEvent,
  productionId,
  // but no longer rendered — the numeric score left the stats strip 2026-06.
  productionBlockchain,
  organicSummary
}) => {
  const intl = useIntl();

  const [showAll, setShowAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const isMobile = useBreakpointValue({ base: true, md: false });
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleToggleShowAll = useCallback(() => {
    if (showAll) {
      setShowAll(false);
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      setShowAll(true);
    }
  }, [showAll]);

  // Event detail modal handlers
  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  // A getEfficiencyColor(score) helper used to live here, mapping a score to green/yellow/
  // orange. It was never called, and a colour scale keyed to a self-reported score grades the
  // farm just as surely as a number does — deleted 2026-07 rather than left for someone to
  // wire up. See src/views/Scan/__tests__/noScoreOnConsumer.test.ts.

  // Helper function to get verification confidence icon
  const getConfidenceIcon = (confidence?: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return FaCheckCircle;
      case 'medium':
        return FaEye;
      case 'low':
        return FaExclamationCircle;
      default:
        return FaShieldAlt;
    }
  };

  // Get event configuration based on type - Enhanced for all 7 event types
  const getEventConfig = (event: TimelineEvent) => {
    const type = event.type.toLowerCase();
    const description = event.description.toLowerCase();

    // 🚨 CRITICAL: Check event_type field FIRST - it's the source of truth from backend
    // If event_type_field is explicitly set (0, 1, 2, etc.), use it directly without checking description
    const eventTypeField = (event as any)?.event_type;
    if (
      eventTypeField !== undefined &&
      eventTypeField !== null &&
      typeof eventTypeField === 'number'
    ) {
      // Use event_type_field as the primary classifier
      switch (eventTypeField) {
        case 0: // Weather
          return {
            icon: FaCloudRain,
            category: 'Weather'
          };
        case 1: // Production
          return {
            icon: FaSeedling,
            category: 'Production'
          };
        case 2: // Chemical
          return {
            icon: FaFlask,
            category: 'Crop Inputs'
          };
        case 3: // General
          return {
            icon: FaClipboardList,
            category: 'Other Farm Activity'
          };
        case 4: // Equipment
          return {
            icon: FaTractor,
            category: 'Equipment'
          };
        case 5: // Soil Management
          return {
            icon: FaLayerGroup,
            category: 'Soil Management'
          };
        case 6: // Pest Management
          return {
            icon: FaBug,
            category: 'Pest Management'
          };
        case 7: // Business
          return {
            icon: FaCertificate,
            category: 'Business'
          };
      }
    }

    // ⚠️ FALLBACK: Only check type strings and description keywords if event_type_field is missing
    // This ensures descriptions like "wind" in transplanting events don't override explicit event_type

    // Weather Events - Check type string and type codes ONLY (not description, which has false positives)
    if (
      type === 'weather' || // String type check
      ['fr', 'dr', 'hl', 'ht', 'ts', 'hw', 'hh', 'lh'].includes(type) || // Weather type codes
      type.includes('weather')
    ) {
      return {
        icon: FaCloudRain,
        category: 'Weather'
      };
    }

    // Chemical Events (event_type: 2) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 2 || // Direct event_type check
      type === 'chemical' || // String type check
      ['fe', 'pe', 'fu', 'he'].includes(type) || // Chemical type codes
      type.includes('chemical') ||
      description.includes('fertilizer') ||
      description.includes('spray') ||
      description.includes('pesticide') ||
      description.includes('herbicide') ||
      description.includes('fungicide')
    ) {
      return {
        icon: FaFlask,
        category: 'Crop Inputs'
      };
    }

    // Production Events (event_type: 1) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 1 || // Direct event_type check
      type === 'production' || // String type check
      ['pl', 'ha', 'ir', 'pr', 'tr', 'cu', 'th', 'em'].includes(type) ||
      type.includes('production') ||
      description.includes('harvest') ||
      description.includes('planting') ||
      description.includes('bee') ||
      description.includes('irrigation') ||
      description.includes('pruning') ||
      description.includes('transplant') ||
      description.includes('cultivation') ||
      description.includes('thinning') ||
      description.includes('equipment maintenance')
    ) {
      return {
        icon: FaSeedling,
        category: 'Production'
      };
    }

    // Equipment Events (event_type: 4) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 4 || // Direct event_type check
      type === 'equipment' || // String type check
      ['mn', 're', 'ca', 'fc', 'bd', 'ei'].includes(type) || // Equipment type codes
      type.includes('equipment') ||
      description.includes('tractor') ||
      description.includes('machinery') ||
      description.includes('fuel') ||
      description.includes('maintenance') ||
      description.includes('repair') ||
      description.includes('calibration')
    ) {
      return {
        icon: FaTractor,
        category: 'Equipment'
      };
    }

    // Soil Management Events (event_type: 5) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 5 || // Direct event_type check
      type === 'soil_management' || // String type check
      type === 'soil' || // Alternative string type check
      ['st', 'pa', 'om', 'cc', 'ti', 'co'].includes(type) || // Soil type codes
      type.includes('soil') ||
      description.includes('soil') ||
      description.includes('organic matter') ||
      description.includes('carbon reserves') ||
      description.includes('amendment') ||
      description.includes('composting') ||
      description.includes('cover crop')
    ) {
      return {
        icon: FaSeedling,
        category: 'Soil Management'
      };
    }

    // Pest Management Events (event_type: 6) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 6 || // Direct event_type check
      type === 'pest_management' || // String type check
      type === 'pest' || // Alternative string type check
      ['sc', 'br', 'tm', 'pi', 'ta', 'ip'].includes(type) || // Pest type codes
      type.includes('pest') ||
      description.includes('pest') ||
      description.includes('beneficial') ||
      description.includes('scouting') ||
      description.includes('ipm') ||
      description.includes('monitoring')
    ) {
      return {
        icon: FaBug,
        category: 'Pest Management'
      };
    }

    // Business Events (event_type: 7) - Check event_type first, then type string, then type codes, then description
    if (
      (event as any)?.event_type === 7 || // Direct event_type check
      type === 'business' || // String type check
      ['ce', 'cm', 'in'].includes(type) || // Business type codes
      type.includes('business') ||
      description.includes('certification') ||
      description.includes('compliance') ||
      description.includes('audit') ||
      description.includes('inspection')
    ) {
      return {
        icon: FaCertificate,
        category: 'Business'
      };
    }

    // General Events (fallback)
    return {
      icon: FaClipboardList,
      category: 'General'
    };
  };

  // Sort and filter events
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() // Oldest first
  );

  const filteredEvents =
    selectedCategory === 'all'
      ? sortedEvents
      : sortedEvents.filter((event) => {
          const config = getEventConfig(event);
          return (
            config.category &&
            typeof config.category === 'string' &&
            config.category.toLowerCase() === selectedCategory.toLowerCase()
          );
        });

  // Group same-subtype events for cleaner consumer display
  // Events with 3+ of the same type get grouped into a summary card
  type EventGroup =
    | {
        kind: 'single';
        event: TimelineEvent;
      }
    | {
        kind: 'group';
        type: string;
        category: string;
        events: TimelineEvent[];
        dateRange: string;
      };

  const groupEvents = (evts: TimelineEvent[]): EventGroup[] => {
    if (evts.length === 0) return [];

    // Count events by type (using the subtype code like IR, PL, HA, etc.)
    const typeCounts: Record<string, TimelineEvent[]> = {};
    evts.forEach((event) => {
      const key = event.type || 'general';
      if (!typeCounts[key]) typeCounts[key] = [];
      typeCounts[key].push(event);
    });

    // Types that have 3+ events get grouped
    const groupableTypes = new Set(
      Object.entries(typeCounts)
        .filter(([, items]) => items.length >= 3)
        .map(([type]) => type)
    );

    const result: EventGroup[] = [];
    let i = 0;
    while (i < evts.length) {
      const event = evts[i];
      const eventType = event.type || 'general';

      if (groupableTypes.has(eventType)) {
        // Collect all consecutive events of this type
        const groupedEvents: TimelineEvent[] = [];
        // Collect ALL events of this type (not just consecutive)
        const allOfType = typeCounts[eventType];
        const config = getEventConfig(event);

        // Format date range
        const dates = allOfType
          .map((e) => new Date(e.date))
          .sort((a, b) => a.getTime() - b.getTime());
        const startMonth = dates[0].toLocaleDateString('en-US', { month: 'short' });
        const endMonth = dates[dates.length - 1].toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        });
        const dateRange = startMonth === endMonth ? endMonth : `${startMonth} - ${endMonth}`;

        // Only add group once (skip individual events of this type)
        if (!result.some((r) => r.kind === 'group' && r.type === eventType)) {
          result.push({
            kind: 'group',
            type: eventType,
            category: config.category,
            events: allOfType,
            dateRange
          });
        }
        i++;
      } else {
        result.push({ kind: 'single', event });
        i++;
      }
    }

    return result;
  };

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const toggleGroup = (type: string) => {
    setExpandedGroup((prev) => (prev === type ? null : type));
    setExpandedEventId(null);
  };

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const toggleEventExpand = (eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, 3);
  // Proof view is a FLAT chronological log — always. The old "5 Chemical
  // Events → Click to see all 5" summary groups required a second tap and
  // read as the audit UI the chapter redesign eliminated. groupEvents() is
  // retained only for potential producer-side reuse; the kind==='group'
  // render branch below is intentionally unreachable on this page.
  void groupEvents;
  const groupedDisplayEvents = (
    selectedCategory !== 'all' ? filteredEvents : showAll ? filteredEvents : displayedEvents
  ).map((event) => ({ kind: 'single' as const, event }));

  const categories = [
    'all',
    ...new Set(
      events
        .map((event) => getEventConfig(event).category)
        .filter((cat) => cat && typeof cat === 'string')
    )
  ];

  // ── Phase 2: consumer story chapters ─────────────────────────────────────
  // Default view groups the season into six shopper-meaningful chapters and
  // shows only highlight events; the complete chronological log (including
  // equipment/general events) lives in the proof view (?view=proof).
  // No market-leading consumer experience shows a raw 20-event audit log.
  const [searchParams, setSearchParams] = useSearchParams();
  const isProofView = searchParams.get('view') === 'proof';

  // Buyer-facing surfaces exist for a visitor of the PUBLIC record, not for the
  // farm looking at its own production.
  const isConsumerAudience = audience === 'consumer';

  // One builder for all three ConsumerEventCard call sites in this file, so a card cannot
  // acquire the affordance on one path and miss it on another. Returns undefined unless the
  // caller wired a handler AND the payload gave us a real id to act on — an event the owner
  // cannot address gets no button rather than a broken one.
  /**
   * Producer-audience visibility label. SSOT: CONSUMER_WITHHELD_PRODUCTION_SUBTYPES
   * (the mirror of the backend's event-level withhold). Every card in the producer
   * preview states which side of the buyer page it lives on, with the reason when
   * it is certifier-only — a withheld record must never be dressed as a consumer card.
   */
  const buildVisibilityBadge = (event: any) => {
    if (isConsumerAudience) return undefined;
    const reasonId = buyerPageWithheldReasonId(event ?? {});
    if (reasonId) {
      return (
        <Tooltip label={intl.formatMessage({ id: reasonId })} hasArrow placement="top">
          <Badge colorScheme="gray" variant="subtle" fontSize="11px" cursor="help">
            {intl.formatMessage({ id: 'producer.event.certifierOnlyBadge' })}
          </Badge>
        </Tooltip>
      );
    }
    return (
      <Badge colorScheme="green" variant="subtle" fontSize="11px">
        {intl.formatMessage({ id: 'producer.event.buyerPageBadge' })}
      </Badge>
    );
  };

  const buildProducerAction = (event: any) => {
    const recordId = event?.record_id;
    const eventType = event?.event_type;
    const hasIdentity = recordId && eventType !== undefined && eventType !== null;
    const viewButton =
      onViewEvent && hasIdentity ? (
        <Button
          size="xs"
          variant="link"
          colorScheme="gray"
          fontWeight="normal"
          onClick={(e) => {
            e.stopPropagation();
            onViewEvent(event);
          }}>
          {intl.formatMessage({ id: 'producer.event.viewFullRecord' })}
        </Button>
      ) : null;
    const correctButton =
      onCorrectEvent && hasIdentity ? (
        <Button
          size="xs"
          variant="link"
          colorScheme="gray"
          fontWeight="normal"
          onClick={(e) => {
            e.stopPropagation();
            onCorrectEvent(Number(recordId), Number(eventType));
          }}>
          {intl.formatMessage({ id: 'producer.event.correct' })}
        </Button>
      ) : null;
    if (!viewButton && !correctButton) return undefined;
    return (
      <HStack spacing={3}>
        {viewButton}
        {correctButton}
      </HStack>
    );
  };

  // Production public UUID for the buyer-docs CTA: prefer the prop, fall back
  // to the route param (the parent consumer page doesn't pass the prop).
  const { productionId: routeProductionId } = useParams();
  const resolvedProductionId = productionId || routeProductionId;
  const buyerDocProductionId =
    isConsumerAudience && resolvedProductionId && PUBLIC_UUID_RE.test(resolvedProductionId)
      ? resolvedProductionId
      : undefined;
  const openProofView = useCallback(
    (chapterKey?: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('view', 'proof');
          if (chapterKey) {
            next.set('cat', chapterKey);
          } else {
            next.delete('cat');
          }
          return next;
        },
        { replace: false }
      );
      setSelectedCategory('all');
      setShowAll(true); // "view the full record" means the full record — no second "Show All" tap
    },
    [setSearchParams]
  );
  const closeProofView = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('view');
        next.delete('cat');
        return next;
      },
      { replace: false }
    );
    setSelectedCategory('all');
    setShowAll(false);
    setTimeout(anchorJourneySection, 50);
  }, [setSearchParams]);

  // Keep filter state in sync with the URL (deep links, browser back/forward)
  // and anchor the viewport at the journey when entering the proof view. The
  // search-param navigation remounts this component, so the scroll must be
  // driven by the URL value here — a click-time scroll or prev-value ref dies
  // with the old instance and the browser keeps a meaningless absolute offset.
  const catParam = searchParams.get('cat');
  React.useEffect(() => {
    if (isProofView) {
      setSelectedCategory('all');
      setShowAll(true);
      anchorJourneySection();
    }
  }, [isProofView, catParam]);

  type ChapterKey = 'trust' | 'soil' | 'care' | 'inputs' | 'pest' | 'harvest';
  // A chapter is a KIND of work, not a status, so every chapter and category wears one neutral
  // tone and the icon + title tell them apart (2026-11-04). They used to carry a hue each: Pest
  // & Disease in RED, which reads as an alarm to a shopper looking at routine scouting, Crop
  // Inputs in orange (warning), Harvest in green (approval). On this page colour is reserved
  // for meaning and for actions: green marks a link or button, or the solid OMRI chip (a
  // third-party match). A category wears neither.
  // Guard: consumerJourneyColourIsMeaning.test.ts.
  const CHAPTER_DEFS: Array<{
    key: ChapterKey;
    icon: any;
    title: string;
    subtitle: string;
  }> = [
    {
      key: 'soil',
      icon: FaLayerGroup,
      title: intl.formatMessage({
        id: 'consumer.journey.chapterSoilTitle',
        defaultMessage: 'Soil & Planting'
      }),
      subtitle: intl.formatMessage({
        id: 'consumer.journey.chapterSoilSubtitle',
        defaultMessage: 'How the ground was prepared and planted'
      })
    },
    {
      // Droplet, NOT a rain cloud. A rain cloud is precipitation — water that
      // FELL — and this chapter is overwhelmingly water the grower APPLIED
      // (CARE_CODES: irrigation, pruning, cultivation, thinning, frost
      // protection, mowing). It also collided: FaCloudRain is the weather
      // event-card icon (see the getEventIcon fallbacks below and
      // eventTypeAppearance type 0), and WEATHER_CODES route INTO this
      // chapter, so the header wore the icon of one class of its own rows.
      // The title carries the "& Care" half; the icon carries the water half.
      key: 'care',
      icon: FaTint,
      title: intl.formatMessage({
        id: 'consumer.journey.chapterCareTitle',
        defaultMessage: 'Water & Care'
      }),
      subtitle: intl.formatMessage({
        id: 'consumer.journey.chapterCareSubtitle',
        defaultMessage: 'Irrigation and crop care through the season'
      })
    },
    {
      key: 'inputs',
      icon: FaFlask,
      title: intl.formatMessage({
        id: 'consumer.journey.chapterInputsTitle',
        defaultMessage: 'Crop Inputs'
      }),
      subtitle: intl.formatMessage({
        id: 'consumer.journey.chapterInputsSubtitle',
        defaultMessage: 'Every input applied to this crop'
      })
    },
    {
      key: 'pest',
      icon: FaBug,
      title: intl.formatMessage({
        id: 'consumer.journey.chapterPestTitle',
        defaultMessage: 'Pest & Disease'
      }),
      subtitle: intl.formatMessage({
        id: 'consumer.journey.chapterPestSubtitle',
        defaultMessage: 'Monitoring and pest management'
      })
    },
    {
      key: 'harvest',
      icon: FaSeedling,
      title: intl.formatMessage({
        id: 'consumer.journey.chapterHarvestTitle',
        defaultMessage: 'Harvest & Handling'
      }),
      subtitle: intl.formatMessage({
        id: 'consumer.journey.chapterHarvestSubtitle',
        defaultMessage: 'Picking, quality, and handling'
      })
    },
    {
      // Run 8 (R8-15): business events are what the FARM entered: a certificate it holds, an
      // inspection it reports, an OSP change notice it filed. This chapter used to be titled
      // "Independent checks on how this farm operates", led the page and carried a purple seal,
      // while its featured item was the grower's own notice. A confirmed third-party
      // certification is shown, database-gated, in the certification card above; here the
      // records are stated as the farm's, in neutral styling, after the crop's own story.
      key: 'trust',
      icon: FaClipboardList,
      title: intl.formatMessage({
        id: 'consumer.journey.chapterFarmRecordsTitle',
        defaultMessage: 'Certificates and filings the farm recorded'
      }),
      subtitle: intl.formatMessage({
        id: 'consumer.journey.chapterFarmRecordsSubtitle',
        defaultMessage:
          'Entered by the farm. Independent confirmation, where there is any, is shown with the certification above.'
      })
    }
  ];

  const PRODUCTION_SOIL_CODES = new Set(['PL', 'TR']);
  // FP (frost protection) and MO (mowing / orchard-floor) are in-season crop
  // care — without this they fall through getChapterKey to null and get
  // buried in the proof-only/operational bucket, invisible on the curated
  // consumer timeline (Batch 3, 2026-06).
  const CARE_CODES = new Set(['IR', 'PR', 'CU', 'TH', 'FP', 'MO']);
  const HARVEST_CODES = new Set(['HA', 'PO', 'PH', 'CM']);
  const WEATHER_CODES = new Set(['FR', 'DR', 'HL', 'TS', 'HW', 'HT', 'HH', 'LH']);
  // Mirrors the backend rule in PublicHistorySerializer._annotate_consumer_highlights;
  // used only as a fallback when the payload predates the is_highlight flag.
  // FP is always a highlight (frost events are infrequent and notable); MO is
  // first-occurrence only on the backend (mowing recurs) so it is not listed here.
  const HIGHLIGHT_ALWAYS = new Set([
    'PL',
    'HA',
    'FE',
    'PE',
    'FU',
    'HE',
    'CC',
    'OM',
    'PA',
    'TM',
    'BR',
    'PI',
    'FP'
  ]);

  const getChapterKey = (event: TimelineEvent): ChapterKey | null => {
    const t = (event as any).type as string;
    if (t === 'chemical') return 'inputs';
    if (t === 'soil_management') return 'soil';
    if (t === 'pest_management') return 'pest';
    if (t === 'business') return 'trust';
    // Equipment maintenance and general admin activity are operational records, not part
    // of the crop's story — proof view only.
    if (t === 'equipment' || t === 'general') return null;
    // Weather events are season context — they live with crop care.
    if (t === 'weather' || WEATHER_CODES.has(t)) return 'care';
    // The normalizer rewrites production events to type='production' and
    // keeps the subtype code (PL/HA/IR/…) in production_type; raw payloads
    // carry the code directly in type. Accept both.
    const code = t === 'production' ? ((event as any).production_type as string) : t;
    if (PRODUCTION_SOIL_CODES.has(code)) return 'soil';
    if (CARE_CODES.has(code)) return 'care';
    if (HARVEST_CODES.has(code)) return 'harvest';
    return null;
  };

  const isHighlightEvent = (event: TimelineEvent): boolean => {
    const flag = (event as any).is_highlight;
    if (typeof flag === 'boolean') return flag;
    const t = (event as any).type as string;
    if (t === 'chemical' || t === 'soil_management' || t === 'pest_management') return true;
    const code = t === 'production' ? ((event as any).production_type as string) : t;
    return HIGHLIGHT_ALWAYS.has(code);
  };

  const countEventPhotos = (event: TimelineEvent): number =>
    event.album?.images?.length ?? ((event as any).albums?.[0]?.images?.length || 0);

  /**
   * Client-side fallback for `verification_level` when the payload omits it.
   *
   * Deliberately tops out at 'photo_documented'. The server's higher tier
   * ('photo_verified') means GPS + timestamp corroboration, which a photo COUNT cannot
   * establish — inferring it here would manufacture a verification claim the data does not
   * support (compliance.md: "documented", never "verified", unless something third-party
   * says so). Under-claiming is the safe direction.
   */
  const derivePhotoTierLevel = (event: TimelineEvent): 'self_reported' | 'photo_documented' =>
    countEventPhotos(event) > 0 ? 'photo_documented' : 'self_reported';

  const chapterData = CHAPTER_DEFS.map((def) => {
    const chapterEvents = sortedEvents.filter((e) => getChapterKey(e) === def.key);
    const highlights = chapterEvents.filter(isHighlightEvent);
    const photoCount = chapterEvents.reduce((acc, e) => acc + countEventPhotos(e), 0);
    // FTC 16 CFR 260.6 / EU ECGT: this chip is an affirmative organic claim, so it
    // may ONLY come from the backend classification (`claim_resolver`), never from a
    // local scan of `organic_approved`.
    //
    // The previous implementation was `chapterEvents.every((e) => Boolean(e.organic_approved))`.
    // `organic_approved` is an ENUM STRING whose values include 'not_organic', and
    // `Boolean('not_organic') === true` — so a chapter of entirely conventional inputs
    // satisfied `every(...)` and the page rendered "All Inputs Organic-Approved" on a lot
    // where zero inputs were approved, directly contradicting the "{n} of {m} crop inputs
    // are OMRI/National List–approved" line the same page renders from organic_summary.
    //
    // Absence of a summary is NOT evidence of a negative — when it is missing we simply
    // render no chip rather than claiming or denying anything.
    const allInputsOrganic =
      def.key === 'inputs' &&
      chapterEvents.length > 0 &&
      organicSummary?.has_input_data === true &&
      organicSummary?.all_inputs_organic === true;
    return { ...def, events: chapterEvents, highlights, photoCount, allInputsOrganic };
  }).filter((ch) => ch.events.length > 0);

  const chapterEventTotal = chapterData.reduce((acc, ch) => acc + ch.events.length, 0);
  const proofOnlyCount = sortedEvents.length - chapterEventTotal;

  // Card budget (plan acceptance: ≤9 highlight cards by default on a
  // 20-event production). Every chapter shows at least one card; the
  // remaining budget goes to the chapters shoppers weigh most.
  const CARD_BUDGET = 9;
  // 'trust' leads: a third-party certification is the only non-self-reported claim on the
  // page, so extra budget goes there before anything the farmer asserts about themselves.
  // Run 8 (R8-15): the farm's own filings no longer outrank the crop's story.
  const CHAPTER_PRIORITY: ChapterKey[] = ['inputs', 'harvest', 'soil', 'pest', 'care', 'trust'];
  const visibleCountByChapter: Record<string, number> = {};
  let budgetLeft = CARD_BUDGET;
  chapterData.forEach((ch) => {
    const pool = ch.highlights.length > 0 ? ch.highlights.length : Math.min(ch.events.length, 1);
    visibleCountByChapter[ch.key] = Math.min(1, pool);
    budgetLeft -= visibleCountByChapter[ch.key];
  });
  let added = true;
  while (budgetLeft > 0 && added) {
    added = false;
    for (const key of CHAPTER_PRIORITY) {
      if (budgetLeft <= 0) break;
      const ch = chapterData.find((c) => c.key === key);
      if (!ch) continue;
      const pool = ch.highlights.length > 0 ? ch.highlights.length : Math.min(ch.events.length, 1);
      const current = visibleCountByChapter[key] ?? 0;
      if (current < Math.min(pool, 3)) {
        visibleCountByChapter[key] = current + 1;
        budgetLeft -= 1;
        added = true;
      }
    }
  }

  // "+N more" deep-links carry the CHAPTER key — "+2 more" on Water & Care
  // must show exactly that chapter's events, not dump the user into the
  // unfiltered grouped log (the bug this replaces). Chapter-filtered proof
  // view renders flat cards and hides the family filter chips.
  const proofChapter = isProofView
    ? chapterData.find((c) => c.key === (catParam as ChapterKey)) ?? null
    : null;
  const proofDisplayGroups = proofChapter
    ? proofChapter.events.map((event) => ({ kind: 'single' as const, event }))
    : groupedDisplayEvents;

  /**
   * Which cards in a rendered list would repeat an explanation another card already gave.
   *
   * WHY (2026-08-01 editorial review): consumer copy is written per SUBTYPE, so a farm that
   * logs three habitat events — raptor perches, nest blocks, an insectary strip — got three
   * cards reading the same two sentences verbatim, one under the other. Correct, and it looks
   * auto-generated, which is the one thing this page cannot afford.
   *
   * The explanation is a general truth about the practice, so it belongs on the first card
   * that needs it; the repeats keep their own title, date, facts, photos and the farmer's own
   * words — the parts that actually differ. Computed PER RENDERED LIST, not globally, so a
   * card is never stripped because of a sibling the reader cannot see (chapter filters and the
   * "+N more" deep link both render subsets).
   */
  const computeRepeatedCopy = (list: TimelineEvent[]) => {
    const seenImpact = new Set<string>();
    const seenShort = new Set<string>();
    const repeatImpact = new Set<string>();
    const repeatShort = new Set<string>();
    for (const ev of list) {
      let info: { shortDescription?: string; consumerImpact?: string };
      try {
        info = getConsumerEventDescription(ev.description ?? '', ev as never);
      } catch {
        continue;
      }
      const id = String(ev.id);
      const impact = (info.consumerImpact ?? '').trim();
      if (impact) {
        if (seenImpact.has(impact)) repeatImpact.add(id);
        else seenImpact.add(impact);
      }
      const short = (info.shortDescription ?? '').trim();
      if (short) {
        if (seenShort.has(short)) repeatShort.add(id);
        else seenShort.add(short);
      }
    }
    return { repeatImpact, repeatShort };
  };

  // Build enhanced event with blockchain verification, photo data, and transparency fields
  const buildEnhancedEvent = (event: TimelineEvent) => {
    const normalizedEventId = event.id.toString().includes('_')
      ? event.id.toString().split('_')[1]
      : event.id.toString();

    return {
      ...event,
      id: normalizedEventId,
      blockchain_verified:
        event.extra_data?.blockchain_verified || event.blockchain_verified || false,
      blockchain_transaction:
        event.extra_data?.blockchain_transaction || event.blockchain_transaction || '',
      blockchain_block_number:
        event.extra_data?.blockchain_block_number || event.blockchain_block_number || 0,
      verification_confidence:
        event.extra_data?.verification_confidence || event.verification_confidence || 0,
      verification_timestamp:
        event.extra_data?.verification_timestamp || event.verification_timestamp || '',
      data_integrity_score:
        event.extra_data?.data_integrity_score || event.data_integrity_score || 0,
      blockchain_network: event.blockchain_network || 'polygon_amoy',
      usda_factors_used:
        event.extra_data?.carbon_calculation?.usda_compliance || event.usda_factors_used || false,
      carbon_impact: event.extra_data?.carbon_calculation?.co2e || undefined,
      certified: event.certified || false,
      // Fall back to the photo count rather than a flat 'self_reported'. The server
      // computes this level (PublicHistorySerializer._get_verification_level_for_event);
      // when it is absent — older payloads, preview data — defaulting to 'self_reported'
      // understated events that plainly have photo evidence attached.
      verification_level: event.verification_level || derivePhotoTierLevel(event),
      // `photo_verified_count` used to be passed here and rendered as a bare "(3)" next to
      // the retired tier badge. The public payload calls the field `photo_documented_count`
      // (history/transparency_views.py) and a regression test asserts the old name is absent,
      // so this was reading `undefined` and passing 0. The card counts `album.images` itself.
      area_covered: event.area_covered,
      yield_quantity: event.yield_quantity,
      fuel_consumed: event.fuel_consumed,
      equipment_hours: event.equipment_hours,
      area_unit: event.area_unit,
      yield_unit: event.yield_unit,
      fuel_unit: event.fuel_unit,
      area_covered_numeric: event.area_covered_numeric,
      yield_quantity_numeric: event.yield_quantity_numeric,
      fuel_consumed_numeric: event.fuel_consumed_numeric,
      equipment_hours_numeric: event.equipment_hours_numeric,
      operation_type: event.operation_type,
      production_type: event.production_type,
      production_name: event.production_name,
      activity_type: event.activity_type,
      activity_name: event.activity_name,
      duration: event.duration,
      people_involved: event.people_involved,
      album: (() => {
        if (
          event.album &&
          event.album.images &&
          Array.isArray(event.album.images) &&
          event.album.images.length > 0
        ) {
          return {
            id: event.album.id ? event.album.id.toString() : 'album_' + normalizedEventId,
            images: event.album.images
              .filter((img: any) => img && (img.image || img.image_url))
              .map((img: any, index: number) => ({
                id: img.id ? img.id.toString() : `img_${index}`,
                image: img.image || img.image_url,
                caption: img.caption || `Image ${img.id || index + 1}`,
                created_at: img.created_at || new Date().toISOString()
              }))
          };
        }

        if (event.albums && Array.isArray(event.albums) && event.albums.length > 0) {
          const firstAlbum = event.albums[0];
          if (firstAlbum && firstAlbum.images && Array.isArray(firstAlbum.images)) {
            return {
              id: 'album_' + normalizedEventId,
              images: firstAlbum.images
                .filter((img: any) => img && (img.image || img.image_url))
                .map((img: any, index: number) => ({
                  id: img.id ? img.id.toString() : `img_${index}`,
                  image: img.image || img.image_url,
                  caption: img.caption || `Image ${img.id || index + 1}`,
                  created_at: img.created_at || new Date().toISOString()
                }))
            };
          }
          return {
            id: 'album_' + normalizedEventId,
            images: event.albums
              .filter((albumImage: any) => albumImage && (albumImage.image_url || albumImage.image))
              .map((albumImage: any, index: number) => ({
                id: albumImage.id ? albumImage.id.toString() : `album_${index}`,
                image: albumImage.image_url || albumImage.image,
                caption:
                  albumImage.title || albumImage.caption || `Image ${albumImage.id || index + 1}`,
                created_at: albumImage.created_at || new Date().toISOString()
              }))
          };
        }

        return undefined;
      })()
    };
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return {
        short: format(date, 'MMM dd'),
        time: format(date, 'h:mm a'),
        full: format(date, 'MMM dd, yyyy')
      };
    } catch (error) {
      return { short: 'Unknown', time: '', full: 'Date unknown' };
    }
  };

  // NEITHER view renders the custom <Card>.
  //
  // Story view could not: the production CSS fallback (trazo-dashboard-styles.css, a protected
  // file) forces `.trazo-card { background: white; padding: 14/22px } !important` on every
  // Card, so emotion props can never make it transparent. A plain Box carries no .trazo-card
  // class, which is what makes the chapters true top-level cards.
  //
  // Proof view kept the Card until 2026-08-02, and it was the one visible structural difference
  // left between the two: the same events sat inside a father card, giving three nesting levels
  // (journey > event > detail boxes) where story view had two. The wrapper carried no meaning —
  // the page already delimits the section, and "Back to story view" plus the filter chips
  // already signal the drilled-down state — while costing horizontal room that matters at
  // 375px. Same content, same container, in both views.
  const JourneyShell: React.ElementType = Box;
  const proofShellProps = {};

  return (
    <Box ref={sectionRef} data-journey-root scrollMarginTop="120px" overflow="hidden" w="100%">
      <JourneyShell {...proofShellProps}>
        <CardBody p={0} pb={0} bg="transparent" minW={0}>
          {/* Header — its own compact card in BOTH views. The chapters and events are
              siblings, not children, so the page background shows between them. It used to be
              bare in proof view because the father card supplied the surface; with that gone,
              the header carries its own. */}
          <VStack
            spacing={5}
            mb={4}
            minW={0}
            bg={bgColor}
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.200"
            p={{ base: 4, md: 5 }}>
            <VStack spacing={3} w="full" minW={0}>
              <HStack w="full" justify="space-between" align="start">
                <CardHeader pb={6}>
                  <HStack spacing={3}>
                    <Circle size="40px" bg="green.700" color="white">
                      <Icon as={MdTimeline} aria-hidden="true" boxSize={5} />
                    </Circle>
                    <VStack spacing={0} align="start">
                      <Heading size={{ base: 'sm', smd: 'md', lg: 'lg' }} color={textColor}>
                        {intl.formatMessage({
                          id: 'consumer.journey.productionJourney',
                          defaultMessage: 'Production Journey'
                        })}
                      </Heading>
                      <Text fontSize="sm" color={mutedColor}>
                        {intl.formatMessage({
                          id: 'consumer.journey.transparentTimeline',
                          defaultMessage: 'Transparent farming timeline'
                        })}
                      </Text>
                    </VStack>
                  </HStack>
                </CardHeader>

                {/* Run 8 (R8-15): a count of records, not an assurance. Neutral, no check icon. */}
                <Badge
                  variant="neutral"
                  fontSize="xs"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontWeight="600">
                  <HStack spacing={1}>
                    <Text>
                      {intl.formatMessage(
                        {
                          id: 'consumer.journey.eventCount',
                          defaultMessage: '{count, plural, one {# Event} other {# Events}}'
                        },
                        { count: filteredEvents.length }
                      )}
                    </Text>
                  </HStack>
                </Badge>
              </HStack>

              {/* Production Stats Row — minimalist horizontal layout with dividers */}
              <HStack
                spacing={0}
                w="100%"
                bg={useColorModeValue('gray.50', 'gray.800')}
                borderRadius="lg"
                py={3}
                px={3}
                divider={
                  <Box
                    w="1px"
                    h="32px"
                    bg={useColorModeValue('gray.200', 'gray.600')}
                    alignSelf="center"
                  />
                }>
                <VStack
                  spacing={0.5}
                  flex={1}
                  align="center"
                  minW={0}
                  role="group"
                  aria-label={intl.formatMessage(
                    {
                      id: 'consumer.journey.eventsDocumentedAria',
                      defaultMessage:
                        '{count, plural, one {# event documented} other {# events documented}}'
                    },
                    { count: filteredEvents.length }
                  )}>
                  <Text
                    fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                    fontWeight="bold"
                    color={textColor}>
                    {filteredEvents.length}
                  </Text>
                  <Text fontSize="xs" color={mutedColor} fontWeight="500" lineHeight="1.2">
                    {intl.formatMessage({
                      id: 'consumer.journey.eventsLabel',
                      defaultMessage: 'Events'
                    })}
                  </Text>
                </VStack>

                {/* Carbon tonnage cell removed (2026-06): a raw "21.5t Carbon"
                    figure with no boundary context is an environmental claim
                    without methodology (FTC 260.4(c)) and violated our own
                    progressive-disclosure rule. Carbon lives in the
                    Environmental Impact explainer with per-kg framing. */}

                {/* Photo-coverage cell — hidden at 0%: "0% With Photos"
                    advertises the absence of evidence and reads broken. */}
                {(() => {
                  const documentedEvents = filteredEvents.filter(
                    (e) =>
                      (e.album && e.album.images?.length > 0) ||
                      (e.albums && e.albums.length > 0) ||
                      e.extra_data?.photo_count > 0
                  );
                  const photoPercent =
                    filteredEvents.length > 0
                      ? Math.round((documentedEvents.length / filteredEvents.length) * 100)
                      : 0;
                  if (photoPercent === 0) return null;
                  return (
                    <VStack
                      spacing={0.5}
                      flex={1}
                      align="center"
                      minW={0}
                      role="group"
                      aria-label={intl.formatMessage(
                        {
                          id: 'consumer.journey.photoCoverageAria',
                          defaultMessage: '{percent}% of events with photos'
                        },
                        { percent: photoPercent }
                      )}>
                      <Text
                        fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                        fontWeight="bold"
                        color={textColor}>
                        {photoPercent}%
                      </Text>
                      <PhotoDocumentationTooltip>
                        <Text
                          fontSize="xs"
                          color={mutedColor}
                          textAlign="center"
                          fontWeight="500"
                          lineHeight="1.2">
                          {intl.formatMessage({
                            id: 'transparency.withPhotos',
                            defaultMessage: 'With Photos'
                          })}
                        </Text>
                      </PhotoDocumentationTooltip>
                    </VStack>
                  );
                })()}

                {/* Numeric score cell removed (2026-06): self-created score
                    de-emphasized page-wide per claim-safety plan. */}
              </HStack>

              {/* "Documentation Transparency" block removed (2026-06): legacy
                  section gated on the productionId prop (dormant until Phase 4
                  passed it for the buyer CTA). It re-introduced a numeric
                  "100% Transparency" score and a "Trazo Certified" badge —
                  both killed by the claim-safety plan (16 CFR 260.6(d); a
                  self-issued "certified" label is explicitly unsafe). The
                  stats strip above already carries events + photos. */}
            </VStack>

            {/* Minimalist Horizontal Event Type Filters — proof view only,
                hidden while a chapter deep-link filter is active */}
            {isProofView && !proofChapter && categories.length > 1 && (
              <Box w="full" overflowX="auto" pb={2}>
                <HStack spacing={2} minW="max-content" px={1}>
                  {categories.map((category) => {
                    const getEventConfig = (cat: string) => {
                      if (!cat || typeof cat !== 'string') {
                        return { icon: MdTimeline };
                      }
                      switch (cat.toLowerCase()) {
                        case 'all':
                          return { icon: MdTimeline };
                        case 'weather':
                          return { icon: FaCloudRain };
                        case 'crop inputs':
                        case 'chemical':
                          return { icon: FaFlask };
                        case 'production':
                          return { icon: FaSeedling };
                        case 'equipment':
                          return { icon: FaTractor };
                        case 'soil management':
                          return { icon: FaLayerGroup };
                        case 'pest management':
                          return { icon: FaBug };
                        case 'business':
                          return { icon: FaCertificate };
                        case 'other farm activity':
                        case 'other farm activities':
                        case 'general':
                          return { icon: FaClipboardList };
                        default:
                          return { icon: FaClipboardList };
                      }
                    };

                    const config = getEventConfig(category);
                    const isSelected =
                      selectedCategory === category ||
                      (category === 'all' && selectedCategory === 'all');

                    const categoryEvents =
                      category === 'all'
                        ? filteredEvents
                        : sortedEvents.filter((event) => {
                            const eventConfig = getEventConfig(event);
                            return (
                              eventConfig.category &&
                              typeof eventConfig.category === 'string' &&
                              category &&
                              typeof category === 'string' &&
                              eventConfig.category.toLowerCase() === category.toLowerCase()
                            );
                          });

                    const displayName =
                      category === 'all'
                        ? intl.formatMessage({
                            id: 'consumer.journey.filterAll',
                            defaultMessage: 'All'
                          })
                        : category;
                    const eventCount = categoryEvents.length;

                    return (
                      <Button
                        key={category}
                        size="sm"
                        variant={isSelected ? 'solid' : 'outline'}
                        colorScheme="gray"
                        bg={isSelected ? 'green.700' : 'transparent'}
                        color={isSelected ? 'white' : useColorModeValue('gray.700', 'gray.300')}
                        borderColor={
                          isSelected ? 'green.700' : useColorModeValue('gray.200', 'gray.600')
                        }
                        onClick={() => setSelectedCategory(category)}
                        transition="all 0.2s"
                        _hover={{
                          transform: 'translateY(-1px)',
                          shadow: 'sm',
                          bg: isSelected ? 'green.800' : useColorModeValue('gray.50', 'gray.700')
                        }}
                        leftIcon={<Icon as={config.icon} boxSize={3} />}
                        minW="max-content"
                        fontSize="xs"
                        fontWeight="medium"
                        px={3}
                        py={2}
                        h="32px">
                        {displayName} {eventCount > 0 && `(${eventCount})`}
                      </Button>
                    );
                  })}
                </HStack>
              </Box>
            )}
          </VStack>
        </CardBody>

        <CardBody pt={0} px={0} pb={0} minW={0}>
          {/* ── Consumer story view (default): five chapters, highlights only ── */}
          {!isProofView && (
            <VStack spacing={6} align="stretch" minW={0}>
              {chapterData.map((ch) => {
                const visibleCards = (
                  ch.highlights.length > 0 ? ch.highlights : ch.events.slice(0, 1)
                ).slice(0, visibleCountByChapter[ch.key] ?? 1);
                const hiddenCount = ch.events.length - visibleCards.length;
                return (
                  <Box key={ch.key}>
                    {/* Chapter header card — small card of its own (like the
                        journey header above), with the event cards as
                        SIBLINGS below it. No father container wrapping the
                        events; a bare floating heading between carded
                        neighbors read unfinished. */}
                    <Box
                      bg={bgColor}
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="xl"
                      px={{ base: 3, md: 4 }}
                      py={3}
                      mb={2}>
                      <HStack justify="space-between" align="start">
                        <HStack spacing={3} align="center">
                          <Circle size="36px" bg={STATUS_TONE_TOKENS.neutral.circle} flexShrink={0}>
                            <Icon
                              as={ch.icon}
                              aria-hidden="true"
                              color={STATUS_TONE_TOKENS.neutral.glyph}
                              boxSize={4}
                            />
                          </Circle>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold" fontSize="sm" color={textColor}>
                              {ch.title}{' '}
                              <Text as="span" fontWeight="medium" color={mutedColor}>
                                {intl.formatMessage(
                                  {
                                    id: 'consumer.journey.chapterEventCount',
                                    defaultMessage:
                                      '— {count, plural, one {# event} other {# events}}'
                                  },
                                  { count: ch.events.length }
                                )}
                              </Text>
                            </Text>
                            <Text fontSize="xs" color={mutedColor}>
                              {ch.subtitle}
                            </Text>
                          </VStack>
                        </HStack>
                      </HStack>

                      {/* Evidence chips */}
                      {(ch.photoCount > 0 || ch.allInputsOrganic) && (
                        <HStack spacing={2} mt={2} flexWrap="wrap">
                          {/* A COUNT, so it is neutral. It was `colorScheme="green"`, which made
                              it identical to the "All inputs organic-approved" chip sitting
                              beside it — and that one IS a claim, resolved server-side from
                              `organic_summary`. Two different kinds of thing wearing the same
                              green is how a plain fact borrows a claim's authority. Green stays
                              reserved for a third-party-backed statement, which is the rule the
                              OMRI chip and the event card's provenance chip already follow. */}
                          {ch.photoCount > 0 && (
                            <Badge
                              variant="outline"
                              colorScheme="gray"
                              fontSize="xs"
                              borderRadius="full"
                              px={2}>
                              {intl.formatMessage(
                                {
                                  id: 'consumer.journey.photoBadge',
                                  defaultMessage:
                                    '📷 {count, plural, one {# photo} other {# photos}}'
                                },
                                { count: ch.photoCount }
                              )}
                            </Badge>
                          )}
                          {/* Run 8b (8b-06): the farm's own record, so it reads as one: outline
                              and neutral like the photo count, never the green a third-party
                              statement gets, and never a default that drops "recorded". */}
                          {ch.allInputsOrganic && (
                            <Badge
                              variant="outline"
                              colorScheme="gray"
                              fontSize="xs"
                              borderRadius="full"
                              px={2}>
                              {intl.formatMessage({
                                id: 'consumer.journey.allInputsOrganic',
                                defaultMessage:
                                  'Every input recorded by the farm as allowed for organic use'
                              })}
                            </Badge>
                          )}
                        </HStack>
                      )}
                    </Box>

                    {/* Highlight cards — top-level, flat */}
                    <VStack spacing={2} align="stretch">
                      {(() => {
                        const { repeatImpact, repeatShort } = computeRepeatedCopy(visibleCards);
                        return visibleCards.map((event) => {
                          const enhancedEvent = buildEnhancedEvent(event);
                          return (
                            <ConsumerEventCard
                              key={event.id}
                              event={enhancedEvent}
                              isGrouped
                              slim
                              suppressImpactLine={repeatImpact.has(String(event.id))}
                              suppressShortDescription={repeatShort.has(String(event.id))}
                              isExpanded={expandedEventId === event.id}
                              onToggleExpand={() => toggleEventExpand(event.id)}
                              producerAction={buildProducerAction(event)}
                              producerVisibilityBadge={buildVisibilityBadge(event)}
                              productionBlockchain={productionBlockchain}
                            />
                          );
                        });
                      })()}
                    </VStack>

                    {hiddenCount > 0 && (
                      <Button
                        mt={2}
                        px={1}
                        size="xs"
                        variant="link"
                        colorScheme="green"
                        onClick={() => openProofView(ch.key)}>
                        {/* Names the destination (2026-08-02). "+2 more in the full record"
                            reads like an inline expander, but it switches to the full-record
                            view filtered to this chapter — so the label now says the chapter
                            and the TOTAL it will show, not the remainder it hides. */}
                        {intl.formatMessage(
                          {
                            id: 'consumer.journey.seeAllInChapter',
                            defaultMessage: 'See all {count} in {chapter} →'
                          },
                          { count: ch.events.length, chapter: ch.title }
                        )}
                      </Button>
                    )}
                  </Box>
                );
              })}

              {/* Full-record CTA — proof view carries every event, including
                  equipment/business/general records kept out of the story. */}
              <Button
                variant="outline"
                colorScheme="green"
                size="sm"
                onClick={() => openProofView()}>
                {intl.formatMessage(
                  {
                    id: 'consumer.journey.viewFullRecord',
                    defaultMessage:
                      'View the full record — all {count} events{operational, plural, =0 {} other { (incl. # operational)}}'
                  },
                  { count: sortedEvents.length, operational: proofOnlyCount }
                )}
              </Button>

              {/* Buyer-framed entry — the BuyerDocRequest CTA lives in the proof view, so a
                  wholesale buyer landing on the story view needs an explicit door to it
                  (2026-06 audit P2-8). Same openProofView() switch, different framing.
                  Consumer audience only: on the producer's own Production Profile it
                  addressed the farm as if it were its own buyer. */}
              {isConsumerAudience && (
                <Button
                  variant="link"
                  size="xs"
                  colorScheme="gray"
                  fontWeight="normal"
                  onClick={() => openProofView()}>
                  {intl.formatMessage({
                    id: 'consumer.journey.buyerEntry',
                    defaultMessage:
                      'Buyer or retailer? See the full sourcing record & request documents →'
                  })}
                </Button>
              )}
            </VStack>
          )}

          {/* ── Proof view: complete chronological log ── */}
          {isProofView && (
            <Box mb={3}>
              <HStack justify="space-between" flexWrap="wrap" spacing={2}>
                <Button size="xs" variant="link" colorScheme="green" onClick={closeProofView}>
                  {intl.formatMessage({
                    id: 'consumer.journey.backToStory',
                    defaultMessage: '← Back to story view'
                  })}
                </Button>
                {proofChapter && (
                  <Button
                    size="xs"
                    variant="link"
                    colorScheme="gray"
                    onClick={() => openProofView()}>
                    {intl.formatMessage(
                      {
                        id: 'consumer.journey.viewAllEvents',
                        defaultMessage: 'View all {count} events →'
                      },
                      { count: sortedEvents.length }
                    )}
                  </Button>
                )}
              </HStack>
              {proofChapter && (
                <HStack spacing={2} mt={2}>
                  <Icon
                    as={proofChapter.icon}
                    aria-hidden="true"
                    color={STATUS_TONE_TOKENS.neutral.glyph}
                    boxSize={4}
                  />
                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                    {intl.formatMessage(
                      {
                        id: 'consumer.journey.proofChapterHeader',
                        defaultMessage: '{title} — {count, plural, one {# event} other {# events}}'
                      },
                      { title: proofChapter.title, count: proofChapter.events.length }
                    )}
                  </Text>
                </HStack>
              )}
            </Box>
          )}
          {isProofView && (
            <VStack spacing={{ base: 2, md: 4 }} align="stretch" minW={0}>
              {(() => {
                // One ledger for the whole proof list — a grouped event and a single event are
                // siblings on screen, so they must dedupe against each other.
                const { repeatImpact, repeatShort } = computeRepeatedCopy(
                  proofDisplayGroups.flatMap((it) => (it.kind === 'group' ? it.events : [it.event]))
                );
                return proofDisplayGroups.map((item, groupIndex) => {
                  if (item.kind === 'group') {
                    const config = getEventConfig(item.events[0]);
                    const isExpanded = expandedGroup === item.type;
                    const totalEvents = item.events.length;

                    // Compute summary metrics for the grouped events
                    const subtypeNames = item.events.map((evt) => {
                      const info = localizeConsumerDescription(
                        getConsumerEventDescription(evt.description, evt),
                        intl.locale
                      );
                      return info.title;
                    });
                    // Deduplicate while preserving order
                    const uniqueSubtypes = [...new Set(subtypeNames)];

                    return (
                      <Box key={`group-${item.type}`}>
                        <Box
                          bg={bgColor}
                          borderRadius="xl"
                          border="1px solid"
                          borderColor={isExpanded ? 'gray.300' : 'gray.200'}
                          overflow="hidden"
                          cursor="pointer"
                          onClick={() => toggleGroup(item.type)}
                          _hover={{ borderColor: 'gray.300', shadow: 'md' }}
                          transition="all 0.2s"
                          shadow={isExpanded ? 'sm' : 'none'}>
                          <Box p={4}>
                            {/* Row 1: Icon + Title + Date Range + Chevron */}
                            <HStack spacing={3}>
                              <Circle
                                size="40px"
                                bg={STATUS_TONE_TOKENS.neutral.circle}
                                flexShrink={0}>
                                <Icon
                                  as={config.icon}
                                  color={STATUS_TONE_TOKENS.neutral.glyph}
                                  boxSize={4}
                                />
                              </Circle>
                              <VStack align="start" spacing={0} flex={1}>
                                <HStack>
                                  <Text fontWeight="bold" fontSize="sm" color={textColor}>
                                    {intl.formatMessage(
                                      {
                                        id: 'consumer.journey.groupEventCount',
                                        defaultMessage:
                                          '{count, plural, one {# {category} Event} other {# {category} Events}}'
                                      },
                                      { count: totalEvents, category: item.category }
                                    )}
                                  </Text>
                                  <Badge variant="neutral" fontSize="xs" borderRadius="full">
                                    {item.dateRange}
                                  </Badge>
                                </HStack>
                              </VStack>
                              <Icon
                                as={isExpanded ? FaChevronUp : FaChevronDown}
                                color={mutedColor}
                                boxSize={3}
                                flexShrink={0}
                              />
                            </HStack>

                            {/* Row 2: Sub-event journey breadcrumb */}
                            <HStack mt={2} ml="52px" spacing={1} flexWrap="wrap">
                              {uniqueSubtypes.map((name, idx) => (
                                <React.Fragment key={name}>
                                  <Text fontSize="xs" color={mutedColor} fontWeight="medium">
                                    {name}
                                  </Text>
                                  {idx < uniqueSubtypes.length - 1 && (
                                    <Text fontSize="xs" color="gray.400">
                                      ›
                                    </Text>
                                  )}
                                </React.Fragment>
                              ))}
                            </HStack>

                            {/* Row 3: Trust & Impact badges */}
                            <HStack mt={2} ml="52px" spacing={2} flexWrap="wrap">
                              {/* A collapsed group of withheld events (e.g. 4 cleanouts)
                                  must not read as buyer-visible until expanded — the
                                  group key IS the subtype, so member 0 speaks for all. */}
                              {!isConsumerAudience &&
                                item.events.length > 0 &&
                                buyerPageWithheldReasonId(item.events[0] as any) && (
                                  <Badge colorScheme="gray" variant="subtle" fontSize="11px">
                                    {intl.formatMessage({
                                      id: 'producer.event.certifierOnlyBadge'
                                    })}
                                  </Badge>
                                )}
                              {/* A green "ALL RECORDED" badge with a verified-seal icon was here,
                                  counting events with `blockchain_verified`. Blockchain is not a
                                  consumer surface (add-on withdrawn) and a seal reads as
                                  "verified" whatever the words say. Deleted 2026-11-04. */}
                            </HStack>

                            {/* Row 4: Expand hint */}
                            <Text fontSize="xs" color={mutedColor} mt={1.5} ml="52px">
                              {isExpanded
                                ? intl.formatMessage({
                                    id: 'consumer.journey.clickToCollapse',
                                    defaultMessage: 'Click to collapse'
                                  })
                                : intl.formatMessage(
                                    {
                                      id: 'consumer.journey.clickToSeeAll',
                                      defaultMessage: 'Click to see all {count} events'
                                    },
                                    { count: totalEvents }
                                  )}
                            </Text>
                          </Box>
                        </Box>

                        <Collapse in={isExpanded} animateOpacity>
                          <VStack
                            spacing={2}
                            mt={2}
                            ml={{ base: 0, md: 4 }}
                            pl={{ base: 2, md: 3 }}
                            borderLeft="2px solid"
                            borderColor="gray.200"
                            align="stretch">
                            {item.events.map((event, eventIndex) => {
                              const enhancedEvent = buildEnhancedEvent(event);
                              return (
                                <ConsumerEventCard
                                  key={event.id}
                                  event={enhancedEvent}
                                  isLast={eventIndex === item.events.length - 1}
                                  isGrouped
                                  suppressImpactLine={repeatImpact.has(String(event.id))}
                                  suppressShortDescription={repeatShort.has(String(event.id))}
                                  isExpanded={expandedEventId === event.id}
                                  onToggleExpand={() => toggleEventExpand(event.id)}
                                  producerAction={buildProducerAction(event)}
                                  producerVisibilityBadge={buildVisibilityBadge(event)}
                                  productionBlockchain={productionBlockchain}
                                />
                              );
                            })}
                          </VStack>
                        </Collapse>
                      </Box>
                    );
                  }

                  // Single event rendering
                  const event = item.event;
                  const enhancedEvent = buildEnhancedEvent(event);
                  return (
                    <ConsumerEventCard
                      key={event.id}
                      event={enhancedEvent}
                      isLast={groupIndex === proofDisplayGroups.length - 1}
                      suppressImpactLine={repeatImpact.has(String(event.id))}
                      suppressShortDescription={repeatShort.has(String(event.id))}
                      isExpanded={expandedEventId === event.id}
                      onToggleExpand={() => toggleEventExpand(event.id)}
                      producerAction={buildProducerAction(event)}
                      producerVisibilityBadge={buildVisibilityBadge(event)}
                      productionBlockchain={productionBlockchain}
                    />
                  );
                });
              })()}
            </VStack>
          )}

          {/* Show More Button */}
          {isProofView && !proofChapter && filteredEvents.length > 3 && (
            <Box mt={4} textAlign="center">
              <Button
                size="sm"
                variant="ghost"
                colorScheme="green"
                onClick={handleToggleShowAll}
                rightIcon={showAll ? <FaChevronUp /> : <FaChevronDown />}
                aria-expanded={showAll}>
                {showAll
                  ? intl.formatMessage({
                      id: 'consumer.journey.showLess',
                      defaultMessage: 'Show Less'
                    })
                  : intl.formatMessage(
                      {
                        id: 'consumer.journey.showAllEvents',
                        defaultMessage: 'Show All {count, plural, one {# Event} other {# Events}}'
                      },
                      { count: filteredEvents.length }
                    )}
              </Button>
            </Box>
          )}

          {/* Buyer documentation CTA — the foot of BOTH views (2026-08-02).
              It used to render only in the proof view, which meant the one
              conversion path aimed at buyers was reachable only by a reader who
              had already opened the full record. A buyer who lands, skims the
              story and leaves never saw it. It stays at the FOOT, and stays
              quiet: the consumer story is the page's job, and this is an exit
              for the minority who want paperwork rather than a banner
              competing with the record itself. */}
          {buyerDocProductionId && (
            <React.Suspense fallback={null}>
              <Box mt={4}>
                <BuyerDocRequestCTA productionId={buyerDocProductionId} />
              </Box>
            </React.Suspense>
          )}

          {/* Keep the original modal */}
          {selectedEvent && (
            <EnhancedEventDetailModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              event={{
                ...selectedEvent,
                carbon_data: selectedEvent.carbon_data
                  ? {
                      ...selectedEvent.carbon_data,
                      calculation_method:
                        selectedEvent.carbon_data.calculation_method ||
                        intl.formatMessage({
                          id: 'consumer.journey.usdaStandardMethod',
                          defaultMessage: 'USDA Standard Method'
                        }),
                      verification_confidence:
                        selectedEvent.carbon_data.verification_confidence || 'medium'
                    }
                  : undefined
              }}
            />
          )}
        </CardBody>
      </JourneyShell>
    </Box>
  );
};

export default UltraMobileProductionJourney;
