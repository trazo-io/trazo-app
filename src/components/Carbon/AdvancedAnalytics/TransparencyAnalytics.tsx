import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Icon,
  SimpleGrid,
  Progress,
  useColorModeValue,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Flex,
  Circle,
  Divider,
  Alert,
  AlertIcon,
  Tooltip,
  useBreakpointValue,
  List,
  ListItem,
  ListIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShieldAlt,
  FaDatabase,
  FaCertificate,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaEye,
  FaMicroscope,
  FaSearch,
  FaClipboardCheck,
  FaUserCheck,
  FaLock,
  FaGlobe,
  FaUniversity,
  FaRegClock,
  FaLayerGroup,
  FaFingerprint,
  FaTrophy
} from 'react-icons/fa';
import { MdVerifiedUser, MdSecurity, MdScience } from 'react-icons/md';
import { BsShieldCheck, BsGraphUp } from 'react-icons/bs';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

interface DataSource {
  id: string;
  name: string;
  type: 'government' | 'third_party' | 'internal' | 'blockchain';
  credibilityScore: number; // 0-100
  description: string;
  verificationMethod: string;
  lastUpdated: string;
  sampleSize?: number;
  coverage: string;
  icon: any;
  color: string;
  trustFactors: string[];
}

interface VerificationDepth {
  level: 'basic' | 'enhanced' | 'comprehensive' | 'enterprise';
  score: number;
  description: string;
  verifiedAspects: string[];
  auditTrail: AuditStep[];
}

interface AuditStep {
  id: string;
  step: string;
  method: string;
  result: 'verified' | 'partial' | 'pending';
  confidence: number;
  timestamp: string;
  details: string;
}

interface TransparencyData {
  overallTransparencyScore: number; // 0-100
  dataCompleteness: number; // 0-100
  verificationDepth: VerificationDepth;
  dataSources: DataSource[];
  trustIndicators: {
    blockchainVerified: boolean;
    usdaCompliant: boolean;
    realTimeTracking: boolean;
  };
  confidenceMetrics: {
    dataAccuracy: number;
    methodologyRobustness: number;
    sourceCredibility: number;
    auditFrequency: string;
  };
  comparativeContext: {
    industryBenchmark: number;
    percentile: number;
    betterThanPercent: number;
  };
}

interface TransparencyAnalyticsProps {
  data: TransparencyData;
  productionId: string;
  isLoading?: boolean;
  showDetailedAudit?: boolean;
}

