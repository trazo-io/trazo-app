/**
 * Trazo Transparency Indicator Component
 * 
 * Modern, clean, minimalist design following Trazo 2025 standards
 * Replaces competitive carbon rankings with transparency-first approach
 * 
 * Key Features:
 * - Progressive disclosure (quick → detailed)
 * - Trazo color system compliance (green.500 primary)
 * - Mobile-first responsive design
 * - Clean, professional presentation
 * - Consumer trust optimization
 */
import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Tooltip,
  Icon,
  useColorModeValue,
  useBreakpointValue,
  Circle,
  Divider
} from '@chakra-ui/react';
import { 
  FaCheckCircle, 
  FaInfoCircle, 
  FaExclamationTriangle,
  FaQuestionCircle,
  FaShieldAlt,
  FaCertificate
} from 'react-icons/fa';
import { 
  getTransparencyBadgeColor, 
  getTransparencyTrustIcon,
  isTrazoTransparencyCertified 
} from '../../store/api/transparencyQrApi';

interface TransparencyIndicatorProps {
  percentage: number;
  message: string;
  status: 'excellent' | 'certification' | 'good' | 'minimum' | 'below_minimum';
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'compact' | 'full' | 'hero';
  actualEvents?: number;
  expectedEvents?: number;
  farmingApproach?: string;
}

