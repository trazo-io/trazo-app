import React from 'react';
import {
  Tooltip,
  Text,
  VStack,
  HStack,
  Icon,
  Box,
  Badge,
  useColorModeValue
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaCertificate,
  FaInfoCircle,
  FaGlobeAmericas,
  FaFlask,
  FaShieldAlt,
  FaBalanceScale
} from 'react-icons/fa';
import { MdVerified, MdSecurity } from 'react-icons/md';

export interface EducationalTooltipProps {
  term: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
}

// Educational content for different terms
const educationalContent: Record<
  string,
  {
    definition: string;
    explanation: string;
    icon: any;
    color: string;
    example?: string;
  }
> = {
  co2e: {
    definition: 'Carbon Dioxide Equivalent',
    explanation:
      'A standard unit that combines all greenhouse gases (CO₂, methane, nitrous oxide) into a single measurement. Like converting different currencies into dollars for easy comparison.',
    icon: FaGlobeAmericas,
    color: 'green',
    example: '1 ton CO₂e = driving 2,400 miles in an average car'
  },
  carbon_footprint: {
    definition: 'Carbon Footprint',
    explanation:
      'The total amount of greenhouse gases produced during the entire life cycle of a product, from growing to your table. Think of it as the environmental "receipt" for your food.',
    icon: FaLeaf,
    color: 'green',
    example: 'Includes farming, transportation, processing, and packaging emissions'
  },
  usda_verified: {
    definition: 'EPA/USDA Emission Factors',
    explanation:
      'Carbon calculations for this event use official emission factors published by the EPA and USDA. This ensures consistent methodology across all farms — not a verification of farming practices themselves.',
    icon: FaFlask,
    color: 'blue',
    example: 'Government-published data ensures consistent, reliable carbon calculations'
  },
  blockchain_verified: {
    definition: 'Blockchain Recorded',
    explanation:
      'When a production is finished, a digital fingerprint of all documented events is permanently recorded on the Polygon blockchain. This proves data has not been altered after submission — it does not verify farming practice accuracy.',
    icon: MdSecurity,
    color: 'purple',
    example: 'Your production record is cryptographically sealed and immutable on Polygonscan'
  },
  carbon_score: {
    definition: 'Carbon Score (0-100)',
    explanation:
      'A simple rating that shows how climate-friendly this product is. Higher scores mean better environmental performance and more sustainable farming practices.',
    icon: FaBalanceScale,
    color: 'orange',
    example: 'Score 85+ = Exceptional sustainability practices'
  },
  precision_agriculture: {
    definition: 'Precision Agriculture',
    explanation:
      'Farming technology that uses GPS, sensors, and data to apply exactly the right amount of inputs (water, fertilizer) in exactly the right places, reducing waste.',
    icon: FaFlask,
    color: 'blue',
    example: 'Like having a smart phone for farming - everything is measured and optimized'
  },
  conservation_tillage: {
    definition: 'Conservation Tillage',
    explanation:
      'Farming methods that disturb soil as little as possible, keeping plant residue on the surface to protect soil and store carbon. Like using minimal makeup to keep skin healthy.',
    icon: FaShieldAlt,
    color: 'green',
    example: 'No-till farming can store 1.2 tons of CO₂ per hectare annually'
  },
  emission_factors: {
    definition: 'EPA Emission Factors',
    explanation:
      'Published research data that shows how much greenhouse gas different farming activities produce. These are the scientific "recipes" used to calculate carbon footprints accurately.',
    icon: FaFlask,
    color: 'blue',
    example: 'EPA provides exact CO₂ amounts for tractors, fertilizers, and other farm inputs'
  },
  sustainability_impact: {
    definition: 'Sustainability Impact',
    explanation:
      'How this farming practice affects the environment - including soil health, water quality, biodiversity, and climate. Like a health check-up for the planet.',
    icon: FaLeaf,
    color: 'green',
    example: 'High impact = actively helping the environment, not just avoiding harm'
  },
  // Quick Add Event Types
  quick_add: {
    definition: 'Quick Add Event',
    explanation:
      'The fastest way to log farming activities in under 60 seconds. Choose from 8 event types, smart defaults pre-fill common values, and voice capture lets you document hands-free.',
    icon: FaLeaf,
    color: 'green',
    example: 'Log 5-7 events weekly to achieve 85%+ transparency score'
  },
  fertilization_event: {
    definition: 'Fertilization Event',
    explanation:
      'Document NPK applications, organic amendments, and soil nutrients. Includes concentration validation to ensure accurate carbon calculations and consumer transparency.',
    icon: FaFlask,
    color: 'green',
    example: 'NPK 10-10-10 applied at 100 kg/hectare = detailed transparency record'
  },
  irrigation_event: {
    definition: 'Irrigation Event',
    explanation:
      'Record water management practices including volume, method (drip, sprinkler, flood), and duration. Shows consumers your water stewardship and resource efficiency.',
    icon: FaGlobeAmericas,
    color: 'blue',
    example: 'Drip irrigation uses 25-50% less water than flood methods'
  },
  pest_control_event: {
    definition: 'Pest Control Event',
    explanation:
      'Document pest management including IPM practices, pesticide applications, and beneficial insect releases. Consumers value transparency about crop protection methods.',
    icon: FaShieldAlt,
    color: 'orange',
    example: 'IPM practices can reduce pesticide use by 40%'
  },
  herbicide_event: {
    definition: 'Herbicide Event',
    explanation:
      'Record weed management activities including pre-emergent and post-emergent applications. Document organic alternatives and cover crop termination.',
    icon: FaFlask,
    color: 'purple',
    example: 'Organic herbicides have lower environmental impact scores'
  },
  fungicide_event: {
    definition: 'Fungicide Event',
    explanation:
      'Document disease prevention and treatment including copper, sulfur, and synthetic fungicides. Shows consumers your plant health management practices.',
    icon: FaFlask,
    color: 'teal',
    example: 'Preventive applications typically use less product than curative'
  },
  pruning_event: {
    definition: 'Pruning Event',
    explanation:
      'Record plant maintenance including seasonal pruning, thinning, and training. Includes fuel consumption for powered equipment to track environmental impact.',
    icon: FaLeaf,
    color: 'green',
    example: 'Proper pruning improves yield quality and reduces disease'
  },
  harvest_event: {
    definition: 'Harvest Event',
    explanation:
      'Document crop collection including yield quantity, equipment used, and transportation. Consumers see your quality selection and handling practices.',
    icon: FaCertificate,
    color: 'orange',
    example: 'Recording yield data enables transparency benchmarking'
  },
  planting_event: {
    definition: 'Planting Event',
    explanation:
      'Record crop establishment including seed variety, planting density, and soil preparation. Shows consumers the start of your growing journey.',
    icon: FaLeaf,
    color: 'green',
    example: 'Certified seed varieties can improve transparency scores'
  },
  transparency_score: {
    definition: 'Transparency Score',
    explanation:
      'Your 0-100% score based on documented farming events. More events logged = higher score = more consumer trust. Unlike carbon scores, transparency rewards complete documentation.',
    icon: FaBalanceScale,
    color: 'green',
    example: '85%+ transparency unlocks 15-30% premium pricing opportunities'
  }
};

