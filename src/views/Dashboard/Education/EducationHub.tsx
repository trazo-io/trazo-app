import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  SimpleGrid,
  useColorModeValue,
  useBreakpointValue
} from '@chakra-ui/react';
import {
  FaBook,
  FaChevronRight,
  FaQrcode,
  FaRocket,
  FaTractor,
  FaPlayCircle,
  FaCamera,
  FaTrophy,
  FaUsers,
  FaCalculator,
  FaLeaf,
  FaClipboardList,
  FaCalendarAlt,
  FaClipboardCheck,
  FaMapMarkedAlt
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { StandardPage, StandardSearchInput } from 'components/Design/StandardComponents';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

interface DocumentationTopic {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: string;
}

const EducationHub: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const intl = useIntl();

  // Theme colors
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'white');

  // Responsive values
  const columns = useBreakpointValue({ base: 1, md: 2, lg: 3 });

  // Trazo-specific documentation topics
  const documentationTopics: DocumentationTopic[] = [
    {
      id: 'getting-started',
      title: intl.formatMessage({ id: 'education.topicGettingStartedTitle' }),
      description: intl.formatMessage({ id: 'education.topicGettingStartedDesc' }),
      icon: FaRocket,
      category: intl.formatMessage({ id: 'education.categoryGettingStarted' })
    },
    {
      id: 'farm-events',
      title: intl.formatMessage({ id: 'education.topicFarmEventsTitle' }),
      description: intl.formatMessage({ id: 'education.topicFarmEventsDesc' }),
      icon: FaTractor,
      category: intl.formatMessage({ id: 'education.categoryFarmDocumentation' })
    },
    // 'transparency-score' topic removed 2026-08-09: the numeric score renders
    // NOWHERE anymore (farm/transparency route redirects home; the journey strip
    // dropped it 2026-06). Education must not teach the mechanics of an invisible
    // number — completeness guidance lives in 'score-optimization' (retitled
    // "Building a Complete Season Record") and the readiness card itself.
    {
      id: 'qr-codes',
      title: intl.formatMessage({ id: 'education.topicQrCodesTitle' }),
      description: intl.formatMessage({ id: 'education.topicQrCodesDesc' }),
      icon: FaQrcode,
      category: intl.formatMessage({ id: 'education.categoryConsumerEngagement' })
    },
    // 'blockchain' topic removed 2026-08-09: it taught the withdrawn $15/mo consumer
    // add-on as a current feature (BLOCKCHAIN_ENABLED defaults False; no consumer badge
    // exists). See blockchain-disabled-2026-08-06.
    {
      id: 'carbon-data',
      title: intl.formatMessage({ id: 'education.topicCarbonDataTitle' }),
      description: intl.formatMessage({ id: 'education.topicCarbonDataDesc' }),
      icon: FaLeaf,
      category: intl.formatMessage({ id: 'education.categoryEnvironmentalImpact' })
    },
    {
      id: 'carbon-methodology',
      title: intl.formatMessage({ id: 'education.topicCarbonMethodologyTitle' }),
      description: intl.formatMessage({ id: 'education.topicCarbonMethodologyDesc' }),
      icon: FaCalculator,
      category: intl.formatMessage({ id: 'education.categoryEnvironmentalImpact' })
    },
    {
      id: 'first-production',
      title: intl.formatMessage({ id: 'education.topicFirstProductionTitle' }),
      description: intl.formatMessage({ id: 'education.topicFirstProductionDesc' }),
      icon: FaPlayCircle,
      category: intl.formatMessage({ id: 'education.categoryGettingStarted' })
    },
    {
      id: 'event-mastery',
      title: intl.formatMessage({ id: 'education.topicEventMasteryTitle' }),
      description: intl.formatMessage({ id: 'education.topicEventMasteryDesc' }),
      icon: FaCamera,
      category: intl.formatMessage({ id: 'education.categoryFarmDocumentation' })
    },
    {
      id: 'score-optimization',
      title: intl.formatMessage({ id: 'education.topicScoreOptimizationTitle' }),
      description: intl.formatMessage({ id: 'education.topicScoreOptimizationDesc' }),
      icon: FaTrophy,
      category: intl.formatMessage({ id: 'education.categoryCompliance' })
    },
    {
      id: 'consumer-engagement',
      title: intl.formatMessage({ id: 'education.topicConsumerEngagementTitle' }),
      description: intl.formatMessage({ id: 'education.topicConsumerEngagementDesc' }),
      icon: FaUsers,
      category: intl.formatMessage({ id: 'education.categoryConsumerEngagement' })
    },
    // 'subscription-features' removed 2026-08-09: it taught the dead
    // Starter/Standard/Corporate tier model. Current pricing lives on the
    // Subscription page — education must not duplicate it (stale duplication is
    // how a farmer learned a pricing model that no longer exists).
    // 'advanced-features' removed 2026-08-09: card had no matching topic —
    // every click landed on "Topic Not Found".
    {
      id: 'organic-system-plan',
      title: intl.formatMessage({ id: 'education.topicOrganicSystemPlanTitle' }),
      description: intl.formatMessage({ id: 'education.topicOrganicSystemPlanDesc' }),
      icon: FaClipboardList,
      category: intl.formatMessage({ id: 'education.categoryCompliance' })
    },
    {
      id: 'renewal-season',
      title: intl.formatMessage({ id: 'education.topicRenewalSeasonTitle' }),
      description: intl.formatMessage({ id: 'education.topicRenewalSeasonDesc' }),
      icon: FaCalendarAlt,
      category: intl.formatMessage({ id: 'education.categoryCompliance' })
    },
    {
      id: 'inspection-prep',
      title: intl.formatMessage({ id: 'education.topicInspectionPrepTitle' }),
      description: intl.formatMessage({ id: 'education.topicInspectionPrepDesc' }),
      icon: FaClipboardCheck,
      category: intl.formatMessage({ id: 'education.categoryCompliance' })
    },
    {
      id: 'buffer-zones',
      title: intl.formatMessage({ id: 'education.topicBufferZonesTitle' }),
      description: intl.formatMessage({ id: 'education.topicBufferZonesDesc' }),
      icon: FaMapMarkedAlt,
      category: intl.formatMessage({ id: 'education.categoryCompliance' })
    }
  ];

  // Filter topics based on search
  const filteredTopics = documentationTopics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTopicClick = (topicId: string) => {
    navigate(`/admin/dashboard/education/topic/${topicId}`);
  };

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'education.pageTitle' })}
      description={intl.formatMessage({ id: 'education.pageDescription' })}
