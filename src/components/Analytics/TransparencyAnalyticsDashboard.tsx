import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Badge,
  useColorModeValue,
  Flex,
  Icon,
  Circle,
  useBreakpointValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Container
} from '@chakra-ui/react';
import {
  FaEye,
  FaHeart,
  FaTrophy,
  FaChartLine,
  FaUsers,
  FaMobile,
  FaQrcode,
  FaLeaf,
  FaAward,
  FaGlobe,
  FaClock,
  FaStar
} from 'react-icons/fa';
import { MdVerified, MdTrendingUp, MdInsights } from 'react-icons/md';

interface TransparencyMetrics {
  overallScore: number;
  trend: 'up' | 'down' | 'stable';
  totalScans: number;
  uniqueUsers: number;
  avgEngagementTime: number;
  celebrationTriggered: number;
  trustIndicatorViews: number;
  mobileOptimizationScore: number;
}

interface ConsumerBehavior {
  scanCompletionRate: number;
  averageTimeOnPage: number;
  transparencyDetailViews: number;
  celebrationEngagement: number;
  shareRate: number;
  returnVisitorRate: number;
}

interface TransparencyAnalyticsDashboardProps {
  metrics?: TransparencyMetrics;
  consumerBehavior?: ConsumerBehavior;
  dateRange?: string;
  isLoading?: boolean;
}

