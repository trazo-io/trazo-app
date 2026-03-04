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
  useBreakpointValue,
  Circle,
  Flex
} from '@chakra-ui/react';
import {
  FaGraduationCap,
  FaLeaf,
  FaChartLine,
  FaSeedling,
  FaLightbulb,
  FaBookOpen,
  FaPlay,
  FaCheck,
  FaClock,
  FaUsers,
  FaAward,
  FaRocket,
  FaShieldAlt,
  FaQrcode
} from 'react-icons/fa';
import { MdVerified, MdEco, MdTrendingUp } from 'react-icons/md';
import {
  StandardPage,
  StandardCard,
  StandardSection,
  StandardGrid,
  StandardButton,
  StandardAlert,
  StandardMetricCard
} from '../../../components/Design/StandardComponents';

export default function EducationDashboard() {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [completedModules, setCompletedModules] = useState(['transparency-basics']);
  const [selectedTrack, setSelectedTrack] = useState('beginner');

  const learningTracks = {
    beginner: {
      title: 'Transparency Fundamentals',
      description: 'Understand how food transparency works',
      icon: FaLeaf,
      color: 'green',
      modules: [
        {
          id: 'transparency-basics',
          title: 'What is Food Transparency?',
          description: 'Understanding transparency scores, trust indicators, and how documented farming practices build consumer confidence',
          duration: '15 min',
          icon: FaLeaf,
          completed: true,
          progress: 100,
          keyTopics: [
            'Transparency Scores',
            'Trust Indicators',
            'Documented Practices',
            'Trazo Platform'
          ]
        },
        {
          id: 'reading-scores',
          title: 'Reading Transparency Scores',
          description: 'How to interpret and use transparency data when choosing food',
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
          title: 'Making Informed Food Choices',
          description: 'Using transparency data to support farmers who document their practices',
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
      title: 'Farm Practices & Verification',
      description: 'Learn how farms document and verify their practices',
      icon: FaSeedling,
      color: 'blue',
      modules: [
        {
          id: 'farming-practices',
          title: 'How Farms Document Practices',
          description: 'Understanding the 7 event types farmers use to document their growing journey',
          duration: '25 min',
          icon: FaSeedling,
          completed: false,
          progress: 0,
          keyTopics: ['Regenerative Agriculture', 'Soil Health', 'Cover Crops', 'Organic Methods']
        },
        {
          id: 'verification-trust',
          title: 'Verification & Trust Building',
          description: 'How blockchain records, EPA/USDA-sourced data, and photo evidence build trust',
          duration: '20 min',
          icon: FaShieldAlt,
          completed: false,
          progress: 0,
          keyTopics: [
            'EPA/USDA-Sourced Data',
            'Blockchain Verification',
            'Data Integrity',
            'Farm Documentation'
          ]
        },
        {
          id: 'food-journey',
          title: "Understanding Your Food's Journey",
          description: 'How geography, climate, and regional practices affect how your food is grown',
          duration: '22 min',
          icon: FaQrcode,
          completed: false,
          progress: 0,
          keyTopics: ['Climate Zones', 'Soil Types', 'Water Availability', 'Regional Practices']
        }
      ]
    },
    advanced: {
      title: 'Transparency Ecosystem',
      description: 'Master the complete agricultural transparency ecosystem',
      icon: FaAward,
      color: 'purple',
      modules: [
        {
          id: 'farm-to-table',
          title: 'Farm-to-Table Transparency',
          description: 'Complete documentation chain from planting to your plate',
          duration: '30 min',
          icon: FaLeaf,
          completed: false,
          progress: 0,
          keyTopics: [
            'Farm Documentation',
            'Processing Transparency',
            'Distribution Tracking',
            'Quality Verification'
          ]
        },
        {
          id: 'transparency-verification',
          title: 'Transparency Verification',
          description: 'Understanding agricultural transparency and verification systems',
          duration: '28 min',
          icon: FaChartLine,
          completed: false,
          progress: 0,
          keyTopics: [
            'Transparency Metrics',
            'Consumer Trust',
            'Verification Standards',
            'QR Engagement'
          ]
        },
        {
          id: 'future-agriculture',
          title: 'Future of Agricultural Transparency',
          description: 'Emerging technologies and practices in transparent farming',
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
    learningProgress: Math.round((completedCount / totalModules) * 100),
    estimatedTime: `${Object.values(learningTracks).reduce(
      (sum, track) =>
        sum + track.modules.reduce((moduleSum, module) => moduleSum + parseInt(module.duration), 0),
      0
    )} minutes`,
    weeklyGoal: 2,
    streak: 3
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
      title="Transparency Learning Hub"
      description="Learn how agricultural transparency builds trust and supports informed food choices"
    >
      <VStack spacing={8} align="stretch">
        {/* Learning Progress Overview */}
        <StandardCard title="Your Learning Progress" variant="elevated">
          <VStack spacing={6}>
            {/* Progress Stats */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} w="full">
              <VStack spacing={2}>
                <Circle size="50px" bg="green.100" color="green.600">
                  <Icon as={FaGraduationCap} boxSize={6} />
                </Circle>
                <Text fontSize="2xl" fontWeight="bold" color="green.600">
                  {learningStats.learningProgress}%
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Learning Progress
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
                value={learningStats.learningProgress}
                size="lg"
                colorScheme="green"
                borderRadius="full"
                w="full"
              />
            </Box>

            {learningStats.learningProgress < 100 && (
              <StandardAlert
                status="info"
                title="Continue Your Learning"
                description={`You're making great progress! Complete ${
                  learningStats.totalModules - learningStats.modulesCompleted
                } more modules to become a transparency expert.`}
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
                      {track.modules.length} Modules
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
          description={`Master ${currentTrack.modules.length} essential topics in agricultural transparency`}
        >
          <StandardGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {currentTrack.modules.map((module, index) => {
              const isCompleted = completedModules.includes(module.id);
              const isNext = !isCompleted && index === 0;

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

        {/* Transparency Impact Facts */}
        <StandardSection
          title="Transparency Impact Facts"
          description="Essential facts about agricultural transparency"
        >
          <StandardGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <StandardCard variant="flat" padding={6}>
              <StandardMetricCard
                icon={MdEco}
                iconColor="green.600"
                iconBg="green.100"
                value="20 US Crops"
                label="Farm Documentation"
                subtitle="Pre-configured event workflows for specialty crops"
                colorScheme="green"
              />
            </StandardCard>

            <StandardCard variant="flat" padding={6}>
              <StandardMetricCard
                icon={MdVerified}
                iconColor="blue.600"
                iconBg="blue.100"
                value="Government Data"
                label="EPA/USDA-Sourced"
                subtitle="All calculations use published government emission factors"
                colorScheme="blue"
              />
            </StandardCard>

            <StandardCard variant="flat" padding={6}>
              <StandardMetricCard
                icon={FaUsers}
                iconColor="purple.600"
                iconBg="purple.100"
                value="78% Engagement"
                label="Consumer Trust"
                subtitle="Consumer completion rate with transparency-first approach"
                colorScheme="purple"
              />
            </StandardCard>

            <StandardCard variant="flat" padding={6}>
              <StandardMetricCard
                icon={FaShieldAlt}
                iconColor="orange.600"
                iconBg="orange.100"
                value="Immutable Records"
                label="Blockchain Verified"
                subtitle="Cryptographic proof that records haven't been altered"
                colorScheme="orange"
              />
            </StandardCard>
          </StandardGrid>
        </StandardSection>
      </VStack>
    </StandardPage>
  );
}