export const TransparencyAnalytics: React.FC<TransparencyAnalyticsProps> = ({
  data,
  productionId,
  isLoading = false,
  showDetailedAudit = false
}) => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // Theme colors
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Responsive values
  const cardSpacing = useBreakpointValue({ base: 4, md: 6 });
  const iconSize = useBreakpointValue({ base: 6, md: 8 });

  if (isLoading) {
    return (
      <Card bg={bg}>
        <CardBody>
          <VStack spacing={4}>
            <Text>Loading transparency analytics...</Text>
            <Progress size="lg" isIndeterminate colorScheme="blue" />
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card bg={bg}>
        <CardBody>
          <Alert status="info">
            <AlertIcon />
            No transparency data available
          </Alert>
        </CardBody>
      </Card>
    );
  }

  const getTransparencyGrade = (score: number) => {
    if (score >= 95) return { grade: 'A+', text: 'Exceptional', color: 'green' };
    if (score >= 90) return { grade: 'A', text: 'Outstanding', color: 'green' };
    if (score >= 85) return { grade: 'B+', text: 'Excellent', color: 'green' };
    if (score >= 80) return { grade: 'B', text: 'Very Good', color: 'blue' };
    if (score >= 70) return { grade: 'C+', text: 'Good', color: 'blue' };
    if (score >= 60) return { grade: 'C', text: 'Satisfactory', color: 'yellow' };
    return { grade: 'D', text: 'Needs Improvement', color: 'orange' };
  };

  const getSourceTypeDetails = (type: string) => {
    switch (type) {
      case 'government':
        return {
          name: 'Government Data',
          icon: FaUniversity,
          color: 'blue',
          trustLevel: 'Official'
        };
      case 'third_party':
        return {
          name: 'Third-Party Verified',
          icon: MdVerifiedUser,
          color: 'purple',
          trustLevel: 'Independent'
        };
      case 'blockchain':
        return {
          name: 'Blockchain Verified',
          icon: BsShieldCheck,
          color: 'green',
          trustLevel: 'Immutable'
        };
      default:
        return {
          name: 'Internal Data',
          icon: FaDatabase,
          color: 'gray',
          trustLevel: 'Validated'
        };
    }
  };

  const transparencyGrade = getTransparencyGrade(data.overallTransparencyScore);

  return (
    <VStack spacing={cardSpacing} align="stretch">
      {/* Alert: Transparency Calculation Note */}
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontSize="sm" fontWeight="medium">
            Transparency Scoring
          </Text>
          <Text fontSize="xs">
            Scores are calculated objectively based on verified data availability. See methodology
            below.
          </Text>
        </Box>
      </Alert>

      {/* Transparency Score Overview */}
      <MotionCard
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        bg={`${transparencyGrade.color}.50`}
        borderColor={`${transparencyGrade.color}.200`}
        borderWidth="2px">
        <CardBody>
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={3}>
              <HStack spacing={3}>
                <Circle size="50px" bg={`${transparencyGrade.color}.100`}>
                  <Icon as={FaShieldAlt} color={`${transparencyGrade.color}.500`} boxSize={6} />
                </Circle>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color={mutedColor}>
                    Transparency Score
                  </Text>
                  <HStack spacing={2}>
                    <Text fontSize="2xl" fontWeight="bold" color={`${transparencyGrade.color}.600`}>
                      {data.overallTransparencyScore}/100
                    </Text>
                    <Badge
                      colorScheme={transparencyGrade.color}
                      variant="solid"
                      px={2}
                      py={1}
                      borderRadius="md">
                      Grade {transparencyGrade.grade}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color={`${transparencyGrade.color}.600`} fontWeight="medium">
                    {transparencyGrade.text} Transparency
                  </Text>
                </VStack>
              </HStack>

              {/* Industry Comparison */}
              <Box bg={`${transparencyGrade.color}.100`} px={3} py={2} borderRadius="md">
                <HStack spacing={2}>
                  <Icon as={FaTrophy} color={`${transparencyGrade.color}.500`} boxSize={4} />
                  <Text fontSize="sm" fontWeight="medium" color={`${transparencyGrade.color}.700`}>
                    Better than {data.comparativeContext.betterThanPercent}% of similar products
                  </Text>
                </HStack>
              </Box>
            </VStack>

            {/* Progress Ring */}
            <Box position="relative" w="120px" h="120px">
              <Circle size="120px" position="absolute" borderWidth="8px" borderColor="gray.200" />
              <Circle
                size="120px"
                position="absolute"
                borderWidth="8px"
                borderColor={`${transparencyGrade.color}.400`}
                borderTopColor="transparent"
                borderRightColor="transparent"
                transform={`rotate(${(data.overallTransparencyScore / 100) * 360}deg)`}
                transition="transform 1s ease-out"
              />
              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                textAlign="center">
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {data.overallTransparencyScore}%
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  Verified
                </Text>
              </Box>
            </Box>
          </HStack>
        </CardBody>
      </MotionCard>

      {/* Transparency Score Methodology - Positioned early for better UX */}
      <Card bg={bg}>
        <CardHeader>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="md">How We Calculate Transparency</Heading>
              <Text fontSize="sm" color={mutedColor}>
                Our scoring methodology explained
              </Text>
            </VStack>
            <Badge colorScheme="blue" variant="outline" px={3} py={1}>
              Fair & Objective
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color={textColor}>
              The transparency score is calculated based on{' '}
              <strong>actual verification data</strong>, not marketing claims:
            </Text>

            <VStack spacing={2} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>
                  Carbon Data Available
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  30 points
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>
                  USDA Verification
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  25 points
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>
                  Blockchain Verification
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  20 points
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>
                  Production Tracking
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  Up to 15 points
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>
                  Location Verification
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  10 points
                </Text>
              </HStack>
            </VStack>

            <Divider />

            <Text fontSize="xs" color={mutedColor} fontStyle="italic">
              💡 This score reflects what data is actually verified and available, not what
              companies claim. Higher scores mean more comprehensive verification.
            </Text>
          </VStack>
        </CardBody>
      </Card>

      {/* Trust Indicators Grid */}
      <Card bg={bg}>
        <CardHeader>
          <Heading size="md">Trust Indicators</Heading>
          <Text fontSize="sm" color={mutedColor}>
            Independent verification across multiple dimensions
          </Text>
        </CardHeader>
        <CardBody pt={0}>
          <SimpleGrid columns={{ base: 1, sm: 1, md: 3 }} spacing={6}>
            <VStack
              bg={data.trustIndicators.blockchainVerified ? 'green.50' : 'gray.50'}
              p={4}
              borderRadius="lg"
              border="1px"
              borderColor={data.trustIndicators.blockchainVerified ? 'green.200' : 'gray.200'}
              spacing={2}>
              <Icon
                as={BsShieldCheck}
                color={data.trustIndicators.blockchainVerified ? 'green.500' : 'gray.400'}
                boxSize={iconSize}
              />
              <Text fontSize="sm" fontWeight="bold" textAlign="center">
                Blockchain Verified
              </Text>
              <Badge
                colorScheme={data.trustIndicators.blockchainVerified ? 'green' : 'gray'}
                size="sm">
                {data.trustIndicators.blockchainVerified ? 'Active' : 'Inactive'}
              </Badge>
            </VStack>

            <VStack
              bg={data.trustIndicators.usdaCompliant ? 'blue.50' : 'gray.50'}
              p={4}
              borderRadius="lg"
              border="1px"
              borderColor={data.trustIndicators.usdaCompliant ? 'blue.200' : 'gray.200'}
              spacing={2}>
              <Icon
                as={FaUniversity}
                color={data.trustIndicators.usdaCompliant ? 'blue.500' : 'gray.400'}
                boxSize={iconSize}
              />
              <Text fontSize="sm" fontWeight="bold" textAlign="center">
                USDA Compliant
              </Text>
              <Badge colorScheme={data.trustIndicators.usdaCompliant ? 'blue' : 'gray'} size="sm">
                {data.trustIndicators.usdaCompliant ? 'Verified' : 'Pending'}
              </Badge>
            </VStack>

            <VStack
              bg={data.trustIndicators.realTimeTracking ? 'teal.50' : 'gray.50'}
              p={4}
              borderRadius="lg"
              border="1px"
              borderColor={data.trustIndicators.realTimeTracking ? 'teal.200' : 'gray.200'}
              spacing={2}>
              <Icon
                as={BsGraphUp}
                color={data.trustIndicators.realTimeTracking ? 'teal.500' : 'gray.400'}
                boxSize={iconSize}
              />
              <Text fontSize="sm" fontWeight="bold" textAlign="center">
                Real-Time Tracking
              </Text>
              <Badge
                colorScheme={data.trustIndicators.realTimeTracking ? 'teal' : 'gray'}
                size="sm">
                {data.trustIndicators.realTimeTracking ? 'Active' : 'Inactive'}
              </Badge>
            </VStack>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Data Sources */}
      <Card bg={bg}>
        <CardHeader>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="md">Data Sources</Heading>
              <Text fontSize="sm" color={mutedColor}>
                Where this product's carbon data comes from
              </Text>
            </VStack>
            <Badge colorScheme="blue" variant="outline" px={3} py={1}>
              {data.dataSources.length} Sources
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={3} align="stretch">
            {data.dataSources.map((source, index) => {
              const sourceType = getSourceTypeDetails(source.type);
              const isSelected = selectedSource === source.id;

              return (
                <MotionBox
                  key={source.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}>
                  <Card
                    cursor="pointer"
                    bg={isSelected ? `${sourceType.color}.50` : cardBg}
                    borderColor={isSelected ? `${sourceType.color}.300` : borderColor}
                    borderWidth={isSelected ? '2px' : '1px'}
                    _hover={{
                      borderColor: `${sourceType.color}.300`,
                      transform: 'translateY(-2px)',
                      shadow: 'md'
                    }}
                    transition="all 0.2s"
                    onClick={() => setSelectedSource(isSelected ? null : source.id)}>
                    <CardBody>
                      <HStack justify="space-between" align="start" spacing={4}>
                        <HStack spacing={3} align="start" flex={1} minW={0}>
                          <Circle size="40px" bg={`${sourceType.color}.100`} flexShrink={0}>
                            <Icon
                              as={sourceType.icon}
                              color={`${sourceType.color}.500`}
                              boxSize={5}
                            />
                          </Circle>

                          <VStack align="start" spacing={1} flex={1} minW={0}>
                            <HStack spacing={2} align="center" wrap="wrap">
                              <Text fontWeight="bold" color={textColor}>
                                {source.name}
                              </Text>
                              <Badge colorScheme={sourceType.color} variant="subtle" size="sm">
                                {sourceType.trustLevel}
                              </Badge>
                            </HStack>

                            <Text fontSize="sm" color={mutedColor} noOfLines={2}>
                              {source.description}
                            </Text>

                            <HStack spacing={4} fontSize="xs" color={mutedColor}>
                              <HStack spacing={1}>
                                <Icon as={FaRegClock} boxSize={3} />
                                <Text>Updated {source.lastUpdated}</Text>
                              </HStack>
                              <HStack spacing={1}>
                                <Icon as={FaEye} boxSize={3} />
                                <Text>{source.coverage} coverage</Text>
                              </HStack>
                            </HStack>
                          </VStack>
                        </HStack>

                        <VStack spacing={1} align="end" w="70px" flexShrink={0}>
                          <Text 
                            fontSize="lg" 
                            fontWeight="bold" 
                            color={`${sourceType.color}.600`}
                            textAlign="right"
                            lineHeight={1.2}
                          >
                            {source.credibilityScore}%
                          </Text>
                          <Text fontSize="xs" color={mutedColor} textAlign="right">
                            Credibility
                          </Text>
                        </VStack>
                      </HStack>

                      {/* Detailed View */}
                      <AnimatePresence>
                        {isSelected && (
                          <MotionBox
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            overflow="hidden">
                            <Divider my={4} />
                            <VStack align="start" spacing={4}>
                              <Box>
                                <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={2}>
                                  Verification Method:
                                </Text>
                                <Text fontSize="sm" color={mutedColor}>
                                  {source.verificationMethod}
                                </Text>
                              </Box>

                              {source.trustFactors.length > 0 && (
                                <Box>
                                  <Text
                                    fontSize="sm"
                                    fontWeight="semibold"
                                    color={textColor}
                                    mb={2}>
                                    Trust Factors:
                                  </Text>
                                  <List spacing={1}>
                                    {source.trustFactors.map((factor, idx) => (
                                      <ListItem key={idx} fontSize="sm">
                                        <ListIcon as={FaCheckCircle} color="green.500" />
                                        {factor}
                                      </ListItem>
                                    ))}
                                  </List>
                                </Box>
                              )}
                            </VStack>
                          </MotionBox>
                        )}
                      </AnimatePresence>
                    </CardBody>
                  </Card>
                </MotionBox>
              );
            })}
          </VStack>
        </CardBody>
      </Card>

      {/* Verification Depth */}
      <Card bg={bg}>
        <CardHeader>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="md">Verification Depth</Heading>
              <Text fontSize="sm" color={mutedColor}>
                How thoroughly this product's data is verified
              </Text>
            </VStack>
            <Badge colorScheme="purple" variant="solid" px={3} py={1} textTransform="capitalize">
              {data.verificationDepth.level} Level
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={6} align="stretch">
            {/* Verification Progress */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium">
                  Verification Completeness
                </Text>
                <Text fontSize="sm" color={mutedColor}>
                  {data.verificationDepth.score}%
                </Text>
              </HStack>
              <Progress
                value={data.verificationDepth.score}
                colorScheme="purple"
                size="lg"
                borderRadius="full"
              />
              <Text fontSize="sm" color={mutedColor} mt={2}>
                {data.verificationDepth.description}
              </Text>
            </Box>

            {/* Verified Aspects */}
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={3}>
                Verified Aspects ({data.verificationDepth.verifiedAspects.length}):
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                {data.verificationDepth.verifiedAspects.map((aspect, index) => (
                  <HStack key={index} spacing={2}>
                    <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                    <Text fontSize="sm" color={mutedColor}>
                      {aspect}
                    </Text>
                  </HStack>
                ))}
              </SimpleGrid>
            </Box>

            {/* Audit Trail */}
            {showDetailedAudit && data.verificationDepth.auditTrail.length > 0 && (
              <Box>
                <HStack justify="space-between" mb={3}>
                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                    Audit Trail
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="purple"
                    onClick={() => setShowAuditTrail(!showAuditTrail)}>
                    {showAuditTrail ? 'Hide' : 'Show'} Details
                  </Button>
                </HStack>

                <AnimatePresence>
                  {showAuditTrail && (
                    <MotionBox
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      overflow="hidden">
                      <Accordion allowToggle>
                        {data.verificationDepth.auditTrail.map((step, index) => (
                          <AccordionItem key={step.id}>
                            <AccordionButton>
                              <HStack flex={1} textAlign="left" spacing={3}>
                                <Circle
                                  size="20px"
                                  bg={step.result === 'verified' ? 'green.100' : 'orange.100'}>
                                  <Icon
                                    as={step.result === 'verified' ? FaCheckCircle : FaRegClock}
                                    color={step.result === 'verified' ? 'green.500' : 'orange.500'}
                                    boxSize={3}
                                  />
                                </Circle>
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="medium">
                                    {step.step}
                                  </Text>
                                  <Text fontSize="xs" color={mutedColor}>
                                    {step.confidence}% confidence
                                  </Text>
                                </VStack>
                              </HStack>
                              <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel pb={4}>
                              <VStack align="start" spacing={2}>
                                <Text fontSize="sm" color={mutedColor}>
                                  <strong>Method:</strong> {step.method}
                                </Text>
                                <Text fontSize="sm" color={mutedColor}>
                                  <strong>Details:</strong> {step.details}
                                </Text>
                                <Text fontSize="xs" color={mutedColor}>
                                  Completed: {step.timestamp}
                                </Text>
                              </VStack>
                            </AccordionPanel>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </MotionBox>
                  )}
                </AnimatePresence>
              </Box>
            )}
          </VStack>
        </CardBody>
      </Card>


      {/* Consumer Trust Message */}
      <Box
        bg="green.50"
        p={6}
        borderRadius="lg"
        border="1px"
        borderColor="green.200"
        textAlign="center">
        <VStack spacing={4}>
          <Icon as={FaShieldAlt} color="green.500" boxSize={10} />
          <VStack spacing={2}>
            <Heading size="md" color="green.700">
              Your Trust is Our Priority
            </Heading>
            <Text fontSize="sm" color="green.600" maxW="lg">
              This level of transparency demonstrates our commitment to providing you with accurate,
              verified carbon data. Every number is backed by credible sources and rigorous
              verification processes.
            </Text>
          </VStack>
          <HStack spacing={4}>
            <Button colorScheme="green" size="sm">
              View Full Methodology
            </Button>
            <Button
              variant="outline"
              colorScheme="green"
              size="sm"
              leftIcon={<FaExternalLinkAlt />}>
              Verify on Blockchain
            </Button>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );
};

export default TransparencyAnalytics;