export const EducationalTooltip: React.FC<EducationalTooltipProps> = ({
  term,
  children,
  placement = 'top',
  showIcon = true
}) => {
  const content = educationalContent[term.toLowerCase()];

  if (!content) {
    return <>{children}</>;
  }

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const tooltipContent = (
    <VStack align="start" spacing={3} maxW="280px" p={2}>
      {/* Header with icon and term */}
      <HStack spacing={2} w="full">
        <Icon as={content.icon} color={`${content.color}.500`} boxSize={4} />
        <Text fontSize="sm" fontWeight="bold" color={textColor}>
          {content.definition}
        </Text>
      </HStack>

      {/* Main explanation */}
      <Text fontSize="xs" color={textColor} lineHeight="1.4">
        {content.explanation}
      </Text>

      {/* Example if provided */}
      {content.example && (
        <Box
          bg={useColorModeValue(`${content.color}.50`, `${content.color}.900`)}
          p={2}
          borderRadius="md"
          w="full"
        >
          <Text fontSize="xs" color={`${content.color}.600`} fontWeight="medium">
            💡 Example: {content.example}
          </Text>
        </Box>
      )}
    </VStack>
  );

  return (
    <Tooltip
      label={tooltipContent}
      placement={placement}
      hasArrow
      bg={bgColor}
      color={textColor}
      borderColor={borderColor}
      borderWidth="1px"
      borderRadius="lg"
      shadow="lg"
      maxW="300px"
      p={3}
      gutter={8}
    >
      <Box
        display="inline-flex"
        alignItems="center"
        cursor="help"
        _hover={{
          color: `${content.color}.600`,
          transform: 'translateY(-1px)'
        }}
        transition="all 0.2s"
      >
        {children}
        {showIcon && (
          <Icon as={FaInfoCircle} boxSize={3} ml={1} color={`${content.color}.400`} opacity={0.7} />
        )}
      </Box>
    </Tooltip>
  );
};

// Helper component for common terms
export const CO2eTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip term="co2e">{children}</EducationalTooltip>
);

export const USDATooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip term="usda_verified">{children}</EducationalTooltip>
);

export const CarbonScoreTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip term="carbon_score">{children}</EducationalTooltip>
);

export const BlockchainTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip term="blockchain_verified">{children}</EducationalTooltip>
);

export default EducationalTooltip;
