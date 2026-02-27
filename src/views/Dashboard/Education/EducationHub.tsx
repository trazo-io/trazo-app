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
  useBreakpointValue,
  Input,
  InputGroup,
  InputLeftElement
} from '@chakra-ui/react';
import {
  FaBook,
  FaSearch,
  FaChevronRight,
  FaQrcode,
  FaChartLine,
  FaRocket,
  FaTractor,
  FaShieldAlt,
  FaPlayCircle,
  FaCamera,
  FaTrophy,
  FaUsers,
  FaCrown,
  FaCogs,
  FaCalculator,
  FaLeaf
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { StandardPage } from 'components/Design/StandardComponents';
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
    {
      id: 'transparency-score',
      title: intl.formatMessage({ id: 'education.topicTransparencyScoreTitle' }),
      description: intl.formatMessage({ id: 'education.topicTransparencyScoreDesc' }),
      icon: FaChartLine,
      category: intl.formatMessage({ id: 'education.categoryTransparencySystem' })
    },
    {
      id: 'qr-codes',
      title: intl.formatMessage({ id: 'education.topicQrCodesTitle' }),
      description: intl.formatMessage({ id: 'education.topicQrCodesDesc' }),
      icon: FaQrcode,
      category: intl.formatMessage({ id: 'education.categoryConsumerEngagement' })
    },
    {
      id: 'blockchain',
      title: intl.formatMessage({ id: 'education.topicBlockchainTitle' }),
      description: intl.formatMessage({ id: 'education.topicBlockchainDesc' }),
      icon: FaShieldAlt,
      category: intl.formatMessage({ id: 'education.categoryVerificationSystem' })
    },
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
      category: intl.formatMessage({ id: 'education.categoryTransparencySystem' })
    },
    {
      id: 'consumer-engagement',
      title: intl.formatMessage({ id: 'education.topicConsumerEngagementTitle' }),
      description: intl.formatMessage({ id: 'education.topicConsumerEngagementDesc' }),
      icon: FaUsers,
      category: intl.formatMessage({ id: 'education.categoryConsumerEngagement' })
    },
    {
      id: 'subscription-features',
      title: intl.formatMessage({ id: 'education.topicSubscriptionFeaturesTitle' }),
      description: intl.formatMessage({ id: 'education.topicSubscriptionFeaturesDesc' }),
      icon: FaCrown,
      category: intl.formatMessage({ id: 'education.categoryBusinessGrowth' })
    },
    {
      id: 'advanced-features',
      title: intl.formatMessage({ id: 'education.topicAdvancedFeaturesTitle' }),
      description: intl.formatMessage({ id: 'education.topicAdvancedFeaturesDesc' }),
      icon: FaCogs,
      category: intl.formatMessage({ id: 'education.categoryAdvancedFeatures' })
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
      showBackButton
      onBack={() => navigate(-1)}
    >
      <VStack spacing={6} w="full" maxW="6xl" mx="auto">
        {/* Search */}
        <Box maxW="md" w="full">
          <InputGroup>
            <InputLeftElement>
              <Icon as={FaSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder={intl.formatMessage({ id: 'education.searchPlaceholder' })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg={cardBg}
            />
          </InputGroup>
        </Box>

        {/* Documentation Topics */}
        <SimpleGrid columns={columns} spacing={6} w="full">
          {filteredTopics.map((topic) => (
            <Card key={topic.id} bg={cardBg}>
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <HStack>
                    <Icon as={topic.icon} boxSize={6} color="green.500" />
                    <Text fontSize="sm" color="green.500" fontWeight="medium">
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
            <Text color={textColor}>{intl.formatMessage({ id: 'education.noResultsFound' }, { searchTerm })}</Text>
          </Box>
        )}
      </VStack>
    </StandardPage>
  );
};

export default EducationHub;
