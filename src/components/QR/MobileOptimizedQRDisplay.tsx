import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Circle,
  Card,
  CardBody,
  useColorModeValue,
  useBreakpointValue,
  Skeleton,
  Button,
  Progress,
  Container,
  Flex,
  Image,
  AspectRatio,
  SimpleGrid
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShieldAlt,
  FaCheckCircle,
  FaEye,
  FaLeaf,
  FaUsers,
  FaChartLine,
  FaQrcode,
  FaMobileAlt,
  FaWifi,
  FaSignal
} from 'react-icons/fa';
import { MdVerified, MdSpeed, MdOfflinePin } from 'react-icons/md';
import { BsShieldCheck, BsSpeedometer2 } from 'react-icons/bs';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

interface MobileQRData {
  transparencyScore: number;
  carbonScore: number;
  productName: string;
  farmName: string;
  primaryTrustIndicator: {
    icon: any;
    label: string;
    value: string;
    color: string;
  };
  quickStats: {
    scansCount: number;
    verificationLevel: string;
    lastUpdated: string;
  };
  loadingStates: {
    essentialData: boolean;
    detailedData: boolean;
    verificationData: boolean;
  };
  connectionQuality: 'fast' | 'slow' | 'offline';
}

export interface MobileOptimizedQRDisplayProps {
  qrData: MobileQRData;
  onDetailsRequest: () => void;
  onTrustDetails: () => void;
  variant?: 'scan' | 'display' | 'share';
  enableOfflineMode?: boolean;
  showPerformanceMetrics?: boolean;
}