>
      <VStack spacing={6} w="full" align="stretch">
        {/* Search — the app's one search field (same control as the navbar and Documents),
            left-aligned on the content column rather than floating centre-stage. */}
        <StandardSearchInput
          placeholder={intl.formatMessage({ id: 'education.searchPlaceholder' })}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          maxW={{ base: 'full', smd: '360px' }}
        />

        {/* Documentation Topics */}
        <SimpleGrid columns={columns} spacing={6} w="full">
          {filteredTopics.map((topic) => (
            <Card key={topic.id} bg={cardBg}>
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <HStack>
                    <Icon as={topic.icon} boxSize={6} color="green.700" />
                    <Text fontSize="sm" color="green.700" fontWeight="medium">
                      {topic.category}
                    </Text>
                  </HStack>

                  <VStack spacing={2} align="start">
                    <Heading size="md" color={headingColor}>
                      {topic.title}
                    </Heading>
                    <Text color={textColor} fontSize="sm">
                      {topic.description}
                    </Text>
                  </VStack>

                  <Button
                    rightIcon={<FaChevronRight />}
                    variant="outline"
                    colorScheme="green"
                    size="sm"
                    onClick={() => handleTopicClick(topic.id)}
                  >
                    {intl.formatMessage({ id: 'education.readMore' })}
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        {/* Empty state */}
        {filteredTopics.length === 0 && (
          <Box textAlign="center" py={12}>
            <Icon as={FaBook} boxSize={12} color="gray.300" mb={4} />
            <Text color={textColor}>
              {intl.formatMessage({ id: 'education.noResultsFound' }, { searchTerm })}
            </Text>
          </Box>
        )}

        {/* FAQ entry — the /education/faq route existed with no inbound link anywhere. */}
        <Card bg={cardBg} w="full">
          <CardBody p={6}>
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <HStack spacing={3}>
                <Icon as={FaBook} boxSize={6} color="green.700" />
                <VStack spacing={0} align="start">
                  <Heading size="sm" color={headingColor}>
                    {intl.formatMessage({ id: 'education.faqCardTitle' })}
                  </Heading>
                  <Text color={textColor} fontSize="sm">
                    {intl.formatMessage({ id: 'education.faqCardDesc' })}
                  </Text>
                </VStack>
              </HStack>
              <Button
                rightIcon={<FaChevronRight />}
                variant="outline"
                colorScheme="green"
                size="sm"
                onClick={() => navigate('/admin/dashboard/education/faq')}
              >
                {intl.formatMessage({ id: 'education.faqCardCta' })}
              </Button>
            </HStack>
          </CardBody>
        </Card>
      </VStack>
    </StandardPage>
  );
};

export default EducationHub;
