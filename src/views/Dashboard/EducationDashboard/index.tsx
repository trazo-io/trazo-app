import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Heading,
  Text,
  Icon,
  Badge,
  Progress,
  Button,
  useColorModeValue,
  useBreakpointValue,
  Circle,
  Flex
} from '@chakra-ui/react';
import {
  FaGraduationCap,
  FaLeaf,
  FaIndustry,
  FaChartLine,
  FaSeedling,
  FaCertificate,
  FaLightbulb,
  FaBookOpen,
  FaPlay,
  FaCheck,
  FaClock,
  FaUsers,
  FaAward,
  FaRocket
} from 'react-icons/fa';
import { MdVerified, MdEco, MdScience, MdTimeline, MdTrendingUp } from 'react-icons/md';
import {
  StandardPage,
  StandardCard,
  StandardSection,
  StandardGrid,
  StandardButton,
  StandardAlert
} from '../../../components/Design/StandardComponents';

export default function EducationDashboard() {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [completedModules, setCompletedModules] = useState(['carbon-basics']);
  const [selectedTrack, setSelectedTrack] = useState('beginner');

  const learningTracks = {
    beginner: {
      title: 'Carbon Transparency Basics',
      description: 'Start your carbon literacy journey',
      icon: FaLeaf,
      color: 'green',
      modules: [
        {
          id: 'carbon-basics',
          title: 'Carbon Footprint Fundamentals',
          description: 'Understanding CO₂e, emissions, and carbon scoring in agriculture',
          duration: '15 min',
          icon: FaLeaf,
          completed: true,
          progress: 100,
          keyTopics: [
            'CO₂ Equivalents',
            'Carbon Scoring',
            'Agricultural Emissions',
            'Trazo Methodology'
          ]
        },
        {
          id: 'reading-scores',
          title: 'Reading Carbon Scores',
          description: 'How to interpret and use carbon transparency data',
          duration: '12 min',
          icon: FaChartLine,
          completed: false,
          progress: 0,
          keyTopics: [
            'Score Interpretation',
            'Comparison Methods',
            'Trust Indicators',
            'Action Items'
          ]
        },
        {
          id: 'making-choices',
          title: 'Making Carbon-Informed Choices',
          description: 'Using carbon data to drive sustainable purchasing decisions',
          duration: '18 min',
          icon: FaLightbulb,
          completed: false,
          progress: 0,
          keyTopics: [
            'Smart Shopping',
            'Seasonal Impact',
            'Local vs Global',
            'Budget Considerations'
          ]
        }
      ]
    },
    intermediate: {
      title: 'Agricultural Carbon Science',
      description: 'Deepen your understanding of farm-level carbon impact',
      icon: FaSeedling,
      color: 'blue',
      modules: [
        {
          id: 'farming-practices',
          title: 'Sustainable Farming Methods',
          description: 'How different agricultural practices affect carbon emissions',
          duration: '25 min',
          icon: FaSeedling,
          completed: false,
          progress: 0,
          keyTopics: ['Regenerative Agriculture', 'Soil Carbon', 'Cover Crops', 'Organic Methods']
        },
        {
          id: 'usda-verification',
          title: 'USDA Verification Systems',
          description: 'Understanding how agricultural data gets verified and validated',
          duration: '20 min',
          icon: FaCertificate,
          completed: false,
          progress: 0,
          keyTopics: [
            'USDA Standards',
            'Blockchain Verification',
            'Data Accuracy',
            'Audit Processes'
          ]
        },
        {
          id: 'regional-differences',
          title: 'Regional Carbon Variations',
          description: 'How climate, soil, and geography affect agricultural carbon footprints',
          duration: '22 min',
          icon: FaIndustry,
          completed: false,
          progress: 0,
          keyTopics: ['Climate Zones', 'Soil Types', 'Water Availability', 'Transportation Impact']
        }
      ]
    },
    advanced: {
      title: 'Carbon System Mastery',
      description: 'Master the complete carbon transparency ecosystem',
      icon: FaAward,
      color: 'purple',
      modules: [
        {
          id: 'supply-chain',
          title: 'Supply Chain Carbon Analysis',
          description: 'Complete lifecycle assessment from farm to consumer',
          duration: '30 min',
          icon: FaIndustry,
          completed: false,
          progress: 0,
          keyTopics: [
            'Lifecycle Assessment',
            'Processing Impact',
            'Distribution Networks',
            'Waste Management'
          ]
        },
        {
          id: 'carbon-markets',
          title: 'Carbon Credit Markets',
          description: 'Understanding agricultural carbon credits and trading systems',
          duration: '28 min',
          icon: FaChartLine,
          completed: false,
          progress: 0,
          keyTopics: [
            'Carbon Credits',
            'Offset Programs',
            'Verification Standards',
            'Market Dynamics'
          ]
        },
        {
          id: 'future-agriculture',
          title: 'Future of Carbon Agriculture',
          description: 'Emerging technologies and practices in carbon-smart farming',
          duration: '25 min',
          icon: FaRocket,
          completed: false,
          progress: 0,
          keyTopics: [
            'Precision Agriculture',
            'AI in Farming',
            'Climate Adaptation',
            'Policy Trends'
          ]
        }
      ]
    }
  };

  const currentTrack = learningTracks[selectedTrack];
  const totalModules = Object.values(learningTracks).reduce(
    (sum, track) => sum + track.modules.length,
    0
  );
  const completedCount = Object.values(learningTracks)
    .flat()
    .reduce(
      (sum, track) => sum + track.modules.filter((m) => completedModules.includes(m.id)).length,
      0
    );

  const learningStats = {
    modulesCompleted: completedCount,
    totalModules: totalModules,
    currentTrack: selectedTrack,
    carbonLiteracy: Math.round((completedCount / totalModules) * 100),
    estimatedTime: `${Object.values(learningTracks).reduce(
      (sum, track) =>
        sum + track.modules.reduce((moduleSum, module) => moduleSum + parseInt(module.duration), 0),
      0
    )} minutes`,
    weeklyGoal: 2, // modules per week
    streak: 3 // days
  };

  const handleModuleClick = (moduleId: string) => {
    console.log(`Navigate to module: ${moduleId}`);
  };

  const toggleModuleCompletion = (moduleId: string) => {
    if (completedModules.includes(moduleId)) {
      setCompletedModules((prev) => prev.filter((id) => id !== moduleId));
    } else {
      setCompletedModules((prev) => [...prev, moduleId]);
    }
  };

  const handleTrackChange = (trackId: string) => {
    setSelectedTrack(trackId);
  };

  return (
    <StandardPage
      title="Carbon Literacy Academy"
      description="Master agricultural carbon transparency and make informed sustainable choices"
    >
      <VStack spacing={8} align="stretch">
        {/* Learning Progress Overview */}
        <StandardCard title="Your Carbon Learning Journey" variant="elevated">
          <VStack spacing={6}>
            {/* Progress Stats */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} w="full">
              <VStack spacing={2}>
                <Circle size="50px" bg="green.100" color="green.600">
                  <Icon as={FaGraduationCap} boxSize={6} />
                </Circle>
                <Text fontSize="2xl" fontWeight="bold" color="green.600">
                  {learningStats.carbonLiteracy}%
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Carbon Literacy
                </Text>
              </VStack>

              <VStack spacing={2}>
                <Circle size="50px" bg="blue.100" color="blue.600">
                  <Icon as={FaBookOpen} boxSize={6} />
                </Circle>
                <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                  {learningStats.modulesCompleted}/{learningStats.totalModules}
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Modules Completed
                </Text>
              </VStack>

              <VStack spacing={2}>
                <Circle size="50px" bg="purple.100" color="purple.600">
                  <Icon as={FaClock} boxSize={6} />
                </Circle>
                <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                  {learningStats.streak}
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Day Streak
                </Text>
              </VStack>

              <VStack spacing={2}>
                <Circle size="50px" bg="orange.100" color="orange.600">
                  <Icon as={MdTrendingUp} boxSize={6} />
                </Circle>
                <Text fontSize="2xl" fontWeight="bold" color="orange.600">
                  {learningStats.weeklyGoal}
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Weekly Goal
                </Text>
              </VStack>
            </SimpleGrid>

            {/* Overall Progress Bar */}
            <Box w="full">
              <Flex justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  Overall Progress
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {learningStats.modulesCompleted} of {learningStats.totalModules} modules
                </Text>
              </Flex>
              <Progress
                value={learningStats.carbonLiteracy}
                size="lg"
                colorScheme="green"
                borderRadius="full"
                w="full"
              />
            </Box>

            {learningStats.carbonLiteracy < 100 && (
              <StandardAlert
                status="info"
                title="Continue Your Learning"
                description={`You're making great progress! Complete ${
                  learningStats.totalModules - learningStats.modulesCompleted
                } more modules to become a carbon transparency expert.`}
              />
            )}
          </VStack>
        </StandardCard>

        {/* Learning Track Selection */}
        <StandardSection
          title="Choose Your Learning Path"
          description="Select the track that matches your current knowledge level"
        >
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {Object.entries(learningTracks).map(([trackId, track]) => (
              <Box
                key={trackId}
                p={6}
                borderRadius="xl"
                border="2px solid"
                borderColor={selectedTrack === trackId ? `${track.color}.500` : 'gray.200'}
                bg={selectedTrack === trackId ? `${track.color}.50` : 'white'}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  borderColor: `${track.color}.300`,
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }}
                onClick={() => handleTrackChange(trackId)}
              >
                <VStack spacing={4}>
                  <Circle size="60px" bg={`${track.color}.100`} color={`${track.color}.600`}>
                    <Icon as={track.icon} boxSize={8} />
                  </Circle>
                  <VStack spacing={2}>
                    <Heading size="md" textAlign="center" color="gray.700">
                      {track.title}
                    </Heading>
                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      {track.description}
                    </Text>
                    <Badge colorScheme={track.color} variant="solid">
                      {track.modules.length} modules
                    </Badge>
                  </VStack>
                  {selectedTrack === trackId && (
                    <Badge colorScheme={track.color} variant="solid">
                      Selected
                    </Badge>
                  )}
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </StandardSection>

        {/* Current Track Modules */}
        <StandardSection
          title={`${currentTrack.title} Modules`}
          description={`Master ${currentTrack.modules.length} essential topics in carbon agriculture`}
        >
          <StandardGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {currentTrack.modules.map((module, index) => {
              const isCompleted = completedModules.includes(module.id);
              const isNext = !isCompleted && index === 0; // First incomplete module

              return (
                <StandardCard key={module.id} variant="elevated" padding={6}>
                  <VStack spacing={4} align="stretch">
                    {/* Module Header */}
                    <HStack justify="space-between">
                      <HStack spacing={3}>
                        <Circle
                          size="50px"
                          bg={isCompleted ? 'green.100' : `${currentTrack.color}.100`}
                          color={isCompleted ? 'green.600' : `${currentTrack.color}.600`}
                        >
                          <Icon as={isCompleted ? FaCheck : module.icon} boxSize={6} />
                        </Circle>
                        <VStack align="start" spacing={1}>
                          <Heading size="sm" color="gray.700">
                            {module.title}
                          </Heading>
                          <HStack spacing={2}>
                            <Badge colorScheme={currentTrack.color} size="sm">
                              {module.duration}
                            </Badge>
                            {isNext && (
                              <Badge colorScheme="orange" size="sm">
                                Next
                              </Badge>
                            )}
                          </HStack>
                        </VStack>
                      </HStack>
                      {isCompleted && <Icon as={MdVerified} color="green.500" boxSize={6} />}
                    </HStack>

                    {/* Module Description */}
                    <Text fontSize="sm" color="gray.600">
                      {module.description}
                    </Text>

                    {/* Key Topics */}
                    <Box>
                      <Text fontSize="xs" fontWeight="medium" color="gray.700" mb={2}>
                        Key Topics:
                      </Text>
                      <Flex wrap="wrap" gap={2}>
                        {module.keyTopics.map((topic, topicIndex) => (
                          <Badge key={topicIndex} colorScheme="gray" size="sm">
                            {topic}
                          </Badge>
                        ))}
                      </Flex>
                    </Box>

                    {/* Progress Bar */}
                    {module.progress > 0 && (
                      <Box>
                        <Flex justify="space-between" mb={1}>
                          <Text fontSize="xs" color="gray.600">
                            Progress
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {module.progress}%
                          </Text>
                        </Flex>
                        <Progress
                          value={module.progress}
                          size="sm"
                          colorScheme={currentTrack.color}
                          borderRadius="full"
                        />
                      </Box>
                    )}

                    {/* Action Buttons */}
                    <HStack spacing={3}>
                      <StandardButton
                        variant={isCompleted ? 'outline' : 'primary'}
                        size="sm"
                        leftIcon={isCompleted ? <FaCheck /> : <FaPlay />}
                        onClick={() => handleModuleClick(module.id)}
                      >
                        {isCompleted ? 'Review' : 'Start Learning'}
                      </StandardButton>
                      {!isCompleted && (
                        <StandardButton
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleModuleCompletion(module.id)}
                        >
                          Mark Complete
                        </StandardButton>
                      )}
                    </HStack>
                  </VStack>
                </StandardCard>
              );
            })}
          </StandardGrid>
        </StandardSection>

        {/* Quick Carbon Insights */}
        <StandardSection
          title="Carbon Intelligence Insights"
          description="Essential facts about agricultural carbon transparency"
        >
          <StandardGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <StandardCard variant="flat" padding={6}>
              <VStack spacing={4}>
                <Circle size="60px" bg="green.100" color="green.600">
                  <Icon as={MdEco} boxSize={8} />
                </Circle>
                <VStack spacing={2}>
                  <Heading size="sm" textAlign="center" color="gray.700">
                    Regenerative Impact
                  </Heading>
                  <Text fontSize="lg" fontWeight="bold" color="green.600">
                    0.5-2 tons CO₂
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Sequestered per hectare annually through regenerative practices
                  </Text>
                </VStack>
              </VStack>
            </StandardCard>

            <StandardCard variant="flat" padding={6}>
              <VStack spacing={4}>
                <Circle size="60px" bg="blue.100" color="blue.600">
                  <Icon as={MdVerified} boxSize={8} />
                </Circle>
                <VStack spacing={2}>
                  <Heading size="sm" textAlign="center" color="gray.700">
                    USDA Verification
                  </Heading>
                  <Text fontSize="lg" fontWeight="bold" color="blue.600">
                    95%+ Accuracy
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Reliability standard for agricultural carbon data
                  </Text>
                </VStack>
              </VStack>
            </StandardCard>

            <StandardCard variant="flat" padding={6}>
              <VStack spacing={4}>
                <Circle size="60px" bg="purple.100" color="purple.600">
                  <Icon as={MdScience} boxSize={8} />
                </Circle>
                <VStack spacing={2}>
                  <Heading size="sm" textAlign="center" color="gray.700">
                    Transparency Impact
                  </Heading>
                  <Text fontSize="lg" fontWeight="bold" color="purple.600">
                    23% Improvement
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Average improvement in farm practices with transparency
                  </Text>
                </VStack>
              </VStack>
            </StandardCard>

            <StandardCard variant="flat" padding={6}>
              <VStack spacing={4}>
                <Circle size="60px" bg="orange.100" color="orange.600">
                  <Icon as={FaUsers} boxSize={8} />
                </Circle>
                <VStack spacing={2}>
                  <Heading size="sm" textAlign="center" color="gray.700">
                    Consumer Impact
                  </Heading>
                  <Text fontSize="lg" fontWeight="bold" color="orange.600">
                    40% Shift
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Consumers change purchasing based on carbon data
                  </Text>
                </VStack>
              </VStack>
            </StandardCard>
          </StandardGrid>
        </StandardSection>
      </VStack>
    </StandardPage>
  );
}
