import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Spinner,
  Progress,
  Tooltip,
  Heading,
  Flex,
  Divider
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { FaLeaf, FaDollarSign, FaLightbulb, FaCheckCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import {
  formatCO2e as formatCO2eUtil,
  getImpactLevel as getImpactLevelUtil,
  getCarbonScoreColor as getCarbonScoreColorUtil
} from '../../utils/carbonDisplayUtils';

interface CarbonCalculation {
  co2e?: number;
  efficiency_score?: number;
  usda_factors_used?: boolean;
  calculation_method: string;
  // Error handling properties
  error?: boolean;
  calculation_unavailable?: boolean;
  message?: string;
  transparency_note?: string;
  retry_available?: boolean;
  // Original user input for display purposes
  original_volume_applied?: number;
  original_volume_unit?: string;
  original_area_treated?: number;
  original_area_unit?: string;
  breakdown?: {
    // Chemical application fields
    nitrogen_emissions?: number;
    phosphorus_emissions?: number;
    potassium_emissions?: number;
    application_efficiency?: number;
    volume_applied_liters?: number;
    area_treated_hectares?: number;
    application_method?: string;
    manufacturing_emissions_kg_co2e?: number;
    application_emissions_kg_co2e?: number;
    // Fuel consumption details for chemical applications
    application_fuel_liters?: number;
    application_fuel_gallons?: number;
    application_fuel_type?: string;
    epa_diesel_factor_kg_co2_per_gallon?: number;
    // Generic fuel factor (replaces `epa_diesel_factor_kg_co2_per_gallon` for non-diesel fuels).
    // Holds the actual emission factor applied — gasoline 8.78, propane 5.66, electric kWh factor, etc.
    epa_fuel_factor_kg_co2_per_unit?: number;
    epa_fuel_factor_unit?: string;
    // Chemical calculation breakdown (2025-12-24)
    chemical_subtype_used?: string;
    active_ingredient_percentage?: number;
    active_ingredient_kg?: number;
    emission_factor_kg_co2_per_kg?: number;
    concentration_source?: 'user_provided' | 'default';
    pesticide_subtype?: string;
    herbicide_subtype?: string;
    fungicide_subtype?: string;
    // Fertilizer calculation breakdown (2025-12-24)
    fertilizer_subtype?: 'organic' | 'synthetic' | 'slow_release';
    note?: string; // Explanation of fertilizer type impact
    npk_content?: {
      N?: number;
      P?: number;
      K?: number;
    };
    nitrogen_kg?: number;
    phosphorus_kg?: number;
    potassium_kg?: number;

    // Irrigation event fields
    water_volume_gallons?: number;
    kwh_consumed?: number;
    actual_kwh_consumed?: number;
    electricity_emission_factor_kg_per_kwh?: number;
    pump_efficiency_kwh_per_1000_gallons?: number;
    water_source?: string;
    water_source_label?: string;
    fuel_type?: string;
    energy_source?: string;
    // Pump-only emissions (excludes auxiliary diesel). Backend-computed to keep
    // the pump line in sync with the stored calculation.
    pump_electricity_emissions_kg?: number;
    // Auxiliary diesel on electric irrigation (2026-04-10 fix)
    // Set when farmer reports diesel fuel alongside a non-diesel electric pump
    // (grid/solar/wind/mixed — NOT diesel_generator, which already includes
    // generator fuel in its 0.65 kg CO₂e/kWh factor). Represents service vehicles,
    // standby tractors, or maintenance equipment — added on top of pump electricity.
    auxiliary_diesel_fuel_gallons?: number;
    auxiliary_diesel_emissions_kg?: number;
    auxiliary_diesel_emission_factor_kg_per_gallon?: number;
    auxiliary_diesel_note?: string;

    // Production event fields
    production_activity?: string;
    area_covered_acres?: number;
    area_covered_hectares?: number;
    diesel_emission_factor_kg_per_gallon?: number;
    // USDA factor field names vary by production type
    usda_planting_factor_gallons_per_hectare?: number;
    usda_production_factor_gallons_per_hectare?: number;
    usda_harvesting_factor_gallons_per_hectare?: number;
    usda_transplanting_factor_gallons_per_hectare?: number;
    usda_thinning_factor_gallons_per_hectare?: number;
    usda_cultivation_factor_gallons_per_hectare?: number;
    calculation_basis?: string;
    confidence_level?: number;
    actual_fuel_consumed_gallons?: number;
    equipment_hours?: number;
    // Manual-operation detection (Trazo Direct Operational Emissions)
    // Set when farmer documents a manual method ("Hand thinning", "Pruning shears") and
    // calculator routes to _calculate_manual_operation_emissions (~0.1 kg CO2e/acre)
    // instead of USDA blanket mechanical averages.
    manual_operation_detected?: boolean;
    method_documented?: string;
    production_type_code?: string;

    // Soil management event fields
    soil_activity?: string;
    area_managed?: number;
    fuel_consumed?: number;
    fuel_unit?: string;
    area_emissions?: number;
    fuel_emissions?: number;
    emission_factor?: number;
    total_impact?: number;

    // Pest management event fields (Sprint 3 Epic 3.1)
    pest_activity?: string;
    pest_management_type?: string;
    area_covered?: number;
    area_unit?: string;
    fuel_type?: string;
    production_efficiency?: string;
  };
  cost_analysis?: {
    estimated_cost: number;
    cost_per_co2e: number;
  };
  recommendations?: Array<{
    type: string;
    title: string;
    description: string;
    potential_savings: number;
    carbon_reduction: number;
  }>;
}

interface CarbonImpactPreviewProps {
  eventType: string;
  formData: any;
  calculation?: CarbonCalculation | null;
  isCalculating?: boolean;
}

export const CarbonImpactPreview: React.FC<CarbonImpactPreviewProps> = memo(
  ({ eventType, formData, calculation, isCalculating = false }) => {
    const intl = useIntl();
    const bgColor = useColorModeValue('gray.50', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const textColor = useColorModeValue('gray.800', 'white');

    const [showDetails, setShowDetails] = useState(false);

    // Use shared utility functions (from carbonDisplayUtils.ts)
    const getCarbonScoreColor = getCarbonScoreColorUtil;
    const getImpactLevel = getImpactLevelUtil;
    const formatCO2e = formatCO2eUtil;

    // Memoized calculations to prevent recalculation unless calculation changes
    const { impactLevel, efficiencyColor, formattedCO2e } = useMemo(() => {
      if (!calculation) return { impactLevel: null, efficiencyColor: null, formattedCO2e: null };

      return {
        impactLevel: getImpactLevel(calculation.co2e),
        efficiencyColor: getCarbonScoreColor(calculation.efficiency_score),
        formattedCO2e: formatCO2e(calculation.co2e)
      };
    }, [calculation, getImpactLevel, getCarbonScoreColor, formatCO2e]);

    // Handle error state from API failures
    if (calculation?.error || calculation?.calculation_unavailable) {
      return (
        <Card size="sm" bg="orange.50" borderRadius="md" borderWidth="1px" borderColor="orange.200">
          <CardBody>
            <VStack spacing={3} align="stretch">
              <HStack spacing={3}>
                <Icon as={FaLeaf} color="orange.500" boxSize={5} />
                <VStack spacing={1} align="start" flex={1}>
                  <Text fontSize="sm" fontWeight="semibold" color="orange.700">
                    {calculation.message || 'Carbon calculation temporarily unavailable'}
                  </Text>
                  <Text fontSize="xs" color="orange.600">
                    {calculation.transparency_note ||
                      'Event will still be documented for transparency tracking'}
                  </Text>
                </VStack>
              </HStack>

              <Alert status="info" size="sm" borderRadius="md">
                <AlertIcon boxSize={3} />
                <Box>
                  <AlertTitle fontSize="xs">Transparency Focus</AlertTitle>
                  <AlertDescription fontSize="xs">
                    This event will build your transparency score and appear in consumer QR stories.
                    Carbon calculations will be updated when available.
                  </AlertDescription>
                </Box>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      );
    }

    if (!calculation && !isCalculating) {
      return (
        <Card size="sm" bg={bgColor} borderRadius="md">
          <CardBody>
            <HStack spacing={3}>
              <Icon as={FaLeaf} color="gray.400" boxSize={5} />
              <Text fontSize="sm" color="gray.500">
                Enter event details to see carbon impact
              </Text>
            </HStack>
          </CardBody>
        </Card>
      );
    }

    if (isCalculating) {
      return (
        <Card size="sm" bg={bgColor} borderRadius="md">
          <CardBody>
            <HStack spacing={3}>
              <Spinner size="sm" color="green.500" thickness="3px" />
              <Text fontSize="sm" color={textColor}>
                Calculating carbon impact...
              </Text>
            </HStack>
          </CardBody>
        </Card>
      );
    }

    if (!calculation) return null;

    // Zero-emission events: show context-aware transparency message
    const isPollination =
      calculation.calculation_method?.includes('pollination') ||
      formData?.production_type === 'PO' ||
      formData?.type === 'PO';
    const isZeroEmissionEvent =
      calculation.co2e === 0 ||
      calculation.calculation_method?.includes('weather') ||
      isPollination;
    if (isZeroEmissionEvent) {
      // Determine event context from calculation_method for appropriate messaging
      const method = calculation.calculation_method || '';
      const isScouting = method.includes('scouting');
      const isIPM =
        !isScouting &&
        (method.includes('integrated') || method.includes('ipm') || method.includes('pest'));
      const isWeather = method.includes('weather');
      const isBusiness = method.includes('business');
      const isGeneral = method.includes('general');

      const transparencyMessage = isPollination
        ? 'Pollination is a biological service performed by bees and other insects. It generates no direct emissions and builds your transparency score by documenting this critical natural process.'
        : isScouting
        ? 'Pest scouting is observational and does not produce direct emissions. It builds your transparency score and demonstrates your commitment to integrated pest management.'
        : isIPM
        ? 'Integrated pest management activities like biological control and beneficial releases build your transparency score and demonstrate sustainable farming practices.'
        : isBusiness
        ? 'Business activities like certifications and audits build consumer trust. They generate no direct emissions but strengthen your transparency score.'
        : isGeneral
        ? 'General farm activities document agricultural practices. They generate no direct emissions but build your transparency score and enrich the consumer story.'
        : isWeather
        ? 'Weather events document environmental conditions. They generate no emissions but build your transparency score and enrich the consumer story.'
        : 'This event generates no direct emissions but builds your transparency score and enriches the consumer story.';

      return (
        <Card size="sm" bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
          <CardHeader pb={2}>
            <HStack spacing={2}>
              <Icon as={FaLeaf} color="green.500" boxSize={4} />
              <Heading size="sm" color={textColor}>
                Carbon Impact Preview
              </Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between" align="center">
                <VStack spacing={0} align="start">
                  <HStack spacing={2}>
                    <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                      0
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      kg CO₂e
                    </Text>
                    <Badge colorScheme="gray" size="sm">
                      None
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    No direct emissions
                  </Text>
                </VStack>
                <VStack spacing={0} align="end">
                  <HStack spacing={1}>
                    <Text fontSize="lg" fontWeight="bold" color="green.500">
                      100
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      /100
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    Efficiency Score
                  </Text>
                </VStack>
              </HStack>
              <Alert status={isPollination ? 'success' : 'info'} size="sm" borderRadius="md">
                <AlertIcon boxSize={3} />
                <Box>
                  <AlertTitle fontSize="xs">
                    {isPollination ? 'Zero-Emission Biological Service' : 'Transparency Value'}
                  </AlertTitle>
                  <AlertDescription fontSize="xs">{transparencyMessage}</AlertDescription>
                </Box>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      );
    }

    return (
      <Card size="sm" bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
        <CardHeader pb={2}>
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Icon as={FaLeaf} color="green.500" boxSize={4} />
              <Heading size="sm" color={textColor}>
                Carbon Impact Preview
              </Heading>
            </HStack>
            {calculation.usda_factors_used && (
              <Tooltip label={intl.formatMessage({ id: 'carbon.badge.epaUsdaTooltip' })}>
                <Badge colorScheme="blue" size="sm">
                  <HStack spacing={1}>
                    <Icon as={FaCheckCircle} boxSize={3} />
                    <Text fontSize="xs">
                      {intl.formatMessage({ id: 'carbon.badge.epaUsdaSourced' })}
                    </Text>
                  </HStack>
                </Badge>
              </Tooltip>
            )}
          </HStack>
        </CardHeader>

        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">
            {/* Phase 3: Renewable power source note for IR events */}
            {(formData?.type === 'IR' || formData?.production_type === 'IR') &&
              (() => {
                const elecSrc =
                  formData?.electricity_source ?? formData?.extra_data?.electricity_source;
                if (elecSrc === 'solar' || elecSrc === 'wind') {
                  return (
                    <Alert status="success" borderRadius="md" py={2}>
                      <AlertIcon />
                      <AlertDescription fontSize="xs">
                        {elecSrc === 'solar' ? 'Solar' : 'Wind'}-powered pump — near-zero pump
                        emissions. Only water delivery carbon is counted.
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}
            {/* Phase 3: Fertigation note for FE events */}
            {(formData?.type === 'FE' || formData?.chemical_type === 'FE') &&
              (() => {
                const isFert =
                  formData?.is_fertigation === 'true' ||
                  formData?.is_fertigation === true ||
                  formData?.extra_data?.is_fertigation === true;
                if (isFert) {
                  return (
                    <Alert status="info" borderRadius="md" py={2}>
                      <AlertIcon />
                      <AlertDescription fontSize="xs">
                        Fertigation mode — application fuel excluded from carbon calculation to
                        avoid double-counting with your irrigation events.
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}
            {/* Main Carbon Impact Display */}
            <HStack justify="space-between" align="center">
              <VStack spacing={0} align="start">
                <HStack spacing={2}>
                  <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                    {formattedCO2e}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    kg CO₂e
                  </Text>
                  <Badge colorScheme={impactLevel.color} size="sm">
                    {intl.formatMessage({ id: impactLevel.level })}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500">
                  Carbon footprint estimate
                </Text>
              </VStack>

              <VStack spacing={0} align="end">
                <HStack spacing={1}>
                  <Text fontSize="lg" fontWeight="bold" color={`${efficiencyColor}.500`}>
                    {Math.round(calculation.efficiency_score)}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    /100
                  </Text>
                </HStack>
                <Text fontSize="xs" color="gray.500">
                  Efficiency Score
                </Text>
              </VStack>
            </HStack>

            {/* Cost Analysis */}
            {calculation.cost_analysis && calculation.cost_analysis.estimated_cost > 0 && (
              <>
                <Divider />
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon as={FaDollarSign} color="blue.500" boxSize={4} />
                    <VStack spacing={0} align="start">
                      <Text fontSize="md" fontWeight="semibold" color={textColor}>
                        ${calculation.cost_analysis.estimated_cost.toFixed(2)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Estimated cost
                      </Text>
                    </VStack>
                  </HStack>

                  {calculation.cost_analysis.cost_per_co2e > 0 && (
                    <VStack spacing={0} align="end">
                      <Text fontSize="sm" color={textColor}>
                        ${calculation.cost_analysis.cost_per_co2e.toFixed(2)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        per kg CO₂e
                      </Text>
                    </VStack>
                  )}
                </HStack>
              </>
            )}

            {/* Transparency Recommendations */}
            {calculation.recommendations && calculation.recommendations.length > 0 && (
              <>
                <Divider />
                <VStack spacing={2} align="stretch">
                  <HStack spacing={2}>
                    <Icon as={FaLightbulb} color="yellow.500" boxSize={4} />
                    <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                      Ways to Increase Transparency ({calculation.recommendations.length})
                    </Text>
                  </HStack>

                  {calculation.recommendations.slice(0, 2).map((rec, index) => (
                    <Alert key={index} status="info" size="sm" borderRadius="md">
                      <AlertIcon boxSize={3} />
                      <Box>
                        <AlertTitle fontSize="xs">
                          {rec.title || rec.message || 'USDA Best Practice'}
                        </AlertTitle>
                        <AlertDescription fontSize="xs">
                          {rec.potential_savings && rec.carbon_reduction ? (
                            <>
                              Builds consumer trust • Save ${rec.potential_savings} • Reduce{' '}
                              {rec.carbon_reduction.toFixed(1)} kg CO₂e
                            </>
                          ) : (
                            <>
                              Transparency Impact: {rec.impact || 'High'} • Source:{' '}
                              {rec.source?.replace('EPA', 'USDA') || 'USDA'}
                            </>
                          )}
                        </AlertDescription>
                      </Box>
                    </Alert>
                  ))}

                  {calculation.recommendations.length > 2 && (
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      +{calculation.recommendations.length - 2} more suggestions
                    </Text>
                  )}
                </VStack>
              </>
            )}

            {/* Detailed Breakdown (Expandable) */}
            {calculation.breakdown && (
              <>
                <Divider />
                <Box>
                  <Text
                    fontSize="xs"
                    color="blue.500"
                    cursor="pointer"
                    onClick={() => setShowDetails(!showDetails)}
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {showDetails ? 'Hide' : 'Show'} USDA calculation details
                  </Text>

                  {showDetails &&
                    (() => {
                      // Derive hectares from acres if backend didn't include it
                      const derivedHectares =
                        calculation.breakdown.area_covered_hectares ||
                        (calculation.breakdown.area_covered_acres
                          ? calculation.breakdown.area_covered_acres / 2.471
                          : 0);
                      return (
                        <VStack spacing={2} mt={3} align="stretch">
                          {/* Farmer-Friendly Breakdown */}
                          <VStack spacing={2} align="stretch">
                            <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                              How we calculated {formattedCO2e} kg CO₂e:
                            </Text>

                            {/* Input Summary - Production Events */}
                            {/* Skip for electric irrigation — the Irrigation Activity box handles it */}
                            {calculation.breakdown?.production_activity &&
                              !(
                                calculation.breakdown?.fuel_type === 'electric' &&
                                calculation.breakdown?.water_volume_gallons
                              ) && (
                                <Box
                                  p={2}
                                  bg="blue.50"
                                  borderRadius="md"
                                  borderWidth="1px"
                                  borderColor="blue.200"
                                >
                                  <Text fontSize="xs" fontWeight="semibold" color="blue.700" mb={1}>
                                    Your Production Activity:
                                  </Text>
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Activity:</Text>
                                    <Text color="blue.800" textTransform="capitalize">
                                      {calculation.breakdown.production_activity?.replace(
                                        /_/g,
                                        ' '
                                      )}
                                    </Text>
                                  </HStack>
                                  {/* Manual operations: show method instead of fuel (no fuel was used) */}
                                  {calculation.breakdown.manual_operation_detected ? (
                                    <>
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text color="blue.600">Method:</Text>
                                        <Text color="blue.800" fontWeight="medium">
                                          {calculation.breakdown.method_documented ||
                                            'Manual labor'}
                                        </Text>
                                      </HStack>
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text color="blue.600">Fuel/Equipment:</Text>
                                        <Text color="blue.800" fontStyle="italic">
                                          None (hand labor)
                                        </Text>
                                      </HStack>
                                    </>
                                  ) : (
                                    <HStack justify="space-between" fontSize="xs">
                                      <Text color="blue.600">
                                        {calculation.breakdown.fuel_type === 'electric'
                                          ? 'Energy Consumed:'
                                          : 'Fuel Consumed:'}
                                      </Text>
                                      <Text color="blue.800">
                                        {calculation.breakdown.fuel_type === 'electric'
                                          ? `${(
                                              calculation.breakdown.actual_kwh_consumed ??
                                              calculation.breakdown.kwh_consumed ??
                                              calculation.breakdown.actual_fuel_consumed_kWh ??
                                              0
                                            ).toFixed(1)} kWh`
                                          : calculation.breakdown.actual_fuel_consumed_gallons
                                          ? `${(
                                              calculation.breakdown.actual_fuel_consumed_gallons *
                                              3.78541
                                            ).toFixed(1)} liters`
                                          : `${(
                                              derivedHectares *
                                              (calculation.breakdown
                                                .usda_planting_factor_gallons_per_hectare ||
                                                calculation.breakdown
                                                  .usda_production_factor_gallons_per_hectare ||
                                                calculation.breakdown
                                                  .usda_harvesting_factor_gallons_per_hectare ||
                                                calculation.breakdown
                                                  .usda_transplanting_factor_gallons_per_hectare ||
                                                calculation.breakdown
                                                  .usda_thinning_factor_gallons_per_hectare ||
                                                calculation.breakdown
                                                  .usda_cultivation_factor_gallons_per_hectare ||
                                                0) *
                                              3.78541
                                            ).toFixed(1)} liters (estimated)`}
                                      </Text>
                                    </HStack>
                                  )}
                                  {/* Hide area lines for EM/PO events where area is not applicable */}
                                  {(calculation.original_area_treated > 0 ||
                                    calculation.breakdown.area_covered_acres > 0 ||
                                    (typeof calculation.breakdown.area_covered === 'number' &&
                                      calculation.breakdown.area_covered > 0)) && (
                                    <>
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text color="blue.600">Area Input:</Text>
                                        <Text color="blue.800">
                                          {calculation.original_area_treated?.toFixed(1) ||
                                            calculation.breakdown.area_covered_acres?.toFixed(1) ||
                                            calculation.breakdown.area_covered?.toFixed?.(1) ||
                                            'N/A'}{' '}
                                          {calculation.original_area_unit === 'ha'
                                            ? 'hectares'
                                            : calculation.original_area_unit === 'm2'
                                            ? 'm²'
                                            : 'acres'}
                                        </Text>
                                      </HStack>
                                      {calculation.original_area_unit !== 'ha' && (
                                        <HStack justify="space-between" fontSize="xs">
                                          <Text color="blue.500" fontStyle="italic">
                                            → Converted:
                                          </Text>
                                          <Text color="blue.700" fontStyle="italic">
                                            {derivedHectares ? derivedHectares.toFixed(1) : 'N/A'}{' '}
                                            hectares
                                          </Text>
                                        </HStack>
                                      )}
                                    </>
                                  )}
                                  {calculation.breakdown.equipment_hours > 0 && (
                                    <HStack justify="space-between" fontSize="xs">
                                      <Text color="blue.600">Equipment Hours:</Text>
                                      <Text color="blue.800">
                                        {calculation.breakdown.equipment_hours} hours
                                      </Text>
                                    </HStack>
                                  )}
                                </Box>
                              )}

                            {/* Input Summary - Irrigation Events (Electricity-based) */}
                            {calculation.breakdown?.water_volume_gallons && (
                              <Box
                                p={2}
                                bg="blue.50"
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor="blue.200"
                              >
                                <Text fontSize="xs" fontWeight="semibold" color="blue.700" mb={1}>
                                  Your Irrigation Activity:
                                </Text>
                                <HStack justify="space-between" fontSize="xs">
                                  <Text color="blue.600">Activity:</Text>
                                  <Text color="blue.800">
                                    Irrigation -{' '}
                                    {calculation.breakdown.fuel_type === 'electric'
                                      ? 'Electric pump'
                                      : 'Water application'}
                                  </Text>
                                </HStack>
                                <HStack justify="space-between" fontSize="xs">
                                  <Text color="blue.600">Water Applied:</Text>
                                  <Text color="blue.800">
                                    {calculation.breakdown.water_volume_gallons.toLocaleString()}{' '}
                                    gallons
                                  </Text>
                                </HStack>
                                <HStack justify="space-between" fontSize="xs">
                                  <Text color="blue.600">Energy Consumed:</Text>
                                  <Text color="blue.800">
                                    {(
                                      calculation.breakdown.actual_kwh_consumed ||
                                      calculation.breakdown.kwh_consumed
                                    )?.toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                                    kWh
                                  </Text>
                                </HStack>
                                {calculation.breakdown.water_source_label && (
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Water Source:</Text>
                                    <Text color="blue.800">
                                      {calculation.breakdown.water_source_label}
                                    </Text>
                                  </HStack>
                                )}
                              </Box>
                            )}

                            {/* Input Summary - Soil Management Events */}
                            {calculation.breakdown?.soil_activity && (
                              <Box
                                p={2}
                                bg="blue.50"
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor="blue.200"
                              >
                                <Text fontSize="xs" fontWeight="semibold" color="blue.700" mb={1}>
                                  Your Soil Management Activity:
                                </Text>
                                <HStack justify="space-between" fontSize="xs">
                                  <Text color="blue.600">Activity:</Text>
                                  <Text color="blue.800" textTransform="capitalize">
                                    {calculation.breakdown.soil_activity}
                                  </Text>
                                </HStack>
                                <HStack justify="space-between" fontSize="xs">
                                  <Text color="blue.600">Area Managed:</Text>
                                  <Text color="blue.800">
                                    {calculation.breakdown.area_managed?.toFixed(1) || 'N/A'}{' '}
                                    {calculation.breakdown.area_unit || 'acres'}
                                  </Text>
                                </HStack>
                                {calculation.breakdown.fuel_consumed > 0 && (
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Fuel Consumed:</Text>
                                    <Text color="blue.800">
                                      {calculation.breakdown.fuel_consumed}{' '}
                                      {calculation.breakdown.fuel_unit || 'L'}
                                    </Text>
                                  </HStack>
                                )}
                                {calculation.breakdown.equipment_hours > 0 && (
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Equipment Hours:</Text>
                                    <Text color="blue.800">
                                      {calculation.breakdown.equipment_hours} hours
                                    </Text>
                                  </HStack>
                                )}
                              </Box>
                            )}

                            {/* Input Summary - Pest Management Events (Sprint 3 Epic 3.1) */}
                            {calculation.breakdown?.pest_activity && (
                              <Box
                                p={2}
                                bg="blue.50"
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor="blue.200"
                              >
                                <Text fontSize="xs" fontWeight="semibold" color="blue.700" mb={1}>
                                  Your Pest Management Activity:
                                </Text>
                                <HStack justify="space-between" fontSize="xs">
                                  <Text color="blue.600">Activity:</Text>
                                  <Text color="blue.800" textTransform="capitalize">
                                    {calculation.breakdown.pest_activity?.replace(/_/g, ' ')}
                                  </Text>
                                </HStack>
                                {/* Management Type removed — redundant with Activity (both show same subtype) */}
                                {calculation.breakdown.area_covered > 0 && (
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Area Covered:</Text>
                                    <Text color="blue.800">
                                      {calculation.breakdown.area_covered}{' '}
                                      {calculation.breakdown.area_unit || 'acres'}
                                    </Text>
                                  </HStack>
                                )}
                                {calculation.breakdown.fuel_consumed > 0 && (
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">
                                      {calculation.breakdown.fuel_type === 'electric'
                                        ? 'Energy Used:'
                                        : 'Fuel Consumed:'}
                                    </Text>
                                    <Text color="blue.800">
                                      {calculation.breakdown.fuel_consumed}{' '}
                                      {calculation.breakdown.fuel_unit || 'L'}
                                    </Text>
                                  </HStack>
                                )}
                                {calculation.breakdown.fuel_type && (
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Fuel Type:</Text>
                                    <Text color="blue.800" textTransform="capitalize">
                                      {calculation.breakdown.fuel_type === 'electric'
                                        ? '⚡ Electric'
                                        : calculation.breakdown.fuel_type === 'diesel'
                                        ? '⛽ Diesel'
                                        : calculation.breakdown.fuel_type === 'gasoline'
                                        ? '⛽ Gasoline'
                                        : calculation.breakdown.fuel_type}
                                    </Text>
                                  </HStack>
                                )}
                                {calculation.breakdown.equipment_hours > 0 && (
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Equipment Hours:</Text>
                                    <Text color="blue.800">
                                      {calculation.breakdown.equipment_hours} hours
                                    </Text>
                                  </HStack>
                                )}
                                {calculation.breakdown.production_efficiency && (
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Efficiency:</Text>
                                    <Text
                                      color={
                                        calculation.breakdown.production_efficiency === 'high'
                                          ? 'green.600'
                                          : calculation.breakdown.production_efficiency === 'low'
                                          ? 'orange.600'
                                          : 'blue.800'
                                      }
                                      fontWeight={
                                        calculation.breakdown.production_efficiency === 'high'
                                          ? 'semibold'
                                          : 'normal'
                                      }
                                    >
                                      {calculation.breakdown.production_efficiency === 'high'
                                        ? '⚡ High Efficiency'
                                        : calculation.breakdown.production_efficiency === 'low'
                                        ? '⚠️ Low Efficiency'
                                        : '✓ Normal Efficiency'}
                                    </Text>
                                  </HStack>
                                )}
                              </Box>
                            )}

                            {/* Input Summary - Chemical Application Events */}
                            {calculation.breakdown &&
                              !calculation.breakdown.production_activity &&
                              !calculation.breakdown.soil_activity &&
                              !calculation.breakdown.pest_activity &&
                              !calculation.breakdown.water_volume_gallons && (
                                <Box
                                  p={2}
                                  bg="blue.50"
                                  borderRadius="md"
                                  borderWidth="1px"
                                  borderColor="blue.200"
                                >
                                  <Text fontSize="xs" fontWeight="semibold" color="blue.700" mb={1}>
                                    Your Application:
                                  </Text>
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">
                                      {['kg', 'lbs', 'oz'].includes(
                                        calculation.original_volume_unit || ''
                                      )
                                        ? 'Amount Applied:'
                                        : 'Volume Applied:'}
                                    </Text>
                                    <Text color="blue.800">
                                      {calculation.original_volume_applied &&
                                      calculation.original_volume_unit
                                        ? `${calculation.original_volume_applied} ${
                                            calculation.original_volume_unit === 'kg'
                                              ? 'kilograms'
                                              : calculation.original_volume_unit === 'L'
                                              ? 'liters'
                                              : calculation.original_volume_unit
                                          }`
                                        : `${
                                            calculation.breakdown?.volume_applied_liters || 'N/A'
                                          } liters`}
                                    </Text>
                                  </HStack>
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Area Treated:</Text>
                                    <Text color="blue.800">
                                      {calculation.original_area_treated &&
                                      calculation.original_area_unit
                                        ? `${calculation.original_area_treated} ${
                                            calculation.original_area_unit === 'ha'
                                              ? 'hectares'
                                              : calculation.original_area_unit === 'acres'
                                              ? 'acres'
                                              : calculation.original_area_unit
                                          }`
                                        : `${
                                            calculation.breakdown.area_treated_hectares || 'N/A'
                                          } hectares`}
                                    </Text>
                                  </HStack>
                                  <HStack justify="space-between" fontSize="xs">
                                    <Text color="blue.600">Application Method:</Text>
                                    <Text color="blue.800">
                                      {(calculation.breakdown.application_method || 'standard')
                                        .replace(/_/g, ' ')
                                        .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                    </Text>
                                  </HStack>
                                  {/* Display fuel consumption if provided */}
                                  {calculation.breakdown.application_fuel_gallons > 0 && (
                                    <>
                                      <HStack justify="space-between" fontSize="xs" mt={1}>
                                        <Text color="blue.600">Application Fuel:</Text>
                                        <Text color="blue.800">
                                          {calculation.breakdown.application_fuel_gallons.toFixed(
                                            1
                                          )}{' '}
                                          gallons
                                          {calculation.breakdown.application_fuel_liters && (
                                            <Text as="span" color="blue.500" fontStyle="italic">
                                              {' '}
                                              (
                                              {calculation.breakdown.application_fuel_liters.toFixed(
                                                1
                                              )}{' '}
                                              L)
                                            </Text>
                                          )}
                                        </Text>
                                      </HStack>
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text color="blue.600">Fuel Type:</Text>
                                        <Text color="blue.800" textTransform="capitalize">
                                          {calculation.breakdown.application_fuel_type || 'diesel'}
                                        </Text>
                                      </HStack>
                                    </>
                                  )}
                                </Box>
                              )}

                            {/* Nutrient Breakdown - ONLY show for fertilizers with actual NPK content */}
                            {/* SPRINT 6 FIX (2025-12-23): Don't show empty NPK box for pesticides/herbicides/fungicides */}
                            {calculation.breakdown?.npk_content &&
                              (calculation.breakdown.npk_content.N > 0 ||
                                calculation.breakdown.npk_content.P > 0 ||
                                calculation.breakdown.npk_content.K > 0) && (
                                <Box
                                  p={2}
                                  bg="green.50"
                                  borderRadius="md"
                                  borderWidth="1px"
                                  borderColor="green.200"
                                >
                                  <Text
                                    fontSize="xs"
                                    fontWeight="semibold"
                                    color="green.700"
                                    mb={1}
                                  >
                                    Nutrient Content:
                                  </Text>
                                  {calculation.breakdown.npk_content.N > 0 && (
                                    <HStack justify="space-between" fontSize="xs">
                                      <Text color="green.600">Nitrogen (N):</Text>
                                      <Text color="green.800">
                                        {calculation.breakdown.nitrogen_kg?.toFixed(1) || 'N/A'} kg
                                        applied
                                      </Text>
                                    </HStack>
                                  )}
                                  {calculation.breakdown.npk_content.P > 0 && (
                                    <HStack justify="space-between" fontSize="xs">
                                      <Text color="green.600">Phosphorus (P):</Text>
                                      <Text color="green.800">
                                        {calculation.breakdown.phosphorus_kg?.toFixed(1) || 'N/A'}{' '}
                                        kg applied
                                      </Text>
                                    </HStack>
                                  )}
                                  {calculation.breakdown.npk_content.K > 0 && (
                                    <HStack justify="space-between" fontSize="xs">
                                      <Text color="green.600">Potassium (K):</Text>
                                      <Text color="green.800">
                                        {calculation.breakdown.potassium_kg?.toFixed(1) || 'N/A'} kg
                                        applied
                                      </Text>
                                    </HStack>
                                  )}
                                </Box>
                              )}

                            {/* Emissions Sources */}
                            <Box
                              p={2}
                              bg="orange.50"
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor="orange.200"
                            >
                              <Text fontSize="xs" fontWeight="semibold" color="orange.700" mb={1}>
                                Emissions Sources:
                              </Text>

                              {/* Production Event Emissions */}
                              {/* Skip for electric irrigation — Irrigation Emissions section handles it */}
                              {calculation.breakdown?.production_activity &&
                                !(
                                  calculation.breakdown?.fuel_type === 'electric' &&
                                  calculation.breakdown?.water_volume_gallons
                                ) && (
                                  <VStack spacing={1} align="stretch">
                                    <HStack justify="space-between" fontSize="xs">
                                      <Text color="orange.600">
                                        {calculation.breakdown?.manual_operation_detected
                                          ? 'Manual Labor Estimate:'
                                          : calculation.breakdown?.fuel_type === 'electric'
                                          ? 'Electric Energy Emissions:'
                                          : 'Direct Fuel Combustion:'}
                                      </Text>
                                      <Text color="orange.800">{formattedCO2e} kg CO₂e</Text>
                                    </HStack>
                                    {calculation.breakdown?.manual_operation_detected ? (
                                      <>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • Method:{' '}
                                          {calculation.breakdown.method_documented ||
                                            'Manual operation'}
                                        </Text>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          •{' '}
                                          {calculation.breakdown.area_covered_acres?.toFixed(1) ||
                                            'N/A'}{' '}
                                          acres × 0.1 kg CO₂e/acre (hand-tool wear + worker
                                          logistics)
                                        </Text>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • No fuel combustion, no powered equipment
                                        </Text>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • Basis: Trazo Direct Operational Emissions (manual labor)
                                        </Text>
                                      </>
                                    ) : calculation.breakdown?.fuel_type === 'electric' ? (
                                      <>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          •{' '}
                                          {calculation.breakdown.actual_fuel_consumed_kWh?.toFixed(
                                            1
                                          ) || '0'}{' '}
                                          kWh ×{' '}
                                          {calculation.breakdown.electricity_emission_factor_kg_per_kwh?.toFixed(
                                            2
                                          ) || '0.39'}{' '}
                                          kg CO₂e/kWh
                                        </Text>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • EPA Factor:{' '}
                                          {calculation.breakdown.electricity_emission_factor_kg_per_kwh?.toFixed(
                                            2
                                          ) || '0.39'}{' '}
                                          kg CO₂e/kWh (EPA eGRID 2023)
                                        </Text>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • Source:{' '}
                                          {calculation.breakdown.calculation_basis
                                            ?.replace(/_/g, ' ')
                                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                                        </Text>
                                      </>
                                    ) : (
                                      <>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          •{' '}
                                          {calculation.breakdown.actual_fuel_consumed_gallons
                                            ? `${(
                                                calculation.breakdown.actual_fuel_consumed_gallons *
                                                3.78541
                                              ).toFixed(1)}L × ${(
                                                calculation.breakdown
                                                  .diesel_emission_factor_kg_per_gallon / 3.78541
                                              ).toFixed(2)} kg CO₂e/L`
                                            : `${(
                                                derivedHectares *
                                                (calculation.breakdown
                                                  .usda_planting_factor_gallons_per_hectare ||
                                                  calculation.breakdown
                                                    .usda_production_factor_gallons_per_hectare ||
                                                  calculation.breakdown
                                                    .usda_harvesting_factor_gallons_per_hectare ||
                                                  calculation.breakdown
                                                    .usda_transplanting_factor_gallons_per_hectare ||
                                                  calculation.breakdown
                                                    .usda_thinning_factor_gallons_per_hectare ||
                                                  calculation.breakdown
                                                    .usda_cultivation_factor_gallons_per_hectare ||
                                                  0) *
                                                3.78541
                                              ).toFixed(1)}L (USDA standard) × ${(
                                                calculation.breakdown
                                                  .diesel_emission_factor_kg_per_gallon / 3.78541
                                              ).toFixed(2)} kg CO₂e/L`}
                                        </Text>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • EPA Factor:{' '}
                                          {calculation.breakdown.diesel_emission_factor_kg_per_gallon?.toFixed(
                                            2
                                          )}{' '}
                                          kg CO₂e/gallon
                                        </Text>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • Conversion:{' '}
                                          {calculation.breakdown.diesel_emission_factor_kg_per_gallon?.toFixed(
                                            2
                                          )}{' '}
                                          ÷ 3.785 ={' '}
                                          {(
                                            calculation.breakdown
                                              .diesel_emission_factor_kg_per_gallon / 3.785
                                          ).toFixed(2)}{' '}
                                          kg CO₂e/L
                                        </Text>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • Source:{' '}
                                          {calculation.breakdown.calculation_basis
                                            ?.replace(/_/g, ' ')
                                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                                        </Text>
                                      </>
                                    )}
                                  </VStack>
                                )}

                              {/* Irrigation Event Emissions */}
                              {calculation.breakdown?.water_volume_gallons && (
                                <VStack spacing={1} align="stretch">
                                  {(() => {
                                    // Prefer the backend-computed pump-only emissions
                                    // (single source of truth). Fall back to kWh × factor
                                    // for older API responses without the new field.
                                    const kwh =
                                      calculation.breakdown.actual_kwh_consumed ||
                                      calculation.breakdown.kwh_consumed ||
                                      0;
                                    const elecFactor =
                                      calculation.breakdown
                                        .electricity_emission_factor_kg_per_kwh || 0;
                                    const pumpKg =
                                      calculation.breakdown.pump_electricity_emissions_kg ??
                                      kwh * elecFactor;
                                    return (
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text color="orange.600">Electricity for Pumping:</Text>
                                        <Text color="orange.800">
                                          {pumpKg.toLocaleString(undefined, {
                                            maximumFractionDigits: 1
                                          })}{' '}
                                          kg CO₂e
                                        </Text>
                                      </HStack>
                                    );
                                  })()}
                                  <Text fontSize="xs" color="orange.600" pl={2}>
                                    •{' '}
                                    {(
                                      calculation.breakdown.actual_kwh_consumed ||
                                      calculation.breakdown.kwh_consumed
                                    )?.toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                                    kWh ×{' '}
                                    {calculation.breakdown.electricity_emission_factor_kg_per_kwh?.toFixed(
                                      3
                                    )}{' '}
                                    kg CO₂e/kWh
                                  </Text>
                                  <Text fontSize="xs" color="orange.600" pl={2}>
                                    • Water pumped:{' '}
                                    {calculation.breakdown.water_volume_gallons.toLocaleString()}{' '}
                                    gallons
                                  </Text>
                                  {calculation.breakdown.pump_efficiency_kwh_per_1000_gallons && (
                                    <Text fontSize="xs" color="orange.600" pl={2}>
                                      • Pump efficiency:{' '}
                                      {calculation.breakdown.pump_efficiency_kwh_per_1000_gallons.toFixed(
                                        2
                                      )}{' '}
                                      kWh/1000 gallons
                                      {calculation.breakdown.water_source_label &&
                                        ` (${calculation.breakdown.water_source_label})`}
                                    </Text>
                                  )}
                                  {calculation.breakdown.actual_kwh_consumed && (
                                    <Text fontSize="xs" color="orange.600" pl={2}>
                                      • Basis: Actual farmer-reported electricity consumption
                                    </Text>
                                  )}
                                  <Text fontSize="xs" color="orange.600" pl={2}>
                                    • Source: EPA eGRID electricity emission factors
                                    {calculation.breakdown.pump_efficiency_kwh_per_1000_gallons
                                      ? ' + USDA NRCS pump efficiency'
                                      : ''}
                                  </Text>

                                  {/* Auxiliary diesel (service vehicle, generator, tractor)
                                      reported on top of the electric pump — 2026-04-10 fix */}
                                  {calculation.breakdown.auxiliary_diesel_emissions_kg != null &&
                                    calculation.breakdown.auxiliary_diesel_emissions_kg > 0 && (
                                      <>
                                        <HStack justify="space-between" fontSize="xs" pt={1}>
                                          <Text color="orange.600">Auxiliary Diesel Fuel:</Text>
                                          <Text color="orange.800">
                                            {calculation.breakdown.auxiliary_diesel_emissions_kg.toLocaleString(
                                              undefined,
                                              { maximumFractionDigits: 1 }
                                            )}{' '}
                                            kg CO₂e
                                          </Text>
                                        </HStack>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          •{' '}
                                          {calculation.breakdown.auxiliary_diesel_fuel_gallons?.toLocaleString(
                                            undefined,
                                            { maximumFractionDigits: 2 }
                                          )}{' '}
                                          gal ×{' '}
                                          {calculation.breakdown.auxiliary_diesel_emission_factor_kg_per_gallon?.toFixed(
                                            2
                                          )}{' '}
                                          kg CO₂e/gal (EPA)
                                        </Text>
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • Reported alongside electric pump — counted as auxiliary
                                          equipment (service vehicle, generator, or tractor).
                                        </Text>
                                      </>
                                    )}
                                </VStack>
                              )}

                              {/* Soil Management Event Emissions */}
                              {calculation.breakdown?.soil_activity && (
                                <VStack spacing={1} align="stretch">
                                  {calculation.breakdown.fuel_emissions > 0 && (
                                    <>
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text color="orange.600">Fuel Combustion:</Text>
                                        <Text color="orange.800">
                                          {calculation.breakdown.fuel_emissions.toFixed(2)} kg CO₂e
                                        </Text>
                                      </HStack>
                                      <Text fontSize="xs" color="orange.600" pl={2}>
                                        • {calculation.breakdown.fuel_consumed}{' '}
                                        {calculation.breakdown.fuel_unit} × EPA diesel factor
                                      </Text>
                                    </>
                                  )}
                                  {calculation.breakdown.area_emissions !== 0 && (
                                    <>
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text
                                          color={
                                            calculation.breakdown.area_emissions < 0
                                              ? 'green.600'
                                              : 'orange.600'
                                          }
                                        >
                                          {calculation.breakdown.area_emissions < 0
                                            ? 'Carbon Sequestration Credit:'
                                            : 'Area-Based Emissions:'}
                                        </Text>
                                        <Text
                                          color={
                                            calculation.breakdown.area_emissions < 0
                                              ? 'green.700'
                                              : 'orange.800'
                                          }
                                        >
                                          {calculation.breakdown.area_emissions.toFixed(2)} kg CO₂e
                                        </Text>
                                      </HStack>
                                      <Text
                                        fontSize="xs"
                                        color={
                                          calculation.breakdown.area_emissions < 0
                                            ? 'green.600'
                                            : 'orange.600'
                                        }
                                        pl={2}
                                      >
                                        • {calculation.breakdown.area_managed?.toFixed(1)}{' '}
                                        {calculation.breakdown.area_unit || 'acres'} ×{' '}
                                        {calculation.breakdown.emission_factor?.toFixed(2)} kg CO₂e/
                                        {calculation.breakdown.area_unit || 'acre'}
                                        {calculation.breakdown.area_emissions < 0 &&
                                          ' (composting sequesters carbon)'}
                                      </Text>
                                    </>
                                  )}
                                  <Text fontSize="xs" color="orange.600" pl={2}>
                                    • Total: {calculation.breakdown.total_impact?.toFixed(2)} kg
                                    CO₂e
                                  </Text>
                                </VStack>
                              )}

                              {/* Pest Management Event Emissions (Sprint 3 Epic 3.1) */}
                              {calculation.breakdown?.pest_activity && (
                                <VStack spacing={1} align="stretch">
                                  {calculation.breakdown.fuel_consumed > 0 && (
                                    <>
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text color="orange.600">
                                          {calculation.breakdown.fuel_type === 'electric'
                                            ? 'Electricity Emissions:'
                                            : 'Fuel Combustion:'}
                                        </Text>
                                        <Text color="orange.800">
                                          {calculation.breakdown.fuel_emissions?.toFixed(1) ||
                                            formattedCO2e}{' '}
                                          kg CO₂e
                                        </Text>
                                      </HStack>
                                      <Text fontSize="xs" color="orange.600" pl={2}>
                                        • {calculation.breakdown.fuel_consumed}{' '}
                                        {calculation.breakdown.fuel_unit || 'L'} ×{' '}
                                        {calculation.breakdown.fuel_type === 'electric'
                                          ? 'EPA eGRID factor'
                                          : 'EPA diesel factor'}
                                      </Text>
                                      {calculation.breakdown.fuel_type && (
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • Fuel type:{' '}
                                          {calculation.breakdown.fuel_type === 'electric'
                                            ? 'Electric (0.39 kg CO₂e/kWh)'
                                            : calculation.breakdown.fuel_type === 'diesel'
                                            ? 'Diesel (2.70 kg CO₂e/L)'
                                            : calculation.breakdown.fuel_type === 'gasoline'
                                            ? 'Gasoline (2.32 kg CO₂e/L)'
                                            : calculation.breakdown.fuel_type === 'natural_gas'
                                            ? 'Natural Gas (1.92 kg CO₂e/m³)'
                                            : calculation.breakdown.fuel_type === 'propane'
                                            ? 'LPG / Propane (1.51 kg CO₂e/L)'
                                            : calculation.breakdown.fuel_type === 'biodiesel'
                                            ? 'Biodiesel (2.31 kg CO₂e/L)'
                                            : calculation.breakdown.fuel_type}
                                        </Text>
                                      )}
                                    </>
                                  )}
                                  {calculation.breakdown.area_covered > 0 && (
                                    <Text fontSize="xs" color="orange.600" pl={2}>
                                      • Area covered: {calculation.breakdown.area_covered}{' '}
                                      {calculation.breakdown.area_unit || 'acres'}
                                    </Text>
                                  )}
                                  {calculation.breakdown.equipment_hours > 0 && (
                                    <Text fontSize="xs" color="orange.600" pl={2}>
                                      • Equipment hours: {calculation.breakdown.equipment_hours}h
                                    </Text>
                                  )}
                                  <Text fontSize="xs" color="orange.600" pl={2}>
                                    • Source: EPA GHG Emission Factors Hub
                                  </Text>
                                  {calculation.breakdown.production_efficiency === 'high' && (
                                    <Text
                                      fontSize="xs"
                                      color="green.600"
                                      pl={2}
                                      fontWeight="semibold"
                                    >
                                      ⚡ High efficiency operation reduces emissions
                                    </Text>
                                  )}
                                </VStack>
                              )}

                              {/* Chemical Application Emissions */}
                              {!calculation.breakdown?.production_activity &&
                                !calculation.breakdown?.soil_activity &&
                                !calculation.breakdown?.pest_activity &&
                                !calculation.breakdown?.water_volume_gallons && (
                                  <VStack spacing={1} align="stretch">
                                    {/* Active Ingredient & Emission Factor Details (2025-12-24) */}
                                    {calculation.breakdown?.active_ingredient_percentage !=
                                      null && (
                                      <>
                                        {/* Chemical Subtype with organic/biological indicator */}
                                        {(() => {
                                          const subtype =
                                            calculation.breakdown.chemical_subtype_used ||
                                            calculation.breakdown.pesticide_subtype ||
                                            calculation.breakdown.herbicide_subtype ||
                                            calculation.breakdown.fungicide_subtype ||
                                            'synthetic';
                                          const isOrganic = subtype
                                            ?.toLowerCase()
                                            .includes('organic');
                                          const isBiological = subtype
                                            ?.toLowerCase()
                                            .includes('biological');
                                          const isEcoFriendly = isOrganic || isBiological;

                                          return (
                                            <>
                                              <HStack justify="space-between" fontSize="xs">
                                                <Text color="orange.600">Chemical Type:</Text>
                                                <Text
                                                  color={isEcoFriendly ? 'green.600' : 'orange.800'}
                                                  fontWeight={isEcoFriendly ? 'semibold' : 'normal'}
                                                  textTransform="capitalize"
                                                >
                                                  {subtype.replace('_', ' ')}
                                                  {isOrganic && ' 🌱'}
                                                  {isBiological && ' 🦠'}
                                                </Text>
                                              </HStack>
                                              {calculation.breakdown.note && isEcoFriendly && (
                                                <Text
                                                  fontSize="xs"
                                                  color="green.600"
                                                  fontStyle="italic"
                                                  pl={2}
                                                >
                                                  💡 {calculation.breakdown.note}
                                                </Text>
                                              )}
                                            </>
                                          );
                                        })()}
                                        <HStack justify="space-between" fontSize="xs">
                                          <Text color="orange.600">Active Ingredient:</Text>
                                          <Text color="orange.800">
                                            {calculation.breakdown.active_ingredient_percentage}%
                                            {calculation.breakdown.concentration_source ===
                                              'default' && (
                                              <Text as="span" color="orange.500" fontStyle="italic">
                                                {' '}
                                                (default)
                                              </Text>
                                            )}
                                          </Text>
                                        </HStack>
                                        {calculation.breakdown.active_ingredient_kg != null && (
                                          <HStack justify="space-between" fontSize="xs">
                                            <Text color="orange.600">
                                              Active Ingredient Amount:
                                            </Text>
                                            <Text color="orange.800">
                                              {calculation.breakdown.active_ingredient_kg.toFixed(
                                                3
                                              )}{' '}
                                              kg
                                            </Text>
                                          </HStack>
                                        )}
                                        {calculation.breakdown.emission_factor_kg_co2_per_kg !=
                                          null && (
                                          <HStack justify="space-between" fontSize="xs">
                                            <Text color="orange.600">Emission Factor:</Text>
                                            <Text color="orange.800">
                                              {calculation.breakdown.emission_factor_kg_co2_per_kg.toFixed(
                                                2
                                              )}{' '}
                                              kg CO₂e/kg
                                            </Text>
                                          </HStack>
                                        )}
                                      </>
                                    )}

                                    {/* Fertilizer Type Details (2025-12-24) */}
                                    {calculation.breakdown?.fertilizer_subtype && (
                                      <>
                                        <HStack justify="space-between" fontSize="xs">
                                          <Text color="orange.600">Fertilizer Type:</Text>
                                          <Text
                                            color={
                                              calculation.breakdown.fertilizer_subtype === 'organic'
                                                ? 'green.600'
                                                : 'orange.800'
                                            }
                                            fontWeight={
                                              calculation.breakdown.fertilizer_subtype === 'organic'
                                                ? 'semibold'
                                                : 'normal'
                                            }
                                            textTransform="capitalize"
                                          >
                                            {calculation.breakdown.fertilizer_subtype ===
                                            'slow_release'
                                              ? 'Slow Release'
                                              : calculation.breakdown.fertilizer_subtype}
                                            {calculation.breakdown.fertilizer_subtype ===
                                              'organic' && ' 🌱'}
                                          </Text>
                                        </HStack>
                                        {calculation.breakdown.emission_factor_kg_co2_per_kg !=
                                          null && (
                                          <HStack justify="space-between" fontSize="xs">
                                            <Text color="orange.600">Emission Factor:</Text>
                                            <Text color="orange.800">
                                              {calculation.breakdown.emission_factor_kg_co2_per_kg.toFixed(
                                                2
                                              )}{' '}
                                              kg CO₂e/kg
                                            </Text>
                                          </HStack>
                                        )}
                                        {calculation.breakdown.note && (
                                          <Text
                                            fontSize="xs"
                                            color="green.600"
                                            fontStyle="italic"
                                            pl={2}
                                          >
                                            💡 {calculation.breakdown.note}
                                          </Text>
                                        )}
                                      </>
                                    )}

                                    {(calculation.breakdown?.manufacturing_emissions_kg_co2e ?? 0) >
                                      0 && (
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text color="orange.600">Manufacturing:</Text>
                                        <Text color="orange.800">
                                          {calculation.breakdown.manufacturing_emissions_kg_co2e.toFixed(
                                            1
                                          )}{' '}
                                          kg CO₂e
                                        </Text>
                                      </HStack>
                                    )}
                                    {(calculation.breakdown?.application_emissions_kg_co2e ?? 0) >
                                      0 && (
                                      <>
                                        <HStack justify="space-between" fontSize="xs">
                                          <Text color="orange.600">Application Equipment:</Text>
                                          <Text color="orange.800">
                                            {calculation.breakdown.application_emissions_kg_co2e.toFixed(
                                              1
                                            )}{' '}
                                            kg CO₂e
                                          </Text>
                                        </HStack>
                                        {/* Show calculation formula when fuel data is available.
                                            The stored factor is the one actually applied (gasoline 8.78,
                                            biodiesel 8.76, propane 5.66, etc.) — always self-consistent
                                            with the emissions total shown above.
                                            Only render when the factor's native unit is gallons so the
                                            "X gal × Y kg CO₂e/gal" label is mathematically correct; for
                                            kWh / cubic-feet fuels (electric, natural gas), the formula
                                            line is suppressed to avoid unit mismatch. */}
                                        {calculation.breakdown.application_fuel_gallons > 0 &&
                                          (calculation.breakdown.epa_fuel_factor_unit == null ||
                                            calculation.breakdown.epa_fuel_factor_unit === 'gal') && (
                                            <Text fontSize="xs" color="orange.600" pl={2}>
                                              •{' '}
                                              {calculation.breakdown.application_fuel_gallons.toFixed(
                                                1
                                              )}{' '}
                                              gal ×{' '}
                                              {(() => {
                                                const factor =
                                                  calculation.breakdown
                                                    .epa_fuel_factor_kg_co2_per_unit ??
                                                  calculation.breakdown
                                                    .epa_diesel_factor_kg_co2_per_gallon;
                                                if (factor != null) return factor.toFixed(2);
                                                const gallons =
                                                  calculation.breakdown.application_fuel_gallons;
                                                const emissions =
                                                  calculation.breakdown
                                                    .application_emissions_kg_co2e ?? 0;
                                                return gallons > 0
                                                  ? (emissions / gallons).toFixed(2)
                                                  : '';
                                              })()}{' '}
                                              kg CO₂e/gal (EPA factor)
                                            </Text>
                                          )}
                                      </>
                                    )}
                                  </VStack>
                                )}
                            </Box>

                            {/* USDA Standards Note */}
                            <Box
                              p={2}
                              bg="gray.50"
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor="gray.200"
                            >
                              <HStack spacing={2}>
                                <Icon as={FaCheckCircle} color="green.500" boxSize={3} />
                                <VStack spacing={0} align="start" flex={1}>
                                  <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                                    {intl.formatMessage({ id: 'carbon.badge.epaUsdaSourced' })}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    {intl.formatMessage({ id: 'carbon.badge.epaUsdaTooltip' })}
                                  </Text>
                                </VStack>
                              </HStack>
                            </Box>
                          </VStack>
                        </VStack>
                      );
                    })()}
                </Box>
              </>
            )}

            {/* Efficiency Progress Bar */}
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" color="gray.500">
                  Application Efficiency
                </Text>
                <Text fontSize="xs" color={textColor}>
                  {Math.round(calculation.efficiency_score)}%
                </Text>
              </HStack>
              <Progress
                value={calculation.efficiency_score}
                colorScheme={efficiencyColor}
                size="sm"
                borderRadius="md"
              />
            </Box>
          </VStack>
        </CardBody>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    // Only re-render if calculation data or isCalculating state actually changes
    return (
      prevProps.isCalculating === nextProps.isCalculating &&
      prevProps.calculation?.co2e === nextProps.calculation?.co2e &&
      prevProps.calculation?.efficiency_score === nextProps.calculation?.efficiency_score &&
      prevProps.calculation?.usda_factors_used === nextProps.calculation?.usda_factors_used &&
      JSON.stringify(prevProps.calculation?.recommendations) ===
        JSON.stringify(nextProps.calculation?.recommendations) &&
      JSON.stringify(prevProps.calculation?.cost_analysis) ===
        JSON.stringify(nextProps.calculation?.cost_analysis) &&
      JSON.stringify(prevProps.calculation?.breakdown) ===
        JSON.stringify(nextProps.calculation?.breakdown)
    );
  }
);
