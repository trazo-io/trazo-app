import React, { useState } from 'react';
import {
  VStack,
  HStack,
  SimpleGrid,
  Heading,
  Text,
  Icon,
  Badge,
  Button,
  useBreakpointValue,
  Box,
  Circle,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import { 
  FaLeaf,
  FaChartLine,
  FaMapMarkerAlt,
  FaArrowLeft
} from 'react-icons/fa';
import { MdTrendingUp } from 'react-icons/md';
import {
  StandardPage,
  StandardCard,
  StandardAlert
} from '../../../components/Design/StandardComponents';
import { useNavigate } from 'react-router-dom';

export default function CarbonInsights() {
  const navigate = useNavigate();
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Simple insights data for MVP
  const [insights] = useState({
    totalScans: 12,
    avgCarbonSaved: '2.3 kg',
    bestChoice: 'Organic Tomatoes',
    improveBy: '25%'
  });

  const quickTips = [
    {
      title: 'Choose Local Products',
      description: 'Products grown within 150 miles typically have 30% lower carbon footprints',
      icon: FaMapMarkerAlt,
      impact: '30% reduction'
    },
    {
      title: 'Look for Organic Labels',
      description: 'Organic farming often uses sustainable practices that benefit the environment',
      icon: FaLeaf,
      impact: 'Better soil health'
    },
    {
      title: 'Check Seasonal Availability',
      description: 'In-season produce has lower environmental impact than out-of-season alternatives',
      icon: FaChartLine,
      impact: '15% reduction'
    }
  ];

  return (
    <StandardPage
      title="Your Green Insights"
      description="Simple insights about your environmental impact"
    >
      <VStack spacing={8} align="stretch">
        
        {/* Back to Dashboard */}
        <HStack>
          <Button
            leftIcon={<FaArrowLeft />}
            variant="ghost"
            onClick={() => navigate('/admin/dashboard/impact')}
          >
            Back to My Impact
          </Button>
        </HStack>

        {/* Simple Stats */}
        <StandardCard title="Your Impact Summary" variant="elevated">
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
            <Stat textAlign="center">
              <StatNumber fontSize="2xl" color="green.600">
                {insights.totalScans}
              </StatNumber>
              <StatLabel>Products Scanned</StatLabel>
              <StatHelpText color="green.600">
                <Icon as={MdTrendingUp} mr={1} />
                This month
              </StatHelpText>
            </Stat>

            <Stat textAlign="center">
              <StatNumber fontSize="2xl" color="blue.600">
                {insights.avgCarbonSaved}
              </StatNumber>
              <StatLabel>CO₂ Saved</StatLabel>
              <StatHelpText color="blue.600">
                Total impact
              </StatHelpText>
            </Stat>

            <Stat textAlign="center">
              <StatNumber fontSize="2xl" color="teal.600">
                {insights.improveBy}
              </StatNumber>
              <StatLabel>Potential Improvement</StatLabel>
              <StatHelpText color="teal.600">
                With better choices
              </StatHelpText>
            </Stat>

            <Stat textAlign="center">
              <StatNumber fontSize="lg" color="green.600">
                {insights.bestChoice}
              </StatNumber>
              <StatLabel>Your Best Choice</StatLabel>
              <StatHelpText color="green.600">
                Lowest carbon footprint
              </StatHelpText>
            </Stat>
          </SimpleGrid>
        </StandardCard>

        {/* Simple Tips */}
        <StandardCard title="Tips for Better Choices" variant="elevated">
          <VStack spacing={4}>
            <StandardAlert 
              status="info" 
              title="Pro Tip" 
              description="Small changes in your shopping habits can make a big difference for the environment."
            />
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
              {quickTips.map((tip, index) => (
                <Box key={index} p={5} bg="gray.50" borderRadius="lg">
                  <VStack spacing={3}>
                    <Circle size="50px" bg="green.100" color="green.600">
                      <Icon as={tip.icon} boxSize={6} />
                    </Circle>
                    <VStack spacing={2} textAlign="center">
                      <Text fontWeight="bold" fontSize="md">
                        {tip.title}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {tip.description}
                      </Text>
                      <Badge colorScheme="green" fontSize="xs">
                        {tip.impact}
                      </Badge>
                    </VStack>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>

            <VStack spacing={3} pt={4}>
              <Text fontSize="md" fontWeight="medium" textAlign="center">
                Want to learn more?
              </Text>
              <HStack spacing={3}>
                <Button 
                  colorScheme="green" 
                  variant="outline"
                  onClick={() => navigate('/admin/dashboard/compare')}
                >
                  Compare Products
                </Button>
                <Button 
                  colorScheme="blue" 
                  variant="outline"
                  onClick={() => navigate('/admin/dashboard/journey')}
                >
                  View History
                </Button>
              </HStack>
            </VStack>
          </VStack>
        </StandardCard>

      </VStack>
    </StandardPage>
  );
}