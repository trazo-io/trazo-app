import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Progress,
  Badge,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import {
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiUsers,
  FiBarChart,
  FiTarget,
  FiAward,
  FiDollarSign
} from 'react-icons/fi';

interface SuccessMilestone {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  icon: any;
  status: 'pending' | 'in_progress' | 'completed';
  timeToComplete?: string;
  valueRealized?: string;
}

interface SuccessTrackerProps {
  userId?: string;
  userType: 'farmer' | 'consumer';
  onMilestoneComplete?: (milestone: SuccessMilestone) => void;
}

const SuccessTracker: React.FC<SuccessTrackerProps> = ({
  userId,
  userType,
  onMilestoneComplete
}) => {
  const [milestones, setMilestones] = useState<SuccessMilestone[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Initialize milestones based on user type
  useEffect(() => {
    if (userType === 'farmer') {
      setMilestones([
        {
          id: 'first-carbon-score',
          title: 'First Carbon Score Generated',
          description: 'Get baseline carbon footprint estimate',
          targetValue: 1,
          currentValue: 0,
          unit: 'score',
          icon: FiTarget,
          status: 'pending',
          timeToComplete: '<5 minutes',
          valueRealized: 'Industry comparison + improvement potential'
        },
        {
          id: 'production-setup',
          title: 'First Production Created',
          description: 'Complete production setup with smart templates',
          targetValue: 1,
          currentValue: 0,
          unit: 'production',
          icon: FiBarChart,
          status: 'pending',
          timeToComplete: '<30 minutes',
          valueRealized: 'Automated carbon tracking activated'
        },
        {
          id: 'blockchain-verification',
          title: 'Blockchain Verification Complete',
          description: 'Generate immutable carbon certificate',
          targetValue: 1,
          currentValue: 0,
          unit: 'certificate',
          icon: FiCheckCircle,
          status: 'pending',
          timeToComplete: '<45 minutes',
          valueRealized: 'Consumer transparency + premium pricing'
        },
        {
          id: 'consumer-engagement',
          title: 'First Consumer Interaction',
          description: 'QR code scan or consumer page view',
          targetValue: 1,
          currentValue: 0,
          unit: 'interaction',
          icon: FiUsers,
          status: 'pending',
          timeToComplete: '<7 days',
          valueRealized: 'Market validation + consumer connection'
        },
        {
          id: 'carbon-improvement',
          title: 'Carbon Score Improvement',
          description: 'Measurable carbon footprint reduction',
          targetValue: 5,
          currentValue: 0,
          unit: '% reduction',
          icon: FiTrendingUp,
          status: 'pending',
          timeToComplete: '<30 days',
          valueRealized: 'Operational efficiency + cost savings'
        },
        {
          id: 'premium-pricing',
          title: 'Premium Market Access',
          description: 'Achieve verified sustainable certification',
          targetValue: 1,
          currentValue: 0,
          unit: 'certification',
          icon: FiAward,
          status: 'pending',
          timeToComplete: '<90 days',
          valueRealized: '25-40% premium pricing potential'
        }
      ]);
    } else {
      // Consumer milestones
      setMilestones([
        {
          id: 'first-scan',
          title: 'First QR Code Scan',
          description: 'Discover your first product carbon footprint',
          targetValue: 1,
          currentValue: 0,
          unit: 'scan',
          icon: FiTarget,
          status: 'pending',
          timeToComplete: '<10 seconds',
          valueRealized: 'Carbon transparency + farm connection'
        },
        {
          id: 'carbon-literacy',
          title: 'Carbon Literacy Milestone',
          description: 'Complete educational content engagement',
          targetValue: 5,
          currentValue: 0,
          unit: 'topics',
          icon: FiBarChart,
          status: 'pending',
          timeToComplete: '<3 scans',
          valueRealized: 'Informed purchasing decisions'
        },
        {
          id: 'sustainable-choices',
          title: 'Sustainable Choice Streak',
          description: 'Choose lower-carbon products consistently',
          targetValue: 10,
          currentValue: 0,
          unit: 'choices',
          icon: FiTrendingUp,
          status: 'pending',
          timeToComplete: '<30 days',
          valueRealized: 'Personal carbon impact reduction'
        },
        {
          id: 'community-engagement',
          title: 'Community Advocate',
          description: 'Share sustainable products on social media',
          targetValue: 3,
          currentValue: 0,
          unit: 'shares',
          icon: FiUsers,
          status: 'pending',
          timeToComplete: '<7 days',
          valueRealized: 'Community impact + farmer support'
        }
      ]);
    }
  }, [userType]);

  // Calculate overall progress
  useEffect(() => {
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = milestones.length;
    setOverallProgress(totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0);
  }, [milestones]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      default: return 'gray';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'green';
    if (progress >= 50) return 'blue';
    if (progress >= 25) return 'orange';
    return 'red';
  };

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const inProgressCount = milestones.filter(m => m.status === 'in_progress').length;

  return (
    <Card bg={bg} borderColor={borderColor}>
      <CardHeader>
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Text fontSize="lg" fontWeight="600">
              {userType === 'farmer' ? 'Farmer Success Journey' : 'Carbon Discovery Journey'}
            </Text>
            <Text fontSize="sm" color="gray.500">
              Track your progress toward carbon intelligence mastery
            </Text>
          </VStack>
          <VStack align="end" spacing={1}>
            <Text fontSize="2xl" fontWeight="700" color={`${getProgressColor(overallProgress)}.500`}>
              {Math.round(overallProgress)}%
            </Text>
            <Text fontSize="xs" color="gray.500">Complete</Text>
          </VStack>
        </Flex>
        <Progress 
          value={overallProgress} 
          colorScheme={getProgressColor(overallProgress)}
          size="sm" 
          mt={4}
          borderRadius="full"
        />
      </CardHeader>

      <CardBody pt={0}>
        {/* Quick Stats */}
        <SimpleGrid columns={3} spacing={4} mb={6}>
          <Stat>
            <StatLabel fontSize="xs">Completed</StatLabel>
            <StatNumber fontSize="lg" color="green.500">{completedCount}</StatNumber>
            <StatHelpText fontSize="xs">milestones</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel fontSize="xs">In Progress</StatLabel>
            <StatNumber fontSize="lg" color="blue.500">{inProgressCount}</StatNumber>
            <StatHelpText fontSize="xs">active</StatHelpText>
          </Stat>
          <Stat>
            <StatLabel fontSize="xs">Time to Value</StatLabel>
            <StatNumber fontSize="lg" color="purple.500">
              {userType === 'farmer' ? '30m' : '3m'}
            </StatNumber>
            <StatHelpText fontSize="xs">average</StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Success Recommendations */}
        {overallProgress < 50 && (
          <Alert status="info" mb={4} borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">Next Step Recommendation</AlertTitle>
              <AlertDescription fontSize="xs">
                {userType === 'farmer' 
                  ? 'Complete your first carbon score to unlock premium pricing opportunities'
                  : 'Scan your first product to discover its carbon story and support sustainable farming'
                }
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Milestone List */}
        <VStack spacing={3} align="stretch">
          {milestones.map((milestone, index) => {
            const progress = (milestone.currentValue / milestone.targetValue) * 100;
            const isCompleted = milestone.status === 'completed';
            const isInProgress = milestone.status === 'in_progress';
            
            return (
              <Box
                key={milestone.id}
                p={4}
                bg={isCompleted ? 'green.50' : isInProgress ? 'blue.50' : 'gray.50'}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={isCompleted ? 'green.200' : isInProgress ? 'blue.200' : 'gray.200'}
                position="relative"
                _hover={{ shadow: 'sm' }}
                transition="all 0.2s"
              >
                <Flex align="start" spacing={3}>
                  <Circle
                    size="40px"
                    bg={isCompleted ? 'green.500' : isInProgress ? 'blue.500' : 'gray.300'}
                    color="white"
                    mr={3}
                  >
                    <Icon as={milestone.icon} boxSize={5} />
                  </Circle>
                  
                  <Box flex="1">
                    <Flex justify="space-between" align="start" mb={2}>
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Text fontSize="sm" fontWeight="600">
                            {milestone.title}
                          </Text>
                          <Badge
                            colorScheme={getStatusColor(milestone.status)}
                            variant={isCompleted ? 'solid' : 'subtle'}
                            size="sm"
                          >
                            {milestone.status === 'completed' ? 'Done' : 
                             milestone.status === 'in_progress' ? 'Active' : 'Pending'}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color="gray.600">
                          {milestone.description}
                        </Text>
                      </VStack>
                      
                      <VStack align="end" spacing={1}>
                        <Text fontSize="xs" color="gray.500">
                          <Icon as={FiClock} mr={1} />
                          {milestone.timeToComplete}
                        </Text>
                        {milestone.valueRealized && (
                          <Text fontSize="xs" color="green.600" fontWeight="500">
                            <Icon as={FiDollarSign} mr={1} />
                            {milestone.valueRealized}
                          </Text>
                        )}
                      </VStack>
                    </Flex>
                    
                    {!isCompleted && (
                      <Progress
                        value={progress}
                        colorScheme={getStatusColor(milestone.status)}
                        size="xs"
                        borderRadius="full"
                        bg="gray.200"
                      />
                    )}
                  </Box>
                </Flex>
              </Box>
            );
          })}
        </VStack>

        {/* Call to Action */}
        {overallProgress === 100 && (
          <Alert status="success" mt={4} borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">Congratulations! 🎉</AlertTitle>
              <AlertDescription fontSize="xs">
                You've mastered carbon intelligence! 
                {userType === 'farmer' 
                  ? ' You\'re now ready to unlock premium markets and carbon credits.'
                  : ' You\'re now a carbon-conscious consumer making climate-positive choices.'
                }
              </AlertDescription>
            </Box>
          </Alert>
        )}
      </CardBody>
    </Card>
  );
};

export default SuccessTracker;