import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  List,
  ListItem,
  ListIcon,
  Divider,
  Card,
  CardBody,
  Button,
  Link,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Alert,
  AlertIcon,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import {
  FaCalculator,
  FaChartLine,
  FaLeaf,
  FaShieldAlt,
  FaEye,
  FaCalendarCheck,
  FaCube,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLightbulb,
  FaExternalLinkAlt,
  FaClock,
  FaRocket,
  FaTrophy,
} from 'react-icons/fa';

export interface MetricData {
  carbonScore: number;
  netFootprint: number;
  transparencyScore: number;
  verifiedEvents: number;
  securityScore: number;
  usdaCompliance: number;
  blockchainStatus: string;
  totalEmissions: number;
  totalOffsets: number;
  emissionsByCategory: Record<string, number>;
}

interface MetricTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricType: 'carbonScore' | 'netFootprint' | 'transparencyScore' | 'verifiedEvents' | 'securityScore' | 'usdaCompliance' | 'blockchainStatus';
  metricData: MetricData;
}

const MetricTransparencyModal: React.FC<MetricTransparencyModalProps> = ({
  isOpen,
  onClose,
  metricType,
  metricData,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const greenColor = useColorModeValue('green.500', 'green.400');
  const redColor = useColorModeValue('red.500', 'red.400');
  const yellowColor = useColorModeValue('orange.500', 'orange.400');

  const getMetricConfig = () => {
    switch (metricType) {
      case 'carbonScore':
        return {
          title: 'Carbon Score',
          icon: FaLeaf,
          color: metricData.carbonScore >= 70 ? greenColor : metricData.carbonScore >= 40 ? yellowColor : redColor,
          overview: {
            description: 'Your Carbon Score represents your overall environmental performance based on the ratio of carbon offsets to total emissions.',
            currentValue: metricData.carbonScore,
            unit: '/100',
            status: metricData.carbonScore >= 70 ? 'Excellent' : metricData.carbonScore >= 40 ? 'Good' : 'Needs Improvement',
          },
          calculation: {
            formula: 'Carbon Score = Base Score (10-50) + Offset Bonus',
            steps: [
              'Calculate offset percentage: (Total Offsets ÷ Total Emissions) × 100',
              `Your offset percentage: (${metricData.totalOffsets.toLocaleString()} ÷ ${metricData.totalEmissions.toLocaleString()}) × 100 = ${((metricData.totalOffsets / metricData.totalEmissions) * 100).toFixed(1)}%`,
              'Apply scoring algorithm based on offset ranges:',
              '• 100%+ offsets = 90-100 points (Carbon Negative)',
              '• 75-99% offsets = 75-90 points (Excellent)',
              '• 50-74% offsets = 60-75 points (Good)',
              '• 25-49% offsets = 40-60 points (Fair)',
              '• 0-24% offsets = 10-40 points (Needs Work)',
            ],
            factors: ['Carbon offsets purchased', 'Sequestration activities', 'Total emissions from operations'],
          },
          improvements: {
            immediate: [
              'Purchase verified carbon offsets from renewable energy projects',
              'Implement energy-efficient practices to reduce electricity consumption',
              'Switch to renewable energy sources (solar, wind)',
              'Optimize transportation routes and vehicle efficiency',
            ],
            shortTerm: [
              'Install solar panels or wind turbines on-site',
              'Implement precision agriculture to reduce fertilizer usage',
              'Plant cover crops for natural carbon sequestration',
              'Upgrade to electric or hybrid farm equipment',
            ],
            longTerm: [
              'Achieve carbon neutrality through comprehensive offset strategy',
              'Implement regenerative agriculture practices',
              'Establish on-farm carbon sequestration projects',
              'Transition to fully sustainable operations',
            ],
          },
          benchmarks: {
            excellent: { min: 70, description: 'Industry leader in carbon management' },
            good: { min: 40, description: 'Above average environmental performance' },
            needsWork: { min: 0, description: 'Significant room for improvement' },
          },
        };

      case 'netFootprint':
        return {
          title: 'Net Carbon Footprint',
          icon: FaCalculator,
          color: metricData.netFootprint <= 0 ? greenColor : metricData.netFootprint <= 50000 ? yellowColor : redColor,
          overview: {
            description: 'Your Net Carbon Footprint is the total greenhouse gas emissions from your operations minus any verified carbon offsets.',
            currentValue: metricData.netFootprint,
            unit: 'kg CO₂e',
            status: metricData.netFootprint <= 0 ? 'Carbon Negative' : metricData.netFootprint <= 50000 ? 'Moderate Impact' : 'High Impact',
          },
          calculation: {
            formula: 'Net Footprint = Total Emissions - Verified Offsets',
            steps: [
              `Total Emissions: ${metricData.totalEmissions.toLocaleString()} kg CO₂e`,
              `Verified Offsets: ${metricData.totalOffsets.toLocaleString()} kg CO₂e`,
              `Net Footprint: ${metricData.totalEmissions.toLocaleString()} - ${metricData.totalOffsets.toLocaleString()} = ${metricData.netFootprint.toLocaleString()} kg CO₂e`,
              'Emissions are calculated using USDA-verified emission factors',
              'Offsets are discounted based on verification trust scores',
            ],
            factors: [
              'Fertilizer usage (nitrogen, phosphorus, potassium)',
              'Electricity consumption from grid sources',
              'Transportation and logistics',
              'Equipment fuel consumption',
              'Processing and materials',
            ],
          },
          improvements: {
            immediate: [
              'Reduce fertilizer application through soil testing',
              'Switch to LED lighting and efficient equipment',
              'Optimize irrigation scheduling to reduce energy',
              'Consolidate transportation trips',
            ],
            shortTerm: [
              'Implement precision agriculture technologies',
              'Install renewable energy generation',
              'Upgrade to efficient farm equipment',
              'Use organic fertilizers and soil amendments',
            ],
            longTerm: [
              'Achieve net-zero or carbon-negative operations',
              'Implement comprehensive carbon sequestration',
              'Transition to fully renewable energy',
              'Develop closed-loop sustainable systems',
            ],
          },
          benchmarks: {
            excellent: { min: 0, description: 'Carbon neutral or negative' },
            good: { min: 50000, description: 'Moderate environmental impact' },
            needsWork: { min: 100000, description: 'High carbon footprint requiring action' },
          },
        };

      case 'transparencyScore':
        return {
          title: 'Transparency Score',
          icon: FaEye,
          color: metricData.transparencyScore >= 80 ? greenColor : metricData.transparencyScore >= 60 ? yellowColor : redColor,
          overview: {
            description: 'Your Transparency Score measures how complete and trustworthy your carbon data is for consumers and stakeholders.',
            currentValue: metricData.transparencyScore,
            unit: '/100',
            status: metricData.transparencyScore >= 80 ? 'Highly Transparent' : metricData.transparencyScore >= 60 ? 'Good Transparency' : 'Limited Transparency',
          },
          calculation: {
            formula: 'Transparency Score = Data Completeness × Verification Level × Consumer Access',
            steps: [
              'Data Completeness (40%): Percentage of production events documented',
              'Verification Level (30%): USDA compliance and third-party verification',
              'Consumer Access (30%): QR code availability and public data access',
              'Bonus points for blockchain verification and real-time monitoring',
            ],
            factors: [
              'Production event documentation',
              'Carbon calculation verification',
              'QR code generation for products',
              'Blockchain record creation',
              'Third-party audits and certifications',
            ],
          },
          improvements: {
            immediate: [
              'Document all production events in detail',
              'Generate QR codes for all finished products',
              'Upload supporting documentation and photos',
              'Enable public access to production histories',
            ],
            shortTerm: [
              'Implement real-time IoT monitoring',
              'Obtain third-party carbon verification',
              'Complete blockchain record submissions',
              'Add consumer-friendly explanations',
            ],
            longTerm: [
              'Achieve full supply chain transparency',
              'Implement continuous monitoring systems',
              'Obtain premium sustainability certifications',
              'Create interactive consumer experiences',
            ],
          },
          benchmarks: {
            excellent: { min: 80, description: 'Industry-leading transparency' },
            good: { min: 60, description: 'Good consumer trust level' },
            needsWork: { min: 0, description: 'Limited transparency and trust' },
          },
        };

      case 'verifiedEvents':
        return {
          title: 'Verified Events',
          icon: FaCalendarCheck,
          color: metricData.verifiedEvents >= 50 ? greenColor : metricData.verifiedEvents >= 20 ? yellowColor : redColor,
          overview: {
            description: 'Verified Events represent the number of agricultural activities tracked with carbon impact calculations this year.',
            currentValue: metricData.verifiedEvents,
            unit: 'events',
            status: metricData.verifiedEvents >= 50 ? 'Comprehensive Tracking' : metricData.verifiedEvents >= 20 ? 'Good Tracking' : 'Limited Tracking',
          },
          calculation: {
            formula: 'Events with Carbon Calculations = Chemical + Equipment + Production + Soil Management Events',
            steps: [
              'Each documented agricultural activity counts as one event',
              'Events must have carbon impact calculations to be verified',
              'Calculations use USDA emission factors and verified methodologies',
              'Events are tracked across all production cycles and operations',
            ],
            factors: [
              'Fertilizer and chemical applications',
              'Equipment usage and fuel consumption',
              'Planting, harvesting, and processing activities',
              'Soil management and amendment practices',
              'Transportation and logistics events',
            ],
          },
          improvements: {
            immediate: [
              'Document all chemical applications with quantities',
              'Track equipment usage hours and fuel consumption',
              'Record all planting and harvesting activities',
              'Log transportation and processing events',
            ],
            shortTerm: [
              'Implement IoT sensors for automatic event tracking',
              'Train staff on comprehensive event documentation',
              'Use mobile apps for real-time event logging',
              'Integrate with equipment telemetry systems',
            ],
            longTerm: [
              'Achieve 100% automated event tracking',
              'Implement AI-powered activity recognition',
              'Create real-time carbon impact monitoring',
              'Develop predictive carbon management systems',
            ],
          },
          benchmarks: {
            excellent: { min: 50, description: 'Comprehensive tracking of all activities' },
            good: { min: 20, description: 'Good coverage of major activities' },
            needsWork: { min: 0, description: 'Significant tracking gaps' },
          },
        };

      case 'securityScore':
        return {
          title: 'Security Score',
          icon: FaShieldAlt,
          color: metricData.securityScore >= 70 ? greenColor : metricData.securityScore >= 50 ? yellowColor : redColor,
          overview: {
            description: 'Your Security Score measures the trust and verification level of your carbon data and claims.',
            currentValue: metricData.securityScore,
            unit: '%',
            status: metricData.securityScore >= 70 ? 'High Trust' : metricData.securityScore >= 50 ? 'Moderate Trust' : 'Needs Improvement',
          },
          calculation: {
            formula: 'Security Score = Verification × Documentation × Blockchain × Third-party Audits',
            steps: [
              'Data Verification (25%): USDA compliance and calculation accuracy',
              'Documentation Quality (25%): Completeness and evidence quality',
              'Blockchain Integration (25%): Immutable record creation',
              'Third-party Verification (25%): Independent audits and certifications',
            ],
            factors: [
              'USDA emission factor compliance',
              'Third-party verification certificates',
              'Blockchain record submissions',
              'Audit trail completeness',
              'Evidence quality and authenticity',
            ],
          },
          improvements: {
            immediate: [
              'Submit all carbon records to blockchain',
              'Upload high-quality evidence photos',
              'Complete USDA compliance verification',
              'Obtain basic third-party certifications',
            ],
            shortTerm: [
              'Implement automated verification systems',
              'Obtain premium sustainability certifications',
              'Create comprehensive audit trails',
              'Integrate with certification body APIs',
            ],
            longTerm: [
              'Achieve industry-leading verification standards',
              'Implement real-time verification monitoring',
              'Obtain multiple premium certifications',
              'Create verifiable supply chain transparency',
            ],
          },
          benchmarks: {
            excellent: { min: 70, description: 'High trust and verification' },
            good: { min: 50, description: 'Adequate verification measures' },
            needsWork: { min: 0, description: 'Significant verification gaps' },
          },
        };

      case 'usdaCompliance':
        return {
          title: 'USDA Compliance',
          icon: FaCheckCircle,
          color: metricData.usdaCompliance >= 90 ? greenColor : metricData.usdaCompliance >= 70 ? yellowColor : redColor,
          overview: {
            description: 'USDA Compliance shows the percentage of your carbon calculations using verified USDA emission factors.',
            currentValue: metricData.usdaCompliance,
            unit: '%',
            status: metricData.usdaCompliance >= 90 ? 'Fully Compliant' : metricData.usdaCompliance >= 70 ? 'Mostly Compliant' : 'Non-Compliant',
          },
          calculation: {
            formula: 'USDA Compliance = (USDA Verified Events ÷ Total Events) × 100',
            steps: [
              'Count total carbon-tracked events in the system',
              'Count events using USDA-verified emission factors',
              'Calculate percentage compliance rate',
              'USDA factors include fertilizer, fuel, and equipment emissions',
            ],
            factors: [
              'Nitrogen fertilizer emission factors (11.0 kg CO₂e per kg N)',
              'Diesel fuel emission factors (2.68 kg CO₂e per liter)',
              'Electricity grid emission factors (by region)',
              'Equipment efficiency standards',
              'Transportation emission factors',
            ],
          },
          improvements: {
            immediate: [
              'Update all fertilizer calculations to use USDA factors',
              'Verify fuel consumption calculations',
              'Cross-check equipment emission factors',
              'Update transportation calculations',
            ],
            shortTerm: [
              'Implement automated USDA factor updates',
              'Train staff on USDA compliance requirements',
              'Integrate with USDA databases and APIs',
              'Create compliance monitoring dashboards',
            ],
            longTerm: [
              'Achieve 100% USDA compliance',
              'Implement real-time factor updates',
              'Obtain USDA verification certifications',
              'Lead industry in standardized reporting',
            ],
          },
          benchmarks: {
            excellent: { min: 90, description: 'Full USDA compliance' },
            good: { min: 70, description: 'Mostly USDA compliant' },
            needsWork: { min: 0, description: 'Non-compliant calculations' },
          },
        };

      case 'blockchainStatus':
        return {
          title: 'Blockchain Status',
          icon: FaCube,
          color: metricData.blockchainStatus === 'VERIFIED' ? greenColor : metricData.blockchainStatus === 'PENDING' ? yellowColor : redColor,
          overview: {
            description: 'Blockchain Status shows the verification state of your carbon records on the immutable blockchain ledger.',
            currentValue: metricData.blockchainStatus,
            unit: '',
            status: metricData.blockchainStatus === 'VERIFIED' ? 'Fully Verified' : metricData.blockchainStatus === 'PENDING' ? 'Pending Verification' : 'Not Submitted',
          },
          calculation: {
            formula: 'Blockchain verification requires complete data, USDA compliance, and third-party validation',
            steps: [
              'Data Completeness Check: All required fields must be populated',
              'USDA Compliance: Carbon calculations must use verified emission factors',
              'Third-party Validation: Independent verification of claims',
              'Smart Contract Submission: Data submitted to blockchain network',
              'Network Consensus: Blockchain network validates the submission',
            ],
            factors: [
              'Complete production data',
              'USDA-compliant carbon calculations',
              'Third-party verification certificates',
              'Quality evidence (photos, documents)',
              'Audit trail completeness',
            ],
          },
          improvements: {
            immediate: [
              'Complete all missing data fields',
              'Upload verification documents',
              'Ensure USDA compliance for all calculations',
              'Submit pending records to blockchain',
            ],
            shortTerm: [
              'Implement automated blockchain submission',
              'Obtain required third-party certifications',
              'Create comprehensive audit trails',
              'Integrate with verification services',
            ],
            longTerm: [
              'Achieve real-time blockchain integration',
              'Implement automated verification workflows',
              'Create consumer-facing blockchain verification',
              'Lead industry in transparency standards',
            ],
          },
          benchmarks: {
            excellent: { min: 100, description: 'All records blockchain verified' },
            good: { min: 70, description: 'Most records submitted and verified' },
            needsWork: { min: 0, description: 'No blockchain verification' },
          },
        };

      default:
        return null;
    }
  };

  const config = getMetricConfig();
  if (!config) return null;

  const getBenchmarkColor = (value: number, benchmark: { min: number }) => {
    return value >= benchmark.min ? greenColor : redColor;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent bg={bgColor} borderColor={borderColor} maxW="1200px">
        <ModalHeader borderBottomWidth="1px" borderColor={borderColor}>
          <HStack spacing={3}>
            <Icon as={config.icon} color={config.color} boxSize={6} />
            <VStack align="start" spacing={0}>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                {config.title}
              </Text>
              <Text fontSize="sm" color={mutedColor}>
                Transparency Report & Improvement Guide
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody py={6}>
          <Tabs variant="enclosed" colorScheme="green">
            <TabList>
              <Tab>Overview</Tab>
              <Tab>How It's Calculated</Tab>
              <Tab>Improvement Plan</Tab>
              <Tab>Industry Benchmarks</Tab>
            </TabList>

            <TabPanels>
              {/* Overview Tab */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Card>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                        <Stat>
                          <StatLabel>Current Value</StatLabel>
                          <StatNumber color={config.color}>
                            {typeof config.overview.currentValue === 'number'
                              ? config.overview.currentValue.toLocaleString()
                              : config.overview.currentValue}
                            {config.overview.unit}
                          </StatNumber>
                          <StatHelpText>
                            <Badge colorScheme={config.color === greenColor ? 'green' : config.color === yellowColor ? 'orange' : 'red'}>
                              {config.overview.status}
                            </Badge>
                          </StatHelpText>
                        </Stat>

                        <Stat>
                          <StatLabel>Performance Level</StatLabel>
                          <StatNumber>
                            {typeof config.overview.currentValue === 'number' ? (
                              <Progress
                                value={Math.min(100, Math.max(0, config.overview.currentValue))}
                                colorScheme={config.color === greenColor ? 'green' : config.color === yellowColor ? 'orange' : 'red'}
                                size="lg"
                                borderRadius="md"
                              />
                            ) : (
                              <Badge size="lg" colorScheme={config.color === greenColor ? 'green' : 'orange'}>
                                {config.overview.currentValue}
                              </Badge>
                            )}
                          </StatNumber>
                          <StatHelpText>Visual performance indicator</StatHelpText>
                        </Stat>

                        <Stat>
                          <StatLabel>Impact Level</StatLabel>
                          <StatNumber>
                            <Icon
                              as={config.color === greenColor ? FaCheckCircle : config.color === yellowColor ? FaExclamationTriangle : FaExclamationTriangle}
                              color={config.color}
                              boxSize={8}
                            />
                          </StatNumber>
                          <StatHelpText>{config.overview.status}</StatHelpText>
                        </Stat>
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" mb={3} color={textColor}>
                      What This Metric Means
                    </Text>
                    <Text color={mutedColor} lineHeight={1.6}>
                      {config.overview.description}
                    </Text>
                  </Box>

                  {config.overview.status.includes('Needs') && (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="semibold">Action Required</Text>
                        <Text fontSize="sm">
                          This metric indicates room for improvement. Check the Improvement Plan tab for specific actions.
                        </Text>
                      </Box>
                    </Alert>
                  )}
                </VStack>
              </TabPanel>

              {/* Calculation Tab */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <HStack mb={4}>
                      <Icon as={FaCalculator} color={greenColor} />
                      <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                        Calculation Methodology
                      </Text>
                    </HStack>
                    <Card>
                      <CardBody>
                        <Text fontWeight="semibold" mb={2} color={textColor}>
                          Formula:
                        </Text>
                        <Text
                          fontFamily="mono"
                          fontSize="sm"
                          bg={useColorModeValue('gray.50', 'gray.700')}
                          p={3}
                          borderRadius="md"
                          color={textColor}
                        >
                          {config.calculation.formula}
                        </Text>
                      </CardBody>
                    </Card>
                  </Box>

                  <Box>
                    <Text fontSize="md" fontWeight="semibold" mb={3} color={textColor}>
                      Step-by-Step Calculation
                    </Text>
                    <List spacing={2}>
                      {config.calculation.steps.map((step, index) => (
                        <ListItem key={index}>
                          <ListIcon as={FaCheckCircle} color={greenColor} />
                          <Text display="inline" color={mutedColor}>
                            {step}
                          </Text>
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <Box>
                    <Text fontSize="md" fontWeight="semibold" mb={3} color={textColor}>
                      Contributing Factors
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {config.calculation.factors.map((factor, index) => (
                        <Card key={index} size="sm">
                          <CardBody>
                            <HStack>
                              <Icon as={FaLeaf} color={greenColor} size="sm" />
                              <Text fontSize="sm" color={textColor}>
                                {factor}
                              </Text>
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </Box>
                </VStack>
              </TabPanel>

              {/* Improvement Plan Tab */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <HStack mb={4}>
                      <Icon as={FaLightbulb} color={greenColor} />
                      <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                        Your Improvement Roadmap
                      </Text>
                    </HStack>
                    <Text color={mutedColor} mb={6}>
                      Follow this step-by-step plan to improve your {config.title.toLowerCase()} and environmental performance.
                    </Text>
                  </Box>

                  <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
                    {/* Immediate Actions */}
                    <Card>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <HStack>
                            <Icon as={FaClock} color={redColor} />
                            <Text fontWeight="semibold" color={textColor}>
                              Immediate (0-30 days)
                            </Text>
                          </HStack>
                          <List spacing={2}>
                            {config.improvements.immediate.map((action, index) => (
                              <ListItem key={index}>
                                <ListIcon as={FaCheckCircle} color={greenColor} />
                                <Text fontSize="sm" color={mutedColor}>
                                  {action}
                                </Text>
                              </ListItem>
                            ))}
                          </List>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Short-term Actions */}
                    <Card>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <HStack>
                            <Icon as={FaRocket} color={yellowColor} />
                            <Text fontWeight="semibold" color={textColor}>
                              Short-term (1-6 months)
                            </Text>
                          </HStack>
                          <List spacing={2}>
                            {config.improvements.shortTerm.map((action, index) => (
                              <ListItem key={index}>
                                <ListIcon as={FaCheckCircle} color={greenColor} />
                                <Text fontSize="sm" color={mutedColor}>
                                  {action}
                                </Text>
                              </ListItem>
                            ))}
                          </List>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Long-term Actions */}
                    <Card>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <HStack>
                            <Icon as={FaTrophy} color={greenColor} />
                            <Text fontWeight="semibold" color={textColor}>
                              Long-term (6+ months)
                            </Text>
                          </HStack>
                          <List spacing={2}>
                            {config.improvements.longTerm.map((action, index) => (
                              <ListItem key={index}>
                                <ListIcon as={FaCheckCircle} color={greenColor} />
                                <Text fontSize="sm" color={mutedColor}>
                                  {action}
                                </Text>
                              </ListItem>
                            ))}
                          </List>
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>

                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="semibold">Pro Tip</Text>
                      <Text fontSize="sm">
                        Start with immediate actions to see quick wins, then gradually implement longer-term strategies for sustainable improvement.
                      </Text>
                    </Box>
                  </Alert>
                </VStack>
              </TabPanel>

              {/* Benchmarks Tab */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <HStack mb={4}>
                      <Icon as={FaChartLine} color={greenColor} />
                      <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                        Industry Benchmarks
                      </Text>
                    </HStack>
                    <Text color={mutedColor} mb={6}>
                      See how your performance compares to industry standards and best practices.
                    </Text>
                  </Box>

                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                    <Card borderColor={getBenchmarkColor(typeof config.overview.currentValue === 'number' ? config.overview.currentValue : 100, config.benchmarks.excellent)}>
                      <CardBody>
                        <VStack spacing={3}>
                          <Icon as={FaTrophy} color={greenColor} boxSize={8} />
                          <Text fontWeight="bold" color={greenColor}>
                            Excellent
                          </Text>
                          <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                            {config.benchmarks.excellent.min}+ {config.overview.unit}
                          </Text>
                          <Text fontSize="sm" color={mutedColor} textAlign="center">
                            {config.benchmarks.excellent.description}
                          </Text>
                          {typeof config.overview.currentValue === 'number' && config.overview.currentValue >= config.benchmarks.excellent.min && (
                            <Badge colorScheme="green">You're Here!</Badge>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card borderColor={getBenchmarkColor(typeof config.overview.currentValue === 'number' ? config.overview.currentValue : 50, config.benchmarks.good)}>
                      <CardBody>
                        <VStack spacing={3}>
                          <Icon as={FaCheckCircle} color={yellowColor} boxSize={8} />
                          <Text fontWeight="bold" color={yellowColor}>
                            Good
                          </Text>
                          <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                            {config.benchmarks.good.min}+ {config.overview.unit}
                          </Text>
                          <Text fontSize="sm" color={mutedColor} textAlign="center">
                            {config.benchmarks.good.description}
                          </Text>
                          {typeof config.overview.currentValue === 'number' && 
                           config.overview.currentValue >= config.benchmarks.good.min && 
                           config.overview.currentValue < config.benchmarks.excellent.min && (
                            <Badge colorScheme="orange">You're Here!</Badge>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card borderColor={redColor}>
                      <CardBody>
                        <VStack spacing={3}>
                          <Icon as={FaExclamationTriangle} color={redColor} boxSize={8} />
                          <Text fontWeight="bold" color={redColor}>
                            Needs Work
                          </Text>
                          <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                            Below {config.benchmarks.good.min} {config.overview.unit}
                          </Text>
                          <Text fontSize="sm" color={mutedColor} textAlign="center">
                            {config.benchmarks.needsWork.description}
                          </Text>
                          {typeof config.overview.currentValue === 'number' && config.overview.currentValue < config.benchmarks.good.min && (
                            <Badge colorScheme="red">You're Here!</Badge>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>

                  <Divider />

                  <Box>
                    <Text fontSize="md" fontWeight="semibold" mb={3} color={textColor}>
                      Additional Resources
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      <Link href="https://www.usda.gov/climate" isExternal color={greenColor}>
                        <HStack>
                          <Icon as={FaExternalLinkAlt} />
                          <Text>USDA Climate Hub Resources</Text>
                        </HStack>
                      </Link>
                      <Link href="https://www.epa.gov/ghgemissions/inventory-us-greenhouse-gas-emissions-and-sinks" isExternal color={greenColor}>
                        <HStack>
                          <Icon as={FaExternalLinkAlt} />
                          <Text>EPA Greenhouse Gas Inventory</Text>
                        </HStack>
                      </Link>
                      <Link href="https://www.goldstandard.org/" isExternal color={greenColor}>
                        <HStack>
                          <Icon as={FaExternalLinkAlt} />
                          <Text>Gold Standard Carbon Credits</Text>
                        </HStack>
                      </Link>
                    </VStack>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor={borderColor}>
          <Button onClick={onClose} colorScheme="gray" mr={3}>
            Close
          </Button>
          <Button colorScheme="green" leftIcon={<FaLightbulb />}>
            Start Improvement Plan
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MetricTransparencyModal;