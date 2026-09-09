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
import { useIntl } from 'react-intl';

export interface EducationalTooltipProps {
  term: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
}

// Map terms to their i18n key prefixes and visual config
const tooltipConfig: Record<
  string,
  {
    i18nPrefix: string;
    icon: any;
    color: string;
  }
> = {
  co2e: {
    i18nPrefix: 'tooltip.co2e',
    icon: FaGlobeAmericas,
    color: 'green'
  },
  carbon_footprint: {
    i18nPrefix: 'tooltip.carbonFootprint',
    icon: FaLeaf,
    color: 'green'
  },
  usda_factors_used: {
    i18nPrefix: 'tooltip.usdaFactorsUsed',
    icon: FaFlask,
    color: 'blue'
  },
  blockchain_verified: {
    i18nPrefix: 'tooltip.blockchainRecorded',
    icon: MdSecurity,
    color: 'purple'
  },
  carbon_score: {
    i18nPrefix: 'tooltip.carbonScore',
    icon: FaBalanceScale,
    color: 'orange'
  },
  photo_documentation: {
    i18nPrefix: 'tooltip.photoDocumentation',
    icon: FaCertificate,
    color: 'purple'
  },
  precision_agriculture: {
    i18nPrefix: 'tooltip.precisionAgriculture',
    icon: FaFlask,
    color: 'blue'
  },
  conservation_tillage: {
    i18nPrefix: 'tooltip.conservationTillage',
    icon: FaShieldAlt,
    color: 'green'
  },
  emission_factors: {
    i18nPrefix: 'tooltip.emissionFactors',
    icon: FaFlask,
    color: 'blue'
  },
  sustainability_impact: {
    i18nPrefix: 'tooltip.sustainabilityImpact',
    icon: FaLeaf,
    color: 'green'
  },
  quick_add: {
    i18nPrefix: 'tooltip.quickAdd',
    icon: FaLeaf,
    color: 'green'
  },
  fertilization_event: {
    i18nPrefix: 'tooltip.fertilizationEvent',
    icon: FaFlask,
    color: 'green'
  },
  irrigation_event: {
    i18nPrefix: 'tooltip.irrigationEvent',
    icon: FaGlobeAmericas,
    color: 'blue'
  },
  pest_control_event: {
    i18nPrefix: 'tooltip.pestControlEvent',
    icon: FaShieldAlt,
    color: 'orange'
  },
  herbicide_event: {
    i18nPrefix: 'tooltip.herbicideEvent',
    icon: FaFlask,
    color: 'purple'
  },
  fungicide_event: {
    i18nPrefix: 'tooltip.fungicideEvent',
    icon: FaFlask,
    color: 'teal'
  },
  pruning_event: {
    i18nPrefix: 'tooltip.pruningEvent',
    icon: FaLeaf,
    color: 'green'
  },
  harvest_event: {
    i18nPrefix: 'tooltip.harvestEvent',
    icon: FaCertificate,
    color: 'orange'
  },
  planting_event: {
    i18nPrefix: 'tooltip.plantingEvent',
    icon: FaLeaf,
    color: 'green'
  },
  // ⛔ The `transparency_score` term was removed 2026-09-08 with the three
  // `tooltip.transparencyScore.*` messages it pointed at. The score is retired as a CONCEPT, so
  // there is nothing left to define for a reader. Do not re-add a term here for it.
};

export const EducationalTooltip: React.FC<EducationalTooltipProps> = ({
  term,
  children,
  placement = 'top',
  showIcon = true
}) => {
  const intl = useIntl();
  const config = tooltipConfig[term.toLowerCase()];

  // 🔴 2026-08-31 — every hook ABOVE the `!config` guard.
  //
  // These four sat below it, so an unrecognised term rendered one hook (useIntl) and a
  // recognised one rendered five. React counts hooks per render: the moment a mounted
  // instance's `term` moved between those two sets — a mapped list re-rendering with
  // different terms in the same position is enough — the count changed and React tore the
  // tree down with "Rendered fewer hooks than expected".
  //
  // `config` is optional here by construction, so the example tint falls back rather than
  // reading `.color` off undefined.
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const exampleBg = useColorModeValue(
    `${config?.color ?? 'gray'}.50`,
    `${config?.color ?? 'gray'}.900`
  );

  if (!config) {
    return <>{children}</>;
  }

  const definition = intl.formatMessage({ id: `${config.i18nPrefix}.definition` });
  const explanation = intl.formatMessage({ id: `${config.i18nPrefix}.explanation` });
  const example = intl.formatMessage({ id: `${config.i18nPrefix}.example` });

  const tooltipContent = (
    <VStack align="start" spacing={3} maxW="280px" p={2}>
      <HStack spacing={2} w="full">
        <Icon as={config.icon} color={`${config.color}.500`} boxSize={4} />
        <Text fontSize="sm" fontWeight="bold" color={textColor}>
          {definition}
        </Text>
      </HStack>

      <Text fontSize="xs" color={textColor} lineHeight="1.4">
        {explanation}
      </Text>

      {example && (
        <Box bg={exampleBg} p={2} borderRadius="md" w="full">
          <Text fontSize="xs" color={`${config.color}.600`} fontWeight="medium">
            {intl.formatMessage({ id: 'tooltip.examplePrefix' }, { example })}
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
      gutter={8}>
      <Box
        display="inline-flex"
        alignItems="center"
        cursor="help"
        _hover={{
          color: `${config.color}.600`,
          transform: 'translateY(-1px)'
        }}
        transition="all 0.2s">
        {children}
        {showIcon && (
          <Icon as={FaInfoCircle} boxSize={3} ml={1} color={`${config.color}.400`} opacity={0.7} />
        )}
      </Box>
    </Tooltip>
  );
};

// Helper components for common terms
export const CO2eTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip term="co2e">{children}</EducationalTooltip>
);

export const USDATooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip term="usda_factors_used">{children}</EducationalTooltip>
);

export const CarbonScoreTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip term="carbon_score">{children}</EducationalTooltip>
);

export const BlockchainTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip term="blockchain_verified">{children}</EducationalTooltip>
);

export const PhotoDocumentationTooltip: React.FC<{ children: React.ReactNode }> = ({
  children
}) => <EducationalTooltip term="photo_documentation">{children}</EducationalTooltip>;

export default EducationalTooltip;
