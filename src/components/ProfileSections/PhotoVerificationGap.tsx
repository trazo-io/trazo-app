import React from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Icon,
  useColorModeValue,
  Badge
} from "@chakra-ui/react";
import { FaCamera, FaCheckCircle } from "react-icons/fa";

interface CategoryData {
  actual_count: number;
  photo_verified_count: number;
  photo_verification_rate?: number;
  requires_photos: boolean;
}

interface PhotoVerificationGapProps {
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

const CATEGORY_ORDER = ["production", "chemical", "soil", "pest", "business", "weather", "general"];

const PhotoVerificationGap: React.FC<PhotoVerificationGapProps> = ({
  categoryBreakdown,
  compact = false
}) => {
  const rowBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.700", "gray.200");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const successBg = useColorModeValue("green.50", "green.900");
  const successBorder = useColorModeValue("green.200", "green.700");
  const successText = useColorModeValue("green.700", "green.300");
  const successSubColor = useColorModeValue("green.600", "green.400");
  const progressBg = useColorModeValue("gray.200", "gray.600");

  // Only show categories where photos are required and there is a gap
  const gapCategories = CATEGORY_ORDER
    .filter((key) => {
      const cat = categoryBreakdown[key];
      if (!cat) return false;
      return cat.requires_photos && cat.actual_count > 0 && cat.photo_verified_count < cat.actual_count;
    })
    .map((key) => ({ key, cat: categoryBreakdown[key] }));

  // Summary counts across all photo-required categories
  const totalPhotoRequired = Object.entries(categoryBreakdown)
    .filter(([, cat]) => cat.requires_photos && cat.actual_count > 0)
    .reduce((sum, [, cat]) => sum + cat.actual_count, 0);

  const totalPhotoCovered = Object.entries(categoryBreakdown)
    .filter(([, cat]) => cat.requires_photos && cat.actual_count > 0)
    .reduce((sum, [, cat]) => sum + cat.photo_verified_count, 0);

  const totalMissing = totalPhotoRequired - totalPhotoCovered;

  if (compact) {
    if (totalMissing === 0) {
      return (
        <HStack spacing={2}>
          <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
          <Text fontSize="xs" color="green.600" fontWeight="medium">
            All essential events documented with photos
          </Text>
        </HStack>
      );
    }
    return (
      <HStack spacing={2}>
        <Icon as={FaCamera} color="orange.400" boxSize={4} />
        <Text fontSize="xs" color="orange.600" fontWeight="medium">
          {`${totalMissing} of ${totalPhotoRequired} essential events need photos`}
        </Text>
      </HStack>
    );
  }

  if (gapCategories.length === 0) {
    return (
      <Box
        bg={successBg}
        border="1px solid"
        borderColor={successBorder}
        borderRadius="xl"
        p={4}
      >
        <HStack spacing={3}>
          <Icon as={FaCheckCircle} color="green.500" boxSize={5} flexShrink={0} />
          <VStack align="start" spacing={0} flex={1}>
            <Text fontWeight="bold" color={successText} fontSize="sm">
              All essential events documented with photos
            </Text>
            <Text fontSize="xs" color={successSubColor}>
              Photo evidence increases consumer trust and your transparency score.
            </Text>
          </VStack>
        </HStack>
      </Box>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      {/* Summary row */}
      <HStack spacing={2} flexWrap="wrap">
        <Icon as={FaCamera} color="orange.400" boxSize={4} flexShrink={0} />
        <Text fontSize="sm" color={textColor} fontWeight="medium">
          {`${totalMissing} of ${totalPhotoRequired} essential events need photos`}
        </Text>
        <Badge colorScheme="orange" fontSize="xs" borderRadius="full" variant="subtle">
          {`${Math.round((totalPhotoCovered / totalPhotoRequired) * 100)}% covered`}
        </Badge>
      </HStack>

      {/* Per-category gap rows */}
      {gapCategories.map(({ key, cat }) => {
        const label = CATEGORY_LABELS[key] || key;
        const verifiedCount = cat.photo_verified_count;
        const totalCount = cat.actual_count;
        const rate =
          cat.photo_verification_rate !== undefined
            ? cat.photo_verification_rate
            : totalCount > 0
            ? (verifiedCount / totalCount) * 100
            : 0;
        const missingCount = totalCount - verifiedCount;

        return (
          <Box
            key={key}
            bg={rowBg}
            border="1px solid"
            borderColor="orange.200"
            borderRadius="lg"
            p={3}
          >
            <HStack justify="space-between" mb={2} spacing={2} flexWrap="wrap">
              <HStack spacing={2} minW={0} flex={1}>
                <Icon
                  as={FaCamera}
                  color={rate >= 80 ? "green.500" : "orange.400"}
                  boxSize={3.5}
                  flexShrink={0}
                />
                <Text fontSize="sm" fontWeight="semibold" color={textColor} noOfLines={1}>
                  {label}
                </Text>
              </HStack>
              <Text fontSize="xs" color={mutedColor} whiteSpace="nowrap" flexShrink={0}>
                {`${verifiedCount} of ${totalCount} have photos`}
              </Text>
            </HStack>

            <Progress
              value={rate}
              colorScheme={rate >= 80 ? "green" : rate >= 50 ? "yellow" : "orange"}
              borderRadius="full"
              size="sm"
              bg={progressBg}
            />

            <Text fontSize="xs" color="orange.600" mt={1}>
              {missingCount === 1
                ? "1 event is missing photo documentation"
                : `${missingCount} events are missing photo documentation`}
            </Text>
          </Box>
        );
      })}
    </VStack>
  );
};

export default PhotoVerificationGap;
