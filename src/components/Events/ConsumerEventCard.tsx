import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Collapse,
  useColorModeValue,
  Flex,
  Tooltip,
  Circle,
  Divider,
  Stack,
  useBreakpointValue,
  Link,
  Progress,
  SimpleGrid
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaInfoCircle,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaSeedling,
  FaShieldAlt,
  FaGlobeAmericas,
  FaExternalLinkAlt,
  FaCertificate,
  FaEye,
  FaClock,
  FaCamera,
  FaThermometerHalf,
  FaTint,
  FaWind,
  FaFlask,
  FaTractor,
  FaSeedling as FaSeed,
  FaBug,
  FaRulerCombined,
  FaCalendarDay
} from 'react-icons/fa';
import { MdVerified, MdEco, MdSecurity, MdOpenInNew } from 'react-icons/md';
import { 
  getConsumerEventDescription, 
  formatEventDate, 
  getSustainabilityImpact,
  getEventTrustIndicators 
} from 'utils/eventDescriptions';
import { getEventFieldDisplay, type EventFieldDisplay, type FieldDisplayItem } from 'utils/fieldDisplayUtils';
import { StandardImageGallery } from 'components/ImageGallery';

interface ConsumerEventCardProps {
  event: {
    id: string;
    type: string;
    description: string;
    observation?: string;
    date: string;
    certified?: boolean;
    blockchain_verified?: boolean;
    blockchain_transaction?: string;
    blockchain_block_number?: number;
    blockchain_explorer_url?: string;
    blockchain_network?: string;
    verification_confidence?: number;
    verification_timestamp?: string;
    data_integrity_score?: number;
    usda_verified?: boolean;
    volume?: string;
    area?: string;
    carbon_impact?: number;
    album?: {
      id: string;
      images: Array<{
        id: string;
        image: string;
        caption?: string;
        created_at?: string;
      }>;
    };
    extra_data?: {
      blockchain_verified?: boolean;
      blockchain_transaction?: string;
      blockchain_block_number?: number;
      verification_confidence?: number;
      verification_timestamp?: string;
      data_integrity_score?: number;
    };
  };
  isFirst?: boolean;
  isLast?: boolean;
}

