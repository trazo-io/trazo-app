import React from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Badge,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { FaLeaf, FaSeedling, FaAppleAlt } from 'react-icons/fa';
import { GiCorn, GiAvocado } from 'react-icons/gi';
import { useGetCompanyCropOptionsQuery, CompanyCropOption } from 'store/api/carbonApi';

// Top-level logging
console.log('🌱 CropTypeSelector file loaded');
console.log('🌱 Hook imported:', !!useGetCompanyCropOptionsQuery);
console.log('🌱 CompanyCropOption interface:', !!CompanyCropOption);

interface CropTemplate {
  id: string;
  name: string;
  icon: any;
  description: string;
  avgRevenue: string;
  carbonBenchmark: string;
  commonEvents: string[];
  seasonLength: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  marketDemand: 'High' | 'Medium' | 'Low';
}

// Icon mapping for crop types
const getIconForCrop = (cropId: string) => {
  const iconMap: Record<string, any> = {
    'citrus': FaAppleAlt,
    'almonds': FaSeedling,
    'avocados': GiAvocado,
    'corn': GiCorn,
    'soybeans': FaLeaf,
  };
  return iconMap[cropId] || FaSeedling;
};

// Transform API data to component format
const transformCropOption = (crop: CompanyCropOption): CropTemplate => ({
  id: crop.id,
  name: crop.name,
  icon: getIconForCrop(crop.id),
  description: crop.description,
  avgRevenue: crop.avg_revenue,
  carbonBenchmark: crop.carbon_benchmark,
  commonEvents: crop.common_events,
  seasonLength: crop.season_length,
  difficulty: crop.difficulty,
  marketDemand: crop.market_demand
});

// Fallback crop templates (updated with correct data)
const fallbackCropTemplates: CropTemplate[] = [
  {
    id: 'citrus',
    name: 'Citrus Fruits',
    icon: FaAppleAlt,
    description: 'Premium oranges with verified carbon transparency • California',
    avgRevenue: '$8,000-15,000/acre',
    carbonBenchmark: '1.6 tons CO2e/acre',
    commonEvents: ['Irrigation', 'Pruning', 'QR Generation', 'Verification'],
    seasonLength: 'Year-round',
    difficulty: 'Medium',
    marketDemand: 'High'
  },
  {
    id: 'almonds',
    name: 'Almonds',
    icon: FaSeedling,
    description: 'High-value tree nuts with consumer trust features • California',
    avgRevenue: '$4,000-8,000/acre',
    carbonBenchmark: '2.4 tons CO2e/acre',
    commonEvents: ['Irrigation', 'Harvest', 'Transparency', 'Certification'],
    seasonLength: 'Feb-Oct',
    difficulty: 'Advanced',
    marketDemand: 'High'
  },
  {
    id: 'avocados',
    name: 'Avocados',
    icon: GiAvocado,
    description: 'Premium Hass avocados with blockchain verification • California',
    avgRevenue: '$12,000-20,000/acre',
    carbonBenchmark: '1.7 tons CO2e/acre',
    commonEvents: ['Irrigation', 'Harvest', 'QR Tracking', 'Export'],
    seasonLength: 'Year-round',
    difficulty: 'Advanced',
    marketDemand: 'High'
  },
  {
    id: 'corn',
    name: 'Corn',
    icon: GiCorn,
    description: 'Scale efficiency with carbon tracking • Midwest',
    avgRevenue: '$800-1,200/acre',
    carbonBenchmark: '2.3 tons CO2e/acre',
    commonEvents: ['Planting', 'Fertilization', 'Tracking', 'Harvest'],
    seasonLength: 'Apr-Oct',
    difficulty: 'Easy',
    marketDemand: 'High'
  }
];

interface CropTypeSelectorProps {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
}

