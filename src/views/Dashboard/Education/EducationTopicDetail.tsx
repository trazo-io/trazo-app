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
  FaLeaf,
  FaQrcode,
  FaChartLine,
  FaRocket,
  FaTractor,
  FaShieldAlt,
  FaCheckCircle,
  FaPlayCircle,
  FaCamera,
  FaTrophy,
  FaUsers,
  FaCogs,
  FaDollarSign,
  FaMicrophone,
  FaCalculator,
  FaFlask,
  FaDatabase,
  FaGasPump,
  FaBolt,
  FaSeedling,
  FaExternalLinkAlt,
  FaBullhorn,
  FaSyncAlt,
  FaClipboardList,
  FaCalendarAlt,
  FaClipboardCheck,
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
        icon: FaRocket,
        category: intl.formatMessage({ id: 'education.categoryGettingStarted' }),
        content: (
          <VStack spacing={6} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaPlayCircle} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.gettingStarted.howItWorksTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.gettingStarted.step1Label' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step1' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.gettingStarted.step2Label' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step2' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.gettingStarted.step3Label' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step3' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.gettingStarted.step4Label' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step4' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.gettingStarted.step5Label' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.gettingStarted.step5' })}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaChartLine} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.gettingStarted.whyTransparencyTitle' })}
              </Heading>
            </HStack>
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
          <VStack spacing={6} align="start">
            <Text fontSize="lg">
              {intl.formatMessage({ id: 'education.detail.farmEvents.intro' })}
            </Text>

            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaTractor} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.productionTitle' })}
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.productionDesc' })}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.productionExamples' })}
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaFlask} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.chemicalTitle' })}
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.chemicalDesc' })}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.chemicalExamples' })}
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaSeedling} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.soilTitle' })}
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.soilDesc' })}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.soilExamples' })}
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaShieldAlt} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.pestTitle' })}
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.pestDesc' })}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.pestExamples' })}
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaLeaf} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.weatherTitle' })}
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.weatherDesc' })}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.weatherExamples' })}
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaChartLine} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.businessTitle' })}
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.businessDesc' })}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.businessExamples' })}
                    </Text>
                  </VStack>
                </Box>

                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaBook} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.farmEvents.generalTitle' })}
                      </Heading>
                    </HStack>
                    <Text fontSize="sm">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.generalDesc' })}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'education.detail.farmEvents.generalExamples' })}
                    </Text>
                  </VStack>
                </Box>
              </Grid>
            </Box>

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
          <VStack spacing={6} align="start">
            <HStack spacing={2} mb={3}>
              <Icon as={FaQrcode} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.qrCodes.howItWorksTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.qrCodes.progressiveLoadingLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.qrCodes.progressiveLoading' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.qrCodes.consumerLanguageLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.qrCodes.consumerLanguage' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.qrCodes.farmingJourneyLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.qrCodes.farmingJourney' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.qrCodes.trustIndicatorsLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.qrCodes.trustIndicators' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.qrCodes.carbonDetailsLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.qrCodes.carbonDetails' })}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCheckCircle} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.qrCodes.bestPracticesTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>📱 {intl.formatMessage({ id: 'education.detail.qrCodes.mobileFirst' })}</Text>
                <Text>🎯 {intl.formatMessage({ id: 'education.detail.qrCodes.valueProp' })}</Text>
                <Text>📍 {intl.formatMessage({ id: 'education.detail.qrCodes.placement' })}</Text>
                <Text>🔄 {intl.formatMessage({ id: 'education.detail.qrCodes.updates' })}</Text>
                <Text>📊 {intl.formatMessage({ id: 'education.detail.qrCodes.tracking' })}</Text>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaUsers} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.qrCodes.whatConsumersSeeTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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
          <VStack spacing={6} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaLeaf} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonData.philosophyTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaChartLine} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonData.stillMattersTitle' })}
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🏢 {intl.formatMessage({ id: 'education.detail.carbonData.b2bTitle' })}
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
                    📊 {intl.formatMessage({ id: 'education.detail.carbonData.internalTitle' })}
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaDatabase} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonData.usdaTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaUsers} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonData.presentationTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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
          <VStack spacing={6} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaDatabase} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonMethodology.dataSourcesTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={4} align="start">
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">
                      {intl.formatMessage({ id: 'education.detail.carbonMethodology.epaGhgTitle' })}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.epaGhgDesc' })}
                  </Text>
                  <Link
                    href="https://www.epa.gov/climateleadership/ghg-emission-factors-hub"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    epa.gov/climateleadership/ghg-emission-factors-hub
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.epaEgridTitle'
                      })}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.epaEgridDesc' })}
                  </Text>
                  <Link
                    href="https://www.epa.gov/egrid/summary-data"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    epa.gov/egrid/summary-data
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">
                      {intl.formatMessage({ id: 'education.detail.carbonMethodology.eiaTitle' })}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.eiaDesc' })}
                  </Text>
                  <Link
                    href="https://www.eia.gov/tools/faqs/faq.php?id=74&t=11"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    eia.gov - Electricity CO₂ FAQ
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">
                      {intl.formatMessage({ id: 'education.detail.carbonMethodology.ipccTitle' })}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.ipccDesc' })}
                  </Text>
                  <Link
                    href="https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/4_Volume4/V4_11_Ch11_N2O&CO2.pdf"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    IPCC Vol 4 Ch 11 - N₂O Emissions (PDF)
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.usdaArsTitle'
                      })}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.usdaArsDesc' })}
                  </Text>
                  <Link
                    href="https://www.ars.usda.gov"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    ars.usda.gov
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.usdaNrcsTitle'
                      })}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.usdaNrcsDesc' })}
                  </Text>
                  <Link
                    href="https://www.wcc.nrcs.usda.gov/ftpref/wntsc/waterMgt/irrigation/NEH15/ch8.pdf"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
                    pl={6}
                    mt={1}
                    display="flex"
                    alignItems="center">
                    <Icon as={FaExternalLinkAlt} mr={1} />
                    NRCS National Engineering Handbook - Chapter 8 (PDF)
                  </Link>
                </Box>
                <Box>
                  <HStack mb={1}>
                    <Icon as={FaCheckCircle} color="green.600" />
                    <Text fontWeight="bold">
                      {intl.formatMessage({
                        id: 'education.detail.carbonMethodology.pesticideLcaTitle'
                      })}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" pl={6}>
                    {intl.formatMessage({
                      id: 'education.detail.carbonMethodology.pesticideLcaDesc'
                    })}
                  </Text>
                  <Link
                    href="https://www.sciencedirect.com/science/article/abs/pii/S0160412004000832"
                    isExternal
                    fontSize="xs"
                    color="blue.600"
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaGasPump} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonMethodology.dieselTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaBolt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonMethodology.electricityTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaSeedling} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonMethodology.fertilizerTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaFlask} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonMethodology.chemicalTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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
                      <Text fontSize="lg" fontWeight="bold" color="orange.600">
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
                      <Text fontSize="lg" fontWeight="bold" color="orange.600">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaCalculator} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonMethodology.calculationTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={4} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaLeaf} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.carbonMethodology.philosophyTitle' })}
              </Heading>
            </HStack>
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
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes1' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes2' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes3' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes4' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes5' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.carbonMethodology.includes6' })}
                  </Text>
                </HStack>
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
        icon: FaPlayCircle,
        category: intl.formatMessage({ id: 'education.categoryGettingStarted' }),
        content: (
          <VStack spacing={6} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaCogs} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.firstProduction.step1Title' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.firstProduction.farmInfoLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.firstProduction.farmInfo' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.firstProduction.cropSelectionLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.firstProduction.cropSelection' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.firstProduction.farmSizeLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.firstProduction.farmSize' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.firstProduction.approachLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.firstProduction.approach' })}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaSeedling} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.firstProduction.step2Title' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaBook} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.firstProduction.step3Title' })}
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    📝{' '}
                    {intl.formatMessage({ id: 'education.detail.firstProduction.startWithTitle' })}
                  </Heading>
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.firstProduction.startWith' })}
                  </Text>
                </Box>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    📸{' '}
                    {intl.formatMessage({ id: 'education.detail.firstProduction.addPhotoTitle' })}
                  </Heading>
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'education.detail.firstProduction.addPhoto' })}
                  </Text>
                </Box>
              </Grid>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaQrcode} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.firstProduction.step4Title' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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
          <VStack spacing={6} align="start">
            <Text fontSize="lg">
              {intl.formatMessage({ id: 'education.detail.eventMastery.intro' })}
            </Text>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCamera} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.eventMastery.realTimeVsBatchTitle' })}
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="green.700" mb={2}>
                    ⚡ {intl.formatMessage({ id: 'education.detail.eventMastery.realTimeTitle' })}
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
                  <Heading size="sm" color="yellow.600" mb={2}>
                    📝 {intl.formatMessage({ id: 'education.detail.eventMastery.batchTitle' })}
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaCamera} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.eventMastery.photoTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>
                    📸 {intl.formatMessage({ id: 'education.detail.eventMastery.whatToPhoto' })}
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
                    📱 {intl.formatMessage({ id: 'education.detail.eventMastery.technicalTips' })}
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaMicrophone} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.eventMastery.voiceTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaMicrophone} color="purple.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.eventMastery.voiceCommandsLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.eventMastery.voiceCommands' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaMicrophone} color="purple.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.quickNotesLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.eventMastery.quickNotes' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaMicrophone} color="purple.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.eventMastery.handsFreeLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.eventMastery.handsFree' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaMicrophone} color="purple.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.eventMastery.autoTranscriptionLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.eventMastery.autoTranscription' })}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaLeaf} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.eventMastery.seasonalTitle' })}
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="green.700" mb={2}>
                    🌱{' '}
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
                  <Heading size="sm" color="yellow.600" mb={2}>
                    🌾{' '}
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
                  <Heading size="sm" color="orange.600" mb={2}>
                    🍂{' '}
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
        icon: FaTrophy,
        category: intl.formatMessage({ id: 'education.categoryCompliance' }),
        content: (
          <VStack spacing={6} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaCalculator} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.scoreOptimization.weightsTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaTrophy} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.scoreOptimization.strategyTitle' })}
              </Heading>
            </HStack>
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaShieldAlt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.scoreOptimization.mistakesTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaSeedling} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.scoreOptimization.cropTypesTitle' })}
              </Heading>
            </HStack>
            <Box overflowX="auto" w="full">
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
                gap={4}
                minW={{ base: '280px', md: 'auto' }}>
                <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Heading size="sm" color="gray.700" mb={2}>
                    🥑{' '}
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
                    🌾{' '}
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
                    🫐{' '}
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
          <VStack spacing={6} align="start">
            <Text fontSize="lg">
              {intl.formatMessage({ id: 'education.detail.consumerEngagement.intro' })}
            </Text>

            <HStack spacing={2} mb={3}>
              <Icon as={FaQrcode} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.consumerEngagement.qrPlacementTitle' })}
              </Heading>
            </HStack>
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
                  <VStack spacing={2} align="start">
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
                  <VStack spacing={2} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaChartLine} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.consumerEngagement.analyticsTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <Text>
                  <strong>
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.keyMetrics' })}
                  </strong>
                </Text>
                <UnorderedList spacing={1} pl={6}>
                  <ListItem>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.consumerEngagement.scanRateLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.scanRate' })}
                  </ListItem>
                  <ListItem>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.consumerEngagement.completionRateLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({
                      id: 'education.detail.consumerEngagement.completionRate'
                    })}
                  </ListItem>
                  <ListItem>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.consumerEngagement.engagementTimeLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({
                      id: 'education.detail.consumerEngagement.engagementTime'
                    })}
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
                  <ListItem>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.consumerEngagement.peakTimesLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.peakTimes' })}
                  </ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaUsers} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({
                  id: 'education.detail.consumerEngagement.relationshipsTitle'
                })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.eduLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.edu' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.trustLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.trust' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.consumerEngagement.premiumLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.premium' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.consumerEngagement.repeatLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.repeat' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaUsers} color="yellow.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.consumerEngagement.womLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.consumerEngagement.wom' })}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaRocket} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.consumerEngagement.perfTitle' })}
              </Heading>
            </HStack>
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaBullhorn} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.consumerEngagement.marketingTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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
          <VStack spacing={6} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaClipboardList} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.organicSystemPlan.commonOspTitle' })}
              </Heading>
            </HStack>
            <Text>
              {intl.formatMessage({ id: 'education.detail.organicSystemPlan.commonOspDesc' })}
            </Text>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCheckCircle} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({
                  id: 'education.detail.organicSystemPlan.howTrazoHelpsTitle'
                })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
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
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
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
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
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
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.organicSystemPlan.packetsLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.organicSystemPlan.packets' })}
                  </Text>
                </HStack>
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
          <VStack spacing={6} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaDollarSign} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.renewalSeason.occspTitle' })}
              </Heading>
            </HStack>
            <Text>{intl.formatMessage({ id: 'education.detail.renewalSeason.occspDesc' })}</Text>

            <HStack spacing={2} mb={3}>
              <Icon as={FaCalendarAlt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({
                  id: 'education.detail.renewalSeason.certifierWindowsTitle'
                })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
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
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowPco' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowMosa' })}
                  </ListItem>
                  <ListItem>
                    {intl.formatMessage({ id: 'education.detail.renewalSeason.windowOtco' })}
                  </ListItem>
                </UnorderedList>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaClipboardCheck} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.renewalSeason.completeUpdateTitle' })}
              </Heading>
            </HStack>
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaSyncAlt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.renewalSeason.migratingTitle' })}
              </Heading>
            </HStack>
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
          <VStack spacing={6} align="start">
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
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaFlask} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.inspectionPrep.inputsTitle' })}
                      </Heading>
                    </HStack>
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
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaSeedling} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({ id: 'education.detail.inspectionPrep.seedTitle' })}
                      </Heading>
                    </HStack>
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
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaTractor} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.inspectionPrep.tracebackTitle'
                        })}
                      </Heading>
                    </HStack>
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
                  <VStack spacing={2} align="start">
                    <HStack>
                      <Icon as={FaShieldAlt} color="green.600" />
                      <Heading size="sm" color="gray.700">
                        {intl.formatMessage({
                          id: 'education.detail.inspectionPrep.equipmentTitle'
                        })}
                      </Heading>
                    </HStack>
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
        id: 'buffer-zones',
        title: intl.formatMessage({ id: 'education.topicBufferZonesTitle' }),
        description: intl.formatMessage({ id: 'education.topicBufferZonesDesc' }),
        icon: FaMapMarkedAlt,
        category: intl.formatMessage({ id: 'education.categoryCompliance' }),
        content: (
          <VStack spacing={6} align="start">
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

            <HStack spacing={2} mb={3}>
              <Icon as={FaMapMarkedAlt} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.bufferZones.recordPerBorderTitle' })}
              </Heading>
            </HStack>
            <Box p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="start">
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.bufferZones.adjoiningUseLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.bufferZones.adjoiningUse' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.bufferZones.bufferTypeLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.bufferZones.bufferType' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({
                        id: 'education.detail.bufferZones.lastProhibitedLabel'
                      })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.bufferZones.lastProhibited' })}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.600" />
                  <Text>
                    <strong>
                      {intl.formatMessage({ id: 'education.detail.bufferZones.dispositionLabel' })}
                    </strong>{' '}
                    {intl.formatMessage({ id: 'education.detail.bufferZones.disposition' })}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            <HStack spacing={2} mb={3}>
              <Icon as={FaBullhorn} color="green.600" boxSize={5} />
              <Heading size="md" color="gray.700">
                {intl.formatMessage({ id: 'education.detail.bufferZones.driftTitle' })}
              </Heading>
            </HStack>
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
        {/* Topic Header with Icon */}
        <Card w="full">
          <CardBody>
            <HStack>
              <Icon as={topic.icon} boxSize={8} color="green.500" />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" color="green.500" fontWeight="medium">
                  {topic.category}
                </Text>
                <Heading size="md" color="gray.700">
                  {intl.formatMessage(
                    { id: 'education.learnAbout' },
                    { topic: topic.title.toLowerCase() }
                  )}
                </Heading>
              </VStack>
            </HStack>
          </CardBody>
        </Card>

        {/* Topic Content */}
        <Card w="full">
          <CardBody>{topic.content}</CardBody>
        </Card>
      </VStack>
    </StandardPage>
  );
};

export default EducationTopicDetail;
