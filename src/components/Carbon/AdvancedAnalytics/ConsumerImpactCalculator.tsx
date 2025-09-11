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
  StatArrow,
  Flex,
  Circle,
  Divider,
  Alert,
  AlertIcon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Input,
  InputGroup,
  InputRightAddon,
  FormControl,
  FormLabel,
  Select,
  useBreakpointValue,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaLeaf,
  FaCar,
  FaTree,
  FaHome,
  FaPlane,
  FaRecycle,
  FaCalculator,
  FaGlobeAmericas,
  FaHeart,
  FaChartLine,
  FaBolt,
  FaWater,
  FaTruck,
  FaIndustry,
  FaAppleAlt,
  FaCarSide,
  FaLightbulb
} from 'react-icons/fa';
import { MdEco, MdTrendingUp, MdTrendingDown } from 'react-icons/md';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

interface ImpactComparison {
  category: string;
  description: string;
  value: string;
  icon: any;
  color: string;
  explanation: string;
}

interface PersonalizedImpact {
  annualSavings: number; // kg CO2e saved per year
  monthlyConsumption: number; // times per month
  lifetimeImpact: number; // total kg CO2e over lifetime
  equivalencies: ImpactComparison[];
  carbonOffset: {
    treesEquivalent: number;
    milesOffset: number;
    homeEnergyDays: number;
  };
  financialValue: {
    carbonCreditValue: number; // USD
    socialCostOffset: number; // USD
  };
  cumulativeImpact: {
    oneMonth: number;
    oneYear: number;
    fiveYears: number;
  };
}

interface ConsumerProfile {
  householdSize: number;
  consumptionFrequency: number; // times per month
  environmentalAwareness: 'low' | 'medium' | 'high';
  region: string;
}

interface ConsumerImpactCalculatorProps {
  productCO2e: number; // CO2e per unit of product
  productName: string;
  benchmarkCO2e?: number; // Average CO2e for similar products
  isLoading?: boolean;
}

