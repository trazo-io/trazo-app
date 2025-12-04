import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  Badge,
  Progress,
  Collapse,
  useColorModeValue,
  useBreakpointValue,
  Flex,
  Center,
  SimpleGrid,
  Alert,
  AlertIcon,
  Image,
  AspectRatio
} from '@chakra-ui/react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  FaChevronDown,
  FaChevronUp,
  FaPlay,
  FaCheck,
  FaClock,
  FaStar,
  FaArrowRight,
  FaBookmark,
  FaShare,
  FaDownload,
  FaExpand,
  FaCompress,
  FaVolumeUp
} from 'react-icons/fa';

const MotionBox = motion(Box);

interface MobileContentItem {
  id: string;
  title: string;
  content: string;
  type: 'lesson' | 'practice' | 'faq' | 'guide';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number;
  transparencyImpact?: string;
  imageUrl?: string;
  videoUrl?: string;
  isCompleted?: boolean;
  isBookmarked?: boolean;
  tags?: string[];
}

interface MobileContentDisplayProps {
  content: MobileContentItem[];
  title: string;
  description?: string;
  onItemComplete?: (itemId: string) => void;
  onBookmark?: (itemId: string) => void;
  onShare?: (itemId: string) => void;
  userProgress?: {
    completedItems: string[];
    bookmarkedItems: string[];
  };
  className?: string;
}

