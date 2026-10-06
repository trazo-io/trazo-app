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
  useColorModeValue,
  Spinner,
  Tooltip,
  Heading,
  Flex,
  Divider
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { StandardAlert } from 'components/Design/StandardComponents';
import { FaLeaf, FaDollarSign, FaLightbulb, FaCheckCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import {
  formatCO2e as formatCO2eUtil,
  getImpactLevel as getImpactLevelUtil
} from '../../utils/carbonDisplayUtils';
import { isNotEstimated } from 'utils/carbonStatus';

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
    /**
     * Whether the fuel figure driving this number was MEASURED or ASSUMED, written by
     * every area-based production activity (see `_annotate_fuel_basis` in
     * carbon/services/verified_emission_factors.py).
     *
     * Read this instead of probing for a `usda_<verb>_factor_gallons_per_hectare` key.
     * That key chain was hand-written per activity and cultivation names its factor
     * differently, so it fell through to 0 and this panel printed "0.0 liters (estimated)"
     * for every cultivation event.
     */
    fuel_basis?: {
      measured: boolean;
      /** The factor that actually produced the number — see `assumed_fuel_is_diesel`. */
      emission_factor: {
        value: number;
        unit: string;
        source: string;
        provenance: 'published' | 'internal_estimate';
      };
      /**
       * True when the operator picked a non-diesel fuel (electric, gasoline…) but entered no
       * amount: the calculators substitute a diesel gal/hectare rate regardless of fuel type,
       * so the figure is diesel-derived. Known backend methodology gap — surfaced rather than
       * hidden, because otherwise the panel would describe an electric machine's emissions
       * using a factor that never ran.
       */
      assumed_fuel_is_diesel: boolean;
      /** Present only when we substituted a rate for fuel the operator did not enter. */
      assumed_rate: {
        value: number;
        unit: string;
        source: string;
        provenance: 'published' | 'internal_estimate';
        confidence_level: number;
      } | null;
    };
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
    /** kWh echoed back when the operator entered energy use (electric path). */
    actual_fuel_consumed_kWh?: number;
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
  /**
   * Focus the fuel input this panel is describing. Supplied only where the panel renders
   * beside that input, which is the whole reason it moved out of the sidebar: when fuel
   * was left blank we substitute a national average, and the single most useful thing the
   * panel can offer is a one-click path to replacing that guess with a real reading.
   */
  onEnterActualFuel?: () => void;
}