export const MobileOptimizedQRDisplay: React.FC<MobileOptimizedQRDisplayProps> = ({
  qrData,
  onDetailsRequest,
  onTrustDetails,
  variant = 'scan',
  enableOfflineMode = true,
  showPerformanceMetrics = false
}) => {
  const [loadPhase, setLoadPhase] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    interactionReady: false
  });

  // Theme colors following Trazo patterns
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const primaryColor = useColorModeValue('green.500', 'green.400');

  // Mobile-first responsive values following Trazo breakpoint system
  const containerPadding = useBreakpointValue({ 
    base: 4,      // 320px+
    smd: 4,       // 480px+
    smdd: 5,      // 550px+
    smddd: 6,     // 690px+
    md: 8,        // 768px+
    lg: 10        // 960px+
  });
  
  const scoreSize = useBreakpointValue({ 
    base: '100px',  // 320px - Mobile portrait
    smd: '120px',   // 480px - Mobile landscape
    smdd: '140px',  // 550px - Large mobile
    smddd: '160px', // 690px - Small tablet
    md: '180px',    // 768px - Tablet portrait
    lg: '200px'     // 960px+ - Desktop
  });
  
  const fontSize = useBreakpointValue({ 
    base: 'lg',     // 320px
    smd: 'xl',      // 480px
    smdd: '2xl',    // 550px
    md: '3xl'       // 768px+
  });

  const iconSize = useBreakpointValue({ 
    base: 4,        // 320px
    smd: 5,         // 480px
    md: 6           // 768px+
  });

  const gridColumns = useBreakpointValue({ 
    base: 2,        // 320px - 2 columns for mobile
    smddd: 3,       // 690px - 3 columns for small tablets
    md: 4           // 768px+ - 4 columns for tablets/desktop
  });

  // Performance tracking for mobile optimization
  useEffect(() => {
    const startTime = performance.now();
    
    const timer = setInterval(() => {
      setLoadPhase(prev => {
        if (prev < 3) {
          const currentTime = performance.now();
          setPerformanceMetrics(prevMetrics => ({
            ...prevMetrics,
            loadTime: currentTime - startTime,
            renderTime: prev === 0 ? currentTime - startTime : prevMetrics.renderTime
          }));
          return prev + 1;
        }
        
        setPerformanceMetrics(prevMetrics => ({
          ...prevMetrics,
          interactionReady: true
        }));
        clearInterval(timer);
        return prev;
      });
    }, 300); // Fast loading for mobile

    return () => clearInterval(timer);
  }, []);

  // Get connection quality styling
  const getConnectionStyle = (quality: string) => {
    switch (quality) {
      case 'fast':
        return { color: 'green', icon: FaWifi, label: 'Fast Connection' };
      case 'slow':
        return { color: 'yellow', icon: FaSignal, label: 'Slow Connection' };
      default:
        return { color: 'gray', icon: MdOfflinePin, label: 'Offline Mode' };
    }
  };

  const connectionStyle = getConnectionStyle(qrData.connectionQuality);

  // Get transparency grade for mobile display
  const getTransparencyGrade = (score: number) => {
    if (score >= 95) return { grade: 'A+', color: 'green', bg: 'green.500' };
    if (score >= 85) return { grade: 'A', color: 'green', bg: 'green.400' };
    if (score >= 75) return { grade: 'B+', color: 'blue', bg: 'blue.500' };
    if (score >= 65) return { grade: 'B', color: 'blue', bg: 'blue.400' };
    return { grade: 'C+', color: 'yellow', bg: 'yellow.500' };
  };

  const transparencyGrade = getTransparencyGrade(qrData.transparencyScore);

  return (
    <Container maxW="container.sm" p={0}>
      <VStack spacing={4} align="stretch">
        {/* Performance Metrics (Development/Debug) */}
        {showPerformanceMetrics && (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            bg="blue.50"
            p={2}
            borderRadius="md"
            fontSize="xs">
            <HStack justify="space-between">
              <Text>Load: {performanceMetrics.loadTime.toFixed(0)}ms</Text>
              <Text>Ready: {performanceMetrics.interactionReady ? '✓' : '...'}</Text>
              <HStack spacing={1}>
                <Icon as={connectionStyle.icon} color={`${connectionStyle.color}.500`} />
                <Text color={`${connectionStyle.color}.600`}>{connectionStyle.label}</Text>
              </HStack>
            </HStack>
          </MotionBox>
        )}

        {/* Mobile-Optimized Main Score Card */}
        <MotionCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: loadPhase >= 1 ? 1 : 0, y: 0 }}
          transition={{ duration: 0.4 }}
          bg={`${transparencyGrade.color}.50`}
          borderColor={`${transparencyGrade.color}.200`}
          borderWidth="2px"
          borderRadius="xl"
          boxShadow="lg">
          <CardBody p={containerPadding}>
            <VStack spacing={4}>
              {/* Product Identity - Always loads first */}
              <VStack spacing={2} textAlign="center">
                <Text fontSize={fontSize} fontWeight="bold" color={textColor} noOfLines={1}>
                  {qrData.productName}
                </Text>
                <Text fontSize="md" color={mutedColor} fontWeight="medium" noOfLines={1}>
                  by {qrData.farmName}
                </Text>
              </VStack>

              {/* Main Score Display - Optimized for touch */}
              <Flex 
                direction={{ base: 'column', smddd: 'row' }} 
                align="center" 
                justify="center" 
                gap={6}
                w="full">
                
                {/* Primary Score Circle */}
                <Box position="relative">
                  <Circle
                    size={scoreSize}
                    bg={bg}
                    borderWidth={{ base: '4px', md: '6px' }}
                    borderColor={transparencyGrade.bg}
                    boxShadow="xl">
                    <VStack spacing={0}>
                      {qrData.loadingStates.essentialData ? (
                        <>
                          <Text
                            fontSize={{ base: '2xl', smd: '3xl', md: '4xl' }}
                            fontWeight="black"
                            color={transparencyGrade.bg}
                            lineHeight="1">
                            {Math.round(qrData.transparencyScore)}
                          </Text>
                          <Text
                            fontSize={{ base: 'xs', md: 'sm' }}
                            fontWeight="bold"
                            color={textColor}
                            lineHeight="1">
                            Transparency
                          </Text>
                        </>
                      ) : (
                        <Skeleton height="40px" width="80px" borderRadius="md" />
                      )}
                    </VStack>
                    
                    {/* Grade Badge - Mobile optimized positioning */}
                    <Badge
                      position="absolute"
                      top={{ base: '-1', md: '-2' }}
                      right={{ base: '-1', md: '-2' }}
                      colorScheme={transparencyGrade.color}
                      variant="solid"
                      px={{ base: 2, md: 3 }}
                      py={1}
                      borderRadius="full"
                      fontSize={{ base: 'xs', md: 'sm' }}
                      fontWeight="bold">
                      {transparencyGrade.grade}
                    </Badge>
                  </Circle>
                </Box>

                {/* Primary Trust Indicator - Mobile layout */}
                {loadPhase >= 2 && (
                  <MotionBox
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}>
                    <VStack 
                      spacing={3} 
                      align="center" 
                      bg={`${qrData.primaryTrustIndicator.color}.50`}
                      p={4}
                      borderRadius="lg"
                      border="1px"
                      borderColor={`${qrData.primaryTrustIndicator.color}.200`}
                      minW={{ base: '180px', smddd: '200px' }}>
                      
                      <Circle size="40px" bg={`${qrData.primaryTrustIndicator.color}.100`}>
                        <Icon 
                          as={qrData.primaryTrustIndicator.icon} 
                          color={`${qrData.primaryTrustIndicator.color}.500`} 
                          boxSize={iconSize} 
                        />
                      </Circle>
                      
                      <VStack spacing={1} textAlign="center">
                        <Text 
                          fontSize="sm" 
                          fontWeight="bold" 
                          color={`${qrData.primaryTrustIndicator.color}.700`}>
                          {qrData.primaryTrustIndicator.label}
                        </Text>
                        <Text 
                          fontSize="lg" 
                          fontWeight="bold" 
                          color={`${qrData.primaryTrustIndicator.color}.600`}>
                          {qrData.primaryTrustIndicator.value}
                        </Text>
                      </VStack>
                    </VStack>
                  </MotionBox>
                )}
              </Flex>

              {/* Progress Bar - Mobile optimized */}
              <Box w="full" maxW="sm">
                <Progress
                  value={qrData.transparencyScore}
                  colorScheme={transparencyGrade.color}
                  size={{ base: 'md', md: 'lg' }}
                  borderRadius="full"
                  bg="gray.100"
                />
              </Box>

              {/* Quick Stats Grid - Mobile responsive */}
              {loadPhase >= 3 && (
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  w="full">
                  <SimpleGrid columns={gridColumns} spacing={3}>
                    {/* Consumer Scans */}
                    <Box bg={cardBg} p={3} borderRadius="lg" textAlign="center">
                      <VStack spacing={1}>
                        <Icon as={FaUsers} color="purple.500" boxSize={4} />
                        <Text fontSize="sm" fontWeight="bold" color="purple.600">
                          {qrData.quickStats.scansCount}
                        </Text>
                        <Text fontSize="xs" color={mutedColor}>
                          Scans
                        </Text>
                      </VStack>
                    </Box>

                    {/* Verification Level */}
                    <Box bg={cardBg} p={3} borderRadius="lg" textAlign="center">
                      <VStack spacing={1}>
                        <Icon as={BsShieldCheck} color="green.500" boxSize={4} />
                        <Text fontSize="sm" fontWeight="bold" color="green.600" noOfLines={1}>
                          {qrData.quickStats.verificationLevel}
                        </Text>
                        <Text fontSize="xs" color={mutedColor}>
                          Level
                        </Text>
                      </VStack>
                    </Box>

                    {/* Carbon Score */}
                    <Box bg={cardBg} p={3} borderRadius="lg" textAlign="center">
                      <VStack spacing={1}>
                        <Icon as={FaLeaf} color="green.500" boxSize={4} />
                        <Text fontSize="sm" fontWeight="bold" color="green.600">
                          {qrData.carbonScore}
                        </Text>
                        <Text fontSize="xs" color={mutedColor}>
                          Carbon
                        </Text>
                      </VStack>
                    </Box>

                    {/* Last Updated */}
                    <Box bg={cardBg} p={3} borderRadius="lg" textAlign="center">
                      <VStack spacing={1}>
                        <Icon as={MdSpeed} color="blue.500" boxSize={4} />
                        <Text fontSize="sm" fontWeight="bold" color="blue.600" noOfLines={1}>
                          Fresh
                        </Text>
                        <Text fontSize="xs" color={mutedColor}>
                          Data
                        </Text>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </MotionBox>
              )}

              {/* Mobile-Optimized Action Buttons */}
              <VStack spacing={3} w="full" pt={2}>
                <Button
                  colorScheme="green"
                  size={{ base: 'md', md: 'lg' }}
                  w="full"
                  maxW="sm"
                  borderRadius="full"
                  leftIcon={<Icon as={FaEye} />}
                  onClick={onDetailsRequest}
                  isDisabled={!performanceMetrics.interactionReady}
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg'
                  }}
                  transition="all 0.2s">
                  View Complete Transparency
                </Button>

                <Button
                  variant="outline"
                  colorScheme="green"
                  size="md"
                  w="full"
                  maxW="sm"
                  borderRadius="full"
                  leftIcon={<Icon as={FaShieldAlt} />}
                  onClick={onTrustDetails}
                  isDisabled={!performanceMetrics.interactionReady}>
                  Trust Details: {qrData.transparencyScore}%
                </Button>
              </VStack>

              {/* Offline Mode Indicator */}
              {enableOfflineMode && qrData.connectionQuality === 'offline' && (
                <Box
                  bg="gray.100"
                  p={3}
                  borderRadius="lg"
                  border="1px"
                  borderColor="gray.300"
                  w="full">
                  <HStack justify="center" spacing={2}>
                    <Icon as={MdOfflinePin} color="gray.500" boxSize={4} />
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                      Offline Mode - Cached Data
                    </Text>
                  </HStack>
                </Box>
              )}
            </VStack>
          </CardBody>
        </MotionCard>

        {/* Mobile Performance Notice */}
        <Box
          bg="blue.50"
          p={3}
          borderRadius="lg"
          border="1px"
          borderColor="blue.200"
          textAlign="center">
          <VStack spacing={1}>
            <HStack justify="center" spacing={2}>
              <Icon as={FaMobileAlt} color="blue.500" boxSize={4} />
              <Text fontSize="sm" fontWeight="bold" color="blue.700">
                Mobile-First Experience
              </Text>
            </HStack>
            <Text fontSize="xs" color="blue.600">
              Optimized for {scoreSize} screens • Load time: &lt;1.5s • Touch-friendly
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default MobileOptimizedQRDisplay;