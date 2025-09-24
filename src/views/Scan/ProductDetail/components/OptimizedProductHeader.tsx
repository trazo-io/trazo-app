import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Container,
  IconButton,
  useColorModeValue,
  useBreakpointValue,
  useToast,
  Button,
  useDisclosure
} from '@chakra-ui/react';
import { FaShare, FaHeart, FaStar } from 'react-icons/fa';
import { MdLocationOn } from 'react-icons/md';
import { useIntl } from 'react-intl';

// Import our new trust components
import { 
  EnhancedTrustIndicators, 
  MobileTrustHeader, 
  ProgressiveTrustLoader,
  TrustData 
} from '../../../../components/Trust';
import TransparencyTrustBadge, { TransparencyTrustData } from '../../../../components/Trust/TransparencyTrustBadge';

interface OptimizedProductHeaderProps {
  productName: string;
  location: string;
  carbonScore: number;
  confidenceScore: number;
  isUSDAVerified: boolean;
  isBlockchainVerified: boolean;
  eventsCount: number;
  scansCount: number;
  reviewsCount: number;
  averageRating: number;
  productionId: string;
  verificationDate?: string;
  farmHistory?: number;
  certifications?: string[];
  transparencyScore?: number;
  industryPercentile?: number;
  publicViews?: number;
  isAuthenticated?: boolean;
  onEducationOpen: (topic: string) => void;
  onReviewOpen: () => void;
  onAuthPromptOpen: () => void;
  onShare: () => void;
}

