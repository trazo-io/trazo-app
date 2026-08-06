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
import { useIntl } from "react-intl";

// Single source of truth (also used by TransparencyDashboard.tsx) — see the file's own header
// for why this is no longer a locally-duplicated object.
import { CATEGORY_WEIGHTS } from "./transparencyCategoryWeights";

interface CategoryData {
  actual_count: number;
  photo_verified_count: number;
  /** Event coverage BEFORE the photo penalty. Optional: older cached payloads predate it. */
  records_completeness_percentage?: number;
  /** Event coverage AFTER the photo penalty — drives the score, not this display. */
  completeness_percentage: number;
  status: string;
  requires_photos: boolean;
}

interface TransparencyCategoryBreakdownProps {
  categoryBreakdown: Record<string, CategoryData>;
  compact?: boolean;
}

// Message ids, resolved through intl at render time.
//
// NB these are the PRODUCER-side category names ("Chemical Applications"), which differ from
// the consumer-facing set in TransparencyDashboard's CATEGORY_CONSUMER_NAMES ("Treatment
// Details"). Both vocabularies are live on the same page today; the wording is preserved
// as-is here so this i18n pass changes no visible copy.
const CATEGORY_LABEL_IDS: Record<string, string> = {
  production: "transparency.breakdownCategoryProduction",
  chemical: "transparency.breakdownCategoryChemical",
  soil: "transparency.breakdownCategorySoil",
  pest: "transparency.breakdownCategoryPest",
  business: "transparency.breakdownCategoryBusiness",
  weather: "transparency.breakdownCategoryWeather",
  general: "transparency.breakdownCategoryGeneral"
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
  const intl = useIntl();
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
        const labelId = CATEGORY_LABEL_IDS[key];
        const label = labelId ? intl.formatMessage({ id: labelId }) : key;
        const weight = CATEGORY_WEIGHTS[key] || 5;
        const hasEvents = cat.actual_count > 0;

        // This row reports RECORD COVERAGE, not the score.
        //
        // `completeness_percentage` is record coverage multiplied by a photo penalty
        // (0.5 + 0.5 x rate for essential subtypes). Showing that product here told a grower with
        // 20 complete spray records and no photos that they were at 50% — on records that satisfy
        // NOP 205.103, which asks for auditable records and never for photographs. Photos serve the
        // consumer QR page; they are reported separately below as a count.
        //
        // The penalty is untouched and still drives the transparency score. It just no longer
        // masquerades as documentation completeness. Falls back to the penalized value only for
        // payloads cached before the backend started returning the pre-penalty number.
        const records =
          cat.records_completeness_percentage ?? cat.completeness_percentage ?? 0;
        const colorScheme = getProgressColorScheme(records, hasEvents);
        const borderColor = getBorderColor(records, hasEvents);
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
                {records >= 90 && hasEvents && (
                  <Icon as={FaCheck} boxSize={3} color="green.500" />
                )}
                <Text fontSize="xs" color={mutedColor} whiteSpace="nowrap">
                  {hasEvents
                    ? intl.formatMessage(
                        { id: "transparency.breakdownEventCount" },
                        { count: cat.actual_count }
                      )
                    : intl.formatMessage({ id: "transparency.breakdownNoEvents" })}
                </Text>
              </HStack>
            </HStack>

            <Progress
              value={records}
              colorScheme={colorScheme}
              borderRadius="full"
              size="sm"
              bg={progressBg}
              mb={compact ? 1 : 2}
            />

            {!compact && (
              <HStack justify="space-between" spacing={2}>
                {/* Facts, always — two independent counts that cannot contradict each other.
                    The old line switched between "Fully documented", a photo-coverage string and a
                    percentage depending on thresholds, which is how "Fully documented" ended up
                    printed directly above "5 events are missing photo documentation". */}
                <Text fontSize="xs" color={mutedColor}>
                  {!hasEvents
                    ? intl.formatMessage(
                        { id: "transparency.breakdownLogEventsForWeight" },
                        { weight }
                      )
                    : cat.requires_photos
                    ? intl.formatMessage(
                        { id: "transparency.breakdownRecordsAndPhotos" },
                        { logged: cat.actual_count, photos: cat.photo_verified_count }
                      )
                    : intl.formatMessage(
                        { id: "transparency.breakdownRecordsOnly" },
                        { logged: cat.actual_count }
                      )}
                </Text>
                {hasEvents && (
                  <Badge
                    fontSize="xs"
                    colorScheme={colorScheme}
                    variant="subtle"
                    borderRadius="full"
                  >
                    {Math.round(records)}%
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
