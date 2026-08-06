import React from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Heading,
  useColorModeValue,
  Divider
} from "@chakra-ui/react";
import { FaArrowUp, FaExclamationCircle, FaInfoCircle, FaLightbulb } from "react-icons/fa";
import { useIntl } from "react-intl";
import { StandardButton } from "components/Design/StandardComponents";

interface Opportunity {
  type: string;
  priority: string;
  title: string;
  description: string;
  potential_improvement: string;
}

interface TransparencyImprovementRoadmapProps {
  opportunities: Opportunity[];
  // null when the farm has no finished, published season — there is no score yet, and
  // rendering "Current score: 0%" would state a failing grade for a season still underway.
  currentScore: number | null;
  onAddEvent?: () => void;
}

type KnownPriority = "high" | "medium" | "low";

const PRIORITY_CONFIG: Record<
  KnownPriority,
  { colorScheme: string; labelId: string; iconColor: string; icon: React.ElementType }
> = {
  high: {
    colorScheme: "red",
    labelId: "transparency.roadmapPriorityHigh",
    iconColor: "red.500",
    icon: FaExclamationCircle
  },
  medium: {
    colorScheme: "yellow",
    labelId: "transparency.roadmapPriorityMedium",
    iconColor: "yellow.500",
    icon: FaInfoCircle
  },
  low: {
    colorScheme: "blue",
    labelId: "transparency.roadmapPriorityLow",
    iconColor: "blue.500",
    icon: FaLightbulb
  }
};

const KNOWN_PRIORITIES: KnownPriority[] = ["high", "medium", "low"];

function resolveConfig(priority: string) {
  const key = KNOWN_PRIORITIES.includes(priority as KnownPriority)
    ? (priority as KnownPriority)
    : "low";
  return PRIORITY_CONFIG[key];
}

// `calculateProjectedScore()` was removed 2026-08-04. It summed the per-production gains and
// added them to the FARM score, which produced a card that contradicted itself on screen:
// the header read "Up To +2% Possible" above three items each reading "+30% for this
// production". Two different units, one card.
//
// The projection was wrong in both directions:
//   - Per-production gains are not additive to a farm score. The farm figure is a MEAN over
//     seasons (`EstablishmentDashboardMetricsSerializer`), so +30 on one production does not
//     move it by 30, and three of them do not move it by 90 — the `Math.min(…, 100)` clamp was
//     what silently turned 98 + 90 into "+2".
//   - The opportunities come from `missing_data_opportunities` (company/views.py), which only
//     inspects ACTIVE productions, while the farm score only counts FINISHED ones. Acting on
//     every item here moves the farm score by exactly 0 until those seasons are closed out.
//
// The per-production deltas are real and are kept on each item. Nothing aggregates them.

/** Rows rendered at once. The remainder is reported explicitly rather than silently dropped. */
const MAX_VISIBLE_OPPORTUNITIES = 5;