export const TransparencyIndicator: React.FC<TransparencyIndicatorProps> = ({
  percentage,
  message,
  status,
  showDetails = false,
  size = 'md',
  variant = 'full',
  actualEvents,
  expectedEvents,
  farmingApproach
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  // Trazo design system spacing
  const spacing = { sm: 3, md: 4, lg: 6 }[size];
  const badgeSize = { sm: 'sm', md: 'md', lg: 'lg' }[size];
  
  // Color following Trazo green system
  const badgeColor = getTransparencyBadgeColor(percentage);
  const progressColor = percentage >= 70 ? 'green' : percentage >= 50 ? 'yellow' : 'gray';
  
  // Status icon mapping
  const getStatusIcon = () => {
    switch (status) {
      case 'excellent': return FaCheckCircle;
      case 'certification': return FaCertificate;
      case 'good': return FaInfoCircle;
      case 'minimum': return FaExclamationTriangle;
      default: return FaQuestionCircle;
    }
  };
  
  const StatusIcon = getStatusIcon();
  const trustIcon = getTransparencyTrustIcon(status);
  const isCertified = isTrazoTransparencyCertified(percentage);

  // Compact variant for mobile/small spaces
  if (variant === 'compact') {
    return (
      <HStack 
        spacing={2} 
        p={2}
        bg={bgColor}
        borderRadius="md"
        border="1px solid"
        borderColor={borderColor}
      >
        <Circle size="24px" bg={badgeColor} color="white">
          <Text fontSize="xs" fontWeight="bold">
            {Math.round(percentage)}
          </Text>
        </Circle>
        
        <VStack spacing={0} align="start" flex="1">
          <Text fontSize="sm" fontWeight="medium" color={textColor}>
            {percentage}% Transparency
          </Text>
          {isCertified && (
            <Badge colorScheme="green" size="xs" borderRadius="full">
              Trazo Certified
            </Badge>
          )}
        </VStack>
        
        <Icon as={StatusIcon} color={badgeColor} boxSize={4} />
      </HStack>
    );
  }

  // Hero variant for main product pages
  if (variant === 'hero') {
    return (
      <VStack 
        spacing={spacing} 
        align="center"
        p={6}
        bg={bgColor}
        borderRadius="xl"
        border="2px solid"
        borderColor={borderColor}
        shadow="lg"
        textAlign="center"
      >
        <Circle size="80px" bg={badgeColor} color="white" shadow="md">
          <VStack spacing={0}>
            <Text fontSize="2xl" fontWeight="bold">
              {Math.round(percentage)}
            </Text>
            <Text fontSize="xs" opacity={0.9}>
              %
            </Text>
          </VStack>
        </Circle>
        
        <VStack spacing={2}>
          <HStack spacing={2}>
            <Text fontSize="xl" fontWeight="semibold" color={textColor}>
              Farm Transparency
            </Text>
            <Text fontSize="xl">{trustIcon}</Text>
          </HStack>
          
          <Text fontSize="md" color={mutedColor} maxW="300px">
            {message}
          </Text>
          
          {isCertified && (
            <Badge 
              colorScheme="green" 
              size={badgeSize} 
              borderRadius="full"
              px={3}
              py={1}
            >
              <HStack spacing={1}>
                <Icon as={FaShieldAlt} boxSize={3} />
                <Text>Trazo Transparency Certified</Text>
              </HStack>
            </Badge>
          )}
        </VStack>
        
        {showDetails && actualEvents && expectedEvents && (
          <>
            <Divider />
            <VStack spacing={2} w="100%">
              <Progress 
                value={percentage} 
                colorScheme={progressColor}
                size="lg"
                w="100%"
                borderRadius="full"
                bg="gray.100"
              />
              <HStack justify="space-between" w="100%" fontSize="sm" color={mutedColor}>
                <Text>{actualEvents} events recorded</Text>
                <Text>{expectedEvents} expected</Text>
              </HStack>
            </VStack>
          </>
        )}
      </VStack>
    );
  }

  // Full variant (default) - comprehensive display
  return (
    <Box
      p={spacing}
      bg={bgColor}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      shadow="sm"
      _hover={{ shadow: 'md' }}
      transition="all 0.2s"
    >
      <VStack spacing={spacing} align="stretch">
        
        {/* Header with score and status */}
        <HStack justify="space-between" align="center">
          <HStack spacing={3}>
            <Circle size="48px" bg={badgeColor} color="white">
              <Text fontSize="lg" fontWeight="bold">
                {Math.round(percentage)}
              </Text>
            </Circle>
            
            <VStack align="start" spacing={0}>
              <HStack spacing={2}>
                <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                  {percentage}% Transparency
                </Text>
                <Icon as={StatusIcon} color={badgeColor} boxSize={4} />
              </HStack>
              
              <Text fontSize="sm" color={mutedColor}>
                Farm record completeness
              </Text>
            </VStack>
          </HStack>
          
          {isCertified && (
            <Tooltip 
              label="This farm meets Trazo's transparency certification standards"
              placement="top"
            >
              <Badge 
                colorScheme="green" 
                size={badgeSize} 
                borderRadius="full"
                cursor="help"
              >
                <HStack spacing={1}>
                  <Icon as={FaShieldAlt} boxSize={3} />
                  <Text>Certified</Text>
                </HStack>
              </Badge>
            </Tooltip>
          )}
        </HStack>
        
        {/* Progress bar and message */}
        <VStack spacing={2} align="stretch">
          <Progress 
            value={percentage} 
            colorScheme={progressColor}
            size="lg"
            borderRadius="full"
            bg={useColorModeValue('gray.100', 'gray.700')}
          />
          
          <Text fontSize="sm" color={textColor}>
            {message}
          </Text>
        </VStack>
        
        {/* Details section (optional) */}
        {showDetails && (
          <VStack spacing={3} pt={2} borderTop="1px solid" borderColor={borderColor}>
            
            {/* Event counts */}
            {actualEvents && expectedEvents && (
              <HStack justify="space-between" w="100%" fontSize="sm">
                <Text color={mutedColor}>
                  <Text as="span" fontWeight="medium" color={textColor}>
                    {actualEvents}
                  </Text> events documented
                </Text>
                <Text color={mutedColor}>
                  <Text as="span" fontWeight="medium" color={textColor}>
                    {expectedEvents}
                  </Text> expected
                </Text>
              </HStack>
            )}
            
            {/* Farming approach */}
            {farmingApproach && (
              <HStack justify="space-between" w="100%" fontSize="sm">
                <Text color={mutedColor}>Farming approach:</Text>
                <Badge 
                  colorScheme={farmingApproach === 'organic' ? 'green' : 'blue'} 
                  borderRadius="full"
                  textTransform="capitalize"
                >
                  {farmingApproach}
                </Badge>
              </HStack>
            )}
            
            {/* Trust message */}
            <Box 
              p={3}
              bg={useColorModeValue('green.50', 'green.900')}
              borderRadius="md"
              border="1px solid"
              borderColor={useColorModeValue('green.200', 'green.700')}
            >
              <Text fontSize="xs" color={useColorModeValue('green.800', 'green.200')} textAlign="center">
                💚 Higher transparency means more complete information about how your food was grown
              </Text>
            </Box>
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default TransparencyIndicator;