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
      title: 'Understanding Trazo: Your Agricultural Transparency Platform',
      description:
        'Learn how Trazo transforms farm documentation into consumer trust and premium pricing',
      icon: FaRocket,
      category: 'Getting Started'
    },
    {
      id: 'farm-events',
      title: 'The 8 Core Event Types: Your Transparency Building Blocks',
      description: 'Master each event type to maximize your transparency score and consumer trust',
      icon: FaTractor,
      category: 'Farm Documentation'
    },
    {
      id: 'transparency-score',
      title: 'Transparency Scoring: Your Consumer Trust Metric',
      description:
        'Understanding how Trazo calculates transparency scores and what they mean to consumers',
      icon: FaChartLine,
      category: 'Transparency System'
    },
    {
      id: 'qr-codes',
      title: 'QR Codes & Consumer Pages: Your Digital Farm Story',
      description: 'Create compelling consumer experiences that showcase your transparency',
      icon: FaQrcode,
      category: 'Consumer Engagement'
    },
    {
      id: 'blockchain',
      title: 'Blockchain Verification: Immutable Trust Infrastructure',
      description: 'How Trazo uses Polygon blockchain to create unshakeable consumer confidence',
      icon: FaShieldAlt,
      category: 'Verification System'
    },
    {
      id: 'carbon-data',
      title: "Carbon Data's Supporting Role in the Transparency-First Approach",
      description:
        'Understanding how environmental data enhances transparency without overwhelming consumers',
      icon: FaLeaf,
      category: 'Environmental Impact'
    },
    {
      id: 'carbon-methodology',
      title: 'Carbon Calculation Methodology: How We Calculate Environmental Impact',
      description:
        'Detailed explanation of our carbon calculation methods using EPA and USDA verified emission factors',
      icon: FaCalculator,
      category: 'Environmental Impact'
    },
    {
      id: 'first-production',
      title: 'Starting Your First Production: From Setup to Success',
      description:
        'Complete walkthrough of creating your first production batch and setting up your farm profile',
      icon: FaPlayCircle,
      category: 'Getting Started'
    },
    {
      id: 'event-mastery',
      title: 'Mastering Event Documentation: Best Practices Guide',
      description:
        'When and how to log events, photo evidence strategies, and real-time documentation workflows',
      icon: FaCamera,
      category: 'Farm Documentation'
    },
    {
      id: 'score-optimization',
      title: 'Maximizing Your Transparency Score: 90%+ Strategies',
      description:
        'Proven techniques to achieve excellent transparency scores and maximize consumer trust',
      icon: FaTrophy,
      category: 'Transparency System'
    },
    {
      id: 'consumer-engagement',
      title: 'Consumer Engagement & Marketing Success',
      description: 'QR code placement, scan analytics, and building direct customer relationships',
      icon: FaUsers,
      category: 'Consumer Engagement'
    },
    {
      id: 'subscription-features',
      title: 'Subscription Features & Benefits',
      description:
        'Understanding feature tiers, upgrade benefits, and maximizing transparency value',
      icon: FaCrown,
      category: 'Business Growth'
    },
    {
      id: 'advanced-features',
      title: 'Integration & Advanced Features: Scaling Your Operation',
      description:
        'IoT sensors, voice commands, API integration, and automation for efficient farm management',
      icon: FaCogs,
      category: 'Advanced Features'
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
      title="Educational Resources"
      description="Comprehensive documentation of Trazo's features and capabilities - understand every aspect of the agricultural transparency platform"
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
              placeholder="Search documentation..."
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
                    Read More
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
            <Text color={textColor}>No documentation found matching "{searchTerm}"</Text>
          </Box>
        )}
      </VStack>
    </StandardPage>
  );
};

export default EducationHub;
