import React from 'react';
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
  Image,
  Button,
  List,
  ListItem,
  ListIcon,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Center,
} from '@chakra-ui/react';
import { 
  FaLeaf, 
  FaCar, 
  FaTree, 
  FaShieldAlt, 
  FaMedal, 
  FaHeart,
  FaCheckCircle,
  FaStar,
  FaGlobe,
  FaAward
} from 'react-icons/fa';

interface ConsumerImpactStory {
  headline_message: string;
  key_impacts: {
    carbon_removed: string;
    equivalent_cars_offset: string;
    equivalent_trees_planted: string;
  };
  story_narrative: string;
  transparency_highlights: string[];
  sustainability_achievements: string[];
  consumer_benefits: string[];
}

interface TrustIndicators {
  verification_status: {
    usda_verification_rate: string;
    blockchain_verified: boolean;
    third_party_audited: boolean;
    real_time_tracking: boolean;
  };
  trust_score: number;
  trust_factors: Array<{
    factor: string;
    status: string;
    weight: number;
  }>;
  credibility_indicators: {
    data_completeness: number;
    verification_depth: number;
    audit_frequency: string;
    transparency_level: string;
  };
}

interface ConsumerImpactStoryProps {
  consumerImpactStory: ConsumerImpactStory;
  trustIndicators: TrustIndicators;
  transparencyScore: number;
}

