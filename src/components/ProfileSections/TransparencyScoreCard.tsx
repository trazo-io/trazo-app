import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  CircularProgress,
  CircularProgressLabel,
  Progress,
  Badge,
  Button,
  Flex,
  useBreakpointValue,
} from '@chakra-ui/react';
import { FaCheck, FaLightbulb, FaChevronRight } from 'react-icons/fa';

interface TransparencyLevel {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

const TRANSPARENCY_LEVELS: TransparencyLevel[] = [
  {
    min: 0,
    max: 50,
    label: 'Getting Started',
    color: 'orange',
    description: 'Begin documenting practices',
  },
  {
    min: 50,
    max: 70,
    label: 'Building',
    color: 'yellow',
    description: 'Good documentation progress',
  },
  {
    min: 70,
    max: 90,
    label: 'Strong',
    color: 'blue',
    description: 'Excellent transparency',
  },
  {
    min: 90,
    max: 100,
    label: 'Exceptional',
    color: 'green',
    description: 'Outstanding transparency',
  },
];

interface TransparencyScoreCardProps {
  score: number;
  label?: string;
  type?: 'parcel' | 'production'; // To distinguish between the two
  eventCount?: number;
  nextStepTitle?: string;
  nextSteps?: string[];
  onImprove?: () => void;
  showProgress?: boolean;
  compact?: boolean;
}

const TransparencyScoreCard: React.FC<TransparencyScoreCardProps> = ({
  score,
  label = 'Transparency Score',
  type = 'production',
  eventCount,
  nextStepTitle,
  nextSteps = [],
  onImprove,
  showProgress = true,
  compact = false,
}) => {
  const currentLevel = TRANSPARENCY_LEVELS.find(
    (level) => score >= level.min && score <= level.max
  ) || TRANSPARENCY_LEVELS[0];

  const nextLevel = TRANSPARENCY_LEVELS[TRANSPARENCY_LEVELS.indexOf(currentLevel) + 1];
  const scoreInRange = nextLevel
    ? Math.min(score - currentLevel.min, nextLevel.min - currentLevel.min)
    : score - currentLevel.min;
  const rangeSize = nextLevel
    ? nextLevel.min - currentLevel.min
    : 100 - currentLevel.min;
  const progressPercent = nextLevel ? (scoreInRange / rangeSize) * 100 : 100;

  const isMobile = useBreakpointValue({ base: true, md: false });

  const typeLabel =
    type === 'parcel'
      ? 'Parcel Documentation Score'
      : 'Farm Transparency Score';

  return (
    <Box
      bg={`${currentLevel.color}.50`}
      border="2px solid"
      borderColor={`${currentLevel.color}.200`}
      borderRadius="lg"
      p={{ base: 4, md: 6 }}
      mb={4}
    >
      {/* Header */}
      <VStack align="flex-start" spacing={4}>
        {/* Title and Score */}
        <HStack spacing={4} justify="space-between" w="full">
          <VStack align="flex-start" spacing={1}>
            <Text fontSize="sm" color="gray.600" fontWeight="semibold" textTransform="uppercase">
              {type === 'parcel' ? typeLabel : 'Consumer Trust Score'}
            </Text>
            <HStack spacing={2} align="flex-end">
              <CircularProgress
                value={score}
                size={!isMobile && !compact ? '120px' : '80px'}
                color={currentLevel.color}
                thickness={4}
              >
                <CircularProgressLabel fontSize={isMobile ? 'xl' : '2xl'}>
                  {Math.round(score)}%
                </CircularProgressLabel>
              </CircularProgress>
              <VStack align="flex-start" spacing={0}>
                <Text fontSize={compact ? 'sm' : 'md'} fontWeight="bold" color="gray.900">
                  {currentLevel.label}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {currentLevel.description}
                </Text>
              </VStack>
            </HStack>
          </VStack>
        </HStack>

        {/* Event Count if provided */}
        {eventCount !== undefined && (
          <HStack spacing={4} w="full">
            <Badge colorScheme={currentLevel.color} variant="solid" px={3} py={1}>
              {eventCount} Events Documented
            </Badge>
          </HStack>
        )}

        {/* Progress to Next Level */}
        {showProgress && nextLevel && (
          <VStack align="flex-start" spacing={2} w="full">
            <Flex justify="space-between" w="full">
              <Text fontSize="sm" color="gray.700" fontWeight="medium">
                Progress to {nextLevel.label}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {Math.round(score)}% / {nextLevel.min}%
              </Text>
            </Flex>
            <Progress
              value={progressPercent}
              size="sm"
              colorScheme={currentLevel.color}
              borderRadius="full"
              w="full"
            />
          </VStack>
        )}

        {/* Why This Matters */}
        <Box
          bg="white"
          borderRadius="lg"
          p={3}
          w="full"
          borderLeft="4px solid"
          borderLeftColor={`${currentLevel.color}.500`}
        >
          <HStack spacing={2} mb={1}>
            <FaLightbulb color={currentLevel.color} size={16} />
            <Text fontSize="sm" fontWeight="semibold" color="gray.900">
              Why This Matters
            </Text>
          </HStack>
          <Text fontSize="sm" color="gray.700" lineHeight="1.6">
            {type === 'parcel'
              ? 'Higher documentation scores build consumer trust and demonstrate your commitment to transparency. Complete all fields in your parcel profile to improve this score.'
              : 'Higher transparency shows consumers exactly how their food was grown. Each documented event and verified practice increases consumer confidence in your farming practices.'}
          </Text>
        </Box>

        {/* Next Steps */}
        {nextSteps.length > 0 && (
          <VStack align="flex-start" spacing={2} w="full">
            <Text fontSize="sm" fontWeight="semibold" color="gray.900">
              {nextStepTitle || 'Next Steps for Improvement'}
            </Text>
            {nextSteps.map((step, idx) => (
              <HStack key={idx} spacing={2} fontSize="sm" color="gray.700">
                <Box as="span" color={`${currentLevel.color}.500`}>
                  <FaCheck size={12} />
                </Box>
                <Text>{step}</Text>
              </HStack>
            ))}
          </VStack>
        )}

        {/* Action Button */}
        {onImprove && (
          <Button
            colorScheme={currentLevel.color}
            variant="solid"
            size="sm"
            rightIcon={<FaChevronRight />}
            onClick={onImprove}
            w={{ base: 'full', md: 'auto' }}
          >
            Improve Score
          </Button>
        )}
      </VStack>
    </Box>
  );
};

export default TransparencyScoreCard;