export const CropTypeSelector: React.FC<CropTypeSelectorProps> = ({ data, onChange, onNext }) => {
  console.log('🚀 CropTypeSelector COMPONENT RENDERING');
  console.log('🚀 Props received:', { data, hasOnChange: !!onChange, hasOnNext: !!onNext });
  
  // Test if the hook function exists
  console.log('🔍 Hook function check:', {
    hookExists: !!useGetCompanyCropOptionsQuery,
    hookType: typeof useGetCompanyCropOptionsQuery
  });

  // Force the API call with explicit configuration
  console.log('📞 About to call useGetCompanyCropOptionsQuery...');
  const apiResult = useGetCompanyCropOptionsQuery(undefined, {
    refetchOnMountOrArgChange: true
  });
  console.log('📞 API hook called, result:', apiResult);
  
  const { data: cropOptionsResponse, isLoading, error } = apiResult;
  
  // Use API data if available, otherwise fallback to updated hardcoded data
  const cropTemplates = cropOptionsResponse?.crops?.map(transformCropOption) || fallbackCropTemplates;

  // Comprehensive debug logging
  console.log('🐛 DETAILED DEBUG INFO:', {
    step1_isLoading: isLoading,
    step2_error: error,
    step3_errorDetails: error ? JSON.stringify(error, null, 2) : null,
    step4_hasApiData: !!cropOptionsResponse?.crops,
    step5_apiResponse: cropOptionsResponse,
    step6_apiCropsCount: cropOptionsResponse?.crops?.length,
    step7_fallbackCropsCount: fallbackCropTemplates.length,
    step8_finalCropsCount: cropTemplates.length,
    step9_fullApiResult: apiResult,
    step10_using: cropOptionsResponse?.crops ? 'API_DATA' : 'FALLBACK_DATA'
  });

  // Force the API call to be visible
  React.useEffect(() => {
    console.log('✅ CropTypeSelector mounted - API call should be happening now');
    console.log('✅ Check Network tab for: /api/carbon/company-crop-options/');
  }, []);

  const handleCropSelect = (crop: CropTemplate) => {
    onChange({
      ...data,
      cropType: crop.id,
      cropTemplate: crop,
      expectedRevenue: crop.avgRevenue,
      carbonBenchmark: crop.carbonBenchmark
    });
  };

  if (isLoading) {
    return (
      <VStack spacing={6} align="center" py={8}>
        <Spinner size="lg" color="green.500" />
        <Text color="gray.600">Loading crop options with USDA-verified data...</Text>
      </VStack>
    );
  }

  // Show fallback data even if API fails (better UX)
  // if (error) {
  //   return (
  //     <Alert status="error">
  //       <AlertIcon />
  //       Unable to load crop options. Please try again later.
  //     </Alert>
  //   );
  // }

  return (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center">
        <Text fontSize="2xl" fontWeight="bold" color="green.600" mb={2}>
          What's your primary crop?
        </Text>
        <Text color="gray.600" maxW="600px" mx="auto">
          Choose your main crop to get carbon transparency tools, QR code generation, and consumer trust features
          specifically designed for your agricultural operation.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {cropTemplates.map((crop) => (
          <Card
            key={crop.id}
            cursor="pointer"
            onClick={() => handleCropSelect(crop)}
            bg={data.cropType === crop.id ? 'green.50' : 'white'}
            borderColor={data.cropType === crop.id ? 'green.500' : 'gray.200'}
            borderWidth={2}
            _hover={{
              borderColor: 'green.400',
              transform: 'translateY(-2px)',
              shadow: 'lg'
            }}
            transition="all 0.2s"
          >
            <CardBody>
              <VStack spacing={4} align="stretch">
                {/* Header */}
                <HStack justify="space-between">
                  <HStack spacing={3}>
                    <Icon as={crop.icon} boxSize={6} color="green.500" />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="lg" fontWeight="bold">
                        {crop.name}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {crop.seasonLength}
                      </Text>
                    </VStack>
                  </HStack>
                  <VStack spacing={1}>
                    <Badge
                      colorScheme={
                        crop.difficulty === 'Easy'
                          ? 'green'
                          : crop.difficulty === 'Medium'
                          ? 'yellow'
                          : 'red'
                      }
                    >
                      {crop.difficulty}
                    </Badge>
                    <Badge colorScheme="blue" variant="outline">
                      {crop.marketDemand} Demand
                    </Badge>
                  </VStack>
                </HStack>

                {/* Description */}
                <Text fontSize="sm" color="gray.700">
                  {crop.description}
                </Text>

                {/* Stats */}
                <HStack spacing={4}>
                  <Stat size="sm">
                    <StatLabel fontSize="xs">Revenue/Acre</StatLabel>
                    <StatNumber fontSize="sm" color="green.600">
                      {crop.avgRevenue}
                    </StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel fontSize="xs">Carbon Benchmark</StatLabel>
                    <StatNumber fontSize="sm" color="blue.600">
                      {crop.carbonBenchmark}
                    </StatNumber>
                    <StatHelpText fontSize="xs">USDA verified</StatHelpText>
                  </Stat>
                </HStack>

                {/* Trust Indicators - using API data */}
                <HStack spacing={2} justify="center">
                  {cropOptionsResponse?.crops?.find(c => c.id === crop.id)?.usda_verified && (
                    <Badge colorScheme="green" variant="solid" fontSize="xs">
                      🏆 USDA Verified
                    </Badge>
                  )}
                  {cropOptionsResponse?.crops?.find(c => c.id === crop.id)?.transparency_ready && (
                    <Badge colorScheme="blue" variant="solid" fontSize="xs">
                      📱 QR Ready
                    </Badge>
                  )}
                  {cropOptionsResponse?.crops?.find(c => c.id === crop.id)?.transparency_ready && (
                    <Badge colorScheme="purple" variant="solid" fontSize="xs">
                      ⛓️ Blockchain
                    </Badge>
                  )}
                </HStack>

                {/* Transparency Features */}
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                    Transparency Features:
                  </Text>
                  <HStack spacing={1} flexWrap="wrap">
                    {crop.commonEvents.slice(0, 4).map((event, index) => (
                      <Badge key={index} size="sm" variant="outline" colorScheme="green">
                        {event}
                      </Badge>
                    ))}
                  </HStack>
                </Box>

                {/* Selection Indicator */}
                {data.cropType === crop.id && (
                  <Box bg="green.500" color="white" p={2} borderRadius="md" textAlign="center">
                    <Text fontSize="sm" fontWeight="bold">
                      ✓ Selected - Templates Ready!
                    </Text>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Custom Crop Option */}
      <Card borderStyle="dashed" borderWidth={2} borderColor="gray.300">
        <CardBody textAlign="center" py={6}>
          <VStack spacing={3}>
            <Icon as={FaSeedling} boxSize={8} color="gray.400" />
            <VStack spacing={1}>
              <Text fontWeight="bold" color="gray.600">
                Don't see your crop?
              </Text>
              <Text fontSize="sm" color="gray.500">
                Contact us to add custom crop templates and benchmarks
              </Text>
            </VStack>
            <Button variant="outline" size="sm" colorScheme="gray">
              Request Custom Crop
            </Button>
          </VStack>
        </CardBody>
      </Card>

      {/* Benefits Preview */}
      {data.cropType && (
        <Box bg="blue.50" p={4} borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
          <Text fontSize="sm" fontWeight="bold" color="blue.700" mb={2}>
            🎯 What you'll get with {cropTemplates.find((c) => c.id === data.cropType)?.name}:
          </Text>
          <VStack spacing={1} align="start" fontSize="sm" color="blue.600">
            <Text>• QR code generation for consumer transparency</Text>
            <Text>• USDA-verified carbon benchmarks and tracking</Text>
            <Text>• Blockchain verification for trust building</Text>
            <Text>• Consumer-friendly sustainability reporting</Text>
            <Text>• Premium pricing through transparency leadership</Text>
          </VStack>
        </Box>
      )}
    </VStack>
  );
};
