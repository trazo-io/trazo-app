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
  SimpleGrid,
  useColorModeValue,
  useBreakpointValue,
  Flex,
  Center,
  Circle,
  Divider
} from '@chakra-ui/react';
import {
  FaRocket,
  FaFlag,
  FaAward,
  FaStar,
  FaArrowRight,
  FaCheck,
  FaLock,
  FaClock,
  FaChartLine
} from 'react-icons/fa';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import PracticeCard from './PracticeCard';

interface PathwayStage {
  id: string;
  title: string;
  description: string;
  practices: Practice[];
  requiredCompletions: number;
  unlockMessage?: string;
  estimatedTimeHours: number;
  transparencyScoreTarget: number;
  premiumPotential: string;
}

interface Practice {
  id: string;
  title: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  transparencyImpact: string;
  description: string;
  learningObjectives: string[];
  practiceSteps: Array<{
    id: string;
    title: string;
    description: string;
    actionType?: 'documentation' | 'photo' | 'verification' | 'analysis';
    estimatedTime?: number;
    transparencyPoints?: number;
  }>;
  successMetrics?: {
    transparencyScoreIncrease: number;
    timeToValue: string;
    premiumPotential: string;
  };
  imageUrl?: string;
  isCompleted?: boolean;
  completedSteps?: string[];
}

interface LearningPathwayProps {
  title: string;
  description: string;
  overallGoal: string;
  stages: PathwayStage[];
  userProgress?: {
    completedPractices: string[];
    currentStage: number;
    totalTransparencyGain: number;
    timeSpent: number;
  };
  onPracticeStart?: (practiceId: string) => void;
  onPracticeComplete?: (practiceId: string) => void;
  onStageComplete?: (stageId: string) => void;
}