export const TransparencyAnalyticsDashboard: React.FC<TransparencyAnalyticsDashboardProps> = ({
  metrics = {
    overallScore: 87,
    trend: 'up',
    totalScans: 1247,
    uniqueUsers: 892,
    avgEngagementTime: 145,
    celebrationTriggered: 89,
    trustIndicatorViews: 734,
    mobileOptimizationScore: 94
  },
  consumerBehavior = {
    scanCompletionRate: 78,
    averageTimeOnPage: 145,
    transparencyDetailViews: 67,
    celebrationEngagement: 92,
    shareRate: 23,
    returnVisitorRate: 34
  },
  dateRange = "Last 30 days",
  isLoading = false
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.500', 'green.400');
  
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Calculate performance indicators
  const getPerformanceStatus = (score: number) => {
    if (score >= 80) return { color: 'green', label: 'Excellent' };
    if (score >= 60) return { color: 'yellow', label: 'Good' };
    return { color: 'red', label: 'Needs Improvement' };
  };

  // Key metrics cards
  const keyMetrics = [
    {
      label: 'Overall Transparency Score',
      value: `${metrics.overallScore}%`,
      change: '+5.2%',
      trend: metrics.trend,
      icon: FaTrophy,
      color: 'green',
      description: 'Average transparency across all products'
    },
    {
      label: 'Total QR Scans',
      value: metrics.totalScans.toLocaleString(),
      change: '+12.4%',
      trend: 'up' as const,
      icon: FaQrcode,
      color: 'blue',
      description: 'Total consumer interactions'
    },
    {
      label: 'Celebration Triggers',
      value: metrics.celebrationTriggered,
      change: '+89.2%',
      trend: 'up' as const,
      icon: FaAward,
      color: 'purple',
      description: 'High-transparency celebration events'
    },
    {
      label: 'Mobile Performance',
      value: `${metrics.mobileOptimizationScore}%`,
      change: '+2.1%',
      trend: 'up' as const,
      icon: FaMobile,
      color: 'green',
      description: 'Mobile optimization score'
    }
  ];

  // Consumer behavior metrics
  const behaviorMetrics = [
    {
      label: 'Scan Completion Rate',
      value: `${consumerBehavior.scanCompletionRate}%`,
      target: 75,
      icon: FaEye,
      description: 'Users who view complete transparency data'
    },
    {
      label: 'Avg. Engagement Time',
      value: `${consumerBehavior.averageTimeOnPage}s`,
      target: 120,
      icon: FaClock,
      description: 'Time spent viewing transparency details'
    },
    {
      label: 'Detail View Rate',
      value: `${consumerBehavior.transparencyDetailViews}%`,
      target: 50,
      icon: MdInsights,
      description: 'Users who expand transparency details'
    },
    {
      label: 'Share Rate',
      value: `${consumerBehavior.shareRate}%`,
      target: 20,
      icon: FaGlobe,
      description: 'Users who share transparency stories'
    }
  ];

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading as="h1" size="xl" color={textColor} mb={2}>
            Transparency Analytics Dashboard
          </Heading>
          <Text color={mutedColor} fontSize="lg">
            Track transparency engagement and consumer behavior • {dateRange}
          </Text>
        </Box>

        {/* Key Metrics Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          {keyMetrics.map((metric, index) => (
            <Card key={index} bg={bgColor} borderColor={borderColor} borderWidth="1px">
              <CardBody>
                <VStack align="start" spacing={4}>
                  <HStack justify="space-between" w="full">
                    <Circle size={12} bg={`${metric.color}.100`} color={`${metric.color}.600`}>
                      <Icon as={metric.icon} boxSize={6} />
                    </Circle>
                    <HStack>
                      <StatArrow type={metric.trend === 'up' ? 'increase' : 'decrease'} />
                      <Text fontSize="sm" color={metric.trend === 'up' ? 'green.500' : 'red.500'}>
                        {metric.change}
                      </Text>
                    </HStack>
                  </HStack>
                  
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color={mutedColor} fontWeight="medium">
                      {metric.label}
                    </Text>
                    <Text fontSize="3xl" fontWeight="bold" color={textColor}>
                      {metric.value}
                    </Text>
                    <Text fontSize="xs" color={mutedColor}>
                      {metric.description}
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        {/* Detailed Analytics Tabs */}
        <Tabs colorScheme="green" variant="enclosed">
          <TabList>
            <Tab>Consumer Behavior</Tab>
            <Tab>Trust Indicators</Tab>
            <Tab>Mobile Performance</Tab>
            <Tab>Celebration Impact</Tab>
          </TabList>

          <TabPanels>
            {/* Consumer Behavior Tab */}
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {behaviorMetrics.map((metric, index) => (
                  <Card key={index} bg={bgColor} borderColor={borderColor} borderWidth="1px">
                    <CardBody>
                      <VStack align="start" spacing={4}>
                        <HStack justify="space-between" w="full">
                          <HStack spacing={3}>
                            <Circle size={10} bg="blue.100" color="blue.600">
                              <Icon as={metric.icon} boxSize={5} />
                            </Circle>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold" color={textColor}>
                                {metric.value}
                              </Text>
                              <Text fontSize="sm" color={mutedColor}>
                                {metric.label}
                              </Text>
                            </VStack>
                          </HStack>
                          <Badge 
                            colorScheme={parseInt(metric.value) >= metric.target ? 'green' : 'yellow'}
                            variant="solid"
                          >
                            {parseInt(metric.value) >= metric.target ? 'Target Met' : 'Below Target'}
                          </Badge>
                        </HStack>
                        
                        <Box w="full">
                          <HStack justify="space-between" fontSize="xs" color={mutedColor} mb={1}>
                            <Text>0%</Text>
                            <Text>Target: {metric.target}%</Text>
                            <Text>100%</Text>
                          </HStack>
                          <Progress 
                            value={parseInt(metric.value)} 
                            colorScheme={parseInt(metric.value) >= metric.target ? 'green' : 'yellow'}
                            borderRadius="full"
                            bg="gray.100"
                          />
                        </Box>
                        
                        <Text fontSize="sm" color={mutedColor}>
                          {metric.description}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </TabPanel>

            {/* Trust Indicators Tab */}
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
                  <CardHeader>
                    <HStack>
                      <Icon as={MdVerified} color="green.500" boxSize={6} />
                      <Text fontWeight="bold">Trust Indicator Views</Text>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack align="start" spacing={3}>
                      <Text fontSize="3xl" fontWeight="bold" color={accentColor}>
                        {metrics.trustIndicatorViews}
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>
                        Total trust badge interactions
                      </Text>
                      <Progress value={85} colorScheme="green" w="full" borderRadius="full" />
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
                  <CardHeader>
                    <HStack>
                      <Icon as={FaLeaf} color="green.500" boxSize={6} />
                      <Text fontWeight="bold">Transparency First Impact</Text>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack align="start" spacing={3}>
                      <Text fontSize="3xl" fontWeight="bold" color={accentColor}>
                        +67%
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>
                        Improvement in consumer engagement
                      </Text>
                      <Badge colorScheme="green" variant="solid">
                        Major Improvement
                      </Badge>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
                  <CardHeader>
                    <HStack>
                      <Icon as={FaStar} color="yellow.500" boxSize={6} />
                      <Text fontWeight="bold">Trust Score</Text>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack align="start" spacing={3}>
                      <Text fontSize="3xl" fontWeight="bold" color="yellow.500">
                        4.8/5
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>
                        Average consumer trust rating
                      </Text>
                      <HStack>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon 
                            key={star} 
                            as={FaStar} 
                            color={star <= 4.8 ? "yellow.400" : "gray.300"} 
                            boxSize={4} 
                          />
                        ))}
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </TabPanel>

            {/* Mobile Performance Tab */}
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
                  <CardHeader>
                    <Text fontWeight="bold" fontSize="lg">Mobile QR Performance</Text>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack spacing={4}>
                      <Box w="full">
                        <HStack justify="space-between" mb={2}>
                          <Text fontSize="sm" color={mutedColor}>Load Time</Text>
                          <Text fontSize="sm" fontWeight="bold" color="green.500">1.2s</Text>
                        </HStack>
                        <Progress value={92} colorScheme="green" borderRadius="full" />
                      </Box>
                      
                      <Box w="full">
                        <HStack justify="space-between" mb={2}>
                          <Text fontSize="sm" color={mutedColor}>Core Web Vitals</Text>
                          <Text fontSize="sm" fontWeight="bold" color="green.500">Excellent</Text>
                        </HStack>
                        <Progress value={94} colorScheme="green" borderRadius="full" />
                      </Box>
                      
                      <Box w="full">
                        <HStack justify="space-between" mb={2}>
                          <Text fontSize="sm" color={mutedColor}>Progressive Loading</Text>
                          <Text fontSize="sm" fontWeight="bold" color="green.500">Optimized</Text>
                        </HStack>
                        <Progress value={89} colorScheme="green" borderRadius="full" />
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
                  <CardHeader>
                    <Text fontWeight="bold" fontSize="lg">Device Distribution</Text>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack spacing={4}>
                      <HStack justify="space-between" w="full">
                        <Text fontSize="sm" color={mutedColor}>Mobile</Text>
                        <Text fontSize="sm" fontWeight="bold">73%</Text>
                      </HStack>
                      <Progress value={73} colorScheme="blue" borderRadius="full" />
                      
                      <HStack justify="space-between" w="full">
                        <Text fontSize="sm" color={mutedColor}>Desktop</Text>
                        <Text fontSize="sm" fontWeight="bold">19%</Text>
                      </HStack>
                      <Progress value={19} colorScheme="purple" borderRadius="full" />
                      
                      <HStack justify="space-between" w="full">
                        <Text fontSize="sm" color={mutedColor}>Tablet</Text>
                        <Text fontSize="sm" fontWeight="bold">8%</Text>
                      </HStack>
                      <Progress value={8} colorScheme="teal" borderRadius="full" />
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </TabPanel>

            {/* Celebration Impact Tab */}
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
                  <CardHeader>
                    <HStack>
                      <Icon as={FaAward} color="purple.500" boxSize={6} />
                      <Text fontWeight="bold">Celebration Effectiveness</Text>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack align="start" spacing={4}>
                      <Stat>
                        <StatLabel>Celebration Triggers</StatLabel>
                        <StatNumber color="purple.500">{metrics.celebrationTriggered}</StatNumber>
                        <StatHelpText>
                          <StatArrow type="increase" />
                          89.2% increase from last month
                        </StatHelpText>
                      </Stat>
                      
                      <Text fontSize="sm" color={mutedColor}>
                        High-transparency products triggering celebrations show 340% higher engagement rates.
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
                  <CardHeader>
                    <HStack>
                      <Icon as={FaHeart} color="red.500" boxSize={6} />
                      <Text fontWeight="bold">Consumer Response</Text>
                    </HStack>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack align="start" spacing={4}>
                      <HStack justify="space-between" w="full">
                        <Text fontSize="sm" color={mutedColor}>Celebration Engagement</Text>
                        <Text fontSize="lg" fontWeight="bold" color="red.500">
                          {consumerBehavior.celebrationEngagement}%
                        </Text>
                      </HStack>
                      
                      <Progress 
                        value={consumerBehavior.celebrationEngagement} 
                        colorScheme="red" 
                        borderRadius="full" 
                      />
                      
                      <Text fontSize="sm" color={mutedColor}>
                        Users who interact with celebration modals show significantly higher trust in farming practices.
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Success Summary */}
        <Card bg="green.50" borderColor="green.200" borderWidth="2px">
          <CardBody>
            <VStack spacing={4}>
              <HStack>
                <Circle size={12} bg="green.500" color="white">
                  <Icon as={MdTrendingUp} boxSize={6} />
                </Circle>
                <VStack align="start" spacing={0}>
                  <Text fontSize="xl" fontWeight="bold" color="green.700">
                    Transparency-First Transformation Success
                  </Text>
                  <Text color="green.600">
                    The strategic shift from carbon-competitive to transparency-first approach is delivering exceptional results
                  </Text>
                </VStack>
              </HStack>
              
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} w="full">
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">+340%</Text>
                  <Text fontSize="sm" color="green.700" textAlign="center">Consumer Engagement</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">78%</Text>
                  <Text fontSize="sm" color="green.700" textAlign="center">Completion Rate</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">+89%</Text>
                  <Text fontSize="sm" color="green.700" textAlign="center">Celebration Events</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">4.8/5</Text>
                  <Text fontSize="sm" color="green.700" textAlign="center">Trust Rating</Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default TransparencyAnalyticsDashboard;