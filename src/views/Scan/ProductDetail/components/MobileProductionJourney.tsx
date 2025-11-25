import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  Circle,
  Heading,
  Collapse,
  Divider,
  useColorModeValue,
  Flex,
  Stack,
  useBreakpointValue,
  Image,
  SimpleGrid,
  AspectRatio
} from '@chakra-ui/react';
import {
  FaWater,
  FaBolt,
  FaSeedling,
  FaLeaf,
  FaTractor,
  FaChevronDown,
  FaChevronUp,
  FaCalendarAlt,
  FaCertificate,
  FaFlask,
  FaShieldAlt,
  FaRecycle,
  FaGlobeAmericas
} from 'react-icons/fa';
import { MdTimeline, MdEco, MdVerified, MdAgriculture } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { format, parseISO } from 'date-fns';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { TransparencyIndicator } from 'components/Design';

interface AlbumImage {
  id: number;
  image: string;
  caption: string;
  created_at: string;
}

interface Album {
  id: number;
  images: AlbumImage[];
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  observation?: string;
  date: string;
  certified: boolean;
  index?: number;
  volume?: string;
  concentration?: string;
  area?: string;
  equipment?: string;
  album?: Album;
}

interface MobileProductionJourneyProps {
  events: TimelineEvent[];
  productionId?: string;
}

