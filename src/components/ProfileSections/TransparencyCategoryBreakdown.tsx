import React from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Icon,
  useColorModeValue
} from "@chakra-ui/react";
import { FaCamera, FaCheck } from "react-icons/fa";

interface CategoryData {
  actual_count: number;
  photo_verified_count: number;
  completeness_percentage: number;
  status: string;
  requires_photos: boolean;
}

interface TransparencyCategoryBreakdownProps {
  categoryBreakdown: Record<string, CategoryData>;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  production: "Growing & Harvesting",
  chemical: "Chemical Applications",
  soil: "Soil Management",
  pest: "Pest Management",
  business: "Business & Certifications",
  weather: "Weather Monitoring",
  general: "General Documentation"
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  production: 30,
  chemical: 20,
  soil: 18,
  pest: 12,
  business: 10,
  weather: 5,
  general: 5
};

const CATEGORY_ORDER = [
  "production",
  "chemical",
  "soil",
  "pest",
  "business",
  "weather",
  "general"
];

function getProgressColorScheme(completeness: number, hasEvents: boolean): string {
  if (!hasEvents) return "gray";
  if (completeness >= 70) return "green";
  if (completeness >= 50) return "yellow";
  return "orange";
}

function getBorderColor(completeness: number, hasEvents: boolean): string {
  if (!hasEvents) return "gray.200";
  if (completeness >= 70) return "green.200";
  if (completeness >= 50) return "yellow.200";
  return "orange.200";
}

const TransparencyCategoryBreakdown: React.FC<TransparencyCategoryBreakdownProps> = ({
  categoryBreakdown,
  compact = false
}) => {
  const rowBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.700", "gray.200");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const progressBg = useColorModeValue("gray.200", "gray.600");

  const sortedEntries = CATEGORY_ORDER
    .filter((key) => key in categoryBreakdown)
    .map((key) => [key, categoryBreakdown[key]] as [string, CategoryData]);

  // Also include any categories returned by the API that are not in CATEGORY_ORDER
  const extraEntries = Object.entries(categoryBreakdown).filter(
    ([key]) => !CATEGORY_ORDER.includes(key)
  );

  const allEntries = [...sortedEntries, ...extraEntries];

  return (
    <VStack spacing={compact ? 2 : 3} align="stretch">
      {allEntries.map(([key, cat]) => {
        const label = CATEGORY_LABELS[key] || key;
        const weight = CATEGORY_WEIGHTS[key] || 5;
        const completeness = cat.completeness_percentage || 0;
        const hasEvents = cat.actual_count > 0;
        const colorScheme = getProgressColorScheme(completeness, hasEvents);
        const borderColor = getBorderColor(completeness, hasEvents);
        const photosMissing =
          cat.requires_photos && hasEvents && cat.photo_verified_count < cat.actual_count;
        const allPhotosVerified =
          cat.requires_photos && hasEvents && cat.photo_verified_count >= cat.actual_count;

        return (
          <Box
            key={key}
            bg={rowBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="lg"
            p={compact ? 3 : 4}
          >
            <HStack justify="space-between" mb={2} spacing={2} flexWrap="wrap">
              <HStack spacing={2} minW={0} flex={1}>
                <Text
                  fontSize={compact ? "xs" : "sm"}
                  fontWeight="semibold"
                  color={textColor}
                  noOfLines={1}
                >
                  {label}
                </Text>
                <Badge
                  fontSize="xs"
                  colorScheme="gray"
                  variant="outline"
                  borderRadius="full"
                  flexShrink={0}
                >
                  {weight}%
                </Badge>
              </HStack>

              <HStack spacing={2} flexShrink={0}>
                {cat.requires_photos && hasEvents && (
                  <Icon
                    as={FaCamera}
                    boxSize={3}
                    color={allPhotosVerified ? "green.500" : photosMissing ? "orange.400" : "gray.400"}
                  />
                )}
                {completeness >= 90 && hasEvents && (
                  <Icon as={FaCheck} boxSize={3} color="green.500" />
                )}
                <Text fontSize="xs" color={mutedColor} whiteSpace="nowrap">
                  {hasEvents ? `${cat.actual_count} event${cat.actual_count !== 1 ? "s" : ""}` : "No events"}
                </Text>
              </HStack>
            </HStack>

            <Progress
              value={completeness}
              colorScheme={colorScheme}
              borderRadius="full"
              size="sm"
              bg={progressBg}
              mb={compact ? 1 : 2}
            />

            {!compact && (
              <HStack justify="space-between" spacing={2}>
                <Text fontSize="xs" color={mutedColor}>
                  {completeness >= 90 && hasEvents
                    ? "Fully documented"
                    : !hasEvents
                    ? `Log events to contribute ${weight}% weight`
                    : photosMissing
                    ? `${cat.photo_verified_count} of ${cat.actual_count} events have photos`
                    : `${Math.round(completeness)}% complete`}
                </Text>
                {hasEvents && (
                  <Badge
                    fontSize="xs"
                    colorScheme={colorScheme}
                    variant="subtle"
                    borderRadius="full"
                  >
                    {Math.round(completeness)}%
                  </Badge>
                )}
              </HStack>
            )}
          </Box>
        );
      })}
    </VStack>
  );
};

export default TransparencyCategoryBreakdown;
