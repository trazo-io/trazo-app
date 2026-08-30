import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  useColorModeValue,
  CircularProgress,
  HStack,
  VStack,
  Icon,
  SimpleGrid,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { FaClipboardList } from 'react-icons/fa';
import { MdEco } from 'react-icons/md';
import { useGetCarbonFootprintSummaryQuery } from 'store/api/companyApi';
import { useGetFarmComprehensiveDashboardQuery } from 'store/api/dashboardMetricsApi';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

const TransparencySummaryCard = ({ farmId }) => {
  const intl = useIntl();
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const year = new Date().getFullYear();

  // Get company from Redux state
  const activeCompany = useSelector((state) => state.company.currentCompany);
  const companyId = activeCompany?.id;

  // Get comprehensive transparency data (primary source)
  const {
    data: comprehensiveData,
    isLoading: isLoadingComprehensive,
    isFetching: isFetchingComprehensive,
    isError: isErrorComprehensive
  } = useGetFarmComprehensiveDashboardQuery(
    { companyId, farmId },
    {
      refetchOnMountOrArgChange: true,
      skip: !companyId || !farmId
    }
  );

  // Get carbon data for environmental impact section (fallback)
  const {
    data: carbonData,
    isLoading: isLoadingCarbon,
    isFetching: isFetchingCarbon,
    isError: isErrorCarbon
  } = useGetCarbonFootprintSummaryQuery({ farmId, year }, { refetchOnMountOrArgChange: true });

  // `data` (comprehensiveData || carbonData) was removed with the client-side transparency
  // fallback formula that was its only consumer. Each remaining reader picks its source
  // explicitly, so no caller can silently read a carbon payload where it expected a
  // transparency one.
  const isLoading = isLoadingComprehensive || isLoadingCarbon;
  const isFetching = isFetchingComprehensive || isFetchingCarbon;
  const isError = isErrorComprehensive && isErrorCarbon;

  // NO TRANSPARENCY SCORE ON THIS CARD — removed 2026-08-04.
  //
  // This card used to render the score four times over (a "Transparency Score" stat, a
  // re-worded "Transparency: Complete" stat, a progress bar, and a verdict headline), and
  // SmartUsageCard above it rendered a fifth. One farm, one number, five renders on one screen.
  //
  // The score is Trazo's own completeness measure against a baseline Trazo authored
  // (TransparencyCalculator.EXPECTED_EVENTS). It has no external deadline and no buyer asking
  // for it, so it is a poor headline for a certified grower whose actual pressure is the
  // annual inspection. Farm home now leads with what a certifier would query
  // (CertifierReadinessCard) and states facts here. This note used to end "the score keeps its
  // own page: /admin/dashboard/farm/:farmId/transparency" — that page was never routed and was
  // deleted 2026-08-11. The score has no producer surface; it is a backend KPI.
  //
  // Do not reintroduce a score, tier badge, grade, or progress bar on this card.

  const getEventCount = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;
    if (compData?.total_events !== undefined) {
      return compData.total_events;
    }
    // Fallback to carbon data
    return carbonData?.entries_count?.total || 0;
  };

  const getPhotoCount = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;
    if (compData?.total_photos !== undefined) {
      return compData.total_photos;
    }

    // Try alternative field names in comprehensiveData root
    if (comprehensiveData) {
      const possiblePhotoFields = [
        'total_photos',
        'photos_count',
        'total_photo_count',
        'photo_count',
        'documented_photos'
      ];
      for (const field of possiblePhotoFields) {
        if (comprehensiveData[field] !== undefined) {
          return comprehensiveData[field];
        }
      }
    }

    // Fallback to carbon data
    return carbonData?.photos_count || 0;
  };

  const getActiveProductionsCount = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;

    // FIX: Prioritize active_productions (only productions without finish_date)
    // The UI label says "Producciones Activas" so we should show active only
    if (compData?.active_productions !== undefined) {
      return compData.active_productions;
    }

    // Fallback to total_productions if active not available
    if (compData?.total_productions !== undefined) {
      return compData.total_productions;
    }

    // Fallback to carbon data
    return carbonData?.active_productions_count || 0;
  };

  // `getVerificationStatus()` was removed with the score (2026-08-04). It rendered a
  // "Transparency: Complete / Advanced / In Progress" verdict derived from the same
  // percentage shown two stats to its left — a second wording of one number, and a
  // documentation-quality verdict Trazo assigns to itself. Blockchain state, the one genuinely
  // distinct fact it carried, is a production-level attribute and is shown where it belongs.

  // Get carbon data (for environmental impact section)
  const getCarbonData = () => {
    // Try comprehensive data first (flat structure may not have carbon_summary)
    if (comprehensiveData?.carbon_summary?.net_carbon !== undefined) {
      return comprehensiveData.carbon_summary.net_carbon;
    }
    // Fallback to carbon endpoint data
    return carbonData?.net_carbon || 0;
  };

  // Carbon per ACRE. The backend reports per_hectare; US growers work in acres, and the rest
  // of the product already enters and displays area in acres. null when unavailable so the
  // row is omitted rather than showing a fabricated 0.
  const HECTARES_PER_ACRE = 0.404686;
  const perHectareCarbon = comprehensiveData?.carbon_summary?.per_hectare;
  const perAcreCarbon =
    typeof perHectareCarbon === 'number' && perHectareCarbon > 0
      ? perHectareCarbon * HECTARES_PER_ACRE
      : null;

  // `getTransparencyMessage()` was removed with the score (2026-08-04). It titled the card with
  // a verdict on the farm — "Full Transparency!" at >= 95, "Excellent Documentation" at >= 85.
  // Beyond duplicating the number below it, the claim was not true: 98% means "met the event
  // baseline Trazo expects for this crop", not that a farm is fully transparent. A grower who
  // screenshots that headline into a buyer deck has published a sustainability grade Trazo
  // invented — the exact artefact EU ECGT 2024/825 and FTC 16 CFR 260.6 target. The card now
  // states what was recorded and lets the reader judge.

  if (isLoading || isFetching) {
    return (
      <Card bg={bgColor} p={6} borderRadius="15px">
        <Flex justify="center" align="center" py={4}>
          <CircularProgress isIndeterminate color="green.500" size="40px" />
        </Flex>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card bg={bgColor} p={6} borderRadius="15px">
        <VStack spacing={4}>
          <Icon as={MdEco} color="red.500" boxSize={8} />
          <Text color="red.700" textAlign="center">
            {intl.formatMessage({ id: 'dashboard.errorLoadingTransparency' })}
          </Text>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={() => window.location.reload()}>
            {intl.formatMessage({ id: 'app.retry' })}
          </Button>
        </VStack>
      </Card>
    );
  }

  return (
    <Card
      bg={bgColor}
      p={{ base: 4, md: 6 }}
      borderRadius="xl"
      className="trazo-card"
      boxShadow="md">
      <CardHeader p={0} mb={{ base: 4, md: 4 }}>
        <Flex direction="column">
          <HStack spacing={2} align="center">
            {/* `green.700`, not `green.500` — same ⛔ case as CarouselHorizontal's "+ New"
                glyph: `green.500` on a white card is 2.78:1, under the 3.0 floor a non-text
                mark owes. `green.700` is the palette's text-weight green (5.13:1). */}
            <Icon as={FaClipboardList} color="green.700" boxSize={{ base: 5, md: 6 }} />
            {/* `textColor` is colour-mode aware; the literal "gray.700" that used to be here went
                near-invisible on the dark theme. It also left `textColor` defined-but-unused once
                the score header above it was removed. */}
            <Text fontSize={{ base: 'xl', md: 'xl' }} color={textColor} fontWeight="700">
              {intl.formatMessage({
                id: 'dashboard.farmRecordsTitle',
                defaultMessage: 'Your farm records'
              })}
            </Text>
          </HStack>
          <Text fontSize={{ base: 'sm', md: 'sm' }} color="gray.500" fontWeight="400" ml={7}>
            {intl.formatMessage({ id: 'dashboard.establishmentDocumentation' })}
          </Text>
        </Flex>
      </CardHeader>
      <CardBody px={0}>
        {/* Facts only — counts of what was actually recorded. No score, no verdict, no grade. */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 3, md: 3 }}>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'blue.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'blue.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                {intl.formatMessage({ id: 'dashboard.documentedEvents' })}
              </StatLabel>
              <StatNumber fontSize={{ base: 'md', md: 'lg' }} color="green.700" fontWeight="bold">
                {getEventCount()}
              </StatNumber>
              <StatHelpText fontSize="xs" mt={1}>
                {intl.formatMessage({ id: 'dashboard.registeredActivities' })}
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'orange.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'orange.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                {intl.formatMessage({ id: 'dashboard.documentedPhotos' })}
              </StatLabel>
              <StatNumber fontSize={{ base: 'md', md: 'lg' }} color="green.700" fontWeight="bold">
                {getPhotoCount()}
              </StatNumber>
              <StatHelpText fontSize="xs" mt={1}>
                {intl.formatMessage({ id: 'dashboard.visualEvidence' })}
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'teal.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'teal.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                {intl.formatMessage({ id: 'dashboard.activeProductions' })}
              </StatLabel>
              <StatNumber fontSize={{ base: 'md', md: 'lg' }} color="green.700" fontWeight="bold">
                {getActiveProductionsCount()}
              </StatNumber>
              <StatHelpText fontSize="xs" mt={1}>
                {intl.formatMessage({ id: 'dashboard.transparencyCycles' })}
              </StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* SECONDARY: Environmental Impact — collapsed by design.
            `transparency-first.md` mandates progressive disclosure: documentation facts first,
            carbon on demand. The Transparency Dashboard already follows this (its own
            "Environmental Impact Details" accordion); farm home was the last surface still
            printing carbon inline, above the fold, unasked. Carbon here is a background
            calculation for B2B reporting, not something the grower acts on from this card. */}
        <Accordion allowToggle mt={{ base: 3, md: 4 }}>
          <AccordionItem border="none">
            <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
              {/* `as="h3"` to match the two certifier cards above it. Chakra's `Heading` defaults to
                  h2, so this peer card sat one level HIGHER in the document outline than its
                  neighbours — a screen-reader user walking headings got the three cards reported
                  as h2, h3, h3. Purely semantic; nothing changes visually. 2026-08-15. */}
              <Heading
                as="h3"
                size="sm"
                color="gray.600"
                fontWeight="600"
                flex="1"
                textAlign="left">
                {intl.formatMessage({ id: 'dashboard.environmentalImpactLabel' })}
              </Heading>
              <AccordionIcon color="gray.500" />
            </AccordionButton>
            <AccordionPanel px={0} pb={2}>
              {/* Rounded to whole kg: two decimals on a five-figure number ("45832.72 kg CO₂e")
                  implied a precision the estimate does not have. Neutral colour, not orange —
                  orange read as a failing grade on a number that has no target and that the
                  farmer cannot act on from this card. The per-acre line gives it a denominator,
                  in acres because that is the unit US growers work in.

                  Labelled "Direct operational emissions", not "Net Footprint" (changed
                  2026-08-04). Per `compliance.md`, "footprint" implies a full life-cycle
                  assessment; Trazo measures Scope 1 only — the fuel, fertiliser, and energy the
                  farmer actually controls — and excludes supply chain, packaging, distribution
                  and end-of-life. "Net" additionally implied offsets had been netted out. */}
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between" w="full" fontSize="sm">
                  <Text color="gray.600">
                    {intl.formatMessage({ id: 'dashboard.netFootprint' })}
                  </Text>
                  <Text fontWeight="medium" color="gray.700">
                    {intl.formatMessage(
                      { id: 'dashboard.kgCO2e' },
                      { value: Math.round(getCarbonData()).toLocaleString() }
                    )}
                  </Text>
                </HStack>
                {perAcreCarbon !== null && (
                  <HStack justify="space-between" w="full" fontSize="xs">
                    <Text color="gray.500">
                      {intl.formatMessage({
                        id: 'dashboard.perAcre',
                        defaultMessage: 'Per acre'
                      })}
                    </Text>
                    <Text color="gray.500">
                      {intl.formatMessage(
                        { id: 'dashboard.kgCO2e' },
                        { value: Math.round(perAcreCarbon).toLocaleString() }
                      )}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  );
};

export default TransparencySummaryCard;