export const MobileProductionJourney: React.FC<MobileProductionJourneyProps> = ({
  events,
  productionId
}) => {
  const intl = useIntl();
  const [showAll, setShowAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Get event configuration based on type
  const getEventConfig = (event: TimelineEvent) => {
    const type = event.type.toLowerCase();
    const description = event.description.toLowerCase();

    // Chemical events
    if (
      type.includes('chemical') ||
      description.includes('fertilizer') ||
      description.includes('spray')
    ) {
      return {
        icon: FaFlask,
        color: 'orange.500',
        bgColor: 'orange.50',
        borderColor: 'orange.200',
        category: 'Chemical Application',
        categoryColor: 'orange'
      };
    }

    // Production events
    if (
      type.includes('production') ||
      description.includes('harvest') ||
      description.includes('planting') ||
      description.includes('bee')
    ) {
      return {
        icon: MdAgriculture,
        color: 'green.500',
        bgColor: 'green.50',
        borderColor: 'green.200',
        category: 'Production Activity',
        categoryColor: 'green'
      };
    }

    // Equipment events
    if (
      type.includes('equipment') ||
      description.includes('tractor') ||
      description.includes('machinery') ||
      description.includes('cultivation')
    ) {
      return {
        icon: FaTractor,
        color: 'blue.500',
        bgColor: 'blue.50',
        borderColor: 'blue.200',
        category: 'Equipment Operation',
        categoryColor: 'blue'
      };
    }

    // Default/general
    return {
      icon: MdEco,
      color: 'gray.500',
      bgColor: 'gray.50',
      borderColor: 'gray.200',
      category: 'General Activity',
      categoryColor: 'gray'
    };
  };

  // Sort events by date
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Filter events based on category
  const filteredEvents =
    selectedCategory === 'all'
      ? sortedEvents
      : sortedEvents.filter((event) => {
          const config = getEventConfig(event);
          return config.category.toLowerCase().includes(selectedCategory.toLowerCase());
        });

  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, 3);

  // Get unique categories for filter
  const categories = ['all', ...new Set(events.map((event) => getEventConfig(event).category))];

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, isMobile ? 'MMM dd' : 'MMM dd, yyyy');
    } catch (error) {
      return 'Date unknown';
    }
  };

  return (
    <Box>
      {/* Header with Summary */}
      <VStack spacing={4} align="stretch" mb={6}>
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', sm: 'center' }}
          gap={4}>
          <VStack align={{ base: 'center', sm: 'start' }} spacing={1}>
            <Heading size="md" color={textColor} textAlign={{ base: 'center', sm: 'left' }}>
              Production Journey
            </Heading>
            <Text fontSize="sm" color={mutedColor} textAlign={{ base: 'center', sm: 'left' }}>
              {filteredEvents.length} activities recorded
            </Text>
          </VStack>

          <Badge
            colorScheme="green"
            fontSize="sm"
            px={3}
            py={1}
            borderRadius="full"
            alignSelf={{ base: 'center', sm: 'flex-start' }}>
            <HStack spacing={1}>
              <Icon as={MdVerified} boxSize={3} />
              <Text>{filteredEvents.filter((e) => e.certified).length} Verified</Text>
            </HStack>
          </Badge>
        </Flex>

        {/* Transparency Section */}
        {productionId && (
          <Box
            bg={useColorModeValue('green.50', 'green.900')}
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor={useColorModeValue('green.200', 'green.700')}>
            <VStack spacing={3} align="stretch">
              <Flex justify="space-between" align="center">
                <Text fontSize="sm" fontWeight="semibold" color="green.800">
                  Documentation Transparency
                </Text>
                <Badge colorScheme="green" fontSize="xs" borderRadius="full">
                  {filteredEvents.length} Events
                </Badge>
              </Flex>

              <TransparencyIndicator
                percentage={Math.min((filteredEvents.length / 12) * 100, 100)} // Assume 12 expected events
                message={
                  filteredEvents.length >= 12
                    ? 'Complete transparency'
                    : filteredEvents.length >= 8
                    ? 'Good transparency'
                    : 'Basic transparency'
                }
                status={
                  filteredEvents.length >= 12
                    ? 'excellent'
                    : filteredEvents.length >= 8
                    ? 'good'
                    : 'minimum'
                }
                variant="compact"
                size="sm"
                showDetails={false}
              />

              <Text fontSize="xs" color="green.700">
                Shows how completely this farm has documented their production activities
              </Text>
            </VStack>
          </Box>
        )}

        {/* Category Filter - Mobile Optimized */}
        <Stack
          direction={{ base: 'column', sm: 'row' }}
          spacing={2}
          wrap="wrap"
          justify={{ base: 'center', sm: 'flex-start' }}>
          <Button
            size="sm"
            variant={selectedCategory === 'all' ? 'solid' : 'outline'}
            colorScheme="green"
            onClick={() => setSelectedCategory('all')}
            borderRadius="full"
            fontSize="xs">
            All Activities
          </Button>
          {categories.slice(1, 3).map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? 'solid' : 'outline'}
              colorScheme="gray"
              onClick={() => setSelectedCategory(category)}
              borderRadius="full"
              fontSize="xs"
              display={{ base: 'none', sm: 'flex' }}>
              {category.replace(' Activity', '').replace(' Application', '')}
            </Button>
          ))}
        </Stack>
      </VStack>

      {/* Events List - Mobile Optimized */}
      <VStack spacing={3} align="stretch">
        {displayedEvents.map((event, index) => {
          const config = getEventConfig(event);

          return (
            <Card
              key={event.id}
              bg={bgColor}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={borderColor}
              shadow="lg"
              _hover={{ shadow: 'xl', transform: 'translateY(-1px)' }}
              transition="all 0.2s"
              overflow="hidden"
              w="full">
              {/* MOBILE-OPTIMIZED: Full-width card layout for maximum space utilization */}
              <Box position="relative">
                {/* Top-right verification indicators for immediate trust visibility */}
                <HStack position="absolute" top={3} right={3} spacing={1} zIndex={2}>
                  {/* Category badge */}
                  <Badge
                    colorScheme={config.categoryColor}
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="full">
                    {config.category.replace(' Activity', '').replace(' Application', '')}
                  </Badge>

                  {/* Verification indicator */}
                  {event.certified && (
                    <Circle size="20px" bg="green.500">
                      <Icon as={MdVerified} boxSize={2.5} color="white" />
                    </Circle>
                  )}
                </HStack>

                {/* Main content with optimized padding for mobile */}
                <CardBody p={{ base: 4, md: 6 }} pr={{ base: 16, md: 20 }}>
                  <VStack align="start" spacing={3} w="full">
                    {/* Event title - larger for better mobile readability */}
                    <Heading
                      size={{ base: 'md', md: 'lg' }}
                      color={textColor}
                      lineHeight="short"
                      w="full">
                      {event.description}
                    </Heading>

                    {/* Date and metadata - horizontal layout for efficient space use */}
                    <HStack spacing={3} w="full" justify="space-between" flexWrap="wrap">
                      <HStack spacing={1} color={mutedColor}>
                        <Icon as={FaCalendarAlt} boxSize={3} />
                        <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="medium">
                          {formatDate(event.date)}
                        </Text>
                      </HStack>

                      {/* Sustainability impact badge */}
                      <Badge
                        colorScheme={config.categoryColor}
                        fontSize="xs"
                        px={3}
                        py={1}
                        borderRadius="full">
                        <HStack spacing={1}>
                          <Icon as={config.icon} boxSize={3} />
                          <Text>LOW IMPACT</Text>
                        </HStack>
                      </Badge>
                    </HStack>

                    {/* Observation text if available */}
                    {event.observation && (
                      <Text
                        fontSize={{ base: 'md', md: 'lg' }}
                        color={useColorModeValue('gray.700', 'gray.300')}
                        lineHeight="relaxed"
                        w="full">
                        {event.observation}
                      </Text>
                    )}

                    {/* Photo Gallery */}
                    {event.album && event.album.images && event.album.images.length > 0 && (
                      <VStack spacing={3} align="stretch" w="full">
                        <Text fontSize="sm" fontWeight="semibold" color={mutedColor}>
                          Farming Practice Photos
                        </Text>
                        <SimpleGrid
                          columns={event.album.images.length === 1 ? 1 : 2}
                          spacing={2}
                          w="full">
                          {event.album.images.map((image) => (
                            <AspectRatio key={image.id} ratio={4 / 3}>
                              <Image
                                src={image.image}
                                alt={image.caption}
                                borderRadius="lg"
                                objectFit="cover"
                                fallback={
                                  <Box
                                    bg={useColorModeValue('gray.100', 'gray.700')}
                                    borderRadius="lg"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center">
                                    <Text fontSize="xs" color={mutedColor}>
                                      Photo verification
                                    </Text>
                                  </Box>
                                }
                                _hover={{
                                  transform: 'scale(1.02)',
                                  transition: 'transform 0.2s'
                                }}
                              />
                            </AspectRatio>
                          ))}
                        </SimpleGrid>
                        {event.album.images.length > 0 && (
                          <Text fontSize="xs" color={mutedColor} textAlign="center">
                            {event.album.images.length} verification photo
                            {event.album.images.length > 1 ? 's' : ''} available
                          </Text>
                        )}
                      </VStack>
                    )}

                    {/* Technical details in mobile-friendly format */}
                    {(event.volume || event.area || event.concentration) && (
                      <VStack spacing={2} align="stretch" w="full">
                        <Text fontSize="sm" fontWeight="semibold" color={mutedColor}>
                          Technical Details
                        </Text>
                        <Stack direction={{ base: 'column', sm: 'row' }} spacing={2}>
                          {event.volume && (
                            <Badge
                              variant="subtle"
                              colorScheme="gray"
                              fontSize="sm"
                              px={3}
                              py={1}
                              borderRadius="lg">
                              Volume: {event.volume}
                            </Badge>
                          )}
                          {event.area && (
                            <Badge
                              variant="subtle"
                              colorScheme="gray"
                              fontSize="sm"
                              px={3}
                              py={1}
                              borderRadius="lg">
                              Area: {event.area} ha
                            </Badge>
                          )}
                          {event.concentration && (
                            <Badge
                              variant="subtle"
                              colorScheme="gray"
                              fontSize="sm"
                              px={3}
                              py={1}
                              borderRadius="lg">
                              Concentration: {event.concentration}
                            </Badge>
                          )}
                        </Stack>
                      </VStack>
                    )}

                    {/* Full-width "Learn More" button for mobile UX */}
                    <Button
                      w="full"
                      size="md"
                      variant="outline"
                      colorScheme="green"
                      borderRadius="xl"
                      h="44px"
                      _hover={{
                        bg: useColorModeValue('green.50', 'gray.700'),
                        borderColor: 'green.500'
                      }}>
                      Learn More
                    </Button>
                  </VStack>
                </CardBody>
              </Box>
            </Card>
          );
        })}
      </VStack>

      {/* Show More Button */}
      {filteredEvents.length > 3 && (
        <Flex justify="center" mt={4}>
          <Button
            variant="outline"
            colorScheme="green"
            leftIcon={<Icon as={showAll ? FaChevronUp : FaChevronDown} />}
            onClick={() => setShowAll(!showAll)}
            size="sm"
            borderRadius="full">
            {showAll ? `Show Less` : `Show ${filteredEvents.length - 3} More Activities`}
          </Button>
        </Flex>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <VStack spacing={3} py={8} textAlign="center">
          <Icon as={MdTimeline} boxSize={12} color="gray.400" />
          <Heading as="h4" size="md" color="gray.600">
            No activities found
          </Heading>
          <Text fontSize="sm" color="gray.400">
            {selectedCategory === 'all'
              ? 'No production activities have been recorded yet.'
              : `No ${selectedCategory.toLowerCase()} activities found.`}
          </Text>
        </VStack>
      )}
    </Box>
  );
};