const TransparencyImprovementRoadmap: React.FC<TransparencyImprovementRoadmapProps> = ({
  opportunities,
  currentScore,
  onAddEvent
}) => {
  const intl = useIntl();
  const itemBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.700", "gray.200");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const dividerColor = useColorModeValue("gray.100", "gray.600");
  const itemBorderColor = useColorModeValue("gray.200", "gray.600");
  const emptyBg = useColorModeValue("green.50", "green.900");
  const emptyBorderColor = useColorModeValue("green.200", "green.700");
  const emptyTitleColor = useColorModeValue("green.700", "green.300");
  const emptySubColor = useColorModeValue("green.600", "green.400");

  const PRIORITY_ORDER = ["high", "medium", "low"];
  // Unknown priorities sort LAST. `indexOf` returns -1 for anything unrecognised, which sorted it
  // above "high" — while `resolveConfig()` renders that same item with the "Low" badge. An item
  // labelled Low sitting at the top of a priority-ordered list is a contradiction the reader has
  // no way to resolve.
  const priorityRank = (p: string) => {
    const i = PRIORITY_ORDER.indexOf(p);
    return i === -1 ? PRIORITY_ORDER.length : i;
  };

  const rankedOpportunities = [...opportunities].sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority)
  );
  const sortedOpportunities = rankedOpportunities.slice(0, MAX_VISIBLE_OPPORTUNITIES);
  const hiddenCount = rankedOpportunities.length - sortedOpportunities.length;

  if (sortedOpportunities.length === 0) {
    return (
      <Box
        bg={emptyBg}
        border="1px solid"
        borderColor={emptyBorderColor}
        borderRadius="xl"
        p={4}
      >
        <HStack spacing={3}>
          <Icon as={FaLightbulb} color="green.500" boxSize={5} />
          <VStack align="start" spacing={1} flex={1}>
            <Text fontWeight="bold" color={emptyTitleColor} fontSize="sm">
              {intl.formatMessage({ id: "transparency.roadmapAllCaughtUp" })}
            </Text>
            <Text fontSize="xs" color={emptySubColor}>
              {intl.formatMessage({ id: "transparency.roadmapAllCaughtUpHelp" })}
            </Text>
          </VStack>
        </HStack>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Header with score context */}
      <HStack justify="space-between" flexWrap="wrap" spacing={2}>
        <VStack align="start" spacing={0}>
          <Heading as="h3" size="sm" color={textColor}>
            {intl.formatMessage({ id: "transparency.roadmapTitle" })}
          </Heading>
          {currentScore !== null && (
            <Text fontSize="xs" color={mutedColor}>
              {intl.formatMessage({ id: "transparency.roadmapCurrentScore" }, { score: currentScore })}
            </Text>
          )}
        </VStack>
        {/* A COUNT of what is open, not a projected farm-level gain — see the note on the removed
            `calculateProjectedScore()` above. Counts EVERY opportunity, not just the visible five:
            `sortedOpportunities` is already sliced, so reading its length here reported "5 open
            items" to a farm that had twelve. */}
        <Badge
          colorScheme="green"
          fontSize="xs"
          px={3}
          py={1}
          borderRadius="full"
          display="flex"
          alignItems="center"
          gap={1}
        >
          <Icon as={FaArrowUp} boxSize={2.5} />
          {intl.formatMessage(
            { id: "transparency.roadmapOpenItems" },
            { count: rankedOpportunities.length }
          )}
        </Badge>
      </HStack>

      {/* Opportunity list */}
      <VStack spacing={3} align="stretch">
        {sortedOpportunities.map((opportunity, index) => {
          const config = resolveConfig(opportunity.priority);

          return (
            <Box
              key={`${opportunity.type}-${index}`}
              bg={itemBg}
              border="1px solid"
              borderColor={itemBorderColor}
              borderRadius="lg"
              p={4}
              borderLeft="4px solid"
              borderLeftColor={`${config.colorScheme}.400`}
            >
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between" spacing={2} flexWrap="wrap">
                  <HStack spacing={2}>
                    <Icon as={config.icon} color={config.iconColor} boxSize={4} flexShrink={0} />
                    <Badge
                      colorScheme={config.colorScheme}
                      variant="solid"
                      fontSize="xs"
                      borderRadius="full"
                    >
                      {intl.formatMessage({ id: config.labelId })}
                    </Badge>
                  </HStack>
                  {/* The "+30% for this production" figure was removed 2026-08-04. It came from
                      `missing_data_opportunities` in company/views.py, where it is a heuristic
                      (+30 when events lack photos, +20 when under 3 events, +25 when no carbon
                      entries, capped at 50) — a rule of thumb rendered as a precise percentage.
                      The description line below already states the actionable fact
                      ("Add photos to 6 events"), which is both true and specific. */}
                </HStack>

                <Text fontSize="sm" fontWeight="semibold" color={textColor} lineHeight="1.4">
                  {opportunity.title}
                </Text>

                {opportunity.description && (
                  <Text fontSize="xs" color={mutedColor} lineHeight="1.5">
                    {opportunity.description}
                  </Text>
                )}
              </VStack>
            </Box>
          );
        })}
      </VStack>

      {/* Never truncate silently — a list that stops at five looks like a list of five. */}
      {hiddenCount > 0 && (
        <Text fontSize="xs" color={mutedColor}>
          {intl.formatMessage({ id: "transparency.roadmapMoreItems" }, { count: hiddenCount })}
        </Text>
      )}

      {onAddEvent && (
        <>
          <Divider borderColor={dividerColor} />
          <StandardButton
            variant="primary"
            size="md"
            onClick={onAddEvent}
            w="full"
          >
            {intl.formatMessage({ id: "transparency.roadmapAddEvent" })}
          </StandardButton>
        </>
      )}
    </VStack>
  );
};

export default TransparencyImprovementRoadmap;