export const ConsumerImpactCalculator: React.FC<ConsumerImpactCalculatorProps> = ({
  productCO2e,
  productName,
  benchmarkCO2e,
  isLoading = false
}) => {
  const [profile, setProfile] = useState<ConsumerProfile>({
    householdSize: 2,
    consumptionFrequency: 4, // 4 times per month
    environmentalAwareness: 'medium',
    region: 'us'
  });
  
  const [impact, setImpact] = useState<PersonalizedImpact | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  // Theme colors
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Responsive values
  const cardSpacing = useBreakpointValue({ base: 4, md: 6 });
  const iconSize = useBreakpointValue({ base: 6, md: 8 });

  // Calculate personalized impact
  useEffect(() => {
    if (productCO2e) {
      calculatePersonalizedImpact();
    }
  }, [profile, productCO2e, benchmarkCO2e]);

  const calculatePersonalizedImpact = () => {
    const monthlyConsumption = profile.consumptionFrequency;
    const annualConsumption = monthlyConsumption * 12;
    const householdMultiplier = profile.householdSize;
    
    // Calculate actual impact
    const monthlyImpact = Math.abs(productCO2e) * monthlyConsumption * householdMultiplier;
    const annualImpact = monthlyImpact * 12;
    const lifetimeImpact = annualImpact * 10; // 10 years
    
    // Calculate savings vs benchmark
    const benchmarkValue = benchmarkCO2e || Math.abs(productCO2e) + 5; // Assume 5kg higher if no benchmark
    const savingsPerUnit = benchmarkValue - Math.abs(productCO2e);
    const annualSavings = Math.max(0, savingsPerUnit * annualConsumption * householdMultiplier);
    
    // Calculate equivalencies
    const equivalencies: ImpactComparison[] = [];
    
    if (productCO2e <= 0) {
      // Carbon negative - show carbon removed
      const carbonRemoved = Math.abs(productCO2e) * monthlyConsumption * householdMultiplier;
      
      equivalencies.push({
        category: 'Carbon Removed',
        description: 'CO₂ removed from atmosphere monthly',
        value: `${carbonRemoved.toFixed(1)} kg`,
        icon: FaRecycle,
        color: 'green',
        explanation: 'This product actually removes carbon from the atmosphere'
      });
      
      equivalencies.push({
        category: 'Car Miles Offset',
        description: 'Miles of driving offset monthly',
        value: `${(carbonRemoved * 2.31).toFixed(0)} miles`,
        icon: FaCar,
        color: 'green',
        explanation: 'Equivalent to taking a car off the road for this distance'
      });
    } else {
      // Positive carbon footprint - show impact reduction
      if (savingsPerUnit > 0) {
        const monthlySavings = savingsPerUnit * monthlyConsumption * householdMultiplier;
        
        equivalencies.push({
          category: 'Carbon Savings',
          description: 'CO₂ saved vs average alternatives',
          value: `${monthlySavings.toFixed(1)} kg`,
          icon: FaLeaf,
          color: 'green',
          explanation: 'Choosing this product saves carbon compared to alternatives'
        });
      }
    }
    
    // Add universal comparisons
    equivalencies.push({
      category: 'Trees Planted',
      description: 'Equivalent trees needed to offset annual impact',
      value: `${Math.max(1, Math.round(annualImpact / 21.8))} trees`,
      icon: FaTree,
      color: 'green',
      explanation: 'Trees needed to absorb the same amount of CO₂'
    });
    
    equivalencies.push({
      category: 'Home Energy',
      description: 'Days of home energy use',
      value: `${Math.max(1, Math.round(monthlyImpact / 28.2))} days`,
      icon: FaHome,
      color: 'blue',
      explanation: 'Equivalent to your home\'s energy consumption'
    });
    
    // Calculate financial value
    const carbonCreditValue = annualSavings * 0.02; // $20/ton CO2e
    const socialCostOffset = annualSavings * 0.051; // $51/ton social cost of carbon
    
    const calculatedImpact: PersonalizedImpact = {
      annualSavings,
      monthlyConsumption,
      lifetimeImpact,
      equivalencies,
      carbonOffset: {
        treesEquivalent: Math.round(annualImpact / 21.8),
        milesOffset: Math.round(annualImpact * 2.31),
        homeEnergyDays: Math.round(annualImpact / 28.2)
      },
      financialValue: {
        carbonCreditValue,
        socialCostOffset
      },
      cumulativeImpact: {
        oneMonth: monthlyImpact,
        oneYear: annualImpact,
        fiveYears: annualImpact * 5
      }
    };
    
    setImpact(calculatedImpact);
  };

  if (isLoading) {
    return (
      <Card bg={bg}>
        <CardBody>
          <VStack spacing={4}>
            <Text>Loading impact calculator...</Text>
            <Progress size="lg" isIndeterminate colorScheme="green" />
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (!impact) {
    // Don't render anything if impact can't be calculated - cleaner UI
    return null;
  }

  const getImpactColor = () => {
    if (productCO2e <= 0) return 'green';
    if (impact.annualSavings > 0) return 'green';
    if (Math.abs(productCO2e) < 5) return 'blue';
    return 'yellow';
  };

  const impactColor = getImpactColor();

  return (
    <VStack spacing={cardSpacing} align="stretch">
      {/* Personal Impact Calculator Header */}
      <MotionCard
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        bg={`${impactColor}.50`}
        borderColor={`${impactColor}.200`}
        borderWidth="2px"
      >
        <CardBody>
          <VStack spacing={4} textAlign="center">
            <HStack spacing={3}>
              <Circle size="60px" bg={`${impactColor}.100`}>
                <Icon as={FaCalculator} color={`${impactColor}.500`} boxSize={8} />
              </Circle>
              <VStack align="start" spacing={1}>
                <Heading size="md" color={textColor}>
                  Your Personal Impact
                </Heading>
                <Text fontSize="sm" color={mutedColor}>
                  See how choosing {productName} affects the planet
                </Text>
              </VStack>
            </HStack>
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
              <Stat textAlign="center">
                <StatLabel fontSize="xs">Monthly Impact</StatLabel>
                <StatNumber fontSize="lg" color={`${impactColor}.600`}>
                  {productCO2e <= 0 ? '-' : ''}{impact.cumulativeImpact.oneMonth.toFixed(1)} kg
                </StatNumber>
                <StatHelpText fontSize="xs">CO₂e per month</StatHelpText>
              </Stat>
              
              <Stat textAlign="center">
                <StatLabel fontSize="xs">Annual Impact</StatLabel>
                <StatNumber fontSize="lg" color={`${impactColor}.600`}>
                  {productCO2e <= 0 ? '-' : ''}{impact.cumulativeImpact.oneYear.toFixed(1)} kg
                </StatNumber>
                <StatHelpText fontSize="xs">CO₂e per year</StatHelpText>
              </Stat>
              
              {impact.annualSavings > 0 && (
                <Stat textAlign="center">
                  <StatLabel fontSize="xs">Carbon Savings</StatLabel>
                  <StatNumber fontSize="lg" color="green.600">
                    {impact.annualSavings.toFixed(1)} kg
                  </StatNumber>
                  <StatHelpText fontSize="xs">
                    <StatArrow type="decrease" />
                    vs alternatives
                  </StatHelpText>
                </Stat>
              )}
            </SimpleGrid>
          </VStack>
        </CardBody>
      </MotionCard>

      {/* Consumption Profile Settings */}
      <Card bg={bg}>
        <CardHeader>
          <Heading size="md">Customize Your Profile</Heading>
          <Text fontSize="sm" color={mutedColor}>
            Adjust settings to see your personalized impact
          </Text>
        </CardHeader>
        <CardBody pt={0}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <FormControl>
              <FormLabel fontSize="sm">Household Size</FormLabel>
              <NumberInput
                value={profile.householdSize}
                min={1}
                max={10}
                onChange={(_, value) => setProfile({...profile, householdSize: value || 1})}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Text fontSize="xs" color={mutedColor} mt={1}>
                People in your household
              </Text>
            </FormControl>
            
            <FormControl>
              <FormLabel fontSize="sm">Consumption Frequency</FormLabel>
              <Box px={3} pb={2}>
                <Slider
                  value={profile.consumptionFrequency}
                  min={1}
                  max={20}
                  step={1}
                  onChange={(value) => setProfile({...profile, consumptionFrequency: value})}
                  colorScheme={impactColor}
                >
                  <SliderMark value={1} fontSize="xs" mt={2}>Daily</SliderMark>
                  <SliderMark value={10} fontSize="xs" mt={2}>Weekly</SliderMark>
                  <SliderMark value={20} fontSize="xs" mt={2}>Occasionally</SliderMark>
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={4}>
                    <Box color={`${impactColor}.500`} as={FaAppleAlt} />
                  </SliderThumb>
                </Slider>
              </Box>
              <Text fontSize="xs" color={mutedColor} textAlign="center" mt={4}>
                {profile.consumptionFrequency} times per month
              </Text>
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Impact Visualizations */}
      <Card bg={bg}>
        <CardHeader>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="md">Your Impact in Context</Heading>
              <Text fontSize="sm" color={mutedColor}>
                Understanding your environmental contribution
              </Text>
            </VStack>
            <Button
              size="sm"
              colorScheme={impactColor}
              variant="outline"
              onClick={() => setShowComparison(!showComparison)}
            >
              {showComparison ? 'Hide' : 'Show'} Comparison
            </Button>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {impact.equivalencies.map((equiv, index) => (
              <MotionBox
                key={equiv.category}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card
                  bg={`${equiv.color}.50`}
                  borderColor={`${equiv.color}.200`}
                  borderWidth="1px"
                  h="full"
                >
                  <CardBody>
                    <VStack spacing={3} align="center" textAlign="center">
                      <Circle size="50px" bg={`${equiv.color}.100`}>
                        <Icon as={equiv.icon} color={`${equiv.color}.500`} boxSize={iconSize} />
                      </Circle>
                      
                      <VStack spacing={1}>
                        <Text fontWeight="bold" color={textColor} fontSize="sm">
                          {equiv.category}
                        </Text>
                        <Text 
                          fontSize="xl" 
                          fontWeight="bold" 
                          color={`${equiv.color}.600`}
                        >
                          {equiv.value}
                        </Text>
                        <Text fontSize="xs" color={mutedColor} noOfLines={2}>
                          {equiv.description}
                        </Text>
                      </VStack>
                      
                      <AnimatePresence>
                        {showComparison && (
                          <MotionBox
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            overflow="hidden"
                            w="full"
                          >
                            <Divider my={2} />
                            <Text fontSize="xs" color={`${equiv.color}.600`} textAlign="center">
                              {equiv.explanation}
                            </Text>
                          </MotionBox>
                        )}
                      </AnimatePresence>
                    </VStack>
                  </CardBody>
                </Card>
              </MotionBox>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Financial Value */}
      {(impact.financialValue.carbonCreditValue > 0.1 || impact.financialValue.socialCostOffset > 0.1) && (
        <Card bg={bg} borderColor="purple.200" borderWidth="1px">
          <CardHeader>
            <HStack spacing={3}>
              <Circle size="40px" bg="purple.100">
                <Icon as={FaChartLine} color="purple.500" boxSize={iconSize} />
              </Circle>
              <VStack align="start" spacing={1}>
                <Heading size="md">Economic Value</Heading>
                <Text fontSize="sm" color={mutedColor}>
                  The financial value of your environmental choice
                </Text>
              </VStack>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Stat>
                <StatLabel>Annual Carbon Credit Value</StatLabel>
                <StatNumber color="green.600">
                  ${impact.financialValue.carbonCreditValue.toFixed(2)}
                </StatNumber>
                <StatHelpText>
                  Based on current carbon market rates
                </StatHelpText>
              </Stat>
              
              <Stat>
                <StatLabel>Social Cost Offset</StatLabel>
                <StatNumber color="blue.600">
                  ${impact.financialValue.socialCostOffset.toFixed(2)}
                </StatNumber>
                <StatHelpText>
                  Economic benefit to society
                </StatHelpText>
              </Stat>
            </SimpleGrid>
          </CardBody>
        </Card>
      )}

      {/* Cumulative Impact Timeline */}
      <Card bg={bg}>
        <CardHeader>
          <HStack spacing={3}>
            <Circle size="40px" bg="teal.100">
              <Icon as={MdTrendingUp} color="teal.500" boxSize={iconSize} />
            </Circle>
            <VStack align="start" spacing={1}>
              <Heading size="md">Long-term Impact</Heading>
              <Text fontSize="sm" color={mutedColor}>
                Your cumulative environmental contribution
              </Text>
            </VStack>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <VStack
                bg="teal.50"
                p={4}
                borderRadius="lg"
                border="1px"
                borderColor="teal.200"
                spacing={2}
              >
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  1 Month
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="teal.600">
                  {productCO2e <= 0 ? '-' : ''}{impact.cumulativeImpact.oneMonth.toFixed(1)} kg
                </Text>
                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  CO₂e impact this month
                </Text>
              </VStack>
              
              <VStack
                bg="teal.50"
                p={4}
                borderRadius="lg"
                border="1px"
                borderColor="teal.200"
                spacing={2}
              >
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  1 Year
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="teal.600">
                  {productCO2e <= 0 ? '-' : ''}{impact.cumulativeImpact.oneYear.toFixed(1)} kg
                </Text>
                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  CO₂e impact this year
                </Text>
              </VStack>
              
              <VStack
                bg="teal.50"
                p={4}
                borderRadius="lg"
                border="1px"
                borderColor="teal.200"
                spacing={2}
              >
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  5 Years
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="teal.600">
                  {productCO2e <= 0 ? '-' : ''}{impact.cumulativeImpact.fiveYears.toFixed(1)} kg
                </Text>
                <Text fontSize="xs" color={mutedColor} textAlign="center">
                  CO₂e impact over 5 years
                </Text>
              </VStack>
            </SimpleGrid>
            
            <Box
              bg={productCO2e <= 0 ? 'green.50' : 'blue.50'}
              p={4}
              borderRadius="lg"
              border="1px"
              borderColor={productCO2e <= 0 ? 'green.200' : 'blue.200'}
              textAlign="center"
            >
              <HStack justify="center" spacing={2} mb={2}>
                <Icon 
                  as={productCO2e <= 0 ? FaRecycle : FaLeaf} 
                  color={productCO2e <= 0 ? 'green.500' : 'blue.500'} 
                  boxSize={5} 
                />
                <Text 
                  fontSize="sm" 
                  fontWeight="bold" 
                  color={productCO2e <= 0 ? 'green.700' : 'blue.700'}
                >
                  {productCO2e <= 0 ? 'Climate Hero!' : 'Making a Difference'}
                </Text>
              </HStack>
              <Text 
                fontSize="xs" 
                color={productCO2e <= 0 ? 'green.600' : 'blue.600'}
              >
                {productCO2e <= 0 
                  ? 'Your choice actively fights climate change by removing carbon from the atmosphere.'
                  : 'Every sustainable choice you make contributes to a healthier planet.'
                }
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Call to Action */}
      <Box
        bg="green.50"
        p={6}
        borderRadius="lg"
        border="1px"
        borderColor="green.200"
        textAlign="center"
      >
        <VStack spacing={4}>
          <Circle size="60px" bg="green.100">
            <Icon as={FaHeart} color="green.500" boxSize={8} />
          </Circle>
          <VStack spacing={2}>
            <Heading size="md" color="green.700">
              Share Your Impact
            </Heading>
            <Text fontSize="sm" color="green.600" maxW="lg">
              Inspire others to make sustainable choices. Share how your decisions are 
              making a positive difference for the environment.
            </Text>
          </VStack>
          <HStack spacing={4}>
            <Button colorScheme="green" size="sm">
              Share Your Story
            </Button>
            <Button variant="outline" colorScheme="green" size="sm" leftIcon={<FaLightbulb />}>
              Learn More Tips
            </Button>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );
};

export default ConsumerImpactCalculator;