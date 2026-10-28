import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Button,
  Collapse,
  Divider,
  useColorModeValue,
  Link
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaLeaf, FaChevronDown, FaChevronUp, FaGlobeAmericas } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import USDACredibilityBadge from '../Carbon/USDACredibilityBadge';

interface BackendComparisons {
  driving_miles: number;
  trees_per_year: number;
  kwh_electricity: number;
}

interface ConsumerContext {
  kg_per_kg: number;
  per_kg_miles: number;
  per_kg_phone_charges: number;
  has_per_kg_data: boolean;
}

interface CarbonImpactExplainerProps {
  totalCO2e: number;
  productName?: string;
  relatableFootprint?: string;
  backendComparisons?: BackendComparisons;
  consumerContext?: ConsumerContext;
}

export const CarbonImpactExplainer: React.FC<CarbonImpactExplainerProps> = ({
  totalCO2e,
  productName = 'this product',
  backendComparisons,
  consumerContext
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // Run 8 (R8-14): carbon is secondary on the buyer page. The whole card starts closed and
  // opens from its header; the lot's story and the farm come first.
  const [isOpen, setIsOpen] = useState(false);
  const intl = useIntl();

  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('green.50', 'green.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.700', 'green.300');
  // Hoisted out of the JSX. These five used to be called inside the
  // negative-emissions / hasPerKgData branches and inside <Collapse>, i.e. conditionally
  // and in different counts per branch — a rules-of-hooks violation that only stayed quiet
  // because the branch never flipped after mount. The early return added below would have
  // made it flip.
  const cardBorderColor = useColorModeValue('gray.200', 'gray.600');
  const factCardBg = useColorModeValue('gray.50', 'gray.700');
  const factCardBorder = useColorModeValue('gray.200', 'gray.600');
  const expandedBg = useColorModeValue('gray.50', 'gray.700');
  const disclaimerBg = useColorModeValue('gray.100', 'gray.600');

  // Self-graded transparency score removed from the consumer surface (2026-06 claim-safety):
  // a self-assigned "% documented / Fully Documented" verdict shown to shoppers is the
  // self-created sustainability-label class banned by EU ECGT 2024/825 (live 2026-09-27)
  // and an FTC 16 CFR 260.4 general-benefit risk. The score stays on the FARMER dashboard
  // as the engagement KPI; consumers see the factual evidence instead (hero practices count,
  // photos, third-party certs, timeline). This card now shows carbon facts only.
  const hasPerKgData = consumerContext?.has_per_kg_data && consumerContext.kg_per_kg > 0;

  // Per-kg is the preferred consumer framing, but it needs a recorded harvest amount to
  // divide by (`total_co2_kg_per_kg`, transparency_response_formatter.py). A season finished
  // without one — or imported — yields has_per_kg_data:false while the season TOTAL is still
  // a real, calculated number, and the card then rendered a title, an expander and nothing
  // in between. Fall back to the total for the whole season.
  const hasSeasonTotal = Number.isFinite(totalCO2e) && totalCO2e > 0;
  const seasonTotal = Math.round(totalCO2e * 10) / 10;
  const seasonMiles = backendComparisons?.driving_miles ?? 0;

  // No per-kg figure, no season total, not a negative-emissions season: there is nothing
  // measurable to report, so render nothing at all. An "Environmental Impact" heading over
  // an empty body reads as a broken page, and it invites the shopper to read the silence as
  // "zero emissions" — a claim these records do not make (FTC 16 CFR 260.6).
  if (!hasPerKgData && !hasSeasonTotal) {
    return null;
  }

  // FTC 16 CFR 260.4(c): the calculation boundary accompanies the environmental claim, in the
  // same block as the number. Defined once — both the per-kg card and the season-total
  // fallback render this exact string.
  const boundaryLine = intl.formatMessage({
    id: 'app.carbonExplainer.scopeBoundary',
    defaultMessage:
      // 🔴 The previous default made TWO false claims in one sentence. "direct on-farm
      // emissions only" — the calculator includes fertilizer and crop-protection
      // MANUFACTURING, which is upstream and off-farm (Scope 3, not Scope 1). And "based on
      // EPA/USDA factors" — true for fuel, electricity and nitrogen, but P2O5 and K2O are
      // `PROVENANCE_INTERNAL_ESTIMATE` ("Trazo conservative estimate") and crop protection
      // comes from Audsley et al. 2009 / Hillier et al. 2009, i.e. academic LCA. Attributing
      // our own estimates to a government agency is the exact claim shape compliance.md
      // forbids, and the landing methodology table listed the manufacturing rows all along.
      'Estimated emissions from the recorded activities included in this calculation. Missing activity data and excluded sources are not represented. Not a full life-cycle footprint: transport to the farm, packaging, equipment manufacturing and retail are excluded. Fuel and electricity factors are EPA-published; phosphorus and potassium are Trazo estimates where published values are sparse. Each factor shows its own source.'
  });

  // The lime inclusion (Astra follow-up, 2026-10-28): carbonate-lime CO2 is estimated with IPCC
  // Tier 1 factors and booked to the application year, so the boundary says so next to the number
  // instead of leaving a shopper to assume a measured release on the application date. Worded as a
  // condition: the payload carries no lime-present flag, so the line must stay true on a season with
  // no lime at all.
  const limeLine = intl.formatMessage({
    id: 'app.carbonExplainer.scopeBoundaryLime',
    defaultMessage:
      'Where carbonate-lime applications are recorded with their amount, their estimated CO₂ is included, using IPCC Tier 1 factors and assigned to the application year; this is not a measured release on the application date.'
  });

  // Emission categories for methodology section
  const emissionCategories = [
    {
      label: intl.formatMessage({ id: 'app.carbonExplainer.fuelEquipment' }),
      desc: intl.formatMessage({ id: 'app.carbonExplainer.fuelEquipmentDesc' })
    },
    {
      label: intl.formatMessage({ id: 'app.carbonExplainer.fertilizer' }),
      desc: intl.formatMessage({ id: 'app.carbonExplainer.fertilizerDesc' })
    },
    {
      label: intl.formatMessage({ id: 'app.carbonExplainer.chemicals' }),
      desc: intl.formatMessage({ id: 'app.carbonExplainer.chemicalsDesc' })
    },
    {
      label: intl.formatMessage({ id: 'app.carbonExplainer.irrigationEnergy' }),
      desc: intl.formatMessage({ id: 'app.carbonExplainer.irrigationEnergyDesc' })
    }
  ];

  return (
    <Box
      bg={bgColor}
      borderRadius="xl"
      border="1px solid"
      borderColor={cardBorderColor}
      overflow="hidden">
      {/* Header — carbon-impact card title. No self-graded documentation score:
          consumers see facts (counts/photos/certs), not a self-assigned grade. */}
      <Box
        as="button"
        type="button"
        w="100%"
        textAlign="left"
        p={4}
        bg={cardBg}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}>
        <VStack align="start" spacing={2}>
          <HStack>
            <Icon as={FaGlobeAmericas} color={accentColor} boxSize={5} />
            <Text
              as="h2"
              fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
              fontWeight="bold"
              color={textColor}>
              {intl.formatMessage({ id: 'app.carbonExplainer.title' })}
            </Text>
            <Icon as={isOpen ? FaChevronUp : FaChevronDown} color={mutedColor} boxSize={3} />
          </HStack>
          <Text fontSize="sm" color={mutedColor}>
            {intl.formatMessage({ id: 'app.carbonExplainer.subtitle' }, { productName })}
          </Text>
        </VStack>
      </Box>

      <Collapse in={isOpen} animateOpacity>
        {/* PRIMARY: Consumer-friendly impact summary */}
        <Box p={4}>
          <VStack spacing={3} align="stretch">
            {/* ⛔ REMOVED 2026-09-23 — the "Very Low Emissions" + green "Carbon Stored" card.
              It rendered whenever `totalCO2e < 0`, and totalCO2e was `net_impact`
              (emissions minus offsets). Offsets are purchased, self-entered and
              self-marked verified (`create_secure_carbon_offset`), so any farm that
              recorded enough of them minted itself a green environmental badge on a
              public page. That is the self-created sustainability label EU ECGT
              2024/825 bans (live 2026-09-27) and an FTC 16 CFR 260.5 / 260.4 claim.
              Same class as the transparency score retired in 2026-06, and it survived
              that sweep because it is a COLOUR AND AN ICON rather than a number.
              This surface now receives GROSS emissions, which cannot be negative, so
              there is no honest branch left to render here. Guarded by
              `__tests__/noSelfCreatedCarbonBadge.test.tsx`.
              ⛔ Do not reintroduce a "carbon negative"/"carbon stored"/"climate
              positive" state on a consumer surface without third-party verification. */}
            {hasPerKgData ? (
              /* Per-kg impact card — the only relatable metric for consumers */
              <Box
                bg={factCardBg}
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor={factCardBorder}>
                <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={2}>
                  {intl.formatMessage({ id: 'app.carbonExplainer.yourImpact' })}
                </Text>
                <Text fontSize="sm" color={mutedColor} mb={1}>
                  {intl.formatMessage(
                    { id: 'app.carbonExplainer.perKgNarrative' },
                    { productName }
                  )}
                </Text>
                <HStack spacing={2} align="baseline" mb={3}>
                  <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                    {intl.formatNumber(consumerContext!.kg_per_kg)}
                  </Text>
                  <Text fontSize="sm" color={mutedColor}>
                    {intl.formatMessage({ id: 'app.carbonExplainer.directEmissionsUnit' })}
                  </Text>
                </HStack>

                {/* Run 8 (R8-14): driving and phone-charge equivalents removed. They turned an
                  estimate with a stated boundary into a vivid comparison the boundary does
                  not travel with. */}

                <Text fontSize="xs" color={mutedColor} mt={3}>
                  {boundaryLine}
                </Text>
                <Text fontSize="xs" color={mutedColor} mt={2}>
                  {limeLine}
                </Text>
              </Box>
            ) : (
              /* Season-total fallback. The per-kg figure needs a recorded harvest weight to
               divide by, so any season the payload reports no kg_per_kg for lands here —
               legacy or imported seasons, mostly. Same shape, same boundary line, one honest
               number: the season's total instead of the amount behind one kilogram. The early
               return above guarantees this branch has a total worth showing. */
              <Box
                bg={factCardBg}
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor={factCardBorder}>
                <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={2}>
                  {intl.formatMessage({ id: 'app.carbonExplainer.totalSeasonTitle' })}
                </Text>
                <Text fontSize="sm" color={mutedColor} mb={1}>
                  {intl.formatMessage({ id: 'app.carbonExplainer.totalNarrative' })}
                </Text>
                <HStack spacing={2} align="baseline" mb={3}>
                  <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                    {intl.formatNumber(seasonTotal)}
                  </Text>
                  <Text fontSize="sm" color={mutedColor}>
                    {intl.formatMessage({ id: 'app.carbonExplainer.directEmissionsUnit' })}
                  </Text>
                </HStack>

                <Text fontSize="xs" color={mutedColor} mt={3}>
                  {boundaryLine}
                </Text>
                <Text fontSize="xs" color={mutedColor} mt={2}>
                  {limeLine}
                </Text>
              </Box>
            )}

            {/* Expand Button */}
            <Button
              size="sm"
              variant="ghost"
              colorScheme="green"
              onClick={() => setIsExpanded(!isExpanded)}
              rightIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}>
              {isExpanded
                ? intl.formatMessage({ id: 'app.carbonExplainer.showLess' })
                : intl.formatMessage({ id: 'app.carbonExplainer.showMore' })}
            </Button>
          </VStack>
        </Box>

        {/* Expanded: Methodology + Trust */}
        <Collapse in={isExpanded}>
          <Divider />
          <Box p={4} bg={expandedBg}>
            <VStack spacing={6} align="stretch">
              {/* How We Calculate */}
              <Box>
                <Text fontSize="md" fontWeight="semibold" mb={1} color={textColor}>
                  {intl.formatMessage({ id: 'app.carbonExplainer.howWeCalculateTitle' })}
                </Text>
                <Text fontSize="xs" color={mutedColor} mb={3}>
                  {intl.formatMessage({ id: 'app.carbonExplainer.howWeCalculateDesc' })}
                </Text>
                <VStack spacing={3} align="stretch">
                  {emissionCategories.map((item, idx) => (
                    <HStack key={idx} spacing={3}>
                      <Icon as={FaLeaf} color="green.400" boxSize={3} />
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">
                          {item.label}
                        </Text>
                        <Text fontSize="xs" color={mutedColor}>
                          {item.desc}
                        </Text>
                      </Box>
                    </HStack>
                  ))}
                </VStack>
                <Text fontSize="xs" color={mutedColor} mt={3} fontStyle="italic">
                  {intl.formatMessage({ id: 'app.carbonExplainer.epaUsdaNote' })}
                </Text>
              </Box>

              {/* EPA/USDA Credibility Badge (clickable for detailed modal) */}
              <USDACredibilityBadge />

              {/* Methodology Scope Disclaimer (FTC compliance) */}
              <Box p={3} bg={disclaimerBg} borderRadius="md">
                <Text fontSize="xs" color={mutedColor}>
                  {intl.formatMessage({ id: 'app.carbonExplainer.disclaimer' })}
                </Text>
              </Box>

              {/* Full methodology disclosure page (ECGT/FTC substantiation) */}
              <Link
                as={RouterLink}
                to="/methodology#carbon"
                fontSize="sm"
                fontWeight="medium"
                color="green.700"
                _hover={{ color: 'green.500' }}
                display="inline-flex"
                alignItems="center"
                minH="44px"
                alignSelf="flex-start">
                Read the full methodology →
              </Link>
            </VStack>
          </Box>
        </Collapse>
      </Collapse>
    </Box>
  );
};

export default CarbonImpactExplainer;
