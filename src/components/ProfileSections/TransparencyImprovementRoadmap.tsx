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
  currentScore: number;
  onAddEvent?: () => void;
}

type KnownPriority = "high" | "medium" | "low";

const PRIORITY_CONFIG: Record<
  KnownPriority,
  { colorScheme: string; label: string; iconColor: string; icon: React.ElementType }
> = {
  high: {
    colorScheme: "red",
    label: "High",
    iconColor: "red.500",
    icon: FaExclamationCircle
  },
  medium: {
    colorScheme: "yellow",
    label: "Medium",
    iconColor: "yellow.500",
    icon: FaInfoCircle
  },
  low: {
    colorScheme: "blue",
    label: "Low",
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

function parsePotentialImprovement(raw: string): string {
  if (!raw) return "";
  const match = raw.match(/\+?(\d+)%/);
  if (match) return `+${match[1]}% for this production`;
  return raw;
}

function calculateProjectedScore(currentScore: number, opportunities: Opportunity[]): number {
  const totalGain = opportunities
    .slice(0, 5)
    .reduce((sum, opp) => {
      const match = (opp.potential_improvement || "").match(/\+?(\d+)/);
      return sum + (match ? parseInt(match[1], 10) : 0);
    }, 0);
  return Math.min(currentScore + totalGain, 100);
}

const TransparencyImprovementRoadmap: React.FC<TransparencyImprovementRoadmapProps> = ({
  opportunities,
  currentScore,
  onAddEvent
}) => {
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

  const sortedOpportunities = [...opportunities]
    .sort(
      (a, b) =>
        PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    )
    .slice(0, 5);

  const projectedScore = calculateProjectedScore(currentScore, sortedOpportunities);
  const totalGain = projectedScore - currentScore;

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
              All caught up
            </Text>
            <Text fontSize="xs" color={emptySubColor}>
              No improvement actions found. Keep documenting your farming practices to maintain your score.
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
            What To Do Next
          </Heading>
          <Text fontSize="xs" color={mutedColor}>
            {`Current score: ${currentScore}%`}
          </Text>
        </VStack>
        {totalGain > 0 && (
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
            {`Up to +${totalGain}% possible`}
          </Badge>
        )}
      </HStack>

      {/* Opportunity list */}
      <VStack spacing={3} align="stretch">
        {sortedOpportunities.map((opportunity, index) => {
          const config = resolveConfig(opportunity.priority);
          const improvement = parsePotentialImprovement(opportunity.potential_improvement);

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
                      {config.label}
                    </Badge>
                  </HStack>
                  {improvement && (
                    <Text fontSize="xs" color="green.600" fontWeight="semibold" whiteSpace="nowrap">
                      {improvement}
                    </Text>
                  )}
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

      {onAddEvent && (
        <>
          <Divider borderColor={dividerColor} />
          <StandardButton
            variant="primary"
            size="md"
            onClick={onAddEvent}
            w="full"
          >
            Add Event
          </StandardButton>
        </>
      )}
    </VStack>
  );
};

export default TransparencyImprovementRoadmap;
