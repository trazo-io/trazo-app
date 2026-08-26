import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  UnorderedList,
  ListItem,
  Grid,
  Link
} from '@chakra-ui/react';
import {
  FaBook,
  FaBoxOpen,
  FaTint,
  FaLayerGroup,
  FaBug,
  FaTruck,
  FaBorderAll,
  FaBroom,
  FaCut,
  FaSnowflake,
  FaSpa,
  FaSearch,
  FaFileInvoiceDollar,
  FaCloudRain,
  FaLeaf,
  FaQrcode,
  FaTractor,
  FaCamera,
  FaUsers,
  FaCalculator,
  FaFlask,
  FaDatabase,
  FaSeedling,
  FaExternalLinkAlt,
  FaClipboardList,
  FaCalendarAlt,
  FaClipboardCheck,
  FaFileSignature,
  FaMapMarkedAlt
} from 'react-icons/fa';
import { StandardPage } from 'components/Design/StandardComponents';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

interface DocumentationTopic {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: string;
  content: React.ReactNode;
}

const EducationTopicDetail: React.FC = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const intl = useIntl();

  const documentationTopics: DocumentationTopic[] = useMemo(
    () => [
      {
        id: 'getting-started',
        title: intl.formatMessage({ id: 'education.topicGettingStartedTitle' }),
        description: intl.formatMessage({ id: 'education.topicGettingStartedDesc' }),
        icon: FaBook,
        category: intl.formatMessage({ id: 'education.categoryGettingStarted' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.welcomeTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.welcomeDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.gettingStarted.howItWorksTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step1Label' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.step1' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step2Label' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.step2' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step3Label' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.step3' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step4Label' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.step4' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step5Label' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.step5' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.gettingStarted.whyTransparencyTitle' })}
            </Heading>
            <Text>
              {intl.formatMessage({ id: 'education.detail.gettingStarted.whyTransparencyText' })}
            </Text>

            <Text>
              <strong>
                {intl.formatMessage({ id: 'education.detail.gettingStarted.keyBenefits' })}
              </strong>
            </Text>
            <UnorderedList spacing={2} pl={6}>
              <ListItem>
                <strong>
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit1Label' })}
                </strong>{' '}
                {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit1' })}
              </ListItem>
              <ListItem>
                <strong>
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit2Label' })}
                </strong>{' '}
                {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit2' })}
              </ListItem>
              <ListItem>
                <strong>
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit3Label' })}
                </strong>{' '}
                {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit3' })}
              </ListItem>
              <ListItem>
                <strong>
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit4Label' })}
                </strong>{' '}
                {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit4' })}
              </ListItem>
              <ListItem>
                <strong>
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit5Label' })}
                </strong>{' '}
                {intl.formatMessage({ id: 'education.detail.gettingStarted.benefit5' })}
              </ListItem>
            </UnorderedList>

            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.revolutionaryTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.gettingStarted.revolutionaryDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'farm-events',
        title: intl.formatMessage({ id: 'education.topicFarmEventsTitle' }),
        description: intl.formatMessage({ id: 'education.topicFarmEventsDesc' }),
        icon: FaTractor,
        category: intl.formatMessage({ id: 'education.categoryFarmDocumentation' }),
        content: (
          <VStack spacing={6} align="stretch">
            {/* 2026-08-21 — this topic taught the seven BACKEND event models (Production,
                Chemical, Soil, Pest, Weather, Business, General). A farmer never sees those.
                `config/activityVerbs.ts` is "the ONE farmer-language entry vocabulary (WS-4b)"
                and every entry point renders ITS fourteen verbs — so a grower who read
                "Chemical Events" here and opened Add activity found no Chemical tile. It also
                listed "market sales" under Business, the exact claim the verb tile was renamed
                away from on 2026-08-19: there is no sales field on that form, and a sale
                belongs to SalesRecord on the production page. */}
            <Text fontSize="lg">
              {intl.formatMessage({ id: 'education.detail.farmEvents.intro' })}
            </Text>

            <Box w="full">
              <Heading size="sm" color="gray.700" mb={3}>
                {intl.formatMessage({ id: 'education.detail.farmEvents.groupGrowing' })}
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaSeedling} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.plantingTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.plantingDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaTint} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.irrigationTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.irrigationDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaTractor} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.fieldWorkTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.fieldWorkDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaBoxOpen} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.harvestTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.harvestDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaCut} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.pruningTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.pruningDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaSpa} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.pollinationTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.pollinationDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaSnowflake} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.farmEvents.frostProtectionTitle'
                        })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({
                          id: 'education.detail.farmEvents.frostProtectionDesc'
                        })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              </Grid>
            </Box>

            <Box w="full">
              <Heading size="sm" color="gray.700" mb={3}>
                {intl.formatMessage({ id: 'education.detail.farmEvents.groupInputs' })}
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaFlask} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.farmEvents.inputApplicationTitle'
                        })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({
                          id: 'education.detail.farmEvents.inputApplicationDesc'
                        })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaLayerGroup} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.soilTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.soilDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaBug} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.pestTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.pestDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              </Grid>
            </Box>

            <Box w="full">
              <Heading size="sm" color="gray.700" mb={3}>
                {intl.formatMessage({ id: 'education.detail.farmEvents.groupSeparation' })}
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaTruck} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.transportTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.transportDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaBorderAll} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.bufferUseTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.bufferUseDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaBroom} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.cleanoutTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.cleanoutDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              </Grid>
            </Box>

            <Box w="full">
              <Heading size="sm" color="gray.700" mb={3}>
                {intl.formatMessage({ id: 'education.detail.farmEvents.groupPaperwork' })}
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaSearch} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.seedSearchTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.seedSearchDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaFileInvoiceDollar} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.businessTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.businessDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaCloudRain} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.weatherTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.weatherDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                <Box p={3} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <HStack align="start" spacing={3}>
                    <Icon as={FaClipboardList} color="green.700" mt={1} />
                    <Box>
                      <Text fontWeight="semibold" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.otherTitle' })}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.otherDesc' })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              </Grid>
            </Box>

            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.farmEvents.notSalesTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.farmEvents.notSalesDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.farmEvents.proTipTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.farmEvents.proTipDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'qr-codes',
        title: intl.formatMessage({ id: 'education.topicQrCodesTitle' }),
        description: intl.formatMessage({ id: 'education.topicQrCodesDesc' }),
        icon: FaQrcode,
        category: intl.formatMessage({ id: 'education.categoryConsumerEngagement' }),
        content: (
          <VStack spacing={6} align="stretch">
            {/* No icon here: the topic itself declares `icon: FaQrcode` and the page header
                already renders it, so repeating it put two QR marks side by side. */}
            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.qrCodes.howItWorksTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.qrCodes.progressiveLoadingLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.progressiveLoading' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.qrCodes.consumerLanguageLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.consumerLanguage' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.qrCodes.farmingJourneyLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.farmingJourney' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.qrCodes.trustIndicatorsLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.trustIndicators' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.qrCodes.carbonDetailsLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.carbonDetails' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.qrCodes.bestPracticesTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>{intl.formatMessage({ id: 'education.detail.qrCodes.mobileFirst' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.qrCodes.valueProp' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.qrCodes.placement' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.qrCodes.updates' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.qrCodes.tracking' })}</Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.qrCodes.whatConsumersSeeTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.qrCodes.instantTrustLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.instantTrust' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.qrCodes.farmStoryLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.farmStory' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.qrCodes.eventTimelineLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.eventTimeline' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.qrCodes.trustBuildersLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.trustBuilders' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.qrCodes.envDetailsLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.qrCodes.envDetails' })}
                </Text>
              </VStack>
            </Box>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.qrCodes.successTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.qrCodes.successDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'carbon-data',
        title: intl.formatMessage({ id: 'education.topicCarbonDataTitle' }),
        description: intl.formatMessage({ id: 'education.topicCarbonDataDesc' }),
        icon: FaLeaf,
        category: intl.formatMessage({ id: 'education.categoryEnvironmentalImpact' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.carbonData.contextTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.carbonData.contextDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonData.philosophyTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.primaryMetricLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.primaryMetric' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.secondaryLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.secondary' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.consumerFocusLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.consumerFocus' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.progressiveLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.progressive' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonData.stillMattersTitle' })}
            </Heading>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.carbonData.b2bTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.carbonData.b2b1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.carbonData.b2b2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.carbonData.b2b3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.carbonData.b2b4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.carbonData.internalTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.carbonData.internal1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.carbonData.internal2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.carbonData.internal3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.carbonData.internal4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonData.usdaTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.usdaVerifiedLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.usdaVerified' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.realFarmLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.realFarm' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.scopeLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.scope' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.updatesLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.updates' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonData.presentationTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.leadLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.lead' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.envContextLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.envContext' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.expandableLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.expandable' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.carbonData.trustBuildLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.carbonData.trustBuild' })}
                </Text>
              </VStack>
            </Box>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.carbonData.bestOfBothTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.carbonData.bestOfBothDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'carbon-methodology',
        title: intl.formatMessage({ id: 'education.topicCarbonMethodologyTitle' }),
        description: intl.formatMessage({ id: 'education.topicCarbonMethodologyDesc' }),
        icon: FaCalculator,
        category: intl.formatMessage({ id: 'education.categoryEnvironmentalImpact' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.verifiedSourcesTitle'
                  })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.verifiedSourcesDesc'
                  })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonMethodology.dataSourcesTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.epaGhgTitle' })}
                  </Text>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.epaGhgDesc' })}
                  </Text>
                  <Link
                    href="https://www.epa.gov/climateleadership/ghg-emission-factors-hub"
                    isExternal
                    fontSize="xs"
                    color="green.700"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    epa.gov/climateleadership/ghg-emission-factors-hub
                  </Link>
                </Box>
                <Box>
                  <Text fontWeight="bold">
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.epaEgridTitle'
                    })}
                  </Text>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.epaEgridDesc' })}
                  </Text>
                  <Link
                    href="https://www.epa.gov/egrid/summary-data"
                    isExternal
                    fontSize="xs"
                    color="green.700"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    epa.gov/egrid/summary-data
                  </Link>
                </Box>
                <Box>
                  <Text fontWeight="bold">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.eiaTitle' })}
                  </Text>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.eiaDesc' })}
                  </Text>
                  <Link
                    href="https://www.eia.gov/tools/faqs/faq.php?id=74&t=11"
                    isExternal
                    fontSize="xs"
                    color="green.700"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    eia.gov - Electricity CO₂ FAQ
                  </Link>
                </Box>
                <Box>
                  <Text fontWeight="bold">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.ipccTitle' })}
                  </Text>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.ipccDesc' })}
                  </Text>
                  <Link
                    href="https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_11_Ch11_N2O&CO2.pdf"
                    isExternal
                    fontSize="xs"
                    color="green.700"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    IPCC Vol 4 Ch 11 - N₂O Emissions (PDF)
                  </Link>
                </Box>
                <Box>
                  <Text fontWeight="bold">
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.usdaArsTitle'
                    })}
                  </Text>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.usdaArsDesc' })}
                  </Text>
                  <Link
                    href="https://www.ars.usda.gov"
                    isExternal
                    fontSize="xs"
                    color="green.700"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    ars.usda.gov
                  </Link>
                </Box>
                <Box>
                  <Text fontWeight="bold">
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.usdaNrcsTitle'
                    })}
                  </Text>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.usdaNrcsDesc' })}
                  </Text>
                  <Link
                    href="https://www.wcc.nrcs.usda.gov/ftpref/wntsc/waterMgt/irrigation/NEH15/ch8.pdf"
                    isExternal
                    fontSize="xs"
                    color="green.700"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    NRCS National Engineering Handbook - Chapter 8 (PDF)
                  </Link>
                </Box>
                <Box>
                  <Text fontWeight="bold">
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.pesticideLcaTitle'
                    })}
                  </Text>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.pesticideLcaDesc'
                    })}
                  </Text>
                  <Link
                    href="https://www.sciencedirect.com/science/article/abs/pii/S0160412004000832"
                    isExternal
                    fontSize="xs"
                    color="green.700"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    Lal 2004 - Carbon emission from farm operations
                  </Link>
                </Box>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonMethodology.dieselTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.dieselFactor' })}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.dieselSource' })}
                </Text>
                <Text fontSize="sm">
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.dieselConfidence'
                  })}
                </Text>
                <Box bg="white" p={3} borderRadius="md" w="full">
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.dieselUsageTitle'
                    })}
                  </Text>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.dieselUsage1'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.dieselUsage2'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.dieselUsage3'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.dieselUsage4'
                      })}
                    </ListItem>
                  </UnorderedList>
                </Box>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonMethodology.electricityTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.electricityFactor'
                  })}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.electricitySource'
                  })}
                </Text>

                <Text fontSize="sm">
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.electricityConfidence'
                  })}
                </Text>
                <Box bg="white" p={3} borderRadius="md" w="full">
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.electricityAppsTitle'
                    })}
                  </Text>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.electricityApp1'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.electricityApp2'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.electricityApp3'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.electricityApp4'
                      })}
                    </ListItem>
                  </UnorderedList>
                </Box>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonMethodology.fertilizerTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Box overflowX="auto" w="full">
                  <Grid
                    templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                    gap={3}
                    minW={{ base: '280px', md: 'auto' }}>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.nitrogenLabel'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.nitrogenValue'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.nitrogenBreakdown'
                        })}
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.phosphorusLabel'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.phosphorusValue'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.phosphorusBreakdown'
                        })}
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.potassiumLabel'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.potassiumValue'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.potassiumBreakdown'
                        })}
                      </Text>
                    </Box>
                  </Grid>
                </Box>
                <Text fontSize="sm" color="gray.600">
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.fertilizerSource'
                  })}
                </Text>
                <Alert status="success" size="sm">
                  <AlertIcon />
                  <Text fontSize="sm">
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.organicFertilizer'
                    })}
                  </Text>
                </Alert>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonMethodology.chemicalTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text fontWeight="bold">
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.pesticidesHerbicides'
                  })}
                </Text>
                <Box overflowX="auto" w="full">
                  <Grid
                    templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                    gap={3}
                    minW={{ base: '280px', md: 'auto' }}>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.syntheticPesticide'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="red.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.syntheticPesticideValue'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.syntheticPesticideNote'
                        })}
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.organicPesticide'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.organicPesticideValue'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.organicPesticideNote'
                        })}
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.syntheticHerbicide'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="red.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.syntheticHerbicideValue'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.syntheticHerbicideNote'
                        })}
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.organicHerbicide'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.organicHerbicideValue'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.organicHerbicideNote'
                        })}
                      </Text>
                    </Box>
                  </Grid>
                </Box>
                <Text fontWeight="bold" mt={2}>
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.fungicides' })}
                </Text>
                <Box overflowX="auto" w="full">
                  <Grid
                    templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                    gap={3}
                    minW={{ base: '280px', md: 'auto' }}>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.syntheticFungicide'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.syntheticFungicideValue'
                        })}
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.copperFungicide'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.copperFungicideValue'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.copperFungicideNote'
                        })}
                      </Text>
                    </Box>
                    <Box p={3} borderRadius="md" border="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.sulfurFungicide'
                        })}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.700">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.sulfurFungicideValue'
                        })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.sulfurFungicideNote'
                        })}
                      </Text>
                    </Box>
                  </Grid>
                </Box>
                <Text fontSize="sm" color="gray.600" mt={2}>
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.chemicalSource' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonMethodology.calculationTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={4} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.calcStep1Title'
                    })}
                  </strong>
                </Text>
                <Text fontSize="sm" pl={4}>
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.calcStep1Desc' })}
                </Text>

                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.calcStep2Title'
                    })}
                  </strong>
                </Text>
                <Text fontSize="sm" pl={4}>
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.calcStep2Desc' })}
                </Text>

                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.calcStep3Title'
                    })}
                  </strong>
                </Text>
                <Text fontSize="sm" pl={4}>
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.calcStep3Desc' })}
                </Text>

                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.calcStep4Title'
                    })}
                  </strong>
                </Text>
                <Text fontSize="sm" pl={4}>
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.calcStep4Desc' })}
                </Text>

                <Box bg="white" p={3} borderRadius="md" w="full" mt={2}>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.exampleTitle' })}
                  </Text>
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.exampleDesc' })}
                  </Text>
                  <UnorderedList spacing={1} fontSize="sm" pl={4}>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.exampleLine1'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.exampleLine2'
                      })}
                    </ListItem>
                    <ListItem>
                      <strong>
                        {intl.formatMessage({
                          id: 'education.detail.carbonMethodology.exampleTotal'
                        })}
                      </strong>
                    </ListItem>
                  </UnorderedList>
                </Box>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.carbonMethodology.philosophyTitle' })}
            </Heading>
            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.directFocusTitle'
                  })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.directFocusDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <Heading size="sm" color="gray.700" mb={3}>
                {intl.formatMessage({ id: 'education.detail.carbonMethodology.includesTitle' })}
              </Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
                <Text fontSize="sm">
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes1' })}
                </Text>
                <Text fontSize="sm">
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes2' })}
                </Text>
                <Text fontSize="sm">
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes3' })}
                </Text>
                <Text fontSize="sm">
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes4' })}
                </Text>
                <Text fontSize="sm">
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes5' })}
                </Text>
                <Text fontSize="sm">
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes6' })}
                </Text>
              </Grid>
            </Box>

            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.carbonMethodology.continuousTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({
                    id: 'education.detail.carbonMethodology.continuousImprovement'
                  })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'first-production',
        title: intl.formatMessage({ id: 'education.topicFirstProductionTitle' }),
        description: intl.formatMessage({ id: 'education.topicFirstProductionDesc' }),
        icon: FaSeedling,
        category: intl.formatMessage({ id: 'education.categoryGettingStarted' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.firstProduction.readyTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.firstProduction.readyDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.firstProduction.step1Title' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.firstProduction.farmInfoLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.firstProduction.farmInfo' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.firstProduction.cropSelectionLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.firstProduction.cropSelection' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.firstProduction.farmSizeLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.firstProduction.farmSize' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.firstProduction.approachLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.firstProduction.approach' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.firstProduction.step2Title' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.firstProduction.productionDetailsLabel'
                    })}
                  </strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>
                    {intl.formatMessage({
                      id: 'education.detail.firstProduction.productionDetail1'
                    })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({
                      id: 'education.detail.firstProduction.productionDetail2'
                    })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({
                      id: 'education.detail.firstProduction.productionDetail3'
                    })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({
                      id: 'education.detail.firstProduction.productionDetail4'
                    })}
                  </ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.firstProduction.step3Title' })}
            </Heading>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.firstProduction.startWithTitle' })}
                  </Heading>
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.firstProduction.startWith' })}
                  </Text>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.firstProduction.addPhotoTitle' })}
                  </Heading>
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.firstProduction.addPhoto' })}
                  </Text>
                </Box>
              </Grid>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.firstProduction.step4Title' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.firstProduction.qrCreationLabel' })}
                    :
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.firstProduction.qrCreation' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.firstProduction.consumerTestLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.firstProduction.consumerTest' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.firstProduction.transparencyScoreLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.firstProduction.transparencyScore' })}
                </Text>
              </VStack>
            </Box>

            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.firstProduction.quickStartTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.firstProduction.quickStartDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'event-mastery',
        title: intl.formatMessage({ id: 'education.topicEventMasteryTitle' }),
        description: intl.formatMessage({ id: 'education.topicEventMasteryDesc' }),
        icon: FaCamera,
        category: intl.formatMessage({ id: 'education.categoryFarmDocumentation' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Text fontSize="lg">
              {intl.formatMessage({ id: 'education.detail.eventMastery.intro' })}
            </Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.eventMastery.realTimeVsBatchTitle' })}
            </Heading>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="green.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.realTimeTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.realTime1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.realTime2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.realTime3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.realTime4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.batchTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.batch1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.batch2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.batch3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.batch4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.eventMastery.photoTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.whatToPhoto' })}
                  </strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.photo1' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.photo2' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.photo3' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.photo4' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.photo5' })}
                  </ListItem>
                </UnorderedList>

                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.technicalTips' })}
                  </strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.tip1' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.tip2' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.tip3' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.tip4' })}
                  </ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.eventMastery.voiceTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.eventMastery.voiceCommandsLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.eventMastery.voiceCommands' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.quickNotesLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.eventMastery.quickNotes' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.handsFreeLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.eventMastery.handsFree' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.eventMastery.autoTranscriptionLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.eventMastery.autoTranscription' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.eventMastery.seasonalTitle' })}
            </Heading>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="green.700" mb={2}>
                    {intl.formatMessage({
                      id: 'education.detail.eventMastery.plantingSeasonTitle'
                    })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.planting1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.planting2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.planting3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.planting4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.growingSeasonTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.growing1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.growing2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.growing3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.growing4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.eventMastery.harvestSeasonTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.harvest1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.harvest2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.harvest3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.harvest4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.eventMastery.successTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.eventMastery.successDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'score-optimization',
        title: intl.formatMessage({ id: 'education.topicScoreOptimizationTitle' }),
        description: intl.formatMessage({ id: 'education.topicScoreOptimizationDesc' }),
        icon: FaClipboardCheck,
        category: intl.formatMessage({ id: 'education.categoryCompliance' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.goalTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.goalDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.scoreOptimization.weightsTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.growingDesc' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.treatmentDesc' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.soilDesc' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.pestDesc' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.certDesc' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.weatherDesc' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.scoreOptimization.strategyTitle' })}
            </Heading>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.scoreOptimization.mustHaveTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.mustHave1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.mustHave2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.mustHave3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.mustHave4' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.mustHave5' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({
                      id: 'education.detail.scoreOptimization.photoStrategyTitle'
                    })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.scoreOptimization.photoStrategy1'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.scoreOptimization.photoStrategy2'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.scoreOptimization.photoStrategy3'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.scoreOptimization.photoStrategy4'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.scoreOptimization.photoStrategy5'
                      })}
                    </ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.scoreOptimization.mistakesTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.mistake1' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.mistake2' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.mistake3' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.mistake4' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.mistake5' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.scoreOptimization.cropTypesTitle' })}
            </Heading>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({
                      id: 'education.detail.scoreOptimization.treeFruitsTitle'
                    })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="xs">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.treeFruits1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.treeFruits2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.treeFruits3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.treeFruits4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({
                      id: 'education.detail.scoreOptimization.annualCropsTitle'
                    })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="xs">
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.scoreOptimization.annualCrops1'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.scoreOptimization.annualCrops2'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.scoreOptimization.annualCrops3'
                      })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({
                        id: 'education.detail.scoreOptimization.annualCrops4'
                      })}
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.scoreOptimization.berriesTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="xs">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.berries1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.berries2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.berries3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.scoreOptimization.berries4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.benchmarkTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.scoreOptimization.benchmarkDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'consumer-engagement',
        title: intl.formatMessage({ id: 'education.topicConsumerEngagementTitle' }),
        description: intl.formatMessage({ id: 'education.topicConsumerEngagementDesc' }),
        icon: FaUsers,
        category: intl.formatMessage({ id: 'education.categoryConsumerEngagement' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Text fontSize="lg">
              {intl.formatMessage({ id: 'education.detail.consumerEngagement.intro' })}
            </Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.consumerEngagement.qrPlacementTitle' })}
            </Heading>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({
                      id: 'education.detail.consumerEngagement.packagingTitle'
                    })}
                  </Heading>
                  <VStack spacing={2} align="stretch">
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({
                          id: 'education.detail.consumerEngagement.packaging1Label'
                        })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.packaging1' })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({
                          id: 'education.detail.consumerEngagement.packaging2Label'
                        })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.packaging2' })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({
                          id: 'education.detail.consumerEngagement.packaging3Label'
                        })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.packaging3' })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({
                          id: 'education.detail.consumerEngagement.packaging4Label'
                        })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.packaging4' })}
                    </Text>
                  </VStack>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.posTitle' })}
                  </Heading>
                  <VStack spacing={2} align="stretch">
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({
                          id: 'education.detail.consumerEngagement.pos1Label'
                        })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.pos1' })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({
                          id: 'education.detail.consumerEngagement.pos2Label'
                        })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.pos2' })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({
                          id: 'education.detail.consumerEngagement.pos3Label'
                        })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.pos3' })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({
                          id: 'education.detail.consumerEngagement.pos4Label'
                        })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.pos4' })}
                    </Text>
                  </VStack>
                </Box>
              </Grid>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.consumerEngagement.analyticsTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.keyMetrics' })}
                  </strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.consumerEngagement.totalScansLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.totalScans' })}
                  </ListItem>
                  <ListItem>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.consumerEngagement.returnScansLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.returnScans' })}
                  </ListItem>
                  <ListItem>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.consumerEngagement.geographicLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.geographic' })}
                  </ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({
                id: 'education.detail.consumerEngagement.relationshipsTitle'
              })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.eduLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.edu' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.trustLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.trust' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.consumerEngagement.premiumLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.premium' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.consumerEngagement.repeatLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.repeat' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.womLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.wom' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.consumerEngagement.perfTitle' })}
            </Heading>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.speedTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.speed1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.speed2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.speed3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.speed4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.mobileTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.mobile1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.mobile2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.mobile3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.mobile4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.commTitle' })}
                  </Heading>
                  <UnorderedList spacing={1} fontSize="sm">
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.comm1' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.comm2' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.comm3' })}
                    </ListItem>
                    <ListItem>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.comm4' })}
                    </ListItem>
                  </UnorderedList>
                </Box>
              </Grid>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.consumerEngagement.marketingTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.marketing1' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.marketing2' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.marketing3' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.marketing4' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.marketing5' })}
                </Text>
              </VStack>
            </Box>

            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.metricsTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.consumerEngagement.metricsDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'organic-system-plan',
        title: intl.formatMessage({ id: 'education.topicOrganicSystemPlanTitle' }),
        description: intl.formatMessage({ id: 'education.topicOrganicSystemPlanDesc' }),
        icon: FaClipboardList,
        category: intl.formatMessage({ id: 'education.categoryCompliance' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.organicSystemPlan.whatIsTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.organicSystemPlan.whatIsDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.organicSystemPlan.commonOspTitle' })}
            </Heading>
            <Text>
              {intl.formatMessage({ id: 'education.detail.organicSystemPlan.commonOspDesc' })}
            </Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({
                id: 'education.detail.organicSystemPlan.howTrazoHelpsTitle'
              })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.organicSystemPlan.guidedQuestionsLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({
                    id: 'education.detail.organicSystemPlan.guidedQuestions'
                  })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.organicSystemPlan.suggestedChipsLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({
                    id: 'education.detail.organicSystemPlan.suggestedChips'
                  })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.organicSystemPlan.naAttestationLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({
                    id: 'education.detail.organicSystemPlan.naAttestation'
                  })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.organicSystemPlan.planReviewLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.organicSystemPlan.planReview' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.organicSystemPlan.packetsLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.organicSystemPlan.packets' })}
                </Text>
              </VStack>
            </Box>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({
                    id: 'education.detail.organicSystemPlan.whereToFindTitle'
                  })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({
                    id: 'education.detail.organicSystemPlan.whereToFindDesc'
                  })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'renewal-season',
        title: intl.formatMessage({ id: 'education.topicRenewalSeasonTitle' }),
        description: intl.formatMessage({ id: 'education.topicRenewalSeasonDesc' }),
        icon: FaCalendarAlt,
        category: intl.formatMessage({ id: 'education.categoryCompliance' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.renewalSeason.whyNowTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.renewalSeason.whyNowDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.renewalSeason.occspTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.renewalSeason.occspDesc' })}</Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({
                id: 'education.detail.renewalSeason.certifierWindowsTitle'
              })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" color="gray.600">
                  {intl.formatMessage({
                    id: 'education.detail.renewalSeason.certifierWindowsIntro'
                  })}
                </Text>
                <UnorderedList spacing={2} pl={6}>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowCcof' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowOtco' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowPco' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowOeffa' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowNofaNy' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowWsda' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowMosa' })}
                  </ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.renewalSeason.completeUpdateTitle' })}
            </Heading>
            <UnorderedList spacing={2} pl={6}>
              <ListItem>
                {intl.formatMessage({ id: 'education.detail.renewalSeason.completeUpdate1' })}
              </ListItem>
              <ListItem>
                {intl.formatMessage({ id: 'education.detail.renewalSeason.completeUpdate2' })}
              </ListItem>
              <ListItem>
                {intl.formatMessage({ id: 'education.detail.renewalSeason.completeUpdate3' })}
              </ListItem>
              <ListItem>
                {intl.formatMessage({ id: 'education.detail.renewalSeason.completeUpdate4' })}
              </ListItem>
            </UnorderedList>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.renewalSeason.planReviewTitle' })}
            </Heading>
            <Text>
              {intl.formatMessage({ id: 'education.detail.renewalSeason.planReviewDesc' })}
            </Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.renewalSeason.migratingTitle' })}
            </Heading>
            <Text>
              {intl.formatMessage({ id: 'education.detail.renewalSeason.migratingDesc' })}
            </Text>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.renewalSeason.readinessTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.renewalSeason.readinessDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'inspection-prep',
        title: intl.formatMessage({ id: 'education.topicInspectionPrepTitle' }),
        description: intl.formatMessage({ id: 'education.topicInspectionPrepDesc' }),
        icon: FaClipboardCheck,
        category: intl.formatMessage({ id: 'education.categoryCompliance' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.inspectionPrep.introTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.inspectionPrep.introDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="stretch">
                    <Heading size="sm" color="gray.700">
                      {intl.formatMessage({ id: 'education.detail.inspectionPrep.inputsTitle' })}
                    </Heading>
                    <Text fontSize="sm" fontStyle="italic">
                      {intl.formatMessage({ id: 'education.detail.inspectionPrep.inputsQuestion' })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({ id: 'education.detail.inspectionPrep.recordsLabel' })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.inspectionPrep.inputsAnswer' })}
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="stretch">
                    <Heading size="sm" color="gray.700">
                      {intl.formatMessage({ id: 'education.detail.inspectionPrep.seedTitle' })}
                    </Heading>
                    <Text fontSize="sm" fontStyle="italic">
                      {intl.formatMessage({ id: 'education.detail.inspectionPrep.seedQuestion' })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({ id: 'education.detail.inspectionPrep.recordsLabel' })}
                      </strong>{' '}
                      {intl.formatMessage({ id: 'education.detail.inspectionPrep.seedAnswer' })}
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="stretch">
                    <Heading size="sm" color="gray.700">
                      {intl.formatMessage({
                        id: 'education.detail.inspectionPrep.tracebackTitle'
                      })}
                    </Heading>
                    <Text fontSize="sm" fontStyle="italic">
                      {intl.formatMessage({
                        id: 'education.detail.inspectionPrep.tracebackQuestion'
                      })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({ id: 'education.detail.inspectionPrep.recordsLabel' })}
                      </strong>{' '}
                      {intl.formatMessage({
                        id: 'education.detail.inspectionPrep.tracebackAnswer'
                      })}
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="stretch">
                    <Heading size="sm" color="gray.700">
                      {intl.formatMessage({
                        id: 'education.detail.inspectionPrep.equipmentTitle'
                      })}
                    </Heading>
                    <Text fontSize="sm" fontStyle="italic">
                      {intl.formatMessage({
                        id: 'education.detail.inspectionPrep.equipmentQuestion'
                      })}
                    </Text>
                    <Text fontSize="sm">
                      <strong>
                        {intl.formatMessage({ id: 'education.detail.inspectionPrep.recordsLabel' })}
                      </strong>{' '}
                      {intl.formatMessage({
                        id: 'education.detail.inspectionPrep.equipmentAnswer'
                      })}
                    </Text>
                  </VStack>
                </Box>
              </Grid>
            </Box>

            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.inspectionPrep.retentionTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.inspectionPrep.retentionDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.inspectionPrep.readinessTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.inspectionPrep.readinessDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'season-lifecycle',
        title: intl.formatMessage({ id: 'education.topicSeasonLifecycleTitle' }),
        description: intl.formatMessage({ id: 'education.topicSeasonLifecycleDesc' }),
        icon: FaSeedling,
        category: intl.formatMessage({ id: 'education.categoryFarmDocumentation' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.seasonLifecycle.introTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.seasonLifecycle.introDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.seasonLifecycle.startTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.startDesc' })}</Text>
            <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.startNote' })}</Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.seasonLifecycle.planTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.planDesc' })}</Text>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.plan1' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.plan2' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.plan3' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.plan4' })}</Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.seasonLifecycle.logTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.log1' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.log2' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.log3' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.log4' })}</Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.seasonLifecycle.finishTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.finishDesc' })}</Text>

            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.seasonLifecycle.finishWarnTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.seasonLifecycle.finishWarnDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.seasonLifecycle.afterTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.seasonLifecycle.afterDesc' })}</Text>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.seasonLifecycle.whereTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.seasonLifecycle.whereDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'osp-data',
        title: intl.formatMessage({ id: 'education.topicOspDataTitle' }),
        description: intl.formatMessage({ id: 'education.topicOspDataDesc' }),
        icon: FaDatabase,
        category: intl.formatMessage({ id: 'education.categoryCompliance' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.ospData.introTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.ospData.introDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>{intl.formatMessage({ id: 'education.detail.ospData.section1' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.ospData.section2' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.ospData.section3' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.ospData.section4' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.ospData.section5' })}</Text>
                <Text>{intl.formatMessage({ id: 'education.detail.ospData.section6' })}</Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.ospData.authorTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.ospData.authorDesc' })}</Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.ospData.prefillTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.ospData.prefillDesc' })}</Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.ospData.registryTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.ospData.registryDesc' })}</Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.ospData.parcelTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.ospData.parcelDesc' })}</Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.ospData.lockTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.ospData.lockDesc' })}</Text>

            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.ospData.updateTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.ospData.updateDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.ospData.whereTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.ospData.whereDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'record-corrections',
        title: intl.formatMessage({ id: 'education.topicRecordCorrectionsTitle' }),
        description: intl.formatMessage({ id: 'education.topicRecordCorrectionsDesc' }),
        icon: FaFileSignature,
        category: intl.formatMessage({ id: 'education.categoryCompliance' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.lockTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.lockDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.recordCorrections.hitLockTitle' })}
            </Heading>
            <Text>
              {intl.formatMessage({ id: 'education.detail.recordCorrections.hitLockDesc' })}
            </Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.recordCorrections.howTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.recordCorrections.step1Label' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.step1' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.recordCorrections.step2Label' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.step2' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.recordCorrections.step3Label' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.step3' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.recordCorrections.step4Label' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.step4' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.recordCorrections.packetTitle' })}
            </Heading>
            <Text>
              {intl.formatMessage({ id: 'education.detail.recordCorrections.packetDesc' })}
            </Text>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.recordCorrections.goodPracticeTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.good1' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.good2' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.good3' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.good4' })}
                </Text>
              </VStack>
            </Box>

            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.limitTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.limitDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.whereTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.recordCorrections.whereDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      },
      {
        id: 'buffer-zones',
        title: intl.formatMessage({ id: 'education.topicBufferZonesTitle' }),
        description: intl.formatMessage({ id: 'education.topicBufferZonesDesc' }),
        icon: FaMapMarkedAlt,
        category: intl.formatMessage({ id: 'education.categoryCompliance' }),
        content: (
          <VStack spacing={6} align="stretch">
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.bufferZones.ruleTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.bufferZones.ruleDesc' })}
                </AlertDescription>
              </Box>
            </Alert>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.bufferZones.recordPerBorderTitle' })}
            </Heading>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.bufferZones.adjoiningUseLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.bufferZones.adjoiningUse' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.bufferZones.bufferTypeLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.bufferZones.bufferType' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({
                      id: 'education.detail.bufferZones.lastProhibitedLabel'
                    })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.bufferZones.lastProhibited' })}
                </Text>
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.bufferZones.dispositionLabel' })}
                  </strong>{' '}
                  {intl.formatMessage({ id: 'education.detail.bufferZones.disposition' })}
                </Text>
              </VStack>
            </Box>

            <Heading size="md" color="gray.700">
              {intl.formatMessage({ id: 'education.detail.bufferZones.driftTitle' })}
            </Heading>
            <Text>{intl.formatMessage({ id: 'education.detail.bufferZones.driftDesc' })}</Text>

            <Alert status="success">
              <AlertIcon />
              <Box>
                <AlertTitle>
                  {intl.formatMessage({ id: 'education.detail.bufferZones.whereTitle' })}
                </AlertTitle>
                <AlertDescription>
                  {intl.formatMessage({ id: 'education.detail.bufferZones.whereDesc' })}
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        )
      }
    ],
    [intl]
  );

  const topic = documentationTopics.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'education.topicNotFound' })}
        showBackButton
        onBack={() => navigate('/admin/dashboard/education')}>
        <VStack spacing={6} py={8}>
          <Text>{intl.formatMessage({ id: 'education.topicNotFoundDescription' })}</Text>
        </VStack>
      </StandardPage>
    );
  }

  return (
    <StandardPage
      title={topic.title}
      description={topic.description}
      showBackButton
      onBack={() => navigate('/admin/dashboard/education')}>
      <VStack spacing={6} w="full" align="stretch">
        {/* 2026-08-21 — a header card stood here that printed the page's own <h1> a second
            time, through `education.learnAbout` with `topic.title.toLowerCase()` applied. It
            carried no information StandardPage was not already showing, and the lowercasing
            mangled every proper noun in a title: "what your records put in the osp", "your
            organic system plan in trazo". Its category line was also `green.500` AS TEXT on a
            white card — 2.78:1, the failure frontend.md calls out by name. The category is
            already on the hub card the reader clicked to get here. */}
        <Card w="full">
          <CardBody>
            <HStack align="start" spacing={4}>
              <Icon as={topic.icon} boxSize={8} color="green.700" flexShrink={0} />
              <Box flex="1" minW={0}>
                {topic.content}
              </Box>
            </HStack>
          </CardBody>
        </Card>
      </VStack>
    </StandardPage>
  );
};

export default EducationTopicDetail;