export const ConsumerImpactStory: React.FC<ConsumerImpactStoryProps> = ({
  consumerImpactStory,
  trustIndicators,
  transparencyScore,
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const gradientBg = useColorModeValue(
    'linear(to-r, green.50, blue.50)', 
    'linear(to-r, green.900, blue.900)'
  );
  
  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 80) return 'blue';
    if (score >= 70) return 'yellow';
    return 'orange';
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'active':
      case 'completed':
        return <Icon as={FaCheckCircle} color="green.500" />;
      case 'full disclosure':
        return <Icon as={FaShieldAlt} color="blue.500" />;
      default:
        return <Icon as={FaStar} color="yellow.500" />;
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Hero Impact Message */}
      <Card bgGradient={gradientBg}>
        <CardBody p={8}>
          <VStack spacing={6} textAlign="center">
            <Icon as={FaLeaf} boxSize={16} color="green.500" />
            <Heading size="lg" color="green.700">
              {consumerImpactStory.headline_message}
            </Heading>
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} width="full">
              <VStack spacing={2}>
                <Icon as={FaLeaf} boxSize={12} color="green.500" />
                <Text fontSize="2xl" fontWeight="bold" color="green.600">
                  {consumerImpactStory.key_impacts.carbon_removed}
                </Text>
                <Text fontSize="sm" color="gray.600">Carbon Removed</Text>
              </VStack>
              
              <VStack spacing={2}>
                <Icon as={FaCar} boxSize={12} color="blue.500" />
                <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                  {consumerImpactStory.key_impacts.equivalent_cars_offset}
                </Text>
                <Text fontSize="sm" color="gray.600">Cars Offset</Text>
              </VStack>
              
              <VStack spacing={2}>
                <Icon as={FaTree} boxSize={12} color="green.500" />
                <Text fontSize="2xl" fontWeight="bold" color="green.600">
                  {consumerImpactStory.key_impacts.equivalent_trees_planted}
                </Text>
                <Text fontSize="sm" color="gray.600">Trees Equivalent</Text>
              </VStack>
            </SimpleGrid>
          </VStack>
        </CardBody>
      </Card>

      {/* Story Narrative */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaGlobe} color="green.500" />
            <Heading size="md">Your Environmental Impact Story</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <Text fontSize="lg" lineHeight="tall" color="gray.700">
            {consumerImpactStory.story_narrative}
          </Text>
        </CardBody>
      </Card>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Trust & Verification */}
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={FaShieldAlt} color="blue.500" />
              <Heading size="md">Trust & Verification</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              {/* Trust Score */}
              <Box textAlign="center">
                <Text fontSize="sm" color="gray.600" mb={2}>Trust Score</Text>
                <Text fontSize="3xl" fontWeight="bold" color={getTrustScoreColor(trustIndicators.trust_score)}>
                  {trustIndicators.trust_score}/100
                </Text>
                <Progress 
                  value={trustIndicators.trust_score} 
                  colorScheme={getTrustScoreColor(trustIndicators.trust_score)}
                  size="lg"
                  borderRadius="full"
                  mt={2}
                />
              </Box>

              {/* Verification Status */}
              <VStack spacing={3} align="stretch">
                <Heading size="sm">Verification Status</Heading>
                
                <HStack justify="space-between">
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm">USDA Verification</Text>
                  </HStack>
                  <Badge colorScheme="green" size="sm">
                    {trustIndicators.verification_status.usda_verification_rate}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <HStack>
                    <Icon as={FaShieldAlt} color="blue.500" />
                    <Text fontSize="sm">Blockchain Verified</Text>
                  </HStack>
                  <Badge colorScheme={trustIndicators.verification_status.blockchain_verified ? 'green' : 'gray'} size="sm">
                    {trustIndicators.verification_status.blockchain_verified ? 'Active' : 'Inactive'}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <HStack>
                    <Icon as={FaMedal} color="purple.500" />
                    <Text fontSize="sm">Third-party Audited</Text>
                  </HStack>
                  <Badge colorScheme={trustIndicators.verification_status.third_party_audited ? 'green' : 'gray'} size="sm">
                    {trustIndicators.verification_status.third_party_audited ? 'Verified' : 'Pending'}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <HStack>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="sm">Real-time Tracking</Text>
                  </HStack>
                  <Badge colorScheme={trustIndicators.verification_status.real_time_tracking ? 'green' : 'gray'} size="sm">
                    {trustIndicators.verification_status.real_time_tracking ? 'Active' : 'Inactive'}
                  </Badge>
                </HStack>
              </VStack>

              {/* Trust Factors */}
              <VStack spacing={2} align="stretch">
                <Heading size="sm">Trust Factors</Heading>
                {trustIndicators.trust_factors.map((factor, index) => (
                  <HStack key={index} justify="space-between">
                    <HStack>
                      {getStatusIcon(factor.status)}
                      <Text fontSize="sm">{factor.factor}</Text>
                    </HStack>
                    <Badge variant="outline" size="sm">
                      {factor.weight}% weight
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Transparency Highlights */}
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={FaStar} color="yellow.500" />
              <Heading size="md">Transparency Excellence</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              {/* Transparency Score */}
              <Box textAlign="center">
                <Text fontSize="sm" color="gray.600" mb={2}>Transparency Score</Text>
                <Text fontSize="3xl" fontWeight="bold" color="yellow.500">
                  {transparencyScore.toFixed(0)}/100
                </Text>
                <Progress 
                  value={transparencyScore} 
                  colorScheme="yellow"
                  size="lg"
                  borderRadius="full"
                  mt={2}
                />
              </Box>

              {/* Transparency Highlights */}
              <VStack spacing={2} align="stretch">
                <Heading size="sm">Transparency Highlights</Heading>
                {consumerImpactStory.transparency_highlights.map((highlight, index) => (
                  <HStack key={index} align="start">
                    <Icon as={FaCheckCircle} color="green.500" mt={1} />
                    <Text fontSize="sm">{highlight}</Text>
                  </HStack>
                ))}
              </VStack>

              {/* Credibility Indicators */}
              <SimpleGrid columns={2} spacing={4}>
                <Stat size="sm">
                  <StatLabel fontSize="xs">Data Complete</StatLabel>
                  <StatNumber fontSize="lg">{trustIndicators.credibility_indicators.data_completeness}%</StatNumber>
                </Stat>
                
                <Stat size="sm">
                  <StatLabel fontSize="xs">Verification</StatLabel>
                  <StatNumber fontSize="lg">{trustIndicators.credibility_indicators.verification_depth}%</StatNumber>
                </Stat>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Achievements & Benefits */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {/* Sustainability Achievements */}
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={FaAward} color="gold" />
              <Heading size="md">Sustainability Achievements</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {consumerImpactStory.sustainability_achievements.map((achievement, index) => (
                <HStack key={index}>
                  <Icon as={FaMedal} color="gold" />
                  <Text fontWeight="medium">{achievement}</Text>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>

        {/* Consumer Benefits */}
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={FaHeart} color="red.500" />
              <Heading size="md">Why This Matters to You</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {consumerImpactStory.consumer_benefits.map((benefit, index) => (
                <HStack key={index} align="start">
                  <Icon as={FaHeart} color="red.500" mt={1} />
                  <Text>{benefit}</Text>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Call to Action */}
      <Card bg="green.50" borderColor="green.200">
        <CardBody>
          <VStack spacing={4} textAlign="center">
            <Icon as={FaLeaf} boxSize={8} color="green.500" />
            <Heading size="md" color="green.700">
              Support Climate-Positive Agriculture
            </Heading>
            <Text color="green.600">
              Every purchase of this product actively fights climate change by supporting farmers 
              who remove more CO₂ from the atmosphere than they produce.
            </Text>
            <HStack spacing={4}>
              <Button colorScheme="green" size="lg">
                Learn More About Our Impact
              </Button>
              <Button variant="outline" colorScheme="green">
                Share This Story
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default ConsumerImpactStory;