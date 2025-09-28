import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Button,
  useColorModeValue,
  Alert,
  AlertIcon,
  Tooltip,
  Skeleton,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import {
  FaSeedling,
  FaTint,
  FaSprayCan,
  FaCut,
  FaLeaf,
  FaCamera,
  FaEye,
  FaCheckCircle,
  FaCalculator,
  FaInfoCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
// Import API hooks for real-time USDA-based carbon calculations
import { 
  useGetEventTemplatesByCropTypeQuery,
  useCalculateEventCarbonPreviewMutation 
} from 'store/api/carbonApi';
import { getEventTypeMapping, getEventDataForType } from 'utils/eventTypeMapping';

// Utility function for formatting carbon values with appropriate precision
const formatCarbonValue = (value: number): string => {
  if (value < 0.01) return value.toFixed(4); // Very small values: 0.0018 -> "0.0018"
  if (value < 0.1) return value.toFixed(3);  // Small values: 0.018 -> "0.018"  
  if (value < 10) return value.toFixed(2);   // Medium values: 2.45 -> "2.45"
  return value.toFixed(1);                   // Large values: 15.3 -> "15.3"
};

interface CarbonEventTemplate {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  // Remove hardcoded carbonImpact - will be calculated from USDA data
  carbonCategory: 'high' | 'medium' | 'low';
  sustainabilityScore: number;
  qrVisibility: 'high' | 'medium' | 'low';
  usageFrequency: 'common' | 'seasonal' | 'rare';
  cropTypes: string[];
  // Enhanced with USDA calculation requirements
  defaultValues: {
    duration?: string;
    typical_application_rate?: string;
    unit?: string;
    efficiency_tip: string;
  };
  // USDA emission factor information
  emission_factor_source?: string;
  usda_compliant?: boolean;
  requires_area_input?: boolean;
  excludeFromCarbonCalculation?: boolean; // For General Events
}

interface CarbonPreview {
  estimated_carbon: number;
  calculation_source: string;
  area_hectares: number;
  application_rate: number;
  emission_factor: number;
  confidence_level: number;
}

interface SmartEventTemplatesProps {
  cropType: string;
  onTemplateSelect: (template: CarbonEventTemplate, carbonPreview?: CarbonPreview) => void;
  selectedTemplate?: CarbonEventTemplate | null;
  // Additional props for area-based calculations
  defaultArea?: number;
  areaUnit?: string;
}

export const SmartEventTemplates: React.FC<SmartEventTemplatesProps> = ({
  cropType,
  onTemplateSelect,
  selectedTemplate,
  defaultArea = 1,
  areaUnit = 'ha'
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // State for area-based carbon calculations
  const [areaInput, setAreaInput] = useState<number>(defaultArea);
  const [applicationRates, setApplicationRates] = useState<Record<string, number>>({});
  const [carbonPreviews, setCarbonPreviews] = useState<Record<string, CarbonPreview>>({});
  
  // API hooks for real-time calculations
  const { 
    data: backendTemplates, 
    isLoading: templatesLoading,
    error: templatesError 
  } = useGetEventTemplatesByCropTypeQuery({ cropType });
  
  const [calculateCarbonPreview] = useCalculateEventCarbonPreviewMutation();

  // USDA-compliant event templates (removing hardcoded carbon values)
  const carbonEventTemplates: CarbonEventTemplate[] = [
    {
      id: 'fertilization',
      name: 'Fertilización',
      icon: FaSeedling,
      color: 'green',
      description: 'Aplicación de fertilizante orgánico/sintético',
      // ✅ REMOVED hardcoded carbonImpact - will be calculated from USDA data
      carbonCategory: 'high',
      sustainabilityScore: 7,
      qrVisibility: 'high',
      usageFrequency: 'common',
      cropTypes: ['citrus', 'almonds', 'soybeans', 'corn'],
      defaultValues: {
        duration: '2-3 hours',
        typical_application_rate: '200',
        unit: 'kg/ha',
        efficiency_tip: 'Soil testing can reduce fertilizer needs by 20-30%'
      },
      emission_factor_source: 'USDA Agricultural Research Service',
      usda_compliant: true,
      requires_area_input: true
    },
    {
      id: 'irrigation',
      name: 'Riego',
      icon: FaTint,
      color: 'blue',
      description: 'Sistema de riego eficiente',
      // ✅ REMOVED hardcoded carbonImpact - will be calculated from energy usage
      carbonCategory: 'medium',
      sustainabilityScore: 8,
      qrVisibility: 'medium',
      usageFrequency: 'common',
      cropTypes: ['citrus', 'almonds', 'soybeans', 'corn'],
      defaultValues: {
        duration: '1-2 hours setup',
        typical_application_rate: '500',
        unit: 'L/ha',
        efficiency_tip: 'Smart irrigation controllers can save 25% energy'
      },
      emission_factor_source: 'EPA Energy Consumption Guidelines',
      usda_compliant: true,
      requires_area_input: true
    },
    {
      id: 'pest_control',
      name: 'Control de Plagas',
      icon: FaSprayCan,
      color: 'orange',
      description: 'Manejo integrado de plagas (IPM)',
      // ✅ REMOVED hardcoded carbonImpact - will be calculated from chemical application
      carbonCategory: 'high',
      sustainabilityScore: 6,
      qrVisibility: 'high',
      usageFrequency: 'seasonal',
      cropTypes: ['citrus', 'almonds', 'soybeans', 'corn'],
      defaultValues: {
        duration: '3-4 hours',
        typical_application_rate: '5',
        unit: 'L/ha',
        efficiency_tip: 'IPM practices can reduce pesticide use by 40%'
      },
      emission_factor_source: 'USDA Agricultural Research Service',
      usda_compliant: true,
      requires_area_input: true
    },
    {
      id: 'pruning',
      name: 'Poda',
      icon: FaCut,
      color: 'purple',
      description: 'Poda de precisión para optimización',
      // ✅ REMOVED hardcoded carbonImpact - will be calculated from equipment fuel
      carbonCategory: 'low',
      sustainabilityScore: 9,
      qrVisibility: 'low',
      usageFrequency: 'seasonal',
      cropTypes: ['citrus', 'almonds'],
      defaultValues: {
        duration: '4-6 hours',
        typical_application_rate: '1',
        unit: 'trees/hour',
        efficiency_tip: 'Precision pruning can reduce fuel consumption by 15%'
      },
      emission_factor_source: 'EPA Mobile Equipment Standards',
      usda_compliant: true,
      requires_area_input: true
    },
    {
      id: 'bloom_nutrition',
      name: 'Nutrición de Floración',
      icon: FaLeaf,
      color: 'pink',
      description: 'Nutrición específica para floración',
      // ✅ REMOVED hardcoded carbonImpact - will be calculated from nutrient application
      carbonCategory: 'medium',
      sustainabilityScore: 8,
      qrVisibility: 'medium',
      usageFrequency: 'seasonal',
      cropTypes: ['citrus', 'almonds'],
      defaultValues: {
        duration: '2-3 hours',
        typical_application_rate: '150',
        unit: 'kg/ha',
        efficiency_tip: 'Timing-specific nutrition improves efficiency by 20%'
      },
      emission_factor_source: 'USDA Agricultural Research Service',
      usda_compliant: true,
      requires_area_input: true
    },
    // ✅ CRITICAL FIX: General Events - NO CARBON CALCULATIONS
    {
      id: 'general_documentation',
      name: 'Documentación General',
      icon: FaCamera,
      color: 'gray',
      description: 'Actividad general de documentación transparente',
      // ✅ NO carbonImpact field - excluded from carbon calculations
      carbonCategory: 'low', // For UI purposes only
      sustainabilityScore: 10, // High transparency value
      qrVisibility: 'high',
      usageFrequency: 'common',
      cropTypes: ['citrus', 'almonds', 'soybeans', 'corn'],
      defaultValues: {
        duration: 'Variable',
        typical_application_rate: 'N/A',
        unit: 'N/A',
        efficiency_tip: 'Documentation increases farm transparency score'
      },
      excludeFromCarbonCalculation: true, // ✅ CRITICAL: Exclude from carbon calculations
      emission_factor_source: 'N/A - Documentation Only',
      usda_compliant: true,
      requires_area_input: false
    }
  ];

  // Filter templates by crop type
  const relevantTemplates = carbonEventTemplates.filter((template) =>
    template.cropTypes.includes(cropType.toLowerCase())
  );

  // Real-time carbon calculation function using USDA emission factors
  const calculateCarbonPreviewForTemplate = async (template: CarbonEventTemplate, applicationRate?: number) => {
    if (template.excludeFromCarbonCalculation) {
      return null; // No carbon calculation for General Events
    }

    const rate = applicationRate || parseFloat(template.defaultValues.typical_application_rate || '0');
    
    if (rate <= 0 || areaInput <= 0) {
      return null;
    }

    try {
      // Map template type to proper backend event type
      const getEventTypeFromTemplate = (template: any) => {
        const name = template.name?.toLowerCase() || '';
        // Chemical events (fertilizers, pesticides, herbicides)
        if (name.includes('fertiliz')) return 'chemical';
        if (name.includes('spray')) return 'chemical';
        if (name.includes('pesticide')) return 'chemical';
        if (name.includes('herbicide')) return 'chemical';
        if (name.includes('fungicide')) return 'chemical';
        
        // Equipment events (heavy machinery operations)
        if (name.includes('equipment')) return 'equipment';
        if (name.includes('tillage')) return 'equipment';
        if (name.includes('preparation')) return 'equipment';
        
        // Production events (biological/manual operations)
        if (name.includes('irrigation')) return 'production';
        if (name.includes('harvest')) return 'production';
        if (name.includes('planting')) return 'production';
        if (name.includes('pruning')) return 'production';
        if (name.includes('bloom')) return 'production';
        
        return 'production'; // Default for agricultural activities
      };

      const eventType = getEventTypeFromTemplate(template);
      
      // Map event type to proper sub-type
      const getEventSubType = (eventType: string, templateName: string) => {
        if (eventType === 'chemical') {
          if (templateName?.toLowerCase().includes('fertiliz')) return 'FE'; // Fertilizer
          if (templateName?.toLowerCase().includes('pesticide')) return 'PE'; // Pesticide
          if (templateName?.toLowerCase().includes('herbicide')) return 'HE'; // Herbicide
          return 'FE'; // Default to fertilizer for chemical events
        }
        if (eventType === 'production') {
          if (templateName?.toLowerCase().includes('irrigation')) return 'IR'; // Irrigation
          if (templateName?.toLowerCase().includes('harvest')) return 'HA'; // Harvest
          if (templateName?.toLowerCase().includes('plant')) return 'PL'; // Planting
          return 'IR'; // Default to irrigation for production events
        }
        if (eventType === 'equipment') return 'EQ'; // Equipment
        return 'GE'; // General
      };

      const eventSubType = getEventSubType(eventType, template.name);
      
      const response = await calculateCarbonPreview({
        event_type: eventType,
        event_data: {
          type: eventSubType,
          cropType: cropType,
          applicationRate: rate,
          area_covered: areaInput,
          area_unit: 'ha',
          unit: template.defaultValues.unit || 'kg/ha',
          name: template.name,
          template_id: template.id,
          // Add chemical-specific data for fertilization
          ...(eventType === 'chemical' && {
            concentration: '10-10-10', // NPK ratio
            volume: '100', // liters
            volume_unit: 'liters',
            way_of_application: 'broadcast',
            commercial_name: template.name || 'General Fertilizer'
          })
        }
      }).unwrap();

      const preview: CarbonPreview = {
        estimated_carbon: response.co2e || 0,
        calculation_source: response.calculation_method || template.emission_factor_source || 'USDA ARS',
        area_hectares: areaInput,
        application_rate: rate,
        emission_factor: response.emission_factor || 0,
        confidence_level: response.efficiency_score || 0.8,
        usda_verified: response.usda_verified || false
      };

      setCarbonPreviews(prev => ({
        ...prev,
        [template.id]: preview
      }));

      return preview;
    } catch (error) {
      console.error(`Error calculating carbon preview for ${template.id}:`, error);
      return null;
    }
  };

  // Update carbon previews when area or application rates change
  useEffect(() => {
    relevantTemplates.forEach(template => {
      if (!template.excludeFromCarbonCalculation) {
        calculateCarbonPreviewForTemplate(template, applicationRates[template.id]);
      }
    });
  }, [areaInput, applicationRates, relevantTemplates]);

  const getCarbonCategoryColor = (category: string) => {
    switch (category) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'high':
        return FaEye;
      case 'medium':
        return FaCamera;
      case 'low':
        return FaCheckCircle;
      default:
        return FaCamera;
    }
  };

  return (
    <Box>
      {/* USDA-Based Carbon Calculator Header */}
      <Alert status="success" borderRadius="lg" mb={6}>
        <AlertIcon />
        <VStack align="start" spacing={1} flex={1}>
          <Text fontSize="sm" fontWeight="semibold">
            🌱✅ USDA-Compliant Carbon Templates
          </Text>
          <Text fontSize="xs">
            Real-time carbon calculations using USDA emission factors for {cropType}
          </Text>
        </VStack>
      </Alert>

      {/* Area Input for Carbon Calculations */}
      <Box mb={6} p={4} bg="blue.50" borderRadius="lg" borderWidth="1px" borderColor="blue.200">
        <HStack justify="space-between" align="end">
          <FormControl maxW="200px">
            <FormLabel fontSize="sm" fontWeight="bold">
              <Icon as={FaCalculator} mr={2} />
              Farm Area for Calculations
            </FormLabel>
            <NumberInput
              value={areaInput}
              onChange={(_, value) => setAreaInput(value || 1)}
              min={0.1}
              step={0.1}
              size="sm"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <FormHelperText fontSize="xs">
              Area in {areaUnit} - affects carbon calculations
            </FormHelperText>
          </FormControl>
          
          <Alert status="info" size="sm" maxW="300px">
            <FaInfoCircle />
            <Text fontSize="xs" ml={2}>
              Carbon impact calculated using EPA/USDA emission factors × application rate × area
            </Text>
          </Alert>
        </HStack>
      </Box>

      {/* Templates Grid */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
        {relevantTemplates.map((template) => (
          <Card
            key={template.id}
            cursor="pointer"
            borderWidth="2px"
            borderColor={
              selectedTemplate?.id === template.id ? `${template.color}.300` : borderColor
            }
            bg={selectedTemplate?.id === template.id ? `${template.color}.50` : bgColor}
            onClick={() => onTemplateSelect(template)}
            _hover={{
              borderColor: `${template.color}.300`,
              transform: 'translateY(-2px)',
              boxShadow: 'lg'
            }}
            transition="all 0.2s">
            <CardBody p={4}>
              <VStack spacing={3} align="start">
                {/* Header with Icon and Real-Time Carbon Impact */}
                <HStack justify="space-between" width="100%">
                  <HStack>
                    <Icon as={template.icon} color={`${template.color}.500`} boxSize={5} />
                    <Text fontWeight="bold" fontSize="sm">
                      {template.name}
                    </Text>
                  </HStack>
                  
                  {/* ✅ USDA-Based Carbon Display Logic */}
                  {template.excludeFromCarbonCalculation ? (
                    <Badge colorScheme="blue" size="sm">
                      <Icon as={FaCamera} boxSize={3} mr={1} />
                      Documentation
                    </Badge>
                  ) : carbonPreviews[template.id] ? (
                    <Tooltip 
                      label={`Calculated using ${carbonPreviews[template.id].calculation_source}`}
                      placement="top"
                    >
                      <Badge colorScheme="green" size="sm">
                        <Icon as={FaCheckCircle} boxSize={3} mr={1} />
                        {formatCarbonValue(carbonPreviews[template.id].estimated_carbon)} kg CO₂
                      </Badge>
                    </Tooltip>
                  ) : (
                    <Badge colorScheme="yellow" size="sm">
                      <Icon as={FaCalculator} boxSize={3} mr={1} />
                      Calculating...
                    </Badge>
                  )}
                </HStack>

                {/* Description */}
                <Text fontSize="xs" color="gray.600">
                  {template.description}
                </Text>

                {/* Metrics Row */}
                <HStack justify="space-between" width="100%">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" color="gray.500">
                      Sustainability Score
                    </Text>
                    <HStack>
                      <Text fontSize="sm" fontWeight="bold" color="green.600">
                        {template.sustainabilityScore}/10
                      </Text>
                    </HStack>
                  </VStack>

                  <VStack align="end" spacing={0}>
                    <Text fontSize="xs" color="gray.500">
                      QR Visibility
                    </Text>
                    <HStack>
                      <Icon
                        as={getVisibilityIcon(template.qrVisibility)}
                        color="blue.400"
                        boxSize={3}
                      />
                      <Text fontSize="xs" color="blue.600" fontWeight="medium">
                        {template.qrVisibility}
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>

                {/* Usage Frequency Badge */}
                <HStack justify="space-between" width="100%">
                  <Badge
                    colorScheme={template.usageFrequency === 'common' ? 'green' : 'blue'}
                    size="xs">
                    {template.usageFrequency}
                  </Badge>
                  <Text fontSize="xs" color="gray.500">
                    {template.defaultValues.duration}
                  </Text>
                </HStack>

                {/* ✅ USDA Application Rate Input (for carbon calculations) */}
                {!template.excludeFromCarbonCalculation && (
                  <Box p={3} bg="green.50" borderRadius="md" width="100%" borderWidth="1px" borderColor="green.200">
                    <FormControl size="sm">
                      <FormLabel fontSize="xs" fontWeight="bold" color="green.700">
                        Application Rate ({template.defaultValues.unit})
                      </FormLabel>
                      <NumberInput
                        value={applicationRates[template.id] || parseFloat(template.defaultValues.typical_application_rate || '0')}
                        onChange={(_, value) => setApplicationRates(prev => ({
                          ...prev,
                          [template.id]: value || 0
                        }))}
                        min={0}
                        step={1}
                        size="sm"
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <FormHelperText fontSize="xs">
                        Typical: {template.defaultValues.typical_application_rate} {template.defaultValues.unit}
                      </FormHelperText>
                    </FormControl>
                    
                    {/* Carbon Calculation Transparency */}
                    {carbonPreviews[template.id] && (
                      <Box mt={2} p={2} bg="white" borderRadius="sm" fontSize="xs">
                        <Text fontWeight="bold" color="green.600">Carbon Calculation:</Text>
                        <Text color="gray.600">
                          {carbonPreviews[template.id].emission_factor.toFixed(3)} kg CO₂/{template.defaultValues.unit} × {' '}
                          {applicationRates[template.id] || parseFloat(template.defaultValues.typical_application_rate || '0')} {template.defaultValues.unit} × {' '}
                          {areaInput} {areaUnit} = {formatCarbonValue(carbonPreviews[template.id].estimated_carbon)} kg CO₂
                        </Text>
                        <Text fontSize="xs" color="blue.500">
                          Source: {carbonPreviews[template.id].calculation_source}
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Efficiency Tip */}
                <Box p={2} bg="gray.50" borderRadius="md" width="100%">
                  <Text fontSize="xs" color="gray.600">
                    💡 {template.defaultValues.efficiency_tip}
                  </Text>
                </Box>

                {/* Selection Indicator */}
                {selectedTemplate?.id === template.id && (
                  <HStack justify="center" width="100%" pt={2}>
                    <Icon as={FaCheckCircle} color="green.500" />
                    <Text fontSize="xs" color="green.600" fontWeight="bold">
                      Template Selected
                    </Text>
                  </HStack>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </Grid>

      {/* ✅ USDA-Based Selected Template Summary */}
      {selectedTemplate && (
        <Box mt={6} p={4} bg="green.50" borderRadius="lg" borderWidth="1px" borderColor="green.200">
          <VStack spacing={3}>
            <HStack justify="space-between" width="100%">
              <Text fontWeight="bold" color="green.700">
                Ready to create: {selectedTemplate.name}
              </Text>
              
              {/* ✅ Show USDA-calculated carbon impact instead of hardcoded */}
              {selectedTemplate.excludeFromCarbonCalculation ? (
                <Badge colorScheme="blue">
                  <Icon as={FaCamera} boxSize={3} mr={1} />
                  Transparency Event (No Carbon)
                </Badge>
              ) : carbonPreviews[selectedTemplate.id] ? (
                <Badge colorScheme="green">
                  <Icon as={FaCheckCircle} boxSize={3} mr={1} />
                  USDA Carbon: {formatCarbonValue(carbonPreviews[selectedTemplate.id].estimated_carbon)} kg CO₂
                </Badge>
              ) : (
                <Badge colorScheme="yellow">
                  <Icon as={FaCalculator} boxSize={3} mr={1} />
                  Carbon: Calculating...
                </Badge>
              )}
            </HStack>

            <Text fontSize="sm" color="green.600" textAlign="center">
              This event will be visible to consumers with {selectedTemplate.qrVisibility}{' '}
              visibility on QR scans
            </Text>

            {/* ✅ Enhanced Details with USDA Compliance */}
            <HStack spacing={2} wrap="wrap" justify="center">
              <Badge colorScheme="blue" size="sm">
                {applicationRates[selectedTemplate.id] || selectedTemplate.defaultValues.typical_application_rate} {selectedTemplate.defaultValues.unit}
              </Badge>
              <Badge colorScheme="purple" size="sm">
                {selectedTemplate.defaultValues.duration}
              </Badge>
              <Badge colorScheme="green" size="sm">
                Transparency Score: {selectedTemplate.sustainabilityScore}/10
              </Badge>
              {selectedTemplate.usda_compliant && (
                <Badge colorScheme="green" size="sm">
                  ✅ USDA Compliant
                </Badge>
              )}
            </HStack>

            {/* ✅ Carbon Calculation Source Transparency */}
            {carbonPreviews[selectedTemplate.id] && !selectedTemplate.excludeFromCarbonCalculation && (
              <Box p={2} bg="white" borderRadius="md" width="100%">
                <Text fontSize="xs" color="gray.600" textAlign="center">
                  <Icon as={FaInfoCircle} mr={1} />
                  Carbon calculated using {carbonPreviews[selectedTemplate.id].calculation_source}
                  {' '}(Confidence: {(carbonPreviews[selectedTemplate.id].confidence_level * 100).toFixed(0)}%)
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      )}
    </Box>
  );
};
