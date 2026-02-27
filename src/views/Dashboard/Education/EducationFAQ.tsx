import React, { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  Badge,
  useColorModeValue,
  useBreakpointValue,
  Input,
  InputGroup,
  InputLeftElement,
  Skeleton,
  SkeletonText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Center,
  Spinner
} from '@chakra-ui/react';
import { FaQuestionCircle, FaSearch, FaArrowLeft, FaTag } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

// Import education API hooks
import {
  useGetFarmerQuestionsQuery,
  useGetEducationCategoriesQuery,
  FarmerQuestionAnswer,
  EducationCategory
} from 'store/api/educationApi';

const EducationFAQ: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const intl = useIntl();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const containerMaxW = useBreakpointValue({ base: 'full', lg: '6xl' });

  // Theme colors
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');

  // API queries
  const {
    data: allFAQs,
    isLoading: isFAQsLoading,
    error: faqError
  } = useGetFarmerQuestionsQuery({
    category_id: selectedCategory || undefined,
    search: searchQuery || undefined
  });
  const { data: categories } = useGetEducationCategoriesQuery();

  // Show loading state
  if (isFAQsLoading) {
    return (
      <Box bg={bgColor} minH="100vh">
        <Container maxW={containerMaxW} py={{ base: 4, md: 8 }}>
          <Center py={20}>
            <VStack spacing={4}>
              <Spinner size="xl" color="green.500" thickness="3px" />
              <Text color={textColor}>{intl.formatMessage({ id: 'education.faqLoading' })}</Text>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  // Show error state
  if (faqError) {
    return (
      <Box bg={bgColor} minH="100vh">
        <Container maxW={containerMaxW} py={{ base: 4, md: 8 }}>
          <Alert status="error" variant="subtle" borderRadius="xl" maxW="2xl" mx="auto">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <AlertTitle>{intl.formatMessage({ id: 'education.faqErrorTitle' })}</AlertTitle>
              <AlertDescription>
                {intl.formatMessage({ id: 'education.faqErrorDescription' })}
              </AlertDescription>
            </VStack>
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW={containerMaxW} py={{ base: 4, md: 8 }}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box>
            <Button
              leftIcon={<Icon as={FaArrowLeft} />}
              variant="ghost"
              onClick={() => navigate('/education')}
              mb={4}
            >
              {intl.formatMessage({ id: 'education.faqBackToEducation' })}
            </Button>

            <Box textAlign="center" py={6}>
              <Icon as={FaQuestionCircle} boxSize={12} color="blue.500" mb={4} />
              <Heading size={isMobile ? 'xl' : '2xl'} mb={4} color={textColor}>
                {intl.formatMessage({ id: 'education.faqPageTitle' })}
              </Heading>
              <Text fontSize="lg" color={mutedTextColor} maxW="2xl" mx="auto">
                {intl.formatMessage({ id: 'education.faqPageDescription' })}
              </Text>
            </Box>
          </Box>

          {/* Search and Filter */}
          <Card bg={cardBgColor} borderRadius="xl" boxShadow="sm">
            <CardBody>
              <VStack spacing={4} align="stretch">
                <InputGroup maxW={{ base: 'full', md: '500px' }} mx="auto">
                  <InputLeftElement>
                    <Icon as={FaSearch} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder={intl.formatMessage({ id: 'education.faqSearchPlaceholder' })}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="lg"
                  />
                </InputGroup>

                {/* Category Filter */}
                {categories && categories.length > 0 && (
                  <HStack spacing={2} flexWrap="wrap" justify="center">
                    <Button
                      size="sm"
                      variant={selectedCategory === null ? 'solid' : 'outline'}
                      colorScheme="blue"
                      onClick={() => setSelectedCategory(null)}
                    >
                      {intl.formatMessage({ id: 'education.faqAllCategories' })}
                    </Button>
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        size="sm"
                        variant={selectedCategory === category.id ? 'solid' : 'outline'}
                        colorScheme="blue"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </HStack>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* FAQ List */}
          {allFAQs && allFAQs.length > 0 ? (
            <VStack spacing={4} align="stretch">
              {allFAQs.map((faq) => (
                <FAQCard key={faq.id} faq={faq} />
              ))}
            </VStack>
          ) : (
            <Card bg={cardBgColor} borderRadius="xl" boxShadow="sm">
              <CardBody py={16} textAlign="center">
                <Icon as={FaQuestionCircle} boxSize={12} color="gray.400" mb={4} />
                <Heading size="md" color={textColor} mb={2}>
                  {intl.formatMessage({ id: searchQuery ? 'education.faqNoQuestionsFound' : 'education.faqComingSoon' })}
                </Heading>
                <Text color={mutedTextColor}>
                  {intl.formatMessage({ id: searchQuery ? 'education.faqNoQuestionsDescription' : 'education.faqComingSoonDescription' })}
                </Text>
                {searchQuery && (
                  <Button mt={4} variant="outline" onClick={() => setSearchQuery('')}>
                    {intl.formatMessage({ id: 'education.faqClearSearch' })}
                  </Button>
                )}
              </CardBody>
            </Card>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

// Component for FAQ cards
interface FAQCardProps {
  faq: FarmerQuestionAnswer;
}

const FAQCard: React.FC<FAQCardProps> = ({ faq }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const intl = useIntl();
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Card bg={cardBgColor} borderRadius="xl" boxShadow="sm">
      <CardBody p={6}>
        <VStack align="stretch" spacing={4}>
          {/* Question */}
          <HStack
            justify="space-between"
            align="start"
            cursor="pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            _hover={{ opacity: 0.8 }}
          >
            <Heading size="sm" color={textColor} flex={1} pr={4}>
              {faq.question}
            </Heading>
            <Icon
              as={FaQuestionCircle}
              color="blue.500"
              transform={isExpanded ? 'rotate(180deg)' : 'none'}
              transition="transform 0.2s"
              flexShrink={0}
            />
          </HStack>

          {/* Answer - only show when expanded */}
          {isExpanded && (
            <Box pl={4} borderLeft="3px solid" borderColor="blue.200">
              <Text fontSize="sm" color={mutedTextColor} lineHeight="1.6">
                {faq.answer}
              </Text>
            </Box>
          )}

          {/* Tags and metadata */}
          <HStack justify="space-between" align="center" pt={2}>
            <HStack spacing={2} flexWrap="wrap">
              {faq.is_featured && (
                <Badge colorScheme="yellow" size="sm">
                  {intl.formatMessage({ id: 'education.faqFeatured' })}
                </Badge>
              )}
              {faq.tags && faq.tags.length > 0 && (
                <>
                  {faq.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} size="sm" variant="subtle" colorScheme="blue">
                      <Icon as={FaTag} mr={1} /> {tag}
                    </Badge>
                  ))}
                  {faq.tags.length > 3 && (
                    <Badge size="sm" variant="subtle" colorScheme="gray">
                      {intl.formatMessage({ id: 'education.faqMoreTags' }, { count: faq.tags.length - 3 })}
                    </Badge>
                  )}
                </>
              )}
            </HStack>

            {faq.view_count > 0 && (
              <Text fontSize="xs" color={mutedTextColor}>
                {intl.formatMessage({ id: 'education.faqViews' }, { count: faq.view_count })}
              </Text>
            )}
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default EducationFAQ;
