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
    definition: 'USDA Verified',
    explanation:
      'The U.S. Department of Agriculture has independently inspected and confirmed that farming practices meet federal standards for safety, quality, and environmental responsibility.',
    icon: FaCertificate,
    color: 'blue',
    example: 'Like a government seal of approval for sustainable farming'
  },
  blockchain_verified: {
    definition: 'Blockchain Verified',
    explanation:
      'Data is stored on a tamper-proof digital ledger that creates a permanent, unchangeable record. Like a digital fingerprint that proves authenticity.',
    icon: MdSecurity,
    color: 'purple',
    example: 'Every farming event is cryptographically secured and publicly verifiable'
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
    definition: 'USDA Emission Factors',
    explanation:
      'Official government data that shows how much greenhouse gas different farming activities produce. These are the scientific "recipes" used to calculate carbon footprints accurately.',
    icon: FaFlask,
    color: 'blue',
    example: 'USDA provides exact CO₂ amounts for tractors, fertilizers, and other farm inputs'
  },
  sustainability_impact: {
    definition: 'Sustainability Impact',
    explanation:
      'How this farming practice affects the environment - including soil health, water quality, biodiversity, and climate. Like a health check-up for the planet.',
    icon: FaLeaf,
    color: 'green',
    example: 'High impact = actively helping the environment, not just avoiding harm'
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