export const ConsumerEventCard: React.FC<ConsumerEventCardProps> = ({ 
  event, 
  isFirst = false, 
  isLast = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  // Get consumer-friendly description with real event data
  const eventInfo = getConsumerEventDescription(event.description, event);
  const sustainabilityLevel = getSustainabilityImpact(event.description);
  const trustIndicators = getEventTrustIndicators(event);
  const formattedDate = formatEventDate(event.date);
  
  // Get comprehensive field display data based on field display matrix
  const fieldDisplay = getEventFieldDisplay(event);
  
  // DEBUG: Log field display data for production events
  if (event.type?.startsWith('production.')) {
    console.log('🔧 PRODUCTION EVENT FIELD DISPLAY DEBUG:', {
      eventId: event.id,
      eventType: event.type,
      description: event.description,
      area_covered: event.area_covered,
      yield_quantity: event.yield_quantity,
      fuel_consumed: event.fuel_consumed,
      equipment_hours: event.equipment_hours,
      fieldDisplay,
      immediateFields: fieldDisplay.immediate,
      secondaryFields: fieldDisplay.secondary,
      fullEvent: event
    });
  }
  
  // Enhanced blockchain verification processing
  const blockchainData = {
    verified: event.blockchain_verified || event.extra_data?.blockchain_verified || false,
    transaction: event.blockchain_transaction || event.extra_data?.blockchain_transaction || '',
    blockNumber: event.blockchain_block_number || event.extra_data?.blockchain_block_number || 0,
    confidence: event.verification_confidence || event.extra_data?.verification_confidence || 0,
    timestamp: event.verification_timestamp || event.extra_data?.verification_timestamp || '',
    integrityScore: event.data_integrity_score || event.extra_data?.data_integrity_score || 0,
    explorerUrl: event.blockchain_explorer_url || `https://amoy.polygonscan.com/tx/${event.blockchain_transaction || event.extra_data?.blockchain_transaction || ''}`,
    network: event.blockchain_network || 'polygon_amoy'
  };

  // Enhanced blockchain verification processing - use actual API data
  // Check if this event contains blockchain verification data from the API
  if (event.blockchain_verified && event.blockchain_transaction) {
    blockchainData.verified = event.blockchain_verified;
    blockchainData.transaction = event.blockchain_transaction;
    blockchainData.confidence = event.verification_confidence || 0;
    blockchainData.integrityScore = event.data_integrity_score || 0;
    blockchainData.timestamp = event.verification_timestamp || '';
    blockchainData.blockNumber = event.blockchain_block_number || 0;
  }

  // Photo verification processing (NEW - anti-gaming system)
  const photoVerification = {
    hasPhotos: Boolean(event.album?.images?.length),
    photoCount: event.album?.images?.length || 0,
    isPhotoVerified: Boolean(event.album?.images?.length && event.album.images.length >= 1),
    verificationLevel: (() => {
      const photoCount = event.album?.images?.length || 0;
      if (photoCount >= 2) return 'strong';
      if (photoCount >= 1) return 'moderate';
      return 'none';
    })(),
    trustMessage: (() => {
      const photoCount = event.album?.images?.length || 0;
      if (photoCount >= 2) return `Photo verified (${photoCount} images)`;
      if (photoCount >= 1) return `Photo documented (${photoCount} image)`;
      return 'Text documentation only';
    })()
  };

  // DEBUG: Log photo verification data for debugging
  console.log('📸 PHOTO VERIFICATION DEBUG:', {
    eventId: event.id,
    eventDescription: event.description,
    hasAlbum: !!event.album,
    albumId: event.album?.id,
    imagesCount: event.album?.images?.length || 0,
    images: event.album?.images || [],
    photoVerification,
    hasPhotos: photoVerification.hasPhotos
  });


  // Critical event types that require photo verification (matches backend logic)
  const requiresPhotoVerification = ['FE', 'PE', 'FU', 'HE', 'PL', 'HA'].includes(event.type);

  // Enhanced verification status
  const getVerificationLevel = () => {
    const hasBlockchain = blockchainData.verified && blockchainData.transaction;
    const hasUSDA = event.usda_verified;
    const highConfidence = blockchainData.confidence >= 90;
    
    if (hasBlockchain && hasUSDA && highConfidence) return 'ultimate';
    if (hasBlockchain && (hasUSDA || highConfidence)) return 'high';
    if (hasBlockchain || hasUSDA) return 'medium';
    return 'basic';
  };
  
  const verificationLevel = getVerificationLevel();

  // Helper function to get icon for field categories
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'weather': return FaThermometerHalf;
      case 'application': return FaFlask;
      case 'measurement': return FaRulerCombined;
      case 'verification': return FaCertificate;
      case 'environmental': return FaLeaf;
      case 'operational': return FaTractor;
      case 'documentation': return FaInfoCircle;
      default: return FaInfoCircle;
    }
  };

  // Debug blockchain data for verified events
  if (blockchainData.verified && blockchainData.transaction) {
    console.log('🔗 BLOCKCHAIN DEBUG:', {
      eventId: event.id,
      eventDescription: event.description,
      blockchainVerified: event.blockchain_verified,
      transaction: event.blockchain_transaction,
      blockchainData,
      verificationLevel
    });
  }
  
  // Color scheme
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const accentColor = useColorModeValue('green.500', 'green.400');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const highlightBg = useColorModeValue('green.50', 'gray.700');
  
  // Sustainability colors
  const sustainabilityColors = {
    high: 'green',
    medium: 'blue',
    low: 'gray'
  };
  
  return (
    <Box position="relative">
      {/* Timeline connector - DESKTOP ONLY */}
      {!isLast && (
        <Box
          position="absolute"
          left={{ base: '20px', md: '24px' }}
          top="60px"
          bottom="-20px"
          width="2px"
          bg={borderColor}
          zIndex={0}
          display={{ base: 'none', md: 'block' }}
        />
      )}
      
      <HStack align="flex-start" spacing={{ base: 0, md: 4 }} position="relative" zIndex={1}>
        {/* Timeline dot - DESKTOP ONLY */}
        <Flex direction="column" align="center" minW="40px" display={{ base: 'none', md: 'flex' }}>
          <Circle
            size={{ base: '40px', md: '48px' }}
            bg={isFirst ? accentColor : bgColor}
            border="3px solid"
            borderColor={verificationLevel === 'ultimate' ? 'green.400' : verificationLevel === 'high' ? 'blue.400' : accentColor}
            position="relative"
            boxShadow={verificationLevel === 'ultimate' ? '0 0 20px rgba(72, 187, 120, 0.4)' : 'none'}
          >
            <Icon
              as={verificationLevel === 'ultimate' ? MdSecurity : FaSeedling}
              boxSize={{ base: 4, md: 5 }}
              color={isFirst ? 'white' : verificationLevel === 'ultimate' ? 'green.500' : accentColor}
            />
            
            {/* Multiple verification indicators */}
            {event.certified && (
              <Circle
                size="14px"
                bg="green.500"
                position="absolute"
                top="-1px"
                right="-1px"
                border="1px solid white"
              >
                <Icon as={FaCertificate} boxSize="8px" color="white" />
              </Circle>
            )}
            
            {/* Blockchain verification indicator */}
            {blockchainData.verified && (
              <Circle
                size="14px"
                bg={verificationLevel === 'ultimate' ? 'blue.500' : 'blue.400'}
                position="absolute"
                bottom="-1px"
                right="-1px"
                border="1px solid white"
              >
                <Icon as={MdVerified} boxSize="8px" color="white" />
              </Circle>
            )}
            
            {/* USDA verification indicator */}
            {event.usda_verified && (
              <Circle
                size="14px"
                bg="green.600"
                position="absolute"
                bottom="-1px"
                left="-1px"
                border="1px solid white"
              >
                <Text fontSize="6px" color="white" fontWeight="bold">USDA</Text>
              </Circle>
            )}
          </Circle>
          
          {/* Verification confidence indicator */}
          {blockchainData.confidence > 0 && (
            <Text fontSize="xs" color="gray.500" mt={1} textAlign="center">
              {blockchainData.confidence}% verified
            </Text>
          )}
        </Flex>
        
        {/* Event card - Full width on mobile */}
        <Box
          flex="1"
          w={{ base: 'full', md: 'auto' }}
          bg={bgColor}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={borderColor}
          overflow="hidden"
          transition="all 0.2s"
          _hover={{ shadow: 'md', transform: 'translateY(-1px)' }}
          mb={{ base: 4, md: 0 }}
        >
          {/* Mobile-Optimized Card Header */}
          <Box p={{ base: 4, md: 4 }}>
            <HStack justify="space-between" align="flex-start" mb={2}>
              <VStack align="start" spacing={1} flex="1">
                <HStack>
                  <Text
                    fontSize={{ base: 'md', md: 'lg' }}
                    fontWeight="bold"
                    color={useColorModeValue('gray.800', 'white')}
                  >
                    {eventInfo.title}
                  </Text>
                  {isFirst && (
                    <Badge colorScheme="green" fontSize="xs">Latest</Badge>
                  )}
                </HStack>
                <Text fontSize={{ base: 'xs', md: 'sm' }} color={mutedColor}>
                  {formattedDate}
                </Text>
              </VStack>
              
              {/* Sustainability badge */}
              <Badge
                colorScheme={sustainabilityColors[sustainabilityLevel]}
                fontSize="xs"
                px={2}
                py={1}
                borderRadius="full"
              >
                <HStack spacing={1}>
                  <Icon as={MdEco} boxSize={3} />
                  <Text>{sustainabilityLevel.toUpperCase()} IMPACT</Text>
                </HStack>
              </Badge>
            </HStack>
            
            {/* Mobile-Optimized Short Description */}
            <Text
              fontSize={{ base: 'md', md: 'md' }}
              color={useColorModeValue('gray.700', 'gray.300')}
              mb={{ base: 4, md: 3 }}
              lineHeight={{ base: '1.6', md: '1.5' }}
            >
              {eventInfo.shortDescription}
            </Text>
            
            {/* Enhanced Trust & Verification Indicators */}
            <VStack spacing={2} mb={3} align="stretch">
              {/* Primary trust indicators */}
              {trustIndicators.length > 0 && (
                <HStack spacing={2} flexWrap="wrap">
                  {trustIndicators.map((indicator, idx) => (
                    <Badge
                      key={idx}
                      variant="subtle"
                      colorScheme="blue"
                      fontSize="xs"
                      px={2}
                      py={1}
                    >
                      <HStack spacing={1}>
                        <Icon as={FaCheckCircle} boxSize={3} />
                        <Text>{indicator}</Text>
                      </HStack>
                    </Badge>
                  ))}
                </HStack>
              )}
              
              {/* Removed redundant photo verification badge - photos are already mentioned in description and shown in gallery */}
              
              {/* Enhanced verification badges row */}
              <HStack spacing={2} flexWrap="wrap">
                {/* Blockchain verification badge */}
                {blockchainData.verified && (
                  <Tooltip
                    label={`Blockchain verified with ${blockchainData.confidence}% confidence. View transaction on Polygon explorer.`}
                    placement="top"
                  >
                    <Badge
                      colorScheme={verificationLevel === 'ultimate' ? 'green' : 'blue'}
                      variant="solid"
                      fontSize="xs"
                      px={3}
                      py={1}
                      borderRadius="full"
                      cursor="pointer"
                    >
                      <HStack spacing={1}>
                        <Icon as={MdVerified} boxSize={3} />
                        <Text>BLOCKCHAIN VERIFIED</Text>
                        {blockchainData.confidence > 0 && (
                          <Text fontWeight="bold">({blockchainData.confidence}%)</Text>
                        )}
                      </HStack>
                    </Badge>
                  </Tooltip>
                )}
                
                {/* USDA verification badge - REMOVED to avoid duplication with EnhancedTrustIndicators */}
                {/* USDA verification is already shown in the product header via EnhancedTrustIndicators */}
                
                {/* Photo verification badge */}
                {photoVerification.hasPhotos && (
                  <Tooltip
                    label="Visual evidence provided with verified photos from the farm"
                    placement="top"
                  >
                    <Badge
                      colorScheme="blue"
                      variant="solid"
                      fontSize="xs"
                      px={3}
                      py={1}
                      borderRadius="full"
                    >
                      <HStack spacing={1}>
                        <Icon as={FaCamera} boxSize={3} />
                        <Text>PHOTO VERIFIED</Text>
                      </HStack>
                    </Badge>
                  </Tooltip>
                )}
                
                {/* High integrity score badge */}
                {blockchainData.integrityScore >= 95 && (
                  <Tooltip
                    label={`Data integrity score: ${blockchainData.integrityScore}%. This indicates extremely high data quality and trustworthiness.`}
                    placement="top"
                  >
                    <Badge
                      colorScheme="purple"
                      variant="solid"
                      fontSize="xs"
                      px={3}
                      py={1}
                      borderRadius="full"
                    >
                      <HStack spacing={1}>
                        <Icon as={FaShieldAlt} boxSize={3} />
                        <Text>HIGH INTEGRITY ({blockchainData.integrityScore}%)</Text>
                      </HStack>
                    </Badge>
                  </Tooltip>
                )}
                
                {/* Ultimate verification indicator */}
                {verificationLevel === 'ultimate' && (
                  <Badge
                    colorScheme="gold"
                    variant="solid"
                    fontSize="xs"
                    px={3}
                    py={1}
                    borderRadius="full"
                    bg="linear-gradient(45deg, #FFD700, #FFA500)"
                    color="white"
                  >
                    <HStack spacing={1}>
                      <Icon as={MdSecurity} boxSize={3} />
                      <Text fontWeight="bold">ULTIMATE TRUST</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
            </VStack>
            
            {/* Mobile-Optimized Expand Button */}
            <Button
              size={{ base: 'md', md: 'sm' }}
              variant="ghost"
              colorScheme="green"
              onClick={() => setIsExpanded(!isExpanded)}
              rightIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              _hover={{ bg: highlightBg }}
              w={{ base: 'full', md: 'auto' }}
              justifyContent={{ base: 'space-between', md: 'flex-start' }}
              minH={{ base: '44px', md: 'auto' }}
              fontSize={{ base: 'md', md: 'sm' }}
              fontWeight="semibold"
            >
              {isExpanded ? 'Show Less Details' : 'See More Details'}
            </Button>
          </Box>
          
          {/* Expanded content */}
          <Collapse in={isExpanded}>
            <Divider />
            <Box p={{ base: 3, md: 4 }} bg={cardBg}>
              <VStack align="start" spacing={3}>
                {/* Consumer impact */}
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaShieldAlt} color={accentColor} boxSize={4} />
                    <Text fontWeight="semibold" fontSize="sm">
                      What This Means For You
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={mutedColor} pl={6}>
                    {eventInfo.consumerImpact}
                  </Text>
                </Box>
                
                {/* Sustainability benefit */}
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaGlobeAmericas} color="blue.500" boxSize={4} />
                    <Text fontWeight="semibold" fontSize="sm">
                      Environmental Benefit
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={mutedColor} pl={6}>
                    {eventInfo.sustainabilityBenefit}
                  </Text>
                </Box>
                
                {/* Comprehensive Field Display - IMMEDIATE Priority Fields */}
                {fieldDisplay.immediate.length > 0 && (
                  <Box>
                    <HStack mb={3}>
                      <Icon as={FaRulerCombined} color="green.500" boxSize={4} />
                      <Text fontWeight="bold" fontSize="sm" color="green.500">
                        Key Details
                      </Text>
                    </HStack>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} pl={6}>
                      {fieldDisplay.immediate.map((field, idx) => (
                        <Box
                          key={idx}
                          p={3}
                          bg={useColorModeValue('green.50', 'green.900')}
                          borderRadius="lg"
                          border="1px solid"
                          borderColor={useColorModeValue('green.200', 'green.700')}
                        >
                          <HStack spacing={2} mb={1}>
                            <Icon 
                              as={getCategoryIcon(field.category)} 
                              color="green.600" 
                              boxSize={3} 
                            />
                            <Text fontSize="xs" fontWeight="bold" color="green.700">
                              {field.label}
                            </Text>
                          </HStack>
                          <Text fontSize="sm" color="green.800" fontWeight="medium">
                            {field.value}
                          </Text>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </Box>
                )}
                
                {/* Comprehensive Field Display - SECONDARY Priority Fields */}
                {fieldDisplay.secondary.length > 0 && (
                  <Box>
                    <HStack mb={3}>
                      <Icon as={FaInfoCircle} color="blue.500" boxSize={4} />
                      <Text fontWeight="semibold" fontSize="sm" color="blue.500">
                        Additional Information
                      </Text>
                    </HStack>
                    <VStack align="stretch" spacing={2} pl={6}>
                      {fieldDisplay.secondary.map((field, idx) => (
                        <HStack key={idx} justify="space-between" flexWrap="wrap">
                          <HStack spacing={2} minW="120px">
                            <Icon 
                              as={getCategoryIcon(field.category)} 
                              color="blue.600" 
                              boxSize={3} 
                            />
                            <Text fontSize="sm" fontWeight="medium" color="blue.700">
                              {field.label}:
                            </Text>
                          </HStack>
                          <Text fontSize="sm" color={mutedColor} flex="1" textAlign="right">
                            {field.value}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Technical details if available (legacy fallback) */}
                {(event.volume || event.area || event.concentration || event.npk_ratio || 
                  event.active_ingredient || event.application_method || event.target_pest_disease_need) && 
                  fieldDisplay.immediate.length === 0 && (
                  <Box>
                    <HStack mb={4} spacing={2}>
                      <Icon as={FaFlask} color="green.500" boxSize={4} />
                      <Text fontWeight="600" fontSize="sm" color="gray.700">
                        Application Details
                      </Text>
                    </HStack>
                    
                    {/* Modern grid layout for fields */}
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mb={4}>
                      {(() => {
                        const chemicalFields = getEventFieldDisplay(event);
                        return [...chemicalFields.immediate, ...chemicalFields.secondary, ...chemicalFields.details].map((field, index) => (
                          <Box 
                            key={index} 
                            p={3} 
                            bg="gray.50" 
                            borderRadius="lg" 
                            border="1px solid" 
                            borderColor="gray.100"
                            _hover={{ borderColor: "green.200", bg: "green.50" }}
                            transition="all 0.2s"
                          >
                            <Text fontSize="xs" fontWeight="500" color="gray.500" mb={1}>
                              {field.label}
                            </Text>
                            <Text fontSize="sm" fontWeight="600" color="gray.700">
                              {field.value}
                            </Text>
                          </Box>
                        ));
                      })()}
                    </SimpleGrid>

                    {/* Carbon impact with modern styling */}
                    {event.carbon_impact && (
                      <Box 
                        p={4} 
                        bg="green.50" 
                        borderRadius="xl" 
                        border="1px solid" 
                        borderColor="green.200"
                      >
                        <HStack spacing={3}>
                          <Circle size="40px" bg="green.100">
                            <Icon as={FaGlobeAmericas} color="green.600" boxSize={5} />
                          </Circle>
                          <Box>
                            <Text fontSize="sm" fontWeight="600" color="gray.700">
                              Environmental Impact
                            </Text>
                            <Text fontSize="lg" fontWeight="bold" color="green.600">
                              {event.carbon_impact.toFixed(2)} kg CO₂e
                            </Text>
                            <Text fontSize="xs" color="green.600">
                              Carbon footprint data available for sustainability tracking
                            </Text>
                          </Box>
                        </HStack>
                      </Box>
                    )}
                  </Box>
                )}
                
                {/* Comprehensive Field Display - DETAILS Priority Fields */}
                {fieldDisplay.details.length > 0 && (
                  <Box>
                    <HStack mb={3}>
                      <Icon as={FaEye} color="gray.500" boxSize={4} />
                      <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                        Technical Details
                      </Text>
                    </HStack>
                    <VStack align="stretch" spacing={1} pl={6}>
                      {fieldDisplay.details.map((field, idx) => (
                        <HStack key={idx} justify="space-between" flexWrap="wrap">
                          <HStack spacing={2} minW="120px">
                            <Icon 
                              as={getCategoryIcon(field.category)} 
                              color="gray.500" 
                              boxSize={3} 
                            />
                            <Text fontSize="xs" color="gray.600">
                              {field.label}:
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color={mutedColor} flex="1" textAlign="right">
                            {field.value}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}
                
                {/* Enhanced Blockchain Verification Section */}
                {blockchainData.verified && (
                  <Box>
                    <HStack mb={3}>
                      <Icon as={MdSecurity} color="blue.500" boxSize={5} />
                      <Text fontWeight="bold" fontSize="sm" color="blue.500">
                        Blockchain Verification Details
                      </Text>
                    </HStack>
                    
                    <VStack align="stretch" spacing={3} pl={6}>
                      {/* Verification summary */}
                      <Box
                        p={3}
                        bg={useColorModeValue('blue.50', 'blue.900')}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={useColorModeValue('blue.200', 'blue.700')}
                      >
                        <VStack align="stretch" spacing={2}>
                          <HStack justify="space-between">
                            <Text fontSize="sm" fontWeight="semibold" color={useColorModeValue('blue.700', 'blue.200')}>
                              Verification Status
                            </Text>
                            <Badge colorScheme="green" variant="solid">
                              {blockchainData.confidence}% Confirmed
                            </Badge>
                          </HStack>
                          
                          {blockchainData.confidence > 0 && (
                            <Progress 
                              value={blockchainData.confidence} 
                              colorScheme="green" 
                              size="sm" 
                              borderRadius="full"
                            />
                          )}
                          
                          <Text fontSize="xs" color={useColorModeValue('blue.600', 'blue.300')}>
                            This event data is cryptographically secured on the Polygon blockchain, 
                            ensuring immutable transparency and preventing tampering.
                          </Text>
                        </VStack>
                      </Box>
                      
                      {/* Transaction details */}
                      {blockchainData.transaction && (
                        <Box>
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="sm" fontWeight="semibold">
                              Blockchain Transaction
                            </Text>
                            <Link
                              href={blockchainData.explorerUrl}
                              isExternal
                              color="blue.500"
                              fontSize="sm"
                              fontWeight="medium"
                              _hover={{ color: 'blue.600' }}
                            >
                              <HStack spacing={1}>
                                <Icon as={FaEye} boxSize={3} />
                                <Text>View on Explorer</Text>
                                <Icon as={MdOpenInNew} boxSize={3} />
                              </HStack>
                            </Link>
                          </HStack>
                          
                          <VStack align="start" spacing={1}>
                            <Text fontSize="xs" color={mutedColor}>
                              Transaction ID: {blockchainData.transaction.slice(0, 20)}...
                            </Text>
                            {blockchainData.blockNumber > 0 && (
                              <Text fontSize="xs" color={mutedColor}>
                                Block Number: #{blockchainData.blockNumber.toLocaleString()}
                              </Text>
                            )}
                            {blockchainData.timestamp && (
                              <HStack>
                                <Icon as={FaClock} boxSize={3} color="gray.500" />
                                <Text fontSize="xs" color={mutedColor}>
                                  Verified: {new Date(blockchainData.timestamp).toLocaleDateString()}
                                </Text>
                              </HStack>
                            )}
                          </VStack>
                        </Box>
                      )}
                      
                      {/* Data integrity score */}
                      {blockchainData.integrityScore > 0 && (
                        <Box
                          p={2}
                          bg={useColorModeValue('green.50', 'green.900')}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={useColorModeValue('green.200', 'green.700')}
                        >
                          <HStack justify="space-between">
                            <HStack>
                              <Icon as={FaShieldAlt} color="green.500" boxSize={4} />
                              <Text fontSize="sm" fontWeight="medium" color="green.600">
                                Data Integrity Score
                              </Text>
                            </HStack>
                            <Badge colorScheme="green" variant="solid">
                              {blockchainData.integrityScore}%
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color="green.600" mt={1}>
                            Measures data quality, completeness, and accuracy
                          </Text>
                        </Box>
                      )}
                      
                      {/* Network information */}
                      <HStack spacing={3} fontSize="xs" color={mutedColor}>
                        <HStack>
                          <Icon as={FaInfoCircle} boxSize={3} />
                          <Text>Network: Polygon Testnet</Text>
                        </HStack>
                        <HStack>
                          <Icon as={MdVerified} boxSize={3} />
                          <Text>Immutable Record</Text>
                        </HStack>
                      </HStack>
                    </VStack>
                  </Box>
                )}
                
                {/* Photo Gallery using StandardImageGallery */}
                {photoVerification.hasPhotos && (
                  <Box>
                    <HStack spacing={2} mb={4}>
                      <Icon as={FaCamera} color="green.500" boxSize={{ base: 6, md: 5 }} />
                      <Text fontWeight="bold" fontSize={{ base: 'md', md: 'sm' }} color="green.500">
                        See This Farming Practice
                      </Text>
                    </HStack>
                    
                    <VStack align="stretch" spacing={{ base: 4, md: 3 }} pl={{ base: 0, md: 6 }}>
                      {/* Use StandardImageGallery for consistent experience */}
                      <StandardImageGallery
                        images={event.album?.images?.map(image => ({
                          id: image.id,
                          image: image.image,
                          name: image.caption || `Farm photo`,
                          description: image.created_at ? `Taken on ${new Date(image.created_at).toLocaleDateString()}` : undefined
                        })) || []}
                        title=""
                        variant="consumer"
                        enablePreview={true}
                        showImageCount={false}
                        height={{ base: '200px', md: '160px' }}
                        borderRadius="lg"
                        showEmptyState={false}
                        maxDisplayImages={6}
                        aspectRatio="4/3"
                        clickable={true}
                      />
                      
                      {/* Trust indicator */}
                      <Box
                        p={{ base: 3, md: 2 }}
                        bg={useColorModeValue('gray.50', 'gray.800')}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={useColorModeValue('gray.200', 'gray.700')}
                      >
                        <HStack spacing={{ base: 3, md: 2 }}>
                          <Icon as={FaShieldAlt} boxSize={{ base: 5, md: 4 }} color="green.500" />
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontSize={{ base: 'sm', md: 'xs' }} fontWeight="semibold" color="gray.700">
                              Photo Verification: {photoVerification.verificationLevel === 'strong' ? 'Excellent' : 'Good'}
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              {photoVerification.photoCount} verified photo{photoVerification.photoCount > 1 ? 's' : ''} from the farm
                            </Text>
                          </VStack>
                        </HStack>
                      </Box>
                    </VStack>
                  </Box>
                )}
              </VStack>
            </Box>
          </Collapse>
        </Box>
      </HStack>
      
    </Box>
  );
};

export default ConsumerEventCard;