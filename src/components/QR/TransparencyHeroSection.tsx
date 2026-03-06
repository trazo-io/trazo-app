/**
 * Trazo Transparency Hero Section
 *
 * REPLACES: CarbonHeroSection with competitive rankings
 * NEW APPROACH: Transparency-first display that solves farmer incentive problems
 *
 * Key Changes:
 * - Shows transparency percentage instead of competitive rankings
 * - Maintains carbon score but without "better than X% of farms"
 * - Uses Trazo modern, clean, minimalist design patterns
 * - Progressive disclosure: quick view → detailed insights
 * - Trust-building messaging focused on completeness
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Circle,
  Progress,
  Flex,
  useColorModeValue,
  useDisclosure,
  Container,
  Grid,
  GridItem,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useBreakpointValue,
  Tooltip,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaLeaf,
  FaShieldAlt,
  FaCertificate,
  FaCheckCircle,
  FaTree,
  FaGlobeAmericas,
  FaChartLine,
  FaInfoCircle,
  FaAward,
  FaRecycle,
  FaTachometerAlt,
  FaEye
} from 'react-icons/fa';
// Import our new components
import { TransparencyIndicator } from 'components/Design';
import { useGetCompleteSummaryQuery } from '../../store/api/carbonApi';
import { formatCarbonScore, isTrazoTransparencyCertified } from '../../store/api/transparencyQrApi';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

// Enhanced animations for transparency impact
const transparencyGlow = keyframes`
  0% { box-shadow: 0 0 20px rgba(72, 187, 120, 0.3); }
  50% { box-shadow: 0 0 30px rgba(72, 187, 120, 0.6); }
  100% { box-shadow: 0 0 20px rgba(72, 187, 120, 0.3); }
`;

const pulseGreen = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

interface TransparencyHeroSectionProps {
  productionId: string;
  isLoading?: boolean;
  onTransparencyLoad?: (data: any) => void;
}

export const TransparencyHeroSection: React.FC<TransparencyHeroSectionProps> = ({
  productionId,
  isLoading = false,
  onTransparencyLoad
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const isMobile = useBreakpointValue({ base: true, md: false });
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  // Fetch data from working carbon API instead of broken transparency API
  const {
    data: carbonData,
    error: carbonError,
    isLoading: carbonLoading
  } = useGetCompleteSummaryQuery(productionId);

  // Extract transparency data from carbon API response
  const transparencyData = React.useMemo(() => {
    if (!carbonData) return null;

    // Extract transparency information from carbon API
    const timelineLength = carbonData.timeline?.length || 0;
    const expectedEvents = 15; // Baseline for typical production
    const transparency_percentage = Math.min(
      Math.round((timelineLength / expectedEvents) * 100),
      100
    );

    return {
      quick_view: {
        farm_name: carbonData.farmer?.name || 'Farm',
        product_name: carbonData.product?.name || 'Product',
        transparency_score: {
          percentage: transparency_percentage,
          message:
            transparency_percentage >= 80
              ? 'Comprehensive farm record'
              : transparency_percentage >= 60
              ? 'Good record keeping'
              : 'Basic farm information',
          status:
            transparency_percentage >= 80
              ? 'excellent'
              : transparency_percentage >= 60
              ? 'good'
              : 'basic'
        },
        carbon_score: {
          kg_per_kg: carbonData.netFootprint || 0,
          total_emissions: carbonData.totalEmissions || 0,
          unit: 'kg CO₂ per kg product'
        }
      },
      trazo_transparency_certified: transparency_percentage >= 80,
      api_version: '2.0-carbon-derived'
    };
  }, [carbonData]);

  const transparencyError = carbonError;
  const transparencyLoading = carbonLoading;

  // TODO: Implement scan recording once transparency API is fixed
  // For now, focus on displaying transparency data from carbon API

  // Trigger animation and notify parent when data loads
  useEffect(() => {
    if (transparencyData && !hasAnimated) {
      setHasAnimated(true);
      onTransparencyLoad?.(transparencyData);
    }
  }, [transparencyData, hasAnimated, onTransparencyLoad]);

  // Show loading state
  if (isLoading || transparencyLoading) {
    return (
      <Container maxW="container.xl" py={6}>
        <Card bg={bgColor} shadow="xl" borderRadius="2xl" overflow="hidden">
          <CardBody p={8}>
            <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
              <VStack spacing={6} align="start">
                <HStack spacing={4}>
                  <SkeletonCircle size="80px" />
                  <VStack align="start" spacing={2}>
                    <Skeleton height="28px" width="200px" />
                    <Skeleton height="20px" width="150px" />
                  </VStack>
                </HStack>
                <SkeletonText mt={4} noOfLines={3} spacing={4} />
              </VStack>
              <VStack spacing={4}>
                <SkeletonCircle size="120px" />
                <SkeletonText noOfLines={2} spacing={4} />
              </VStack>
            </Grid>
          </CardBody>
        </Card>
      </Container>
    );
  }

  // Show error state
  if (transparencyError) {
    return (
      <Container maxW="container.xl" py={6}>
        <Card bg={bgColor} shadow="lg" borderRadius="xl">
          <CardBody p={8}>
            <VStack spacing={4}>
              <Icon as={FaInfoCircle} boxSize={12} color="red.500" />
              <Text fontSize="lg" color={textColor} textAlign="center">
                Unable to load transparency information
              </Text>
              <Text fontSize="sm" color={mutedColor} textAlign="center">
                Please try refreshing the page
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </Container>
    );
  }

  const quickView = transparencyData?.quick_view;
  const standardView = transparencyData?.standard_view;
  const detailedView = transparencyData?.detailed_view;
  const isCertified = transparencyData?.trazo_transparency_certified || false;

  if (!quickView) return null;

  return (
    <Container maxW="container.xl" py={6}>
      <MotionVStack
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        spacing={6}
      >
        {/* Main Hero Card */}
        <Card
          bg={bgColor}
          shadow="2xl"
          borderRadius="3xl"
          overflow="hidden"
          border="2px solid"
          borderColor={isCertified ? 'green.500' : borderColor}
          position="relative"
        >
          {isCertified && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              height="4px"
              bg="linear-gradient(90deg, #48BB78, #38A169, #2F855A)"
              animation={`${transparencyGlow} 2s infinite`}
            />
          )}

          <CardBody p={{ base: 6, md: 8 }}>
            <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8} alignItems="center">
              {/* Left Side - Product & Transparency Info */}
              <VStack spacing={6} align="start">
                {/* Farm & Product Header */}
                <VStack spacing={3} align="start" w="100%">
                  <HStack spacing={3}>
                    <Icon as={FaLeaf} boxSize={6} color="green.500" />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xl" fontWeight="bold" color={textColor}>
                        {quickView.farm_name}
                      </Text>
                      <Text fontSize="md" color={mutedColor}>
                        {quickView.product_name}
                      </Text>
                    </VStack>
                  </HStack>

                  {isCertified && (
                    <Badge colorScheme="green" size="lg" borderRadius="full" px={4} py={2}>
                      <HStack spacing={2}>
                        <Icon as={FaShieldAlt} boxSize={4} />
                        <Text>High Transparency</Text>
                      </HStack>
                    </Badge>
                  )}
                </VStack>

                {/* Dual Score Display */}
                <HStack spacing={6} wrap="wrap">
                  {/* Transparency Score (PRIMARY) */}
                  <VStack spacing={2} align="center">
                    <Text
                      fontSize="sm"
                      color={mutedColor}
                      textTransform="uppercase"
                      letterSpacing="wide"
                    >
                      Farm Transparency
                    </Text>
                    <Circle
                      size="80px"
                      bg="green.500"
                      color="white"
                      animation={hasAnimated ? `${pulseGreen} 2s ease-in-out` : undefined}
                    >
                      <VStack spacing={0}>
                        <Text fontSize="2xl" fontWeight="bold">
                          {Math.round(quickView.transparency_score.percentage)}
                        </Text>
                        <Text fontSize="xs" opacity={0.9}>
                          %
                        </Text>
                      </VStack>
                    </Circle>
                    <Text fontSize="sm" color="green.600" fontWeight="medium" textAlign="center">
                      {quickView.transparency_score.message}
                    </Text>
                  </VStack>

                  {/* Carbon Score (SECONDARY) */}
                  <VStack spacing={2} align="center">
                    <Text
                      fontSize="sm"
                      color={mutedColor}
                      textTransform="uppercase"
                      letterSpacing="wide"
                    >
                      Carbon Impact
                    </Text>
                    <Circle size="80px" bg="blue.500" color="white">
                      <VStack spacing={0}>
                        <Text fontSize="lg" fontWeight="bold">
                          {quickView.carbon_score.kg_per_kg.toFixed(2)}
                        </Text>
                        <Text fontSize="xs" opacity={0.9}>
                          kg CO₂
                        </Text>
                      </VStack>
                    </Circle>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" maxW="100px">
                      per kg product
                    </Text>
                  </VStack>
                </HStack>

                {/* Trust Message */}
                <Box
                  p={4}
                  bg={useColorModeValue('green.50', 'green.900')}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={useColorModeValue('green.200', 'green.700')}
                  w="100%"
                >
                  <HStack spacing={3}>
                    <Icon as={FaEye} color="green.600" boxSize={5} />
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="medium" color="green.800">
                        Why Transparency Matters
                      </Text>
                      <Text fontSize="xs" color="green.700">
                        Higher transparency means you can see more of the complete story about how
                        your food was grown
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </VStack>

              {/* Right Side - Transparency Indicator */}
              <VStack spacing={4} align="center">
                <TransparencyIndicator
                  percentage={quickView.transparency_score.percentage}
                  message={quickView.transparency_score.message}
                  status={quickView.transparency_score.status}
                  variant="hero"
                  showDetails={showDetails}
                  actualEvents={standardView?.transparency_details?.actual_events}
                  expectedEvents={standardView?.transparency_details?.expected_events}
                  farmingApproach={standardView?.transparency_details?.farming_approach}
                />

                {/* Action Buttons */}
                <HStack spacing={3}>
                  <Button
                    leftIcon={<Icon as={FaChartLine} />}
                    colorScheme="green"
                    variant={showDetails ? 'solid' : 'outline'}
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    borderRadius="full"
                  >
                    {showDetails ? 'Less Details' : 'More Details'}
                  </Button>

                  <Tooltip label="Learn about transparency scoring">
                    <Button
                      leftIcon={<Icon as={FaInfoCircle} />}
                      variant="ghost"
                      size="sm"
                      onClick={onOpen}
                      borderRadius="full"
                    >
                      Learn More
                    </Button>
                  </Tooltip>
                </HStack>
              </VStack>
            </Grid>

            {/* Expandable Details Section */}
            <AnimatePresence>
              {showDetails && standardView && (
                <MotionBox
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  mt={6}
                >
                  <Divider mb={6} />
                  <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                    {/* Transparency Breakdown */}
                    <VStack spacing={4} align="start">
                      <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                        📊 Record Completeness
                      </Text>
                      <VStack spacing={3} w="100%">
                        {Object.entries(standardView.transparency_details.category_breakdown).map(
                          ([category, data]) => (
                            <HStack key={category} justify="space-between" w="100%">
                              <Text fontSize="sm" color={textColor} textTransform="capitalize">
                                {category.replace('_', ' ')}
                              </Text>
                              <HStack spacing={2}>
                                <Progress
                                  value={data.completeness_percentage}
                                  colorScheme="green"
                                  size="sm"
                                  width="80px"
                                  borderRadius="full"
                                />
                                <Text fontSize="xs" color={mutedColor} minW="40px">
                                  {Math.round(data.completeness_percentage)}%
                                </Text>
                              </HStack>
                            </HStack>
                          )
                        )}
                      </VStack>
                    </VStack>

                    {/* Farm Details */}
                    <VStack spacing={4} align="start">
                      <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                        🏡 Farm Information
                      </Text>
                      <VStack spacing={2} align="start">
                        <HStack>
                          <Icon as={FaGlobeAmericas} color="blue.500" boxSize={4} />
                          <Text fontSize="sm" color={textColor}>
                            {standardView.farm_details.location || 'Location private'}
                          </Text>
                        </HStack>
                        <HStack>
                          <Icon as={FaLeaf} color="green.500" boxSize={4} />
                          <Text fontSize="sm" color={textColor} textTransform="capitalize">
                            {standardView.transparency_details.farming_approach} farming
                          </Text>
                        </HStack>
                        <HStack>
                          <Icon as={FaTree} color="green.600" boxSize={4} />
                          <Text fontSize="sm" color={textColor}>
                            {standardView.transparency_details.actual_events} events documented
                          </Text>
                        </HStack>
                      </VStack>
                    </VStack>
                  </Grid>
                </MotionBox>
              )}
            </AnimatePresence>
          </CardBody>
        </Card>

        {/* Education Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Understanding Farm Transparency</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4} align="start">
                <Text>
                  Trazo transparency scores show how completely a farm has documented their growing
                  practices. Higher scores mean more complete information about how your food was
                  grown.
                </Text>

                <VStack spacing={2} align="start">
                  <Text fontWeight="semibold">What we track:</Text>
                  <Text fontSize="sm">• Planting and harvesting activities</Text>
                  <Text fontSize="sm">• Fertilizer and chemical applications</Text>
                  <Text fontSize="sm">• Soil management practices</Text>
                  <Text fontSize="sm">• Equipment use and maintenance</Text>
                  <Text fontSize="sm">• Weather and environmental factors</Text>
                </VStack>

                <Box p={3} bg="green.50" borderRadius="md" w="100%">
                  <Text fontSize="sm" color="green.800">
                    💚 <strong>Why it matters:</strong> Complete transparency lets you see the real
                    story behind your food and support farmers who practice full openness.
                  </Text>
                </Box>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </MotionVStack>
    </Container>
  );
};

// Card components for consistency
const Card: React.FC<any> = ({ children, ...props }) => <Box {...props}>{children}</Box>;

const CardBody: React.FC<any> = ({ children, ...props }) => <Box {...props}>{children}</Box>;
