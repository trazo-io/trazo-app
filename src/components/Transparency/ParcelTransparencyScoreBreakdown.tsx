import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Icon,
  Badge,
  SimpleGrid,
  Circle,
  Divider,
  Button,
  useColorModeValue
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaLightbulb,
  FaEdit,
  FaCamera,
  FaCertificate,
  FaLeaf,
  FaFileAlt,
  FaSeedling,
  FaChartLine
} from 'react-icons/fa';
import { StandardCard } from '../Design/StandardComponents';

interface ParcelTransparencyData {
  transparency_score?: number;
  transparency_description?: string;
  sustainability_practices?: string;
  consumer_story?: string;
  images?: string[] | { id: number; url: string }[];
  certified?: boolean;
  certification_type?: string;
}

interface ScoreCategory {
  id: string;
  label: string;
  maxPoints: number;
  currentPoints: number;
  icon: React.ElementType;
  color: string;
  requirement: string;
  tip: string;
  isComplete: boolean;
}

interface ParcelTransparencyScoreBreakdownProps {
  parcelData: ParcelTransparencyData;
  variant?: 'full' | 'compact' | 'form-preview';
  onEditClick?: () => void;
  showEditButton?: boolean;
}

/**
 * ParcelTransparencyScoreBreakdown
 *
 * A reusable component that shows farmers exactly how their parcel's
 * transparency score is calculated and what they can do to improve it.
 *
 * Design patterns follow Trazo standards:
 * - Color-coded categories (green, blue, purple, orange)
 * - StandardCard wrapper with flat variant
 * - Progress indicators with visual feedback
 * - Actionable improvement tips
 */
