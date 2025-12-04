import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Badge,
  Circle,
  Icon,
  useColorModeValue,
  Flex,
  Progress,
  Tooltip
} from '@chakra-ui/react';
import {
  FaShieldAlt,
  FaCamera,
  FaCheck,
  FaLink,
  FaCertificate,
  FaUsers,
  FaEye,
  FaStar,
  FaAward
} from 'react-icons/fa';
import { MdVerifiedUser, MdSecurity, MdPhotoCameraFront } from 'react-icons/md';
import { ConsumerTooltip } from '../Design/StandardComponents';

interface TrustIndicatorsProps {
  trustMetrics: {
    blockchain_verified: boolean;
    photo_evidence_count: number;
    third_party_verified: boolean;
  };
  photoEvidenceCount: number;
  hasBlockchainVerification: boolean;
  isMobile?: boolean;
}

export const TrustIndicators: React.FC<TrustIndicatorsProps> = ({
  trustMetrics,
  photoEvidenceCount,
  hasBlockchainVerification,
  isMobile = false
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const successColor = useColorModeValue('green.500', 'green.400');
  const warningColor = useColorModeValue('yellow.500', 'yellow.400');

  // Calculate overall trust score
  const calculateTrustScore = () => {
    let score = 0;
    if (trustMetrics.blockchain_verified) score += 40;
    if (trustMetrics.photo_evidence_count > 0) score += 30;
    if (trustMetrics.third_party_verified) score += 20;
    if (trustMetrics.photo_evidence_count >= 5) score += 10; // Bonus for comprehensive documentation
    return Math.min(score, 100);
  };

  const trustScore = calculateTrustScore();

  const getTrustLevel = (score: number) => {
    if (score >= 90)
      return { label: 'Excellent', color: 'green', description: 'Highest trust and verification' };
    if (score >= 70)
      return {
        label: 'Very Good',
        color: 'green',
        description: 'Strong verification and transparency'
      };
    if (score >= 50)
      return {
        label: 'Good',
        color: 'yellow',
        description: 'Good verification with room for improvement'
      };
    if (score >= 30)
      return { label: 'Fair', color: 'orange', description: 'Basic verification in place' };
    return { label: 'Building Trust', color: 'red', description: 'More verification needed' };
  };

  const trustLevel = getTrustLevel(trustScore);

  // Trust indicators data
  const trustIndicators = [
    {
      id: 'blockchain',
      name: 'Blockchain Verified',
      description: 'Carbon data secured on blockchain',
      icon: FaShieldAlt,
      verified: trustMetrics.blockchain_verified,
      value: hasBlockchainVerification ? 'Verified' : 'Pending',
      color: hasBlockchainVerification ? 'green' : 'gray',
      tooltip: {
        label: 'Blockchain Verification',
        explanation:
          'Your carbon data is permanently recorded on the blockchain for transparency and cannot be altered'
      }
    },
    {
      id: 'photo_evidence',
      name: 'Photo Evidence',
      description: 'Visual documentation of practices',
      icon: MdPhotoCameraFront,
      verified: trustMetrics.photo_evidence_count > 0,
      value: `${trustMetrics.photo_evidence_count} photos`,
      color: trustMetrics.photo_evidence_count > 0 ? 'blue' : 'gray',
      tooltip: {
        label: 'Photo Evidence',
        explanation:
          'Photos provide visual proof of agricultural practices and increase consumer trust'
      }
    },
    {
      id: 'third_party',
      name: 'Third-Party Verified',
      description: 'Independent verification process',
      icon: MdVerifiedUser,
      verified: trustMetrics.third_party_verified,
      value: trustMetrics.third_party_verified ? 'Certified' : 'Self-Reported',
      color: trustMetrics.third_party_verified ? 'purple' : 'gray',
      tooltip: {
        label: 'Third-Party Verification',
        explanation:
          'Independent verification by certified auditors adds credibility to your sustainability claims'
      }
    }
  ];

  return (
    <VStack spacing={6} align="stretch">
      {/* Overall Trust Score */}
      <Box textAlign="center">
        <VStack spacing={3}>
          <Circle
            size={isMobile ? '100px' : '120px'}
            bg={`${trustLevel.color}.100`}
            position="relative"
          >
            {/* Progress ring */}
            <Progress
              value={trustScore}
              size="lg"
              colorScheme={trustLevel.color}
              borderRadius="full"
              transform="rotate(-90deg)"
              width="90%"
              height="90%"
              position="absolute"
            />

            {/* Score content */}
            <VStack spacing={0} position="relative" zIndex={1}>
              <Text
                fontSize={isMobile ? '2xl' : '3xl'}
                fontWeight="bold"
                color={`${trustLevel.color}.600`}
              >
                {trustScore}%
              </Text>
              <Text fontSize="xs" color={mutedColor} textAlign="center">
                Trust Score
              </Text>
            </VStack>
          </Circle>

          <VStack spacing={1}>
            <Badge colorScheme={trustLevel.color} variant="solid" fontSize="sm" px={3} py={1}>
              {trustLevel.label}
            </Badge>
            <Text fontSize="sm" color={mutedColor} textAlign="center">
              {trustLevel.description}
            </Text>
          </VStack>
        </VStack>
      </Box>

      {/* Trust Indicators Grid */}
      <SimpleGrid columns={isMobile ? 1 : 3} spacing={4}>
        {trustIndicators.map((indicator) => (
          <ConsumerTooltip
            key={indicator.id}
            label={indicator.tooltip.label}
            explanation={indicator.tooltip.explanation}
          >
            <Box
              p={isMobile ? 3 : 4}
              borderRadius="lg"
              border="2px solid"
              borderColor={indicator.verified ? `${indicator.color}.200` : borderColor}
              bg={indicator.verified ? `${indicator.color}.50` : bgColor}
              transition="all 0.2s"
              cursor="help"
              minHeight={isMobile ? '120px' : 'auto'} // Consistent mobile height
              _hover={{
                transform: isMobile ? 'none' : 'translateY(-2px)', // Disable hover on mobile
                boxShadow: isMobile ? 'none' : 'md'
              }}
              _active={{
                transform: isMobile ? 'scale(0.98)' : 'none', // Touch feedback
                bg: indicator.verified ? `${indicator.color}.100` : 'gray.100'
              }}
            >
              <VStack spacing={3}>
                <Circle
                  size={isMobile ? '50px' : '60px'} // Slightly smaller on mobile for space
                  bg={indicator.verified ? `${indicator.color}.500` : 'gray.300'}
                  color="white"
                  position="relative"
                >
                  <Icon as={indicator.icon} boxSize={isMobile ? 5 : 6} />
                  {indicator.verified && (
                    <Circle
                      size="20px"
                      bg="white"
                      color={`${indicator.color}.500`}
                      position="absolute"
                      bottom="-2px"
                      right="-2px"
                      border="2px solid white"
                    >
                      <Icon as={FaCheck} boxSize={3} />
                    </Circle>
                  )}
                </Circle>

                <VStack spacing={1} textAlign="center">
                  <Text
                    fontWeight="semibold"
                    fontSize={isMobile ? 'xs' : 'sm'}
                    color={textColor}
                    lineHeight="tight"
                  >
                    {indicator.name}
                  </Text>
                  <Text
                    fontSize="xs"
                    color={mutedColor}
                    display={isMobile ? 'none' : 'block'} // Hide description on mobile to save space
                  >
                    {indicator.description}
                  </Text>
                  <Badge
                    colorScheme={indicator.color}
                    variant={indicator.verified ? 'solid' : 'outline'}
                    fontSize="xs"
                    px={isMobile ? 2 : 3}
                    py={isMobile ? 1 : 1}
                  >
                    {indicator.value}
                  </Badge>
                </VStack>
              </VStack>
            </Box>
          </ConsumerTooltip>
        ))}
      </SimpleGrid>

      {/* Trust Building Recommendations */}
      {trustScore < 100 && (
        <Box
          p={4}
          borderRadius="lg"
          bg={useColorModeValue('blue.50', 'blue.900')}
          border="1px solid"
          borderColor="blue.200"
        >
          <VStack spacing={3} align="start">
            <HStack spacing={2}>
              <Icon as={FaAward} color="blue.500" boxSize={5} />
              <Text fontWeight="semibold" color="blue.700">
                Build More Trust
              </Text>
            </HStack>

            <VStack align="start" spacing={2} fontSize="sm">
              {!trustMetrics.blockchain_verified && (
                <HStack spacing={2}>
                  <Icon as={FaLink} color="blue.500" boxSize={3} />
                  <Text color="blue.600">
                    Enable blockchain verification for permanent carbon records
                  </Text>
                </HStack>
              )}

              {trustMetrics.photo_evidence_count < 5 && (
                <HStack spacing={2}>
                  <Icon as={FaCamera} color="blue.500" boxSize={3} />
                  <Text color="blue.600">
                    Add more photos to document your agricultural practices
                  </Text>
                </HStack>
              )}

              {!trustMetrics.third_party_verified && (
                <HStack spacing={2}>
                  <Icon as={FaCertificate} color="blue.500" boxSize={3} />
                  <Text color="blue.600">
                    Consider third-party verification to increase credibility
                  </Text>
                </HStack>
              )}
            </VStack>
          </VStack>
        </Box>
      )}

      {/* Consumer Impact Message */}
      <Box
        p={4}
        borderRadius="lg"
        bg={useColorModeValue('green.50', 'green.900')}
        border="1px solid"
        borderColor="green.200"
      >
        <HStack spacing={3}>
          <Circle size="40px" bg="green.500" color="white">
            <Icon as={FaUsers} boxSize={5} />
          </Circle>
          <VStack align="start" spacing={1} flex={1}>
            <Text fontWeight="semibold" color="green.700" fontSize="sm">
              Consumer Trust Impact
            </Text>
            <Text fontSize="xs" color="green.600">
              Higher trust scores lead to{' '}
              {trustScore >= 80 ? '3x' : trustScore >= 60 ? '2x' : '1.5x'} more consumer engagement
              and premium pricing opportunities
            </Text>
          </VStack>
          <VStack align="end" spacing={0}>
            <HStack spacing={1}>
              {[...Array(5)].map((_, i) => (
                <Icon
                  key={i}
                  as={FaStar}
                  color={i < Math.ceil(trustScore / 20) ? 'yellow.400' : 'gray.300'}
                  boxSize={3}
                />
              ))}
            </HStack>
            <Text fontSize="xs" color="green.600">
              {Math.ceil(trustScore / 20)}/5 trust rating
            </Text>
          </VStack>
        </HStack>
      </Box>
    </VStack>
  );
};

export default TrustIndicators;