export const OptimizedProductHeader: React.FC<OptimizedProductHeaderProps> = ({
  productName,
  location,
  carbonScore,
  confidenceScore,
  isUSDAVerified,
  isBlockchainVerified,
  eventsCount,
  scansCount,
  reviewsCount,
  averageRating,
  verificationDate,
  farmHistory = 5,
  certifications = [],
  transparencyScore = 85,
  industryPercentile = 75,
  publicViews = scansCount,
  isAuthenticated = false,
  onEducationOpen,
  onReviewOpen,
  onAuthPromptOpen,
  onShare
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const intl = useIntl();
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();

  // Simulate progressive loading (in real app, this would be based on API calls)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Prepare trust data for our components
  const trustData: TrustData = {
    carbonScore,
    confidenceScore,
    isUSDAVerified,
    isBlockchainVerified,
    scansCount,
    reviewsCount,
    averageRating,
    verificationDate: verificationDate || new Date().toISOString(),
    farmHistory,
    certifications,
    transparencyScore,
    industryPercentile,
    sustainabilityBadges: isUSDAVerified ? ['USDA Verified', 'Carbon Tracked'] : ['Carbon Tracked'],
    publicViews
  };

  // Prepare transparency-first trust data
  const transparencyTrustData: TransparencyTrustData = {
    transparencyScore,
    eventsDocumented: eventsCount,
    photoCount: Math.floor(eventsCount * 0.6), // Estimate 60% have photos
    verificationCount: Math.floor(eventsCount * 0.3), // Estimate 30% are verified
    isTrazoVerified: transparencyScore >= 80, // Trazo verification threshold
    isUSDAVerified,
    isBlockchainVerified,
    confidenceScore,
    scansCount,
    reviewsCount,
    averageRating,
    farmHistory,
    certifications,
    verificationDate: verificationDate || new Date().toISOString(),
    industryPercentile
  };

  const handleReviewClick = () => {
    if (!isAuthenticated) {
      onAuthPromptOpen();
      return;
    }
    onReviewOpen();
  };

  const handleShare = () => {
    onShare();
    toast({
      title: "Link copied!",
      description: "Product transparency link copied to clipboard",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  if (isMobile) {
    return (
      <Box
        bgGradient="linear(to-br, green.50, blue.50)"
        borderBottomRadius="3xl"
        overflow="hidden"
        position="relative"
        pb={4}
      >
        {/* Background Pattern */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bgImage="radial-gradient(circle, rgba(72, 187, 120, 0.05) 1px, transparent 1px)"
          bgSize="20px 20px"
        />

        <Container maxW="container.xl" position="relative">
          <VStack spacing={0} align="stretch">
            {/* Mobile Header with basic info */}
            <Box px={4} pt={6} pb={4}>
              <HStack justify="space-between" align="start" mb={4}>
                <VStack align="start" spacing={1} flex={1}>
                  <Heading as="h1" size="lg" color={textColor} fontWeight="bold" lineHeight="shorter">
                    {productName}
                  </Heading>
                  <HStack color={mutedColor} fontSize="sm">
                    <MdLocationOn />
                    <Text>{location}</Text>
                  </HStack>
                </VStack>

                {/* Share Button */}
                <IconButton
                  aria-label="Share product"
                  icon={<FaShare />}
                  colorScheme="green"
                  variant="ghost"
                  size="md"
                  borderRadius="full"
                  onClick={handleShare}
                />
              </HStack>
            </Box>

            {/* Transparency-First Mobile Trust - PRIMARY for mobile */}
            <TransparencyTrustBadge
              trustData={transparencyTrustData}
              isLoading={isLoading}
              variant="compact"
              showAnimation={true}
            />
            
            {/* Original Mobile Trust Header - SECONDARY (for comparison) */}
            <Box pt={3}>
              <MobileTrustHeader
                trustData={{
                  carbonScore,
                  confidenceScore,
                  isUSDAVerified,
                  isBlockchainVerified,
                  reviewsCount,
                  averageRating,
                  transparencyScore,
                  scansCount
                }}
                isLoading={isLoading}
                onDetailClick={onDetailOpen}
              />
            </Box>

            {/* Action buttons */}
            <Box px={4} pt={4}>
              <HStack spacing={3}>
                <Button
                  leftIcon={<FaStar />}
                  colorScheme="orange"
                  variant="outline"
                  size="sm"
                  flex={1}
                  onClick={handleReviewClick}
                >
                  Rate & Review
                </Button>
                <Button
                  leftIcon={<FaHeart />}
                  colorScheme="green"
                  variant="solid"
                  size="sm"
                  flex={1}
                  onClick={() => onEducationOpen('carbon_footprint')}
                >
                  Learn More
                </Button>
              </HStack>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  // Desktop version
  return (
    <Box
      bgGradient="linear(to-br, green.50, blue.50)"
      borderBottomRadius="3xl"
      overflow="hidden"
      position="relative"
    >
      {/* Background Pattern */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bgImage="radial-gradient(circle, rgba(72, 187, 120, 0.05) 1px, transparent 1px)"
        bgSize="20px 20px"
      />

      <Container maxW="container.xl" py={8} position="relative">
        <VStack spacing={8} align="stretch">
          {/* Header with Share Button */}
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={2} flex={1}>
              {/* Product Title */}
              <Heading as="h1" size="2xl" color={textColor} fontWeight="bold" lineHeight="shorter">
                {productName}
              </Heading>

              {/* Subtitle with Location */}
              <HStack color={mutedColor} fontSize="lg">
                <MdLocationOn />
                <Text>{location}</Text>
              </HStack>

              {/* Quick carbon score preview */}
              <Text fontSize="md" color="green.600" fontWeight="medium">
                Carbon Score: {carbonScore} • {eventsCount} tracked events
              </Text>
            </VStack>

            {/* Share Button */}
            <IconButton
              aria-label="Share product"
              icon={<FaShare />}
              colorScheme="green"
              variant="ghost"
              size="lg"
              borderRadius="full"
              onClick={handleShare}
            />
          </HStack>

          {/* Transparency-First Trust Badge - PRIMARY */}
          <TransparencyTrustBadge
            trustData={transparencyTrustData}
            isLoading={isLoading}
            variant="hero"
            showAnimation={true}
          />
          
          {/* Enhanced Trust Indicators - SECONDARY (for detailed verification) */}
          <Box pt={4}>
            <EnhancedTrustIndicators
              trustData={trustData}
              isLoading={isLoading}
              variant="compact"
              showDetails={true}
            />
          </Box>

          {/* Action buttons */}
          <HStack spacing={4} justify="center">
            <Button
              leftIcon={<FaStar />}
              colorScheme="orange"
              variant="outline"
              size="lg"
              onClick={handleReviewClick}
            >
              Rate & Review
            </Button>
            <Button
              leftIcon={<FaHeart />}
              colorScheme="green"
              variant="solid"
              size="lg"
              onClick={() => onEducationOpen('carbon_footprint')}
            >
              Learn About Carbon Impact
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
};

export default OptimizedProductHeader;