export const ParcelTransparencyScoreBreakdown: React.FC<ParcelTransparencyScoreBreakdownProps> = ({
  parcelData,
  variant = 'full',
  onEditClick,
  showEditButton = true
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  // Calculate score breakdown matching backend logic
  const calculateScoreBreakdown = (): ScoreCategory[] => {
    const desc = parcelData.transparency_description || '';
    const descLength = desc.trim().length;

    // Description points (40 max)
    let descPoints = 0;
    if (descLength >= 100) descPoints = 40;
    else if (descLength >= 50) descPoints = 30;
    else if (descLength >= 10) descPoints = 20;

    // Sustainability practices (30 max)
    const hasPractices = !!(parcelData.sustainability_practices?.trim());
    const practicesPoints = hasPractices ? 30 : 0;

    // Images (20 max)
    const imageCount = Array.isArray(parcelData.images) ? parcelData.images.length : 0;
    let imagePoints = 0;
    if (imageCount >= 3) imagePoints = 20;
    else if (imageCount >= 1) imagePoints = 15;

    // Certification (10 max)
    const hasCert = parcelData.certified && !!parcelData.certification_type;
    const certPoints = hasCert ? 10 : 0;

    return [
      {
        id: 'description',
        label: 'Description Quality',
        maxPoints: 40,
        currentPoints: descPoints,
        icon: FaFileAlt,
        color: 'green',
        requirement: descLength >= 100
          ? 'Excellent! 100+ characters'
          : descLength >= 50
            ? `Good (${descLength} chars) - add more for full points`
            : descLength >= 10
              ? `Basic (${descLength} chars) - aim for 100+ chars`
              : 'Need at least 10 characters',
        tip: descLength < 100
          ? 'Write a detailed description (100+ characters) explaining what makes this parcel special for consumers.'
          : 'Great job! Your description helps consumers understand this parcel.',
        isComplete: descPoints === 40
      },
      {
        id: 'practices',
        label: 'Sustainability Practices',
        maxPoints: 30,
        currentPoints: practicesPoints,
        icon: FaSeedling,
        color: 'blue',
        requirement: hasPractices ? 'Documented' : 'Not documented',
        tip: hasPractices
          ? 'Great! Your sustainability practices are documented.'
          : 'Add key sustainability practices like water conservation, soil health, or pest management.',
        isComplete: practicesPoints === 30
      },
      {
        id: 'images',
        label: 'Visual Documentation',
        maxPoints: 20,
        currentPoints: imagePoints,
        icon: FaCamera,
        color: 'purple',
        requirement: imageCount >= 3
          ? `Excellent! ${imageCount} images`
          : imageCount >= 1
            ? `${imageCount} image${imageCount > 1 ? 's' : ''} - add ${3 - imageCount} more`
            : 'No images uploaded',
        tip: imageCount < 3
          ? 'Upload 3+ high-quality images showing your parcel and farming practices.'
          : 'Excellent visual documentation!',
        isComplete: imagePoints === 20
      },
      {
        id: 'certification',
        label: 'Certification',
        maxPoints: 10,
        currentPoints: certPoints,
        icon: FaCertificate,
        color: 'orange',
        requirement: hasCert
          ? `${parcelData.certification_type}`
          : 'Not certified',
        tip: hasCert
          ? `Your ${parcelData.certification_type} certification adds credibility.`
          : 'Add certification (Organic, GAP, etc.) to boost consumer trust.',
        isComplete: certPoints === 10
      }
    ];
  };

  const categories = calculateScoreBreakdown();
  const totalScore = categories.reduce((sum, cat) => sum + cat.currentPoints, 0);
  const maxScore = 100;
  const completedCategories = categories.filter(c => c.isComplete).length;

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
  };

  const scoreColor = getScoreColor(totalScore);

  // Compact variant for form preview
  if (variant === 'form-preview') {
    return (
      <Box
        p={4}
        bg={`${scoreColor}.50`}
        borderRadius="lg"
        border="1px"
        borderColor={`${scoreColor}.200`}
      >
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <HStack>
              <Icon as={FaChartLine} color={`${scoreColor}.500`} />
              <Text fontWeight="bold" color={`${scoreColor}.700`}>
                Transparency Score Preview
              </Text>
            </HStack>
            <Badge
              colorScheme={scoreColor}
              variant="solid"
              fontSize="lg"
              px={3}
              py={1}
              borderRadius="full"
            >
              {totalScore}%
            </Badge>
          </HStack>

          <Progress
            value={totalScore}
            colorScheme={scoreColor}
            size="sm"
            borderRadius="full"
            bg={`${scoreColor}.100`}
          />

          <SimpleGrid columns={2} spacing={2}>
            {categories.map((cat) => (
              <HStack key={cat.id} spacing={2}>
                <Icon
                  as={cat.isComplete ? FaCheckCircle : FaExclamationCircle}
                  color={cat.isComplete ? 'green.500' : 'gray.400'}
                  boxSize={3}
                />
                <Text fontSize="xs" color={textColor}>
                  {cat.label}: {cat.currentPoints}/{cat.maxPoints}
                </Text>
              </HStack>
            ))}
          </SimpleGrid>
        </VStack>
      </Box>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Box
        p={4}
        bg="gray.50"
        borderRadius="lg"
        border="1px"
        borderColor="gray.200"
      >
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <Text fontWeight="medium" color={textColor}>
              Transparency Score
            </Text>
            <Badge
              colorScheme={scoreColor}
              variant="solid"
              px={3}
              py={1}
              borderRadius="full"
            >
              {totalScore}%
            </Badge>
          </HStack>

          <Progress
            value={totalScore}
            colorScheme={scoreColor}
            size="sm"
            borderRadius="full"
          />

          <Text fontSize="sm" color={mutedColor}>
            {completedCategories}/4 categories complete
          </Text>
        </VStack>
      </Box>
    );
  }

  // Full variant (default)
  return (
    <StandardCard
      title="Transparency Score Breakdown"
      subtitle="See how your score is calculated and how to improve"
      icon={FaChartLine}
      variant="flat"
    >
      <VStack spacing={6} align="stretch">
        {/* Overall Score Circle */}
        <HStack justify="center" spacing={6}>
          <VStack spacing={2}>
            <Circle
              size="100px"
              bg={`${scoreColor}.100`}
              border="4px solid"
              borderColor={`${scoreColor}.400`}
            >
              <VStack spacing={0}>
                <Text fontSize="2xl" fontWeight="bold" color={`${scoreColor}.600`}>
                  {totalScore}
                </Text>
                <Text fontSize="xs" color={`${scoreColor}.500`}>
                  / 100
                </Text>
              </VStack>
            </Circle>
            <Badge
              colorScheme={scoreColor}
              variant="subtle"
              fontSize="sm"
              px={3}
              py={1}
            >
              {totalScore >= 80 ? 'Excellent' :
               totalScore >= 60 ? 'Good' :
               totalScore >= 40 ? 'Fair' : 'Needs Work'}
            </Badge>
          </VStack>

          <VStack align="start" spacing={1}>
            <Text fontWeight="bold" color={textColor}>
              {completedCategories}/4 Categories Complete
            </Text>
            <Text fontSize="sm" color={mutedColor}>
              {totalScore >= 80
                ? 'Great transparency! Consumers will trust your products.'
                : totalScore >= 60
                  ? 'Good progress! A few improvements will boost trust.'
                  : 'Complete more sections to build consumer confidence.'}
            </Text>
          </VStack>
        </HStack>

        <Divider />

        {/* Category Breakdown */}
        <VStack spacing={4} align="stretch">
          <Text fontWeight="bold" color={textColor} fontSize="md">
            Score Breakdown
          </Text>

          {categories.map((category) => (
            <Box
              key={category.id}
              p={4}
              bg={category.isComplete ? `${category.color}.50` : 'gray.50'}
              borderRadius="lg"
              border="1px"
              borderColor={category.isComplete ? `${category.color}.200` : 'gray.200'}
            >
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <HStack spacing={3}>
                    <Circle
                      size="32px"
                      bg={category.isComplete ? `${category.color}.100` : 'gray.100'}
                    >
                      <Icon
                        as={category.icon}
                        color={category.isComplete ? `${category.color}.500` : 'gray.400'}
                        boxSize={4}
                      />
                    </Circle>
                    <VStack spacing={0} align="start">
                      <Text fontWeight="medium" color={textColor}>
                        {category.label}
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        {category.requirement}
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack spacing={2}>
                    <Text
                      fontWeight="bold"
                      color={category.isComplete ? `${category.color}.600` : 'gray.500'}
                    >
                      {category.currentPoints}/{category.maxPoints}
                    </Text>
                    <Icon
                      as={category.isComplete ? FaCheckCircle : FaExclamationCircle}
                      color={category.isComplete ? 'green.500' : 'orange.400'}
                    />
                  </HStack>
                </HStack>

                <Progress
                  value={(category.currentPoints / category.maxPoints) * 100}
                  colorScheme={category.color}
                  size="sm"
                  borderRadius="full"
                  bg="gray.200"
                />

                {!category.isComplete && (
                  <HStack
                    spacing={2}
                    p={2}
                    bg={`${category.color}.50`}
                    borderRadius="md"
                  >
                    <Icon as={FaLightbulb} color={`${category.color}.500`} boxSize={3} />
                    <Text fontSize="sm" color={`${category.color}.700`}>
                      {category.tip}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Box>
          ))}
        </VStack>

        {/* Action Button */}
        {showEditButton && onEditClick && totalScore < 100 && (
          <>
            <Divider />
            <HStack justify="center">
              <Button
                leftIcon={<FaEdit />}
                colorScheme="green"
                variant="solid"
                onClick={onEditClick}
              >
                Improve Transparency Score
              </Button>
            </HStack>
          </>
        )}

        {/* Success Message */}
        {totalScore === 100 && (
          <Box
            p={4}
            bg="green.50"
            borderRadius="lg"
            border="1px"
            borderColor="green.200"
          >
            <HStack spacing={3}>
              <Icon as={FaCheckCircle} color="green.500" boxSize={5} />
              <VStack spacing={0} align="start">
                <Text fontWeight="bold" color="green.700">
                  Perfect Transparency Score!
                </Text>
                <Text fontSize="sm" color="green.600">
                  Consumers will have complete confidence in your products.
                </Text>
              </VStack>
            </HStack>
          </Box>
        )}
      </VStack>
    </StandardCard>
  );
};

export default ParcelTransparencyScoreBreakdown;