const LearningPathway: React.FC<LearningPathwayProps> = ({
  title,
  description,
  overallGoal,
  stages,
  userProgress,
  onPracticeStart,
  onPracticeComplete,
  onStageComplete
}) => {
  const [selectedStage, setSelectedStage] = useState(userProgress?.currentStage || 0);
  
  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const cardPadding = useBreakpointValue({ base: 4, md: 6 });
  
  // Theme colors
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const successColor = useColorModeValue('green.500', 'green.300');
  const primaryColor = useColorModeValue('blue.500', 'blue.300');
  
  // Calculate overall progress
  const totalPractices = stages.reduce((total, stage) => total + stage.practices.length, 0);
  const completedPractices = userProgress?.completedPractices.length || 0;
  const overallProgress = totalPractices > 0 ? (completedPractices / totalPractices) * 100 : 0;
  
  // Get stage completion status
  const getStageStatus = (stageIndex: number, stage: PathwayStage) => {
    const stageCompletedPractices = stage.practices.filter(practice =>
      userProgress?.completedPractices.includes(practice.id)
    ).length;
    
    const isUnlocked = stageIndex <= (userProgress?.currentStage || 0);
    const isCompleted = stageCompletedPractices >= stage.requiredCompletions;
    const isInProgress = isUnlocked && stageCompletedPractices > 0 && !isCompleted;
    
    return { isUnlocked, isCompleted, isInProgress, stageCompletedPractices };
  };

  return (
    <VStack spacing={8} align="stretch" w="full">
      {/* Pathway Header */}
      <Card bg={cardBgColor} borderRadius="xl" boxShadow="lg">
        <CardHeader>
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={2} flex={1}>
                <Heading size="lg" color={textColor}>
                  {title}
                </Heading>
                <Text color={mutedTextColor}>
                  {description}
                </Text>
              </VStack>
              <Icon as={FaRocket} boxSize={8} color={primaryColor} />
            </HStack>
            
            {/* Overall progress */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  Pathway Progress
                </Text>
                <Text fontSize="sm" color={textColor}>
                  {completedPractices} of {totalPractices} practices
                </Text>
              </HStack>
              <Progress 
                value={overallProgress} 
                colorScheme="blue"
                size="lg"
                borderRadius="full"
              />
            </Box>
            
            {/* Goal statement */}
            <Box 
              p={4}
              bg={useColorModeValue('blue.50', 'blue.900')}
              borderRadius="lg"
              borderLeft="4px"
              borderLeftColor="blue.500"
            >
              <HStack>
                <Icon as={FaFlag} color="blue.500" />
                <Text fontSize="sm" color="blue.600" fontWeight="medium">
                  Goal: {overallGoal}
                </Text>
              </HStack>
            </Box>
            
            {/* User progress stats */}
            {userProgress && (
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <Box textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color={successColor}>
                    +{userProgress.totalTransparencyGain}%
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>
                    Transparency Gained
                  </Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                    {Math.round(userProgress.timeSpent)}h
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>
                    Time Invested
                  </Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color={primaryColor}>
                    {userProgress.currentStage + 1}
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>
                    Current Stage
                  </Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                    {completedPractices}
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>
                    Practices Done
                  </Text>
                </Box>
              </SimpleGrid>
            )}
          </VStack>
        </CardHeader>
      </Card>
      
      {/* Stage Navigation */}
      <Card bg={cardBgColor} borderRadius="xl" boxShadow="sm">
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Heading size="md" color={textColor}>
              Learning Stages
            </Heading>
            
            {/* Stage progress line for desktop */}
            {!isMobile && (
              <Flex align="center" justify="center" position="relative" py={4}>
                {/* Progress line */}
                <Box
                  position="absolute"
                  top="50%"
                  left="10%"
                  right="10%"
                  h="2px"
                  bg={borderColor}
                  zIndex={1}
                />
                <Box
                  position="absolute"
                  top="50%"
                  left="10%"
                  h="2px"
                  bg={successColor}
                  zIndex={2}
                  width={`${((userProgress?.currentStage || 0) / (stages.length - 1)) * 80}%`}
                />
                
                {/* Stage indicators */}
                <HStack spacing={0} justify="space-between" w="80%" zIndex={3}>
                  {stages.map((stage, index) => {
                    const { isUnlocked, isCompleted, isInProgress } = getStageStatus(index, stage);
                    
                    return (
                      <VStack
                        key={stage.id}
                        spacing={2}
                        cursor={isUnlocked ? 'pointer' : 'default'}
                        onClick={() => isUnlocked && setSelectedStage(index)}
                      >
                        <Circle
                          size={12}
                          bg={
                            isCompleted 
                              ? successColor 
                              : isInProgress 
                                ? primaryColor 
                                : isUnlocked 
                                  ? 'gray.300' 
                                  : 'gray.100'
                          }
                          color="white"
                          border="3px"
                          borderColor={cardBgColor}
                          transition="all 0.2s"
                          _hover={isUnlocked ? { transform: 'scale(1.1)' } : {}}
                        >
                          <Icon 
                            as={
                              isCompleted 
                                ? FaCheck 
                                : isInProgress 
                                  ? FaChartLine
                                  : !isUnlocked 
                                    ? FaLock 
                                    : FaRocket
                            } 
                            boxSize={5} 
                          />
                        </Circle>
                        <Text 
                          fontSize="xs" 
                          color={isUnlocked ? textColor : mutedTextColor}
                          textAlign="center"
                          maxW="60px"
                          fontWeight={selectedStage === index ? 'bold' : 'normal'}
                        >
                          Stage {index + 1}
                        </Text>
                      </VStack>
                    );
                  })}
                </HStack>
              </Flex>
            )}
            
            {/* Mobile stage selector */}
            {isMobile && (
              <HStack spacing={2} overflowX="auto" pb={2}>
                {stages.map((stage, index) => {
                  const { isUnlocked, isCompleted, isInProgress } = getStageStatus(index, stage);
                  
                  return (
                    <Button
                      key={stage.id}
                      size="sm"
                      variant={selectedStage === index ? 'solid' : 'outline'}
                      colorScheme={isCompleted ? 'green' : isInProgress ? 'blue' : 'gray'}
                      leftIcon={
                        <Icon 
                          as={
                            isCompleted 
                              ? FaCheck 
                              : !isUnlocked 
                                ? FaLock 
                                : FaRocket
                          } 
                        />
                      }
                      onClick={() => isUnlocked && setSelectedStage(index)}
                      isDisabled={!isUnlocked}
                      minW="120px"
                    >
                      Stage {index + 1}
                    </Button>
                  );
                })}
              </HStack>
            )}
          </VStack>
        </CardBody>
      </Card>
      
      {/* Selected Stage Content */}
      {stages[selectedStage] && (
        <Card bg={cardBgColor} borderRadius="xl" boxShadow="lg">
          <CardHeader>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between" align="start">
                <VStack align="start" spacing={2} flex={1}>
                  <HStack>
                    <Heading size="lg" color={textColor}>
                      {stages[selectedStage].title}
                    </Heading>
                    {getStageStatus(selectedStage, stages[selectedStage]).isCompleted && (
                      <Icon as={FaAward} color={successColor} boxSize={6} />
                    )}
                  </HStack>
                  <Text color={mutedTextColor}>
                    {stages[selectedStage].description}
                  </Text>
                </VStack>
              </HStack>
              
              {/* Stage metrics */}
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    {stages[selectedStage].estimatedTimeHours}h
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>
                    Estimated Time
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="lg" fontWeight="bold" color={successColor}>
                    {stages[selectedStage].transparencyScoreTarget}%
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>
                    Target Transparency
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="lg" fontWeight="bold" color="orange.500">
                    {stages[selectedStage].premiumPotential}
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>
                    Premium Potential
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="lg" fontWeight="bold" color={primaryColor}>
                    {stages[selectedStage].practices.length}
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>
                    Practices
                  </Text>
                </Box>
              </SimpleGrid>
              
              {/* Stage progress */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="medium" color={textColor}>
                    Stage Progress
                  </Text>
                  <Text fontSize="sm" color={textColor}>
                    {getStageStatus(selectedStage, stages[selectedStage]).stageCompletedPractices} of {stages[selectedStage].requiredCompletions} required
                  </Text>
                </HStack>
                <Progress 
                  value={(getStageStatus(selectedStage, stages[selectedStage]).stageCompletedPractices / stages[selectedStage].requiredCompletions) * 100}
                  colorScheme="blue"
                  size="md"
                  borderRadius="full"
                />
              </Box>
            </VStack>
          </CardHeader>
          
          <CardBody pt={0}>
            {/* Practices grid */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {stages[selectedStage].practices.map((practice) => (
                <PracticeCard
                  key={practice.id}
                  title={practice.title}
                  category={practice.category}
                  difficulty={practice.difficulty}
                  estimatedDuration={practice.estimatedDuration}
                  transparencyImpact={practice.transparencyImpact}
                  description={practice.description}
                  learningObjectives={practice.learningObjectives}
                  practiceSteps={practice.practiceSteps}
                  successMetrics={practice.successMetrics}
                  imageUrl={practice.imageUrl}
                  isCompleted={practice.isCompleted}
                  completedSteps={practice.completedSteps}
                  onStartPractice={() => onPracticeStart?.(practice.id)}
                  onStepComplete={(stepId) => {/* Handle step completion */}}
                  onViewProgress={() => {/* Handle progress view */}}
                />
              ))}
            </SimpleGrid>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};

export default LearningPathway;