export const CarbonImpactPreview: React.FC<CarbonImpactPreviewProps> = memo(
  ({ eventType, formData, calculation, isCalculating = false, onEnterActualFuel }) => {
    const intl = useIntl();
    const bgColor = useColorModeValue('gray.50', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const textColor = useColorModeValue('gray.800', 'white');

    const [showDetails, setShowDetails] = useState(false);

    // Use shared utility functions (from carbonDisplayUtils.ts)
    const getImpactLevel = getImpactLevelUtil;
    const formatCO2e = formatCO2eUtil;

    // Memoized calculations to prevent recalculation unless calculation changes
    const { impactLevel, formattedCO2e } = useMemo(() => {
      // A not-estimated preview carries no figure (run 8): nothing to grade or format.
      if (!calculation || calculation.co2e == null)
        return { impactLevel: null, formattedCO2e: null };

      return {
        impactLevel: getImpactLevel(calculation.co2e),
        formattedCO2e: formatCO2e(calculation.co2e)
      };
    }, [calculation, getImpactLevel, formatCO2e]);

    /**
     * Measured-vs-assumed, straight from the backend. Everything this panel claims about
     * provenance keys off this one object rather than inspecting `source` prose or
     * guessing from which breakdown keys happen to be populated.
     */
    const fuelBasis = calculation?.breakdown?.fuel_basis;

    /**
     * Whether a published factor DEMONSTRABLY ran, rather than whether the response says so.
     *
     * `usda_factors_used` is hardcoded `True` for every production event in
     * `carbon/views.py`, and `calculation_method` reads
     * "verified_epa_usda_factors_with_electric_support" even for pruning and canopy
     * management — whose figure is a Trazo 0.1 kg/acre manual-labour estimate computed
     * without touching an EPA factor at all. Trusting either one put a citation badge on a
     * number with no citation behind it.
     *
     * Evidence is: a `fuel_basis` whose factor is labelled published, or an explicit factor
     * value in the breakdown (irrigation's eGRID electricity, the diesel combustion factor).
     * Absent both, the panel says nothing about sourcing — the same fail-safe direction as
     * `provenance` defaulting to `internal_estimate`.
     */
    const hasPublishedFactorEvidence = Boolean(
      fuelBasis?.emission_factor?.provenance === 'published' ||
        calculation?.breakdown?.diesel_emission_factor_kg_per_gallon ||
        calculation?.breakdown?.electricity_emission_factor_kg_per_kwh
    );

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

              <StandardAlert
                status="info"
                title="Transparency Focus"
                description="This event becomes part of the record your certifier reviews at renewal. A carbon estimate is added once there is enough detail to compute one."
              />
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
              <Spinner size="sm" color="green.700" thickness="3px" />
              <Text fontSize="sm" color={textColor}>
                Calculating carbon impact...
              </Text>
            </HStack>
          </CardBody>
        </Card>
      );
    }

    if (!calculation) return null;

    // Run 8 (R8-04): the record holds nothing to count from. The save stores no figure, so the
    // preview shows none either: "Not estimated", never 0 (the saved/preview mismatch Astra saw).
    if (isNotEstimated(calculation)) {
      return (
        <Card bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <HStack spacing={2} align="start">
              <Icon as={FaLeaf} color="gray.500" boxSize={4} mt={1} />
              <VStack spacing={1} align="start">
                <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                  {intl.formatMessage({ id: 'carbon.notEstimated' })}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {intl.formatMessage({ id: 'carbon.notEstimatedHint' })}
                </Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>
      );
    }

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
        ? // Every one of these named the transparency SCORE, which was retired as a producer
          // surface, and several also promised "the consumer story" — on a panel that renders
          // beside the certifier record on every form. Each now says what the record is FOR.
          'Pollination is a biological service — no fuel burned, so no direct emissions. Hive counts and placement dates evidence the § 205.200 biodiversity practices your OSP describes.'
        : isScouting
        ? 'Scouting is observational, so it produces no direct emissions. It is also the record § 205.206(e) rests on: a National List substance is permitted only where prevention proved insufficient.'
        : isIPM
        ? 'Biological control and beneficial releases produce no direct emissions. They are the § 205.206(a)–(d) practices a certifier expects to see tried before any substance is applied.'
        : isBusiness
        ? 'Certifications, inspections and audits produce no direct emissions. Their dates and certificate numbers are what your certifier asks for at renewal.'
        : isGeneral
        ? 'General farm work produces no direct emissions. It still belongs in the record — § 205.103(b)(1) asks for records adapted to the particular business you run.'
        : isWeather
        ? 'Weather events produce no emissions. They explain the gaps in a season when your certifier reads back through the record.'
        : 'This event produces no direct emissions. It still forms part of the record your certifier reviews at renewal.';

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
                {/* "Efficiency Score 100/100" stood here. It was a grade Trazo assigned to
                    the farmer's work, on a scale nothing on screen explained, and it read
                    as an achievement for events that simply burn no fuel — scouting scored
                    100 for being observational. Same self-graded-number class as the
                    producer transparency score, retired for the same reason. */}
              </HStack>
              {/*
                Was a raw `<Alert status={isPollination ? 'success' : 'info'} size="sm">`.
                Three things were wrong with it:
                  - `status="success"` bought a green box for copy that reports no success —
                    the same abuse removed from the OSP wizard. Zero emissions is a property
                    of the event type, not an achievement.
                  - `size="sm"` is not an Alert prop (Alert has status/variant only), so it
                    was inert; the shrinking came from `<AlertIcon boxSize={3} />`.
                  - AlertTitle/AlertDescription carry Chakra's `lineHeight: "6"` — an
                    ABSOLUTE 24px. Against `fontSize="xs"` (12px) that is double leading,
                    which is why this block rendered with gaping line spacing.
                StandardAlert renders plain `Text`, so it escapes that line-height entirely.
              */}
              <StandardAlert
                status="info"
                title={
                  isPollination
                    ? 'Zero-Emission Biological Service'
                    : 'Why this is still worth logging'
                }
                description={transparencyMessage}
              />
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
            {/* The badge answers "is this number yours or ours?", and it has to have two
                answers. One "EPA/USDA-sourced" badge used to sit over the whole card even
                when the fuel quantity underneath it was a Trazo per-hectare default —
                the EPA combustion factor is genuinely published, the fuel figure it
                multiplies was not, and a single badge let the citable half vouch for the
                other. Driven by the typed `fuel_basis.measured`, never by parsing a
                source string. */}
            {hasPublishedFactorEvidence &&
              (fuelBasis && !fuelBasis.measured ? (
                <Tooltip label={intl.formatMessage({ id: 'carbon.badge.estimatedFuelTooltip' })}>
                  <Badge colorScheme="gray" size="sm">
                    <Text fontSize="xs">
                      {intl.formatMessage({ id: 'carbon.badge.estimatedFuel' })}
                    </Text>
                  </Badge>
                </Tooltip>
              ) : (
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
              ))}
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
                    // status="info", not "success": this annotates how the calculation was
                    // done, it does not report that anything succeeded. Same rule that took
                    // the green off the OSP education blocks.
                    <StandardAlert
                      status="info"
                      description={`${
                        elecSrc === 'solar' ? 'Solar' : 'Wind'
                      }-powered pump — near-zero pump emissions. Only water delivery carbon is counted.`}
                    />
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
                    <StandardAlert
                      status="info"
                      description="Fertigation mode — application fuel excluded from carbon calculation to avoid double-counting with your irrigation events."
                    />
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
                {/* "Carbon footprint estimate" implied a full LCA. This is Scope 1 only —
                    direct operational emissions the farmer controls (carbon-methodology.md). */}
                <Text fontSize="xs" color="gray.500">
                  Direct operational emissions
                </Text>
              </VStack>
              {/* Efficiency Score /100 removed here too — see the zero-emission variant above. */}
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
                    // Rich body, so it rides `children` rather than the string `description`.
                    <StandardAlert
                      key={index}
                      status="info"
                      title={rec.title || rec.message || 'USDA Best Practice'}>
                      <Text fontSize="sm">
                        {rec.potential_savings && rec.carbon_reduction ? (
                          <>
                            Save ${rec.potential_savings} • Reduce {rec.carbon_reduction.toFixed(1)}{' '}
                            kg CO₂e
                          </>
                        ) : (
                          <>
                            Transparency Impact: {rec.impact || 'High'} • Source:{' '}
                            {rec.source?.replace('EPA', 'USDA') || 'USDA'}
                          </>
                        )}
                      </Text>
                    </StandardAlert>
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
                    _hover={{ textDecoration: 'underline' }}>
                    {/* Was "USDA calculation details". The details are Trazo's arithmetic
                        over a mix of published factors and our own defaults, so naming USDA
                        in the affordance itself pre-certified everything behind it. */}
                    {showDetails
                      ? intl.formatMessage({ id: 'carbon.details.hide' })
                      : intl.formatMessage({ id: 'carbon.details.show' })}
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
                                  borderColor="blue.200">
                                  {/* "You told us" — and it must contain ONLY that. The
                                      heading used to read "Your Production Activity" over a
                                      block whose fuel row was frequently a Trazo default,
                                      so the possessive was doing work it had not earned.
                                      Anything we substituted now lives in its own block
                                      below, headed "We assumed". */}
                                  <Text fontSize="xs" fontWeight="semibold" color="blue.700" mb={1}>
                                    You told us:
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
                                    /* Fuel appears under "You told us" ONLY if they told us.
                                       This row used to fall back to hectares × a per-hectare
                                       default and label it "(estimated)" in the same grey as
                                       every measured value — one parenthetical carrying the
                                       whole distinction between a reading and a guess. When
                                       fuel is absent the row is simply not here; the
                                       substitution is declared in its own block below. */
                                    /* Boolean(): `actual_fuel_consumed_gallons` is a NUMBER,
                                       and `0` is a value an operator can legitimately enter.
                                       Left bare, `(… || 0) && <JSX>` evaluates to `0`, which
                                       React renders as a literal "0" floating in the card. */
                                    /* An unconditional pass for `fuel_type === 'electric'`
                                       printed "Energy used: 0.0 kWh" under a heading that
                                       promises only what the operator told us — for an
                                       electric machine with nothing entered, that row was
                                       reporting our own blank back at them as a reading. The
                                       row now requires an actual figure from either path. */
                                    Boolean(
                                      fuelBasis?.measured ||
                                        calculation.breakdown.actual_fuel_consumed_gallons ||
                                        calculation.breakdown.actual_kwh_consumed ||
                                        calculation.breakdown.kwh_consumed ||
                                        calculation.breakdown.actual_fuel_consumed_kWh
                                    ) && (
                                      <HStack justify="space-between" fontSize="xs">
                                        <Text color="blue.600">
                                          {calculation.breakdown.fuel_type === 'electric'
                                            ? 'Energy used:'
                                            : 'Fuel used:'}
                                        </Text>
                                        <Text color="blue.800">
                                          {calculation.breakdown.fuel_type === 'electric'
                                            ? `${(
                                                calculation.breakdown.actual_kwh_consumed ??
                                                calculation.breakdown.kwh_consumed ??
                                                calculation.breakdown.actual_fuel_consumed_kWh ??
                                                0
                                              ).toFixed(1)} kWh`
                                            : `${(
                                                (calculation.breakdown
                                                  .actual_fuel_consumed_gallons || 0) * 3.78541
                                              ).toFixed(1)} liters`}
                                        </Text>
                                      </HStack>
                                    )
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

                            {/* "We assumed" — the substitution, stated as a substitution.
                                A default that changes the headline number deserves its own
                                heading, its own colour, and a way out. `variant="warning"`
                                territory rather than a green or blue tint: this is not an
                                achievement and not a neutral fact, it is a gap in the
                                record that the operator alone can close. */}
                            {fuelBasis?.assumed_rate && (
                              /* StandardAlert status="warning" rather than a hand-rolled
                                 amber tint: the theme's amber ramp tops out at #E65100, so
                                 amber.900 on an amber.50 ground measures 3.57:1 and fails
                                 AA for body text. The alert's warning pair clears it, and
                                 "warning" is the honest status — an assumed input is a gap
                                 in the record, not an error and not a neutral fact. */
                              <StandardAlert
                                status="warning"
                                title={intl.formatMessage({ id: 'carbon.assumedFuel.title' })}
                                description={intl.formatMessage(
                                  {
                                    // A non-diesel machine with nothing entered is costed in
                                    // DIESEL — saying "a US average for this activity" there
                                    // would hide which fuel we actually priced.
                                    id: fuelBasis.assumed_fuel_is_diesel
                                      ? 'carbon.assumedFuel.explainDieselSubstitute'
                                      : 'carbon.assumedFuel.explain'
                                  },
                                  { rate: fuelBasis.assumed_rate.value }
                                )}>
                                {onEnterActualFuel && (
                                  <Text
                                    as="button"
                                    type="button"
                                    fontSize="sm"
                                    fontWeight="semibold"
                                    color="green.700"
                                    textDecoration="underline"
                                    onClick={onEnterActualFuel}
                                    _hover={{ color: 'green.800' }}>
                                    {intl.formatMessage({ id: 'carbon.assumedFuel.cta' })}
                                  </Text>
                                )}
                              </StandardAlert>
                            )}

                            {/* Input Summary - Irrigation Events (Electricity-based) */}
                            {Boolean(calculation.breakdown?.water_volume_gallons) && (
                              <Box
                                p={2}
                                bg="blue.50"
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor="blue.200">
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
                                borderColor="blue.200">
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
                                borderColor="blue.200">
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
                                        ? 'Electric'
                                        : calculation.breakdown.fuel_type === 'diesel'
                                        ? 'Diesel'
                                        : calculation.breakdown.fuel_type === 'gasoline'
                                        ? 'Gasoline'
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
                                      }>
                                      {calculation.breakdown.production_efficiency === 'high'
                                        ? 'High Efficiency'
                                        : calculation.breakdown.production_efficiency === 'low'
                                        ? 'Low Efficiency'
                                        : 'Normal Efficiency'}
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
                                  borderColor="blue.200">
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
                                          {Boolean(
                                            calculation.breakdown.application_fuel_liters
                                          ) && (
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
                                  borderColor="green.200">
                                  <Text
                                    fontSize="xs"
                                    fontWeight="semibold"
                                    color="green.700"
                                    mb={1}>
                                    Nutrient Content:
                                  </Text>
                                  {calculation.breakdown.npk_content.N > 0 && (
                                    <HStack justify="space-between" fontSize="xs">
                                      <Text color="green.700">Nitrogen (N):</Text>
                                      <Text color="green.800">
                                        {calculation.breakdown.nitrogen_kg?.toFixed(1) || 'N/A'} kg
                                        applied
                                      </Text>
                                    </HStack>
                                  )}
                                  {calculation.breakdown.npk_content.P > 0 && (
                                    <HStack justify="space-between" fontSize="xs">
                                      <Text color="green.700">Phosphorus (P):</Text>
                                      <Text color="green.800">
                                        {calculation.breakdown.phosphorus_kg?.toFixed(1) || 'N/A'}{' '}
                                        kg applied
                                      </Text>
                                    </HStack>
                                  )}
                                  {calculation.breakdown.npk_content.K > 0 && (
                                    <HStack justify="space-between" fontSize="xs">
                                      <Text color="green.700">Potassium (K):</Text>
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
                              borderColor="orange.200">
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
                                        {/* `!assumed_fuel_is_diesel` on the electric test for
                                            the same reason as the body below: a diesel-costed
                                            event must not be labelled "Electric Energy
                                            Emissions" over a line reading "1.7L × 2.70". */}
                                        {calculation.breakdown?.manual_operation_detected
                                          ? 'Manual Labor Estimate:'
                                          : calculation.breakdown?.fuel_type === 'electric' &&
                                            !fuelBasis?.assumed_fuel_is_diesel
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
                                    ) : /* `!assumed_fuel_is_diesel`: an electric machine with
                                          no kWh entered is costed in DIESEL by the backend,
                                          so this branch used to print "0.0 kWh × 0.39"
                                          directly beneath a 4.5 kg total — the arithmetic on
                                          screen did not reach the number above it. Those
                                          events fall through to the combustion branch, which
                                          shows the litres and factor that actually ran. */
                                    calculation.breakdown?.fuel_type === 'electric' &&
                                      !fuelBasis?.assumed_fuel_is_diesel ? (
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
                                          • EPA factor:{' '}
                                          {calculation.breakdown.electricity_emission_factor_kg_per_kwh?.toFixed(
                                            2
                                          ) || '0.39'}{' '}
                                          kg CO₂e/kWh (EPA eGRID 2023)
                                        </Text>
                                        {/* `calculation_basis` title-cased was rendered here
                                            as "Source:". It is an internal enum, not a
                                            reference — see the diesel branch below. */}
                                      </>
                                    ) : (
                                      <>
                                        {/* The multiplication, in the units the operator
                                            entered. `fuel_basis` supplies the assumed rate
                                            when fuel was blank, replacing a six-deep
                                            `usda_<verb>_factor_gallons_per_hectare` chain
                                            that cultivation never matched — it fell through
                                            to 0 and this line read "0.0L × 2.70". */}
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          •{' '}
                                          {(() => {
                                            // `fuel_basis.emission_factor` FIRST: it is the
                                            // factor the backend actually multiplied by. The
                                            // breakdown key is written only on the
                                            // non-electric path, so a diesel-substituted
                                            // electric event has nothing there and this line
                                            // would read "0.0L × 0.00".
                                            const kgPerGal =
                                              fuelBasis?.emission_factor?.value ??
                                              calculation.breakdown
                                                .diesel_emission_factor_kg_per_gallon ??
                                              0;
                                            const gallons =
                                              calculation.breakdown.actual_fuel_consumed_gallons ??
                                              derivedHectares *
                                                (fuelBasis?.assumed_rate?.value || 0);
                                            const liters = (gallons * 3.78541).toFixed(1);
                                            const kgPerL = (kgPerGal / 3.78541).toFixed(2);
                                            return `${liters}L × ${kgPerL} kg CO₂e/L`;
                                          })()}
                                        </Text>
                                        {/* The one line here that IS a citation, so it
                                            carries the document rather than the agency.
                                            Two lines were dropped alongside it:
                                            "Conversion: 10.21 ÷ 3.785 = 2.70", which is
                                            unit arithmetic dressed as provenance and
                                            padded the apparent citation count; and
                                            "Source: Usda Standard Per Hectare", which was
                                            `calculation_basis` — an internal enum —
                                            title-cased into something that reads like a
                                            reference and resolves to nothing. */}
                                        <Text fontSize="xs" color="orange.600" pl={2}>
                                          • EPA factor:{' '}
                                          {(
                                            fuelBasis?.emission_factor?.value ??
                                            calculation.breakdown
                                              .diesel_emission_factor_kg_per_gallon
                                          )?.toFixed(2)}{' '}
                                          kg CO₂e/gallon
                                          {fuelBasis?.emission_factor?.provenance === 'published'
                                            ? ` — ${fuelBasis.emission_factor.source}`
                                            : ''}
                                        </Text>
                                      </>
                                    )}
                                  </VStack>
                                )}

                              {/* Irrigation Event Emissions */}
                              {Boolean(calculation.breakdown?.water_volume_gallons) && (
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
                                  {Boolean(calculation.breakdown.actual_kwh_consumed) && (
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
                                          }>
                                          {calculation.breakdown.area_emissions < 0
                                            ? 'Carbon Sequestration Credit:'
                                            : 'Area-Based Emissions:'}
                                        </Text>
                                        <Text
                                          color={
                                            calculation.breakdown.area_emissions < 0
                                              ? 'green.700'
                                              : 'orange.800'
                                          }>
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
                                        pl={2}>
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
                                            ? 'Electric (0.365 kg CO₂e/kWh)'
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
                                      color="green.700"
                                      pl={2}
                                      fontWeight="semibold">
                                      High efficiency operation reduces emissions
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
                                                  textTransform="capitalize">
                                                  {subtype.replace('_', ' ')}
                                                  {isOrganic && ''}
                                                  {isBiological && ''}
                                                </Text>
                                              </HStack>
                                              {calculation.breakdown.note && isEcoFriendly && (
                                                <Text
                                                  fontSize="xs"
                                                  color="green.700"
                                                  fontStyle="italic"
                                                  pl={2}>
                                                  {calculation.breakdown.note}
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
                                            textTransform="capitalize">
                                            {calculation.breakdown.fertilizer_subtype ===
                                            'slow_release'
                                              ? 'Slow Release'
                                              : calculation.breakdown.fertilizer_subtype}
                                            {calculation.breakdown.fertilizer_subtype ===
                                              'organic' && ''}
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
                                            color="green.700"
                                            fontStyle="italic"
                                            pl={2}>
                                            {calculation.breakdown.note}
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
                                            calculation.breakdown.epa_fuel_factor_unit ===
                                              'gal') && (
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

                            {/* The footer note, which closed the breakdown with a green
                                check and "Carbon calculation uses published EPA/USDA
                                emission factors". It sat BELOW the "We assumed" block and
                                undid it: the last word on screen re-certified the whole
                                derivation, estimated fuel included. Same two states as the
                                header badge, driven by the same typed field. */}
                            <Box
                              p={2}
                              bg="gray.50"
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor="gray.200">
                              <HStack spacing={2}>
                                {fuelBasis && !fuelBasis.measured ? (
                                  <Text fontSize="xs" color="gray.600" flex={1}>
                                    {intl.formatMessage({
                                      id: 'carbon.badge.estimatedFuelTooltip'
                                    })}
                                  </Text>
                                ) : hasPublishedFactorEvidence ? (
                                  <>
                                    <Icon as={FaCheckCircle} color="green.700" boxSize={3} />
                                    <VStack spacing={0} align="start" flex={1}>
                                      <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                                        {intl.formatMessage({ id: 'carbon.badge.epaUsdaSourced' })}
                                      </Text>
                                      <Text fontSize="xs" color="gray.600">
                                        {intl.formatMessage({ id: 'carbon.badge.epaUsdaTooltip' })}
                                      </Text>
                                    </VStack>
                                  </>
                                ) : (
                                  /* No published factor demonstrably ran (pruning and canopy
                                     management are a flat Trazo per-acre manual estimate), so
                                     the closing note describes the basis instead of awarding
                                     a green check to a citation that does not exist. */
                                  <Text fontSize="xs" color="gray.600" flex={1}>
                                    {intl.formatMessage({ id: 'carbon.basis.trazoEstimate' })}
                                  </Text>
                                )}
                              </HStack>
                            </Box>
                          </VStack>
                        </VStack>
                      );
                    })()}
                </Box>
              </>
            )}

            {/* "Application Efficiency 80%" with a progress bar stood here — the third
                rendering of `efficiency_score` on one card, and the most assertive: a
                filled green bar reads as a rating of how well the operator did the job.
                Nothing on screen said what the scale meant or what would raise it, and for
                a planting event with no fuel entered it graded a national average. Removed
                with the other two; the panel now reports emissions and their provenance,
                and grades nothing. */}
          </VStack>
        </CardBody>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    // Only re-render if calculation data or isCalculating state actually changes
    //
    // `formData` MUST be compared on the fields this component branches on. It was omitted
    // entirely, which was survivable while callers passed a stable object — but the tabs now
    // pass live watched values, and without these four an `electricity_source` or
    // `is_fertigation` change that does not move the co2e total would be swallowed here and
    // the note beneath it would never appear. Compared field-by-field rather than by
    // stringifying the whole object: the tabs spread a fresh literal on every render, so a
    // deep compare would run over the entire form payload each keystroke.
    const sameFormBranchInputs =
      prevProps.formData?.type === nextProps.formData?.type &&
      prevProps.formData?.production_type === nextProps.formData?.production_type &&
      prevProps.formData?.electricity_source === nextProps.formData?.electricity_source &&
      prevProps.formData?.is_fertigation === nextProps.formData?.is_fertigation;

    return (
      prevProps.isCalculating === nextProps.isCalculating &&
      prevProps.onEnterActualFuel === nextProps.onEnterActualFuel &&
      sameFormBranchInputs &&
      prevProps.calculation?.co2e === nextProps.calculation?.co2e &&
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