const MobileContentDisplay: React.FC<MobileContentDisplayProps> = ({
  content,
  title,
  description,
  onItemComplete,
  onBookmark,
  onShare,
  userProgress,
  className
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [fullScreenItem, setFullScreenItem] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const controls = useAnimation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const cardPadding = useBreakpointValue({ base: 4, md: 6 });

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const successColor = useColorModeValue('green.500', 'green.300');

  // Filter content based on search
  const filteredContent = content.filter(
    (item) =>
      item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.content.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  // Calculate progress
  const completedCount = userProgress?.completedItems.length || 0;
  const totalCount = content.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Handle item expansion
  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'green';
      case 'intermediate':
        return 'yellow';
      case 'advanced':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return FaPlay;
      case 'practice':
        return FaStar;
      case 'faq':
        return FaArrowRight;
      case 'guide':
        return FaBookmark;
      default:
        return FaPlay;
    }
  };

  return (
    <Box className={className} w="full" position="relative">
      {/* Header Section */}
      <MotionBox
        bg={bgColor}
        borderRadius="xl"
        p={cardPadding}
        mb={6}
        boxShadow="sm"
        border="1px solid"
        borderColor={borderColor}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <VStack align="stretch" spacing={4}>
          <VStack align="start" spacing={2}>
            <Heading size="lg" color={textColor}>
              {title}
            </Heading>
            {description && (
              <Text color={mutedTextColor} fontSize="md">
                {description}
              </Text>
            )}
          </VStack>

          {/* Progress Bar */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                Learning Progress
              </Text>
              <Text fontSize="sm" color={textColor}>
                {completedCount} of {totalCount} completed
              </Text>
            </HStack>
            <Progress
              value={progressPercentage}
              colorScheme="green"
              size="lg"
              borderRadius="full"
              bg={useColorModeValue('gray.100', 'gray.600')}
            />

            {progressPercentage > 0 && (
              <Text fontSize="xs" color={successColor} mt={1}>
                {Math.round(progressPercentage)}% complete
              </Text>
            )}
          </Box>

          {/* Quick Stats */}
          <SimpleGrid columns={3} spacing={4}>
            <Center>
              <VStack spacing={0}>
                <Text fontSize="xl" fontWeight="bold" color={successColor}>
                  {content.filter((item) => item.type === 'lesson').length}
                </Text>
                <Text fontSize="xs" color={mutedTextColor}>
                  Lessons
                </Text>
              </VStack>
            </Center>
            <Center>
              <VStack spacing={0}>
                <Text fontSize="xl" fontWeight="bold" color="blue.500">
                  {content.filter((item) => item.type === 'practice').length}
                </Text>
                <Text fontSize="xs" color={mutedTextColor}>
                  Practices
                </Text>
              </VStack>
            </Center>
            <Center>
              <VStack spacing={0}>
                <Text fontSize="xl" fontWeight="bold" color="orange.500">
                  {content
                    .filter((item) => item.estimatedTime)
                    .reduce((acc, item) => acc + (item.estimatedTime || 0), 0)}
                </Text>
                <Text fontSize="xs" color={mutedTextColor}>
                  Min Total
                </Text>
              </VStack>
            </Center>
          </SimpleGrid>
        </VStack>
      </MotionBox>

      {/* Content Items */}
      <VStack spacing={4} align="stretch" ref={scrollRef}>
        <AnimatePresence>
          {filteredContent.map((item, index) => {
            const isExpanded = expandedItems.has(item.id);
            const isCompleted = userProgress?.completedItems.includes(item.id) || false;
            const isBookmarked = userProgress?.bookmarkedItems.includes(item.id) || false;

            return (
              <MotionBox
                key={item.id}
                bg={cardBgColor}
                borderRadius="xl"
                border="2px solid"
                borderColor={isCompleted ? successColor : borderColor}
                overflow="hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                boxShadow={isCompleted ? 'md' : 'sm'}
              >
                {/* Item Header */}
                <Box
                  as="button"
                  onClick={() => toggleItemExpansion(item.id)}
                  w="full"
                  p={cardPadding}
                  textAlign="left"
                  transition="all 0.2s ease"
                  _hover={{
                    bg: useColorModeValue('gray.50', 'gray.600')
                  }}
                  _active={{
                    transform: 'scale(0.98)'
                  }}
                >
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between" align="start">
                      <HStack spacing={3} flex={1}>
                        <Center
                          w={10}
                          h={10}
                          bg={
                            isCompleted
                              ? successColor
                              : `${getDifficultyColor(item.difficulty)}.500`
                          }
                          borderRadius="lg"
                          color="white"
                        >
                          <Icon as={isCompleted ? FaCheck : getTypeIcon(item.type)} boxSize={4} />
                        </Center>

                        <VStack align="start" spacing={1} flex={1}>
                          <Heading size="md" color={textColor} noOfLines={2}>
                            {item.title}
                          </Heading>
                          <HStack spacing={3} flexWrap="wrap">
                            <Badge colorScheme={getDifficultyColor(item.difficulty)} size="sm">
                              {item.difficulty}
                            </Badge>
                            <Badge colorScheme="blue" size="sm">
                              {item.type}
                            </Badge>
                            {item.estimatedTime && (
                              <HStack fontSize="xs" color={mutedTextColor}>
                                <Icon as={FaClock} />
                                <Text>{item.estimatedTime}min</Text>
                              </HStack>
                            )}
                          </HStack>
                        </VStack>
                      </HStack>

                      <Icon
                        as={isExpanded ? FaChevronUp : FaChevronDown}
                        color={mutedTextColor}
                        boxSize={5}
                        transition="transform 0.2s ease"
                        transform={isExpanded ? 'rotate(180deg)' : 'none'}
                      />
                    </HStack>

                    {/* Quick Preview */}
                    {!isExpanded && (
                      <Text color={mutedTextColor} fontSize="sm" noOfLines={2}>
                        {item.content.slice(0, 120)}...
                      </Text>
                    )}
                  </VStack>
                </Box>

                {/* Expanded Content */}
                <Collapse in={isExpanded} animateOpacity>
                  <Box p={cardPadding} pt={0}>
                    <VStack align="stretch" spacing={4}>
                      {/* Media Content */}
                      {item.imageUrl && (
                        <AspectRatio ratio={16 / 9} maxH="200px">
                          <Image
                            src={item.imageUrl}
                            alt={item.title}
                            borderRadius="lg"
                            objectFit="cover"
                          />
                        </AspectRatio>
                      )}

                      {/* Text Content */}
                      <Box>
                        <Text color={textColor} lineHeight="tall" whiteSpace="pre-wrap">
                          {item.content}
                        </Text>
                      </Box>

                      {/* Transparency Impact */}
                      {item.transparencyImpact && (
                        <Alert
                          status="success"
                          borderRadius="lg"
                          bg={useColorModeValue('green.50', 'green.900')}
                        >
                          <AlertIcon as={FaStar} color="green.500" />
                          <Text fontSize="sm" color="green.600">
                            <strong>Transparency Impact:</strong> {item.transparencyImpact}
                          </Text>
                        </Alert>
                      )}

                      {/* Action Buttons */}
                      <HStack justify="space-between" pt={2}>
                        <HStack spacing={2}>
                          {!isCompleted && (
                            <Button
                              size="sm"
                              colorScheme="green"
                              leftIcon={<Icon as={FaCheck} />}
                              onClick={() => onItemComplete?.(item.id)}
                              borderRadius="lg"
                            >
                              Mark Complete
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant={isBookmarked ? 'solid' : 'outline'}
                            colorScheme="blue"
                            leftIcon={<Icon as={FaBookmark} />}
                            onClick={() => onBookmark?.(item.id)}
                            borderRadius="lg"
                          >
                            {isBookmarked ? 'Saved' : 'Save'}
                          </Button>
                        </HStack>

                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Icon as={FaShare} />}
                          onClick={() => onShare?.(item.id)}
                          borderRadius="lg"
                        >
                          Share
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>
                </Collapse>

                {/* Completion Indicator */}
                {isCompleted && (
                  <Box
                    bg={useColorModeValue('green.50', 'green.900')}
                    p={3}
                    borderTop="1px solid"
                    borderColor={successColor}
                  >
                    <HStack>
                      <Icon as={FaCheck} color={successColor} />
                      <Text fontSize="sm" color={successColor} fontWeight="medium">
                        Completed
                      </Text>
                    </HStack>
                  </Box>
                )}
              </MotionBox>
            );
          })}
        </AnimatePresence>
      </VStack>

      {/* Empty State */}
      {filteredContent.length === 0 && (
        <MotionBox
          textAlign="center"
          py={12}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <VStack spacing={4}>
            <Text fontSize="lg" color={mutedTextColor}>
              No content found
            </Text>
            <Text fontSize="sm" color={mutedTextColor}>
              Try adjusting your search or browse other sections
            </Text>
          </VStack>
        </MotionBox>
      )}
    </Box>
  );
};

export default MobileContentDisplay;
