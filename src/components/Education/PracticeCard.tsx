import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  Badge,
  Progress,
  Collapse,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
  useBreakpointValue,
  Flex,
  Image,
  Link,
  Divider
} from '@chakra-ui/react';
import {
  FaPlay,
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaStar,
  FaLeaf,
  FaTractor,
  FaCamera,
  FaExternalLinkAlt,
  FaAward
} from 'react-icons/fa';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

interface PracticeStep {
  id: string;
  title: string;
  description: string;
  completed?: boolean;
  actionType?: 'documentation' | 'photo' | 'verification' | 'analysis';
  estimatedTime?: number;
  transparencyPoints?: number;
}

interface PracticeCardProps {
  title: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  transparencyImpact: string;
  description: string;
  learningObjectives: string[];
  practiceSteps: PracticeStep[];
  successMetrics?: {
    transparencyScoreIncrease: number;
    timeToValue: string;
    premiumPotential: string;
  };
  onStartPractice?: () => void;
  onStepComplete?: (stepId: string) => void;
  onViewProgress?: () => void;
  isCompleted?: boolean;
  completedSteps?: string[];
  imageUrl?: string;
}

const PracticeCard: React.FC<PracticeCardProps> = ({
  title,
  category,
  difficulty,
  estimatedDuration,
  transparencyImpact,
  description,
  learningObjectives,
  practiceSteps,
  successMetrics,
  onStartPractice,
  onStepComplete,
  onViewProgress,
  isCompleted = false,
  completedSteps = [],
  imageUrl
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const cardPadding = useBreakpointValue({ base: 4, md: 6 });

  // Theme colors
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const successColor = useColorModeValue('green.500', 'green.300');

  // Calculate completion progress
  const completionPercentage = (completedSteps.length / practiceSteps.length) * 100;
  const isStarted = completedSteps.length > 0;

  // Get category color
  const getCategoryColor = (cat: string) => {
    const name = cat.toLowerCase();
    if (name.includes('transparency') || name.includes('getting started')) return 'blue';
    if (name.includes('farm events') || name.includes('mastery')) return 'green';
    if (name.includes('trust') || name.includes('consumer')) return 'pink';
    if (name.includes('technology') || name.includes('qr')) return 'purple';
    if (name.includes('market') || name.includes('pricing')) return 'orange';
    if (name.includes('carbon') || name.includes('supporting')) return 'teal';
    if (name.includes('compliance')) return 'yellow';
    return 'gray';
  };

  const categoryColor = getCategoryColor(category);

  // Get step action icon
  const getStepActionIcon = (actionType?: string) => {
    switch (actionType) {
      case 'documentation':
        return FaTractor;
      case 'photo':
        return FaCamera;
      case 'verification':
        return FaAward;
      case 'analysis':
        return FaLeaf;
      default:
        return FaCheck;
    }
  };

  return (
    <Card
      bg={cardBgColor}
      borderRadius="xl"
      boxShadow="lg"
      border="1px"
      borderColor={isCompleted ? successColor : borderColor}
      transition="all 0.3s ease"
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: '2xl',
        borderColor: `${categoryColor}.200`
      }}
      overflow="hidden"
    >
      {/* Header with image if available */}
      {imageUrl && (
        <Box position="relative" overflow="hidden" h="180px">
          <Image src={imageUrl} alt={title} w="full" h="full" objectFit="cover" />
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.400"
            display="flex"
            alignItems="end"
            p={4}
          >
            <VStack align="start" spacing={1}>
              <Badge colorScheme={categoryColor} size="sm">
                {category}
              </Badge>
              <Heading size="md" color="white" textShadow="0 1px 3px rgba(0,0,0,0.5)">
                {title}
              </Heading>
            </VStack>
          </Box>
        </Box>
      )}

      <CardHeader pb={2}>
        {!imageUrl && (
          <VStack align="stretch" spacing={2}>
            <HStack justify="space-between" align="start">
              <Badge colorScheme={categoryColor} size="sm">
                {category}
              </Badge>
              <Badge
                colorScheme={
                  difficulty === 'beginner'
                    ? 'green'
                    : difficulty === 'intermediate'
                    ? 'yellow'
                    : 'red'
                }
                size="sm"
              >
                {difficulty}
              </Badge>
            </HStack>
            <Heading size="md" color={textColor}>
              {title}
            </Heading>
          </VStack>
        )}

        {/* Progress indicator for started practices */}
        {isStarted && !isCompleted && (
          <Box mt={3}>
            <HStack justify="space-between" fontSize="sm" mb={2}>
              <Text color={textColor} fontWeight="medium">
                Progress
              </Text>
              <Text color={textColor}>
                {completedSteps.length} of {practiceSteps.length} steps
              </Text>
            </HStack>
            <Progress
              value={completionPercentage}
              colorScheme={categoryColor}
              size="md"
              borderRadius="full"
              bg={useColorModeValue('gray.100', 'gray.700')}
            />
          </Box>
        )}

        {/* Completion celebration */}
        {isCompleted && (
          <HStack p={3} bg={useColorModeValue('green.50', 'green.900')} borderRadius="lg" mt={3}>
            <Icon as={FaAward} color={successColor} boxSize={5} />
            <Text color={successColor} fontWeight="semibold" fontSize="sm">
              Practice Completed! 🎉
            </Text>
          </HStack>
        )}
      </CardHeader>

      <CardBody pt={0}>
        <VStack align="stretch" spacing={4}>
          {/* Core metrics */}
          <HStack spacing={4} flexWrap="wrap">
            <HStack fontSize="sm" color={mutedTextColor}>
              <Icon as={FaClock} />
              <Text>{estimatedDuration}min</Text>
            </HStack>
            {successMetrics?.transparencyScoreIncrease && (
              <HStack fontSize="sm" color={successColor}>
                <Icon as={FaStar} />
                <Text>+{successMetrics.transparencyScoreIncrease}% transparency</Text>
              </HStack>
            )}
          </HStack>

          {/* Description */}
          <Text fontSize="sm" color={textColor} lineHeight="tall">
            {description}
          </Text>

          {/* Transparency impact highlight */}
          <Box
            p={3}
            bg={useColorModeValue(`${categoryColor}.50`, `${categoryColor}.900`)}
            borderRadius="lg"
            borderLeft="4px"
            borderLeftColor={`${categoryColor}.500`}
          >
            <Text
              fontSize="sm"
              color={useColorModeValue(`${categoryColor}.700`, `${categoryColor}.200`)}
              fontWeight="medium"
            >
              💡 {transparencyImpact}
            </Text>
          </Box>

          {/* Action buttons */}
          <VStack align="stretch" spacing={3}>
            {!isStarted ? (
              <Button
                colorScheme={categoryColor}
                size="lg"
                leftIcon={<Icon as={FaPlay} />}
                onClick={onStartPractice}
                w="full"
              >
                Start Practice
              </Button>
            ) : !isCompleted ? (
              <Button
                colorScheme={categoryColor}
                size="lg"
                leftIcon={<Icon as={FaPlay} />}
                onClick={onViewProgress}
                w="full"
              >
                Continue Practice ({completionPercentage.toFixed(0)}%)
              </Button>
            ) : (
              <Button
                variant="outline"
                colorScheme={categoryColor}
                size="lg"
                leftIcon={<Icon as={FaAward} />}
                onClick={onViewProgress}
                w="full"
              >
                Review Completed Practice
              </Button>
            )}

            {/* Expand/collapse for details */}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Icon as={isExpanded ? FaChevronUp : FaChevronDown} />}
              onClick={() => setIsExpanded(!isExpanded)}
              color={mutedTextColor}
            >
              {isExpanded ? 'Hide' : 'Show'} Practice Details
            </Button>
          </VStack>

          {/* Expanded content */}
          <Collapse in={isExpanded} animateOpacity>
            <VStack align="stretch" spacing={4} pt={2}>
              <Divider />

              {/* Learning objectives */}
              <Box>
                <Heading size="sm" color={textColor} mb={3}>
                  What You'll Learn
                </Heading>
                <List spacing={2}>
                  {learningObjectives.map((objective, index) => (
                    <ListItem key={index} fontSize="sm" color={textColor}>
                      <ListIcon as={FaCheck} color={`${categoryColor}.500`} />
                      {objective}
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Practice steps preview */}
              <Box>
                <Heading size="sm" color={textColor} mb={3}>
                  Practice Steps ({practiceSteps.length})
                </Heading>
                <VStack align="stretch" spacing={2}>
                  {practiceSteps.slice(0, 3).map((step, index) => (
                    <HStack
                      key={step.id}
                      p={3}
                      bg={
                        completedSteps.includes(step.id)
                          ? useColorModeValue('green.50', 'green.900')
                          : useColorModeValue('gray.50', 'gray.700')
                      }
                      borderRadius="lg"
                      spacing={3}
                    >
                      <Icon
                        as={
                          completedSteps.includes(step.id)
                            ? FaCheck
                            : getStepActionIcon(step.actionType)
                        }
                        color={
                          completedSteps.includes(step.id) ? successColor : `${categoryColor}.500`
                        }
                        boxSize={4}
                      />
                      <VStack align="start" spacing={1} flex={1}>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color={textColor}
                          textDecor={completedSteps.includes(step.id) ? 'line-through' : 'none'}
                        >
                          {step.title}
                        </Text>
                        <Text fontSize="xs" color={mutedTextColor}>
                          {step.description}
                        </Text>
                        {step.transparencyPoints && (
                          <HStack fontSize="xs" color={`${categoryColor}.500`}>
                            <Icon as={FaStar} />
                            <Text>+{step.transparencyPoints} transparency points</Text>
                          </HStack>
                        )}
                      </VStack>
                    </HStack>
                  ))}

                  {practiceSteps.length > 3 && (
                    <Text fontSize="sm" color={mutedTextColor} textAlign="center">
                      ... and {practiceSteps.length - 3} more steps
                    </Text>
                  )}
                </VStack>
              </Box>

              {/* Success metrics */}
              {successMetrics && (
                <Box>
                  <Heading size="sm" color={textColor} mb={3}>
                    Expected Results
                  </Heading>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between" fontSize="sm">
                      <Text color={mutedTextColor}>Transparency Score Increase:</Text>
                      <Text color={successColor} fontWeight="medium">
                        +{successMetrics.transparencyScoreIncrease}%
                      </Text>
                    </HStack>
                    <HStack justify="space-between" fontSize="sm">
                      <Text color={mutedTextColor}>Time to See Results:</Text>
                      <Text color={textColor} fontWeight="medium">
                        {successMetrics.timeToValue}
                      </Text>
                    </HStack>
                    <HStack justify="space-between" fontSize="sm">
                      <Text color={mutedTextColor}>Premium Potential:</Text>
                      <Text color={`${categoryColor}.500`} fontWeight="medium">
                        {successMetrics.premiumPotential}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          </Collapse>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default PracticeCard;
