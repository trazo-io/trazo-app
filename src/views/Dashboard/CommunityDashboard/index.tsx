import React, { useState } from 'react';
import {
  VStack,
  HStack,
  SimpleGrid,
  Heading,
  Text,
  Icon,
  Badge,
  Avatar,
  Button,
  useBreakpointValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Circle,
  Flex,
  Progress,
  Box
} from '@chakra-ui/react';
import {
  FaUsers,
  FaComments,
  FaShare,
  FaLeaf,
  FaMapMarkerAlt,
  FaCertificate,
  FaHeart,
  FaLightbulb,
  FaRocket,
  FaRecycle
} from 'react-icons/fa';
import { MdVerified, MdTrendingUp, MdGroup, MdEco, MdTimeline } from 'react-icons/md';
import {
  StandardPage,
  StandardCard,
  StandardSection,
  StandardGrid,
  StandardButton,
  StandardAlert,
  StandardInput,
  StandardTextarea
} from '../../../components/Design/StandardComponents';

export default function CommunityDashboard() {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [activeTab, setActiveTab] = useState(0);
  const [newPostContent, setNewPostContent] = useState('');

  // Enhanced community activities focused on carbon transparency
  const transparencyInsights = [
    {
      id: 1,
      author: 'Sarah Chen',
      avatar: '',
      verified: true,
      badge: 'Carbon Detective',
      title: 'Discovered exceptional regenerative farm practices',
      content:
        'Highland Organic Farm in Oregon achieves -0.3 kg CO₂e per kg through innovative carbon sequestration. Their soil health data shows 40% carbon increase over 3 years.',
      timestamp: '2 hours ago',
      likes: 47,
      comments: 23,
      shares: 12,
      farmMentioned: 'Highland Organic Farm',
      location: 'Oregon, USA',
      transparencyLevel: 'Complete',
      carbonData: '-0.3 kg CO₂e/kg',
      impact: 'Carbon Negative',
      type: 'farm_discovery',
      verificationLevel: 'Science-Based'
    },
    {
      id: 2,
      author: 'Dr. Marcus Rivera',
      avatar: '',
      verified: true,
      badge: 'Sustainability Expert',
      title: 'Regional carbon footprint analysis reveals surprising patterns',
      content:
        'After analyzing 200+ farms across the Pacific Northwest, I found that elevation and rainfall patterns provide valuable insights for sustainable farming. Farms above 1000ft elevation show unique transparency opportunities.',
      timestamp: '5 hours ago',
      likes: 89,
      comments: 34,
      shares: 28,
      tag: 'Research Insight',
      type: 'analysis',
      dataPoints: '200+ farms analyzed',
      keyFinding: '25% improvement at elevation'
    },
    {
      id: 3,
      author: 'Community Collective',
      avatar: '',
      verified: true,
      badge: 'Transparency Movement',
      title: 'Community milestone: 1,000 farms now mapped!',
      content:
        "Our collective scanning efforts have mapped over 1,000 transparent farms nationwide. This represents 15% of all certified organic operations. Together, we're driving the transparency revolution in agriculture.",
      timestamp: '8 hours ago',
      likes: 156,
      comments: 67,
      shares: 89,
      achievement: 'Transparency Milestone',
      type: 'milestone',
      impact: '1,000 farms mapped',
      communityImpact: '15% of organic operations'
    },
    {
      id: 4,
      author: 'Emma Rodriguez',
      avatar: '',
      verified: true,
      badge: 'Local Food Champion',
      title: 'Local vs imported: My 30-day carbon comparison experiment',
      content:
        'Tracked carbon footprints of local vs imported produce for 30 days. Local sourcing reduced my food carbon footprint by 60% while supporting 12 regional transparent farms.',
      timestamp: '1 day ago',
      likes: 73,
      comments: 41,
      shares: 19,
      experiment: '30-day tracking',
      result: '60% reduction',
      type: 'experiment',
      localImpact: '12 farms supported'
    }
  ];

  // Simple sustainable tips for consumers
  const sustainableTips = [
    {
      title: 'Shop Local First',
      description: 'Choose locally-grown produce when available to reduce transportation emissions',
      icon: FaMapMarkerAlt,
      impact: 'Reduces carbon footprint by up to 7%'
    },
    {
      title: 'Look for Seasonal Foods',
      description: 'Seasonal produce typically has lower carbon footprints',
      icon: FaLeaf,
      impact: 'Can reduce emissions by 10-15%'
    },
    {
      title: 'Check Organic Labels',
      description: 'Organic farming often uses sustainable practices',
      icon: FaCertificate,
      impact: 'Supports soil health and biodiversity'
    },
    {
      title: 'Reduce Food Waste',
      description: 'Plan meals and use leftovers to minimize waste',
      icon: FaRecycle,
      impact: 'Can reduce household food emissions by 20%'
    }
  ];

  // Simple community goals for MVP
  const communityGoals = [
    {
      title: 'Local Farmers Markets',
      description: 'Find farmers markets in your area',
      icon: FaMapMarkerAlt,
      color: 'green'
    },
    {
      title: 'Sustainable Shopping Tips',
      description: 'Learn how to shop more sustainably',
      icon: FaLightbulb,
      color: 'blue'
    }
  ];

  // Community stats
  const communityStats = {
    activeMembers: 2847,
    discussions: 8934,
    farmsMapped: 1247,
    verifiedProducts: 92,
    carbonSaved: '47.3 tons CO₂e',
    transparencyScore: 94,
    monthlyGrowth: 23,
    communityLevel: 'Advanced Contributor'
  };

  return (
    <StandardPage
      title="Carbon Transparency Community"
      description="Connect with fellow consumers driving agricultural carbon accountability and transparency"
    >
      <VStack spacing={8} align="stretch">
        {/* Community Impact Stats */}
        <StandardCard title="Community Impact Dashboard" variant="elevated">
          <VStack spacing={6}>
            <StandardGrid columns={{ base: 2, md: 4 }} spacing={6}>
              <VStack spacing={3}>
                <Circle size="60px" bg="blue.100" color="blue.600">
                  <Icon as={FaUsers} boxSize={8} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                    {communityStats.activeMembers.toLocaleString()}
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Carbon Transparency Advocates
                  </Text>
                  <Badge colorScheme="blue" size="sm">
                    +{communityStats.monthlyGrowth}% this month
                  </Badge>
                </VStack>
              </VStack>

              <VStack spacing={3}>
                <Circle size="60px" bg="green.100" color="green.600">
                  <Icon as={FaMapMarkerAlt} boxSize={8} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">
                    {communityStats.farmsMapped.toLocaleString()}
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Transparent Farms Mapped
                  </Text>
                  <Badge colorScheme="green" size="sm">
                    All 50 States
                  </Badge>
                </VStack>
              </VStack>

              <VStack spacing={3}>
                <Circle size="60px" bg="green.100" color="green.600">
                  <Icon as={MdEco} boxSize={8} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">
                    {communityStats.carbonSaved}
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Collective Carbon Saved
                  </Text>
                  <Badge colorScheme="green" size="sm">
                    This Year
                  </Badge>
                </VStack>
              </VStack>

              <VStack spacing={3}>
                <Circle size="60px" bg="blue.100" color="blue.600">
                  <Icon as={FaCertificate} boxSize={8} />
                </Circle>
                <VStack spacing={1}>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                    {communityStats.transparencyScore}%
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Products with Data
                  </Text>
                  <Badge colorScheme="blue" size="sm">
                    Science-Based
                  </Badge>
                </VStack>
              </VStack>
            </StandardGrid>

            <StandardAlert
              status="info"
              title="Join the Community"
              description="Connect with other consumers making sustainable food choices."
            />
          </VStack>
        </StandardCard>

        {/* Main Community Features */}
        <StandardCard variant="elevated">
          <Tabs
            index={activeTab}
            onChange={setActiveTab}
            variant="soft-rounded"
            colorScheme="green"
          >
            <TabList mb={6}>
              <Tab>Recent Posts</Tab>
              <Tab>Sustainable Tips</Tab>
            </TabList>

            <TabPanels>
              {/* Transparency Insights */}
              <TabPanel p={0}>
                <VStack spacing={8} align="stretch">
                  {/* Share Insight */}
                  <StandardCard title="Share Your Carbon Discovery" variant="flat">
                    <VStack spacing={4}>
                      <StandardTextarea
                        placeholder="Share your carbon transparency discoveries, farm insights, or research findings..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        rows={4}
                      />
                      <HStack justify="space-between" w="full">
                        <HStack spacing={3} fontSize="sm" color="gray.600">
                          <HStack>
                            <Icon as={FaLeaf} color="green.500" />
                            <Text>Tag farm or product</Text>
                          </HStack>
                          <HStack>
                            <Icon as={FaCertificate} color="blue.500" />
                            <Text>Add verification data</Text>
                          </HStack>
                        </HStack>
                        <StandardButton
                          variant="primary"
                          size="sm"
                          leftIcon={<FaRocket />}
                          onClick={() => {
                            // Handle post submission
                            setNewPostContent('');
                          }}
                        >
                          Share Discovery
                        </StandardButton>
                      </HStack>
                    </VStack>
                  </StandardCard>

                  {/* Transparency Insights Feed */}
                  <StandardSection
                    title="Latest Carbon Intelligence"
                    description="Community discoveries driving agricultural transparency"
                  >
                    <VStack spacing={6}>
                      {transparencyInsights.map((insight) => (
                        <StandardCard key={insight.id} variant="outline" padding={6}>
                          <VStack spacing={4} align="stretch">
                            {/* Insight Header */}
                            <HStack justify="space-between">
                              <HStack spacing={3}>
                                <Avatar size="md" name={insight.author} />
                                <VStack align="start" spacing={1}>
                                  <HStack spacing={2}>
                                    <Text fontWeight="bold" color="gray.700">
                                      {insight.author}
                                    </Text>
                                    {insight.verified && (
                                      <Icon as={MdVerified} color="blue.500" boxSize={4} />
                                    )}
                                    <Badge colorScheme="green" size="sm">
                                      {insight.badge}
                                    </Badge>
                                  </HStack>
                                  <Text fontSize="xs" color="gray.500">
                                    {insight.timestamp}
                                  </Text>
                                </VStack>
                              </HStack>

                              {insight.achievement && (
                                <Badge colorScheme="green" variant="solid">
                                  <Icon as={FaTrophy} mr={1} boxSize={3} />
                                  {insight.achievement}
                                </Badge>
                              )}
                            </HStack>

                            {/* Insight Content */}
                            <VStack align="start" spacing={3}>
                              <Heading size="sm" color="gray.700">
                                {insight.title}
                              </Heading>
                              <Text color="gray.600" lineHeight="1.6">
                                {insight.content}
                              </Text>
                            </VStack>

                            {/* Insight Data & Tags */}
                            <VStack align="start" spacing={3}>
                              <Flex wrap="wrap" gap={2}>
                                {insight.farmMentioned && (
                                  <Badge colorScheme="green" variant="outline">
                                    <Icon as={FaMapMarkerAlt} mr={1} boxSize={3} />
                                    {insight.farmMentioned}
                                  </Badge>
                                )}
                                {insight.location && (
                                  <Badge colorScheme="blue" variant="outline">
                                    {insight.location}
                                  </Badge>
                                )}
                                {insight.transparencyLevel && (
                                  <Badge colorScheme="purple" variant="solid">
                                    Transparency: {insight.transparencyLevel}
                                  </Badge>
                                )}
                                {insight.verificationLevel && (
                                  <Badge colorScheme="orange" variant="outline">
                                    <Icon as={FaCertificate} mr={1} boxSize={3} />
                                    {insight.verificationLevel}
                                  </Badge>
                                )}
                              </Flex>

                              {/* Impact Metrics */}
                              {insight.carbonData && (
                                <HStack spacing={4} fontSize="sm">
                                  <HStack spacing={1}>
                                    <Icon as={MdEco} color="green.500" boxSize={4} />
                                    <Text color="gray.600">Carbon: {insight.carbonData}</Text>
                                  </HStack>
                                  {insight.impact && (
                                    <HStack spacing={1}>
                                      <Icon as={FaChartLine} color="blue.500" boxSize={4} />
                                      <Text color="gray.600">Impact: {insight.impact}</Text>
                                    </HStack>
                                  )}
                                </HStack>
                              )}
                            </VStack>

                            {/* Engagement Actions */}
                            <HStack spacing={4} pt={2} borderTop="1px" borderColor="gray.100">
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<FaHeart />}
                                colorScheme="red"
                              >
                                {insight.likes}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<FaComments />}
                                colorScheme="blue"
                              >
                                {insight.comments}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<FaShare />}
                                colorScheme="green"
                              >
                                {insight.shares}
                              </Button>
                            </HStack>
                          </VStack>
                        </StandardCard>
                      ))}
                    </VStack>
                  </StandardSection>
                </VStack>
              </TabPanel>

              {/* Sustainable Tips */}
              <TabPanel p={0}>
                <StandardSection
                  title="Simple Ways to Shop Sustainably"
                  description="Practical tips for reducing your food's carbon footprint"
                >
                  <StandardGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    {sustainableTips.map((tip, index) => (
                      <StandardCard key={index} variant="elevated" padding={6}>
                        <VStack spacing={4} align="stretch">
                          <HStack spacing={3}>
                            <Circle size="50px" bg="green.100" color="green.600">
                              <Icon as={tip.icon} boxSize={6} />
                            </Circle>
                            <VStack align="start" spacing={1} flex={1}>
                              <Heading size="sm" color="gray.700">
                                {tip.title}
                              </Heading>
                              <Text fontSize="sm" color="gray.600">
                                {tip.description}
                              </Text>
                            </VStack>
                          </HStack>

                          <Box p={3} bg="green.50" borderRadius="md">
                            <HStack spacing={2}>
                              <Icon as={FaLeaf} color="green.600" boxSize={4} />
                              <Text fontSize="sm" fontWeight="medium" color="green.700">
                                {tip.impact}
                              </Text>
                            </HStack>
                          </Box>
                        </VStack>
                      </StandardCard>
                    ))}
                  </StandardGrid>
                </StandardSection>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </StandardCard>
      </VStack>
    </StandardPage>
  );
}
