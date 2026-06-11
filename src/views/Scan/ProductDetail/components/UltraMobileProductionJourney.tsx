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
  FaClipboardList,
  FaLayerGroup
} from 'react-icons/fa';
import { MdTimeline, MdEco, MdVerified, MdAgriculture } from 'react-icons/md';
import { useIntl } from 'react-intl';
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
import { getSustainabilityImpact, getConsumerEventDescription } from 'utils/eventDescriptions';
import { PhotoDocumentationTooltip } from 'components/Education/EducationalTooltip';

// Buyer documentation CTA — proof view only, lazy so the story view (the
// default consumer landing) doesn't pay for the form chunk.
const BuyerDocRequestCTA = React.lazy(() => import('components/BuyerDocRequest/BuyerDocRequestCTA'));

// The consumer route (/production/:productionId) carries the production
// PUBLIC UUID; the farmer dashboard route reuses the same param name for the
// internal numeric id. The buyer-docs endpoint only accepts the public UUID,
// so gate rendering on UUID shape.
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
  productionId?: string;
  transparencyScore?: number;
  /** Production-level blockchain verification data */
  productionBlockchain?: {
    tx_hash?: string;
    verified?: boolean;
    block_number?: number;
    network?: string;
  };
}

export const UltraMobileProductionJourney: React.FC<UltraMobileProductionJourneyProps> = ({
  events,
  productionId,
  // transparencyScore prop retained in the interface (parent still passes it)
  // but no longer rendered — the numeric score left the stats strip 2026-06.
  productionBlockchain
}) => {
  const intl = useIntl();

  const [showAll, setShowAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const proofShellBorderColor = useColorModeValue('gray.100', 'gray.700');
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

  // Helper function to get efficiency color
  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'orange';
  };

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
            color: 'blue.500',
            bgColor: 'blue.50',
            category: 'Weather',
            categoryColor: 'blue'
          };
        case 1: // Production
          return {
            icon: FaSeedling,
            color: 'green.500',
            bgColor: 'green.50',
            category: 'Production',
            categoryColor: 'green'
          };
        case 2: // Chemical
          return {
            icon: FaFlask,
            color: 'orange.500',
            bgColor: 'orange.50',
            category: 'Crop Inputs',
            categoryColor: 'orange'
          };
        case 3: // General
          return {
            icon: FaClipboardList,
            color: 'gray.500',
            bgColor: 'gray.50',
            category: 'Other Farm Activity',
            categoryColor: 'gray'
          };
        case 4: // Equipment
          return {
            icon: FaTractor,
            color: 'blue.700',
            bgColor: 'blue.50',
            category: 'Equipment',
            categoryColor: 'blue'
          };
        case 5: // Soil Management
          return {
            icon: FaLayerGroup,
            color: 'yellow.700',
            bgColor: 'yellow.50',
            category: 'Soil Management',
            categoryColor: 'yellow'
          };
        case 6: // Pest Management
          return {
            icon: FaBug,
            color: 'red.500',
            bgColor: 'red.50',
            category: 'Pest Management',
            categoryColor: 'red'
          };
        case 7: // Business
          return {
            icon: FaCertificate,
            color: 'teal.500',
            bgColor: 'teal.50',
            category: 'Business',
            categoryColor: 'teal'
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
        color: 'blue.500',
        bgColor: 'blue.50',
        category: 'Weather',
        categoryColor: 'blue'
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
        color: 'orange.500',
        bgColor: 'orange.50',
        category: 'Crop Inputs',
        categoryColor: 'orange'
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
        color: 'green.500',
        bgColor: 'green.50',
        category: 'Production',
        categoryColor: 'green'
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
        color: 'blue.700',
        bgColor: 'blue.50',
        category: 'Equipment',
        categoryColor: 'blue'
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
        color: 'yellow.700',
        bgColor: 'yellow.50',
        category: 'Soil Management',
        categoryColor: 'yellow'
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
        color: 'red.500',
        bgColor: 'red.50',
        category: 'Pest Management',
        categoryColor: 'red'
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
        color: 'teal.500',
        bgColor: 'teal.50',
        category: 'Business',
        categoryColor: 'teal'
      };
    }

    // General Events (fallback)
    return {
      icon: MdEco,
      color: 'gray.500',
      bgColor: 'gray.50',
      category: 'General',
      categoryColor: 'gray'
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
  const groupedDisplayEvents = (selectedCategory !== 'all'
    ? filteredEvents
    : showAll
    ? filteredEvents
    : displayedEvents
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
  // Default view groups the season into five shopper-meaningful chapters and
  // shows only highlight events; the complete chronological log (including
  // equipment/business/general events) lives in the proof view (?view=proof).
  // No market-leading consumer experience shows a raw 20-event audit log.
  const [searchParams, setSearchParams] = useSearchParams();
  const isProofView = searchParams.get('view') === 'proof';

  // Production public UUID for the buyer-docs CTA: prefer the prop, fall back
  // to the route param (the parent consumer page doesn't pass the prop).
  const { productionId: routeProductionId } = useParams();
  const resolvedProductionId = productionId || routeProductionId;
  const buyerDocProductionId =
    resolvedProductionId && PUBLIC_UUID_RE.test(resolvedProductionId)
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

  type ChapterKey = 'soil' | 'care' | 'inputs' | 'pest' | 'harvest';
  const CHAPTER_DEFS: Array<{
    key: ChapterKey;
    icon: any;
    title: string;
    subtitle: string;
    colorScheme: string;
  }> = [
    {
      key: 'soil',
      icon: FaLayerGroup,
      title: 'Soil & Planting',
      subtitle: 'How the ground was prepared and planted',
      colorScheme: 'yellow'
    },
    {
      key: 'care',
      icon: FaCloudRain,
      title: 'Water & Care',
      subtitle: 'Irrigation and crop care through the season',
      colorScheme: 'blue'
    },
    {
      key: 'inputs',
      icon: FaFlask,
      title: 'Crop Inputs',
      subtitle: 'Every input applied to this crop',
      colorScheme: 'orange'
    },
    {
      key: 'pest',
      icon: FaBug,
      title: 'Pest & Disease',
      subtitle: 'Monitoring and pest management',
      colorScheme: 'red'
    },
    {
      key: 'harvest',
      icon: FaSeedling,
      title: 'Harvest & Handling',
      subtitle: 'Picking, quality, and handling',
      colorScheme: 'green'
    }
  ];

  const PRODUCTION_SOIL_CODES = new Set(['PL', 'TR']);
  const CARE_CODES = new Set(['IR', 'PR', 'CU', 'TH']);
  const HARVEST_CODES = new Set(['HA', 'PO', 'PH', 'CM']);
  const WEATHER_CODES = new Set(['FR', 'DR', 'HL', 'TS', 'HW', 'HT', 'HH', 'LH']);
  // Mirrors the backend rule in PublicHistorySerializer._annotate_consumer_highlights;
  // used only as a fallback when the payload predates the is_highlight flag.
  const HIGHLIGHT_ALWAYS = new Set([
    'PL', 'HA', 'FE', 'PE', 'FU', 'HE', 'CC', 'OM', 'PA', 'TM', 'BR', 'PI'
  ]);

  const getChapterKey = (event: TimelineEvent): ChapterKey | null => {
    const t = (event as any).type as string;
    if (t === 'chemical') return 'inputs';
    if (t === 'soil_management') return 'soil';
    if (t === 'pest_management') return 'pest';
    if (t === 'equipment' || t === 'business' || t === 'general') return null;
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
    event.album?.images?.length ??
    ((event as any).albums?.[0]?.images?.length || 0);

  const chapterData = CHAPTER_DEFS.map((def) => {
    const chapterEvents = sortedEvents.filter((e) => getChapterKey(e) === def.key);
    const highlights = chapterEvents.filter(isHighlightEvent);
    const photoCount = chapterEvents.reduce((acc, e) => acc + countEventPhotos(e), 0);
    const allInputsOrganic =
      def.key === 'inputs' &&
      chapterEvents.length > 0 &&
      chapterEvents.every((e) => Boolean((e as any).organic_approved));
    return { ...def, events: chapterEvents, highlights, photoCount, allInputsOrganic };
  }).filter((ch) => ch.events.length > 0);

  const chapterEventTotal = chapterData.reduce((acc, ch) => acc + ch.events.length, 0);
  const proofOnlyCount = sortedEvents.length - chapterEventTotal;

  // Card budget (plan acceptance: ≤9 highlight cards by default on a
  // 20-event production). Every chapter shows at least one card; the
  // remaining budget goes to the chapters shoppers weigh most.
  const CARD_BUDGET = 9;
  const CHAPTER_PRIORITY: ChapterKey[] = ['inputs', 'harvest', 'soil', 'pest', 'care'];
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
      verification_level: event.verification_level || 'self_reported',
      photo_verified_count: event.photo_verified_count || 0,
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

  // Story view must NOT render the custom <Card>: the production CSS
  // fallback (trazo-dashboard-styles.css, protected file) forces
  // `.trazo-card { background: white; padding: 14/22px } !important` on every
  // Card, so emotion props can never make it transparent. A plain Box carries
  // no .trazo-card class — the chapters become true top-level cards, two
  // nesting levels (chapter > event), no father card.
  const JourneyShell: React.ElementType = isProofView ? Card : Box;
  const proofShellProps = isProofView
    ? {
        bg: bgColor,
        shadow: 'sm',
        borderRadius: 'xl',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: proofShellBorderColor
      }
    : {};

  return (
    <Box ref={sectionRef} data-journey-root scrollMarginTop="120px" overflow="hidden" w="100%">
      <JourneyShell {...proofShellProps}>
        <CardBody
          p={isProofView ? { base: 4, md: 6 } : 0}
          pb={isProofView ? undefined : 0}
          bg="transparent"
          minW={0}
        >
          {/* Header — its own compact card in story view (the chapters are
              siblings, not children, so the page background shows between). */}
          <VStack
            spacing={5}
            mb={isProofView ? 6 : 4}
            minW={0}
            bg={isProofView ? undefined : bgColor}
            borderRadius={isProofView ? undefined : 'xl'}
            borderWidth={isProofView ? undefined : '1px'}
            borderColor={isProofView ? undefined : 'gray.200'}
            p={isProofView ? undefined : { base: 4, md: 5 }}
          >
            <VStack spacing={3} w="full" minW={0}>
              <HStack w="full" justify="space-between" align="start">
                <CardHeader pb={6}>
                  <HStack spacing={3}>
                    <Circle size="40px" bg="green.500" color="white">
                      <Icon as={MdTimeline} aria-hidden="true" boxSize={5} />
                    </Circle>
                    <VStack spacing={0} align="start">
                      <Heading size={{ base: 'sm', smd: 'md', lg: 'lg' }} color={textColor}>
                        Production Journey
                      </Heading>
                      <Text fontSize="sm" color={mutedColor}>
                        Transparent farming timeline
                      </Text>
                    </VStack>
                  </HStack>
                </CardHeader>

                <Badge
                  colorScheme="green"
                  variant="subtle"
                  fontSize="xs"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontWeight="600"
                >
                  <HStack spacing={1}>
                    <Icon as={MdVerified} aria-hidden="true" boxSize={3} />
                    <Text>
                      {filteredEvents.length} {filteredEvents.length === 1 ? 'Event' : 'Events'}
                    </Text>
                  </HStack>
                </Badge>
              </HStack>

              {/* Production Stats Row — minimalist horizontal layout with dividers */}
              <HStack
                spacing={0}
                w={isProofView ? { base: 'calc(100% + 16px)', md: 'calc(100% + 32px)' } : '100%'}
                mx={isProofView ? { base: -2, md: -4 } : 0}
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
                }
              >
                <VStack
                  spacing={0.5}
                  flex={1}
                  align="center"
                  minW={0}
                  role="group"
                  aria-label={`${filteredEvents.length} event${
                    filteredEvents.length === 1 ? '' : 's'
                  } documented`}
                >
                  <Text
                    fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                    fontWeight="bold"
                    color={textColor}
                  >
                    {filteredEvents.length}
                  </Text>
                  <Text fontSize="xs" color={mutedColor} fontWeight="500" lineHeight="1.2">
                    Events
                  </Text>
                </VStack>

                {/* Carbon tonnage cell removed (2026-06): a raw "21.5t Carbon"
                    figure with no boundary context is an environmental claim
                    without methodology (FTC 260.7) and violated our own
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
                      aria-label={`${photoPercent}% of events with photos`}
                    >
                      <Text
                        fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                        fontWeight="bold"
                        color={textColor}
                      >
                        {photoPercent}%
                      </Text>
                      <PhotoDocumentationTooltip>
                        <Text
                          fontSize="xs"
                          color={mutedColor}
                          textAlign="center"
                          fontWeight="500"
                          lineHeight="1.2"
                        >
                          {intl.formatMessage({ id: 'transparency.withPhotos' })}
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
                        return { icon: MdTimeline, color: 'green.500' };
                      }
                      switch (cat.toLowerCase()) {
                        case 'all':
                          return { icon: MdTimeline, color: 'green.500' };
                        case 'weather':
                          return { icon: FaCloudRain, color: 'blue.500' };
                        case 'crop inputs':
                        case 'chemical':
                          return { icon: FaFlask, color: 'orange.500' };
                        case 'production':
                          return { icon: FaSeedling, color: 'green.500' };
                        case 'equipment':
                          return { icon: FaTractor, color: 'blue.700' };
                        case 'soil management':
                          return { icon: FaLayerGroup, color: 'yellow.700' };
                        case 'pest management':
                          return { icon: FaBug, color: 'red.500' };
                        case 'business':
                          return { icon: FaCertificate, color: 'teal.500' };
                        case 'other farm activity':
                        case 'other farm activities':
                        case 'general':
                          return { icon: FaClipboardList, color: 'gray.500' };
                        default:
                          return { icon: FaClipboardList, color: 'gray.500' };
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

                    const displayName = category === 'all' ? 'All' : category;
                    const eventCount = categoryEvents.length;

                    return (
                      <Button
                        key={category}
                        size="sm"
                        variant={isSelected ? 'solid' : 'outline'}
                        colorScheme={isSelected ? config.color.split('.')[0] : 'gray'}
                        bg={isSelected ? config.color : 'transparent'}
                        color={isSelected ? 'white' : useColorModeValue('gray.700', 'gray.300')}
                        borderColor={
                          isSelected ? config.color : useColorModeValue('gray.200', 'gray.600')
                        }
                        onClick={() => setSelectedCategory(category)}
                        transition="all 0.2s"
                        _hover={{
                          transform: 'translateY(-1px)',
                          shadow: 'sm',
                          bg: isSelected ? config.color : useColorModeValue('gray.50', 'gray.700')
                        }}
                        leftIcon={<Icon as={config.icon} boxSize={3} />}
                        minW="max-content"
                        fontSize="xs"
                        fontWeight="medium"
                        px={3}
                        py={2}
                        h="32px"
                      >
                        {displayName} {eventCount > 0 && `(${eventCount})`}
                      </Button>
                    );
                  })}
                </HStack>
              </Box>
            )}
          </VStack>
        </CardBody>

        <CardBody
          pt={0}
          px={isProofView ? { base: 0, md: 6 } : 0}
          pb={isProofView ? { base: 2, md: 6 } : 0}
          minW={0}
        >
          {/* ── Consumer story view (default): five chapters, highlights only ── */}
          {!isProofView && (
            <VStack spacing={6} align="stretch" minW={0}>
              {chapterData.map((ch) => {
                const visibleCards = (ch.highlights.length > 0
                  ? ch.highlights
                  : ch.events.slice(0, 1)
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
                      mb={2}
                    >
                      <HStack justify="space-between" align="start">
                        <HStack spacing={3} align="center">
                          <Circle size="36px" bg={`${ch.colorScheme}.50`} flexShrink={0}>
                            <Icon
                              as={ch.icon}
                              aria-hidden="true"
                              color={`${ch.colorScheme}.600`}
                              boxSize={4}
                            />
                          </Circle>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold" fontSize="sm" color={textColor}>
                              {ch.title}{' '}
                              <Text as="span" fontWeight="medium" color={mutedColor}>
                                — {ch.events.length} event{ch.events.length === 1 ? '' : 's'}
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
                          {ch.photoCount > 0 && (
                            <Badge
                              variant="subtle"
                              colorScheme="green"
                              fontSize="xs"
                              borderRadius="full"
                              px={2}
                            >
                              📷 {ch.photoCount} photo{ch.photoCount === 1 ? '' : 's'}
                            </Badge>
                          )}
                          {ch.allInputsOrganic && (
                            <Badge
                              variant="subtle"
                              colorScheme="green"
                              fontSize="xs"
                              borderRadius="full"
                              px={2}
                            >
                              All inputs organic-approved
                            </Badge>
                          )}
                        </HStack>
                      )}
                    </Box>

                    {/* Highlight cards — top-level, flat */}
                    <VStack spacing={2} align="stretch">
                      {visibleCards.map((event) => {
                        const enhancedEvent = buildEnhancedEvent(event);
                        return (
                          <ConsumerEventCard
                            key={event.id}
                            event={enhancedEvent}
                            isGrouped
                            slim
                            isExpanded={expandedEventId === event.id}
                            onToggleExpand={() => toggleEventExpand(event.id)}
                            productionBlockchain={productionBlockchain}
                          />
                        );
                      })}
                    </VStack>

                    {hiddenCount > 0 && (
                      <Button
                        mt={2}
                        px={1}
                        size="xs"
                        variant="link"
                        colorScheme="green"
                        onClick={() => openProofView(ch.key)}
                      >
                        +{hiddenCount} more in the full record →
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
                onClick={() => openProofView()}
              >
                View the full record — all {sortedEvents.length} events
                {proofOnlyCount > 0 ? ` (incl. ${proofOnlyCount} operational)` : ''}
              </Button>
            </VStack>
          )}

          {/* ── Proof view: complete chronological log ── */}
          {isProofView && (
            <Box mb={3}>
              <HStack justify="space-between" flexWrap="wrap" spacing={2}>
                <Button size="xs" variant="link" colorScheme="green" onClick={closeProofView}>
                  ← Back to story view
                </Button>
                {proofChapter && (
                  <Button size="xs" variant="link" colorScheme="gray" onClick={() => openProofView()}>
                    View all {sortedEvents.length} events →
                  </Button>
                )}
              </HStack>
              {proofChapter && (
                <HStack spacing={2} mt={2}>
                  <Icon
                    as={proofChapter.icon}
                    aria-hidden="true"
                    color={`${proofChapter.colorScheme}.600`}
                    boxSize={4}
                  />
                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                    {proofChapter.title} — {proofChapter.events.length} event
                    {proofChapter.events.length === 1 ? '' : 's'}
                  </Text>
                </HStack>
              )}
            </Box>
          )}
          {isProofView && (
          <VStack spacing={{ base: 2, md: 4 }} align="stretch" minW={0}>
            {proofDisplayGroups.map((item, groupIndex) => {
              if (item.kind === 'group') {
                const config = getEventConfig(item.events[0]);
                const isExpanded = expandedGroup === item.type;
                const totalEvents = item.events.length;

                // Compute summary metrics for the grouped events
                const subtypeNames = item.events.map((evt) => {
                  const info = getConsumerEventDescription(evt.description, evt);
                  return info.title;
                });
                // Deduplicate while preserving order
                const uniqueSubtypes = [...new Set(subtypeNames)];

                const blockchainCount = item.events.filter(
                  (evt) => evt.blockchain_verified || evt.extra_data?.blockchain_verified
                ).length;

                const impactCounts = { high: 0, medium: 0, low: 0 };
                item.events.forEach((evt) => {
                  const level = getSustainabilityImpact(evt.description, evt);
                  impactCounts[level]++;
                });

                return (
                  <Box key={`group-${item.type}`}>
                    <Box
                      bg={bgColor}
                      borderRadius="xl"
                      border="1px solid"
                      borderColor={isExpanded ? config.color : 'gray.200'}
                      overflow="hidden"
                      cursor="pointer"
                      onClick={() => toggleGroup(item.type)}
                      _hover={{ borderColor: config.color, shadow: 'md' }}
                      transition="all 0.2s"
                      shadow={isExpanded ? 'sm' : 'none'}
                    >
                      <Box p={4}>
                        {/* Row 1: Icon + Title + Date Range + Chevron */}
                        <HStack spacing={3}>
                          <Circle size="40px" bg={config.bgColor} flexShrink={0}>
                            <Icon as={config.icon} color={config.color} boxSize={4} />
                          </Circle>
                          <VStack align="start" spacing={0} flex={1}>
                            <HStack>
                              <Text fontWeight="bold" fontSize="sm" color={textColor}>
                                {totalEvents} {item.category}{' '}
                                {totalEvents === 1 ? 'Event' : 'Events'}
                              </Text>
                              <Badge
                                colorScheme={config.categoryColor}
                                fontSize="xs"
                                borderRadius="full"
                              >
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
                          {/* Blockchain wording: "recorded" never "verified"
                              (compliance rule). Impact-level badges ("Core
                              Practices" / "Standard" / "Supplementary")
                              removed 2026-06 — internal scoring jargon with
                              no consumer meaning. */}
                          {blockchainCount > 0 && (
                            <Badge
                              colorScheme="green"
                              fontSize="xs"
                              borderRadius="full"
                              px={2}
                              py={0.5}
                            >
                              <HStack spacing={1}>
                                <Icon as={MdVerified} boxSize={2.5} />
                                <Text>
                                  {blockchainCount === totalEvents
                                    ? 'ALL RECORDED'
                                    : `${blockchainCount}/${totalEvents} RECORDED`}
                                </Text>
                              </HStack>
                            </Badge>
                          )}
                        </HStack>

                        {/* Row 4: Expand hint */}
                        <Text fontSize="xs" color={mutedColor} mt={1.5} ml="52px">
                          {isExpanded
                            ? 'Click to collapse'
                            : `Click to see all ${totalEvents} events`}
                        </Text>
                      </Box>
                    </Box>

                    <Collapse in={isExpanded} animateOpacity>
                      <VStack
                        spacing={2}
                        mt={2}
                        ml={{ base: 0, md: 4 }}
                        pl={{ base: 2, md: 3 }}
                        borderLeft="3px solid"
                        borderColor={config.color}
                        align="stretch"
                      >
                        {item.events.map((event, eventIndex) => {
                          const enhancedEvent = buildEnhancedEvent(event);
                          return (
                            <ConsumerEventCard
                              key={event.id}
                              event={enhancedEvent}
                              isFirst={eventIndex === 0}
                              isLast={eventIndex === item.events.length - 1}
                              isGrouped
                              isExpanded={expandedEventId === event.id}
                              onToggleExpand={() => toggleEventExpand(event.id)}
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
                  isFirst={groupIndex === 0}
                  isLast={groupIndex === proofDisplayGroups.length - 1}
                  isExpanded={expandedEventId === event.id}
                  onToggleExpand={() => toggleEventExpand(event.id)}
                  productionBlockchain={productionBlockchain}
                />
              );
            })}
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
                aria-expanded={showAll}
              >
                {showAll
                  ? 'Show Less'
                  : `Show All ${filteredEvents.length} ${
                      filteredEvents.length === 1 ? 'Event' : 'Events'
                    }`}
              </Button>
            </Box>
          )}

          {/* Buyer documentation CTA — bottom of the proof view only (the
              story view stays consumer-focused). */}
          {isProofView && buyerDocProductionId && (
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
                        selectedEvent.carbon_data.calculation_method || 'USDA Standard Method',
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
