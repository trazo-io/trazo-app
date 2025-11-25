import React, { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Badge,
  useColorModeValue,
  useBreakpointValue,
  Center,
  Button,
  Flex,
  SimpleGrid
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaRoute,
  FaBookOpen,
  FaQuestionCircle,
  FaRocket,
  FaTractor,
  FaHeart,
  FaLeaf,
  FaChevronLeft,
  FaChevronRight,
  FaGraduationCap,
  FaPlay
} from 'react-icons/fa';

const MotionBox = motion(Box);

interface EducationSection {
  id: string;
  title: string;
  shortTitle: string;
  icon: any;
  color: string;
  description: string;
  itemCount?: number;
  completedCount?: number;
  isLocked?: boolean;
}

interface EducationMobileNavigationProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  userProgress?: {
    completedPractices: string[];
    currentStage: number;
    totalTransparencyGain: number;
  };
  className?: string;
}

const educationSections: EducationSection[] = [
  {
    id: 'pathways',
    title: 'Learning Pathways',
    shortTitle: 'Pathways',
    icon: FaRoute,
    color: 'blue',
    description: 'Structured learning journeys for transparency mastery',
    itemCount: 4,
    completedCount: 1
  },
  {
    id: 'getting_started',
    title: 'Getting Started',
    shortTitle: 'Start',
    icon: FaRocket,
    color: 'green',
    description: 'Essential transparency fundamentals',
    itemCount: 3,
    completedCount: 2
  },
  {
    id: 'farm_events',
    title: 'Farm Events',
    shortTitle: 'Events',
    icon: FaTractor,
    color: 'orange',
    description: 'Document the 8 core event types',
    itemCount: 8,
    completedCount: 5
  },
  {
    id: 'consumer_trust',
    title: 'Consumer Trust',
    shortTitle: 'Trust',
    icon: FaHeart,
    color: 'pink',
    description: 'Build trust through transparency',
    itemCount: 4,
    completedCount: 1
  },
  {
    id: 'course_library',
    title: 'Course Library',
    shortTitle: 'Courses',
    icon: FaBookOpen,
    color: 'purple',
    description: 'Browse all available content',
    itemCount: 12,
    completedCount: 3
  },
  {
    id: 'resources',
    title: 'Resources & FAQ',
    shortTitle: 'Help',
    icon: FaQuestionCircle,
    color: 'yellow',
    description: 'Quick reference guides',
    itemCount: 6,
    completedCount: 2
  }
];

const EducationMobileNavigation: React.FC<EducationMobileNavigationProps> = ({
  activeSection,
  onSectionChange,
  userProgress,
  className
}) => {
  const [showAllSections, setShowAllSections] = useState(false);
  
  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTablet = useBreakpointValue({ base: false, md: true, lg: false });
  
  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const activeBgColor = useColorModeValue('green.50', 'green.900');
  const activeColor = 'green.500';
  
  // Get current section details
  const currentSection = educationSections.find(section => section.id === activeSection);
  
  // Mobile: Show only 3 main sections initially, with expand option
  const displayedSections = isMobile && !showAllSections 
    ? educationSections.slice(0, 3)
    : educationSections;

  const handleSectionClick = (sectionId: string) => {
    onSectionChange(sectionId);
    // On mobile, collapse back to main view after selection
    if (isMobile && showAllSections) {
      setShowAllSections(false);
    }
  };

  // Mobile horizontal scroll navigation
  if (isMobile) {
    return (
      <Box className={className} w="full">
        {/* Current Section Header */}
        {currentSection && (
          <MotionBox
            bg={`${currentSection.color}.500`}
            color="white"
            p={4}
            borderRadius="xl"
            mb={4}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HStack justify="space-between" align="center">
              <HStack>
                <Icon as={currentSection.icon} boxSize={6} />
                <VStack align="start" spacing={0}>
                  <Text fontSize="lg" fontWeight="bold">
                    {currentSection.title}
                  </Text>
                  <Text fontSize="sm" opacity={0.9}>
                    {currentSection.description}
                  </Text>
                </VStack>
              </HStack>
              {currentSection.completedCount && currentSection.itemCount && (
                <VStack spacing={0} align="end">
                  <Text fontSize="xs" opacity={0.8}>Progress</Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {currentSection.completedCount}/{currentSection.itemCount}
                  </Text>
                </VStack>
              )}
            </HStack>
          </MotionBox>
        )}

        {/* Horizontal Section Scroll */}
        <Box overflowX="auto" pb={2}>
          <HStack spacing={3} minW="fit-content" px={1}>
            {displayedSections.map((section) => {
              const isActive = activeSection === section.id;
              const completionRate = section.completedCount && section.itemCount 
                ? (section.completedCount / section.itemCount) * 100 
                : 0;

              return (
                <Button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  variant={isActive ? 'solid' : 'outline'}
                  colorScheme={isActive ? section.color : 'gray'}
                  size="sm"
                  minW="100px"
                  h="60px"
                  borderRadius="xl"
                  flexDirection="column"
                  py={2}
                  px={3}
                  transition="all 0.2s ease"
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'md'
                  }}
                >
                  <VStack spacing={1}>
                    <Icon as={section.icon} boxSize={4} />
                    <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                      {section.shortTitle}
                    </Text>
                    {completionRate > 0 && (
                      <Box
                        w="20px"
                        h="2px"
                        bg="gray.200"
                        borderRadius="full"
                        overflow="hidden"
                      >
                        <Box
                          h="full"
                          bg={isActive ? 'white' : `${section.color}.500`}
                          w={`${completionRate}%`}
                          borderRadius="full"
                          transition="width 0.3s ease"
                        />
                      </Box>
                    )}
                  </VStack>
                </Button>
              );
            })}
            
            {/* Show More Button */}
            {!showAllSections && educationSections.length > 3 && (
              <Button
                onClick={() => setShowAllSections(true)}
                variant="ghost"
                size="sm"
                minW="80px"
                h="60px"
                borderRadius="xl"
                flexDirection="column"
                py={2}
                px={3}
                color={mutedTextColor}
                _hover={{
                  bg: useColorModeValue('gray.50', 'gray.700'),
                  transform: 'translateY(-1px)'
                }}
              >
                <VStack spacing={1}>
                  <Icon as={FaChevronRight} boxSize={4} />
                  <Text fontSize="xs" fontWeight="medium">
                    More
                  </Text>
                </VStack>
              </Button>
            )}
          </HStack>
        </Box>

        {/* Quick Action Bar */}
        <MotionBox
          bg={bgColor}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="xl"
          p={4}
          mt={4}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                Quick Start
              </Text>
              <Text fontSize="xs" color={mutedTextColor}>
                Jump right into learning
              </Text>
            </VStack>
            <HStack spacing={2}>
              <Button
                size="sm"
                colorScheme="blue"
                leftIcon={<Icon as={FaPlay} />}
                borderRadius="lg"
                onClick={() => handleSectionClick('getting_started')}
              >
                Begin
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Icon as={FaGraduationCap} />}
                borderRadius="lg"
                onClick={() => handleSectionClick('pathways')}
              >
                Pathways
              </Button>
            </HStack>
          </HStack>
        </MotionBox>

        {/* Progress Summary */}
        {userProgress && (
          <MotionBox
            bg={activeBgColor}
            borderRadius="xl"
            p={4}
            mt={4}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <HStack justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  Your Progress
                </Text>
                <Text fontSize="xs" color={mutedTextColor}>
                  +{userProgress.totalTransparencyGain}% transparency gained
                </Text>
              </VStack>
              <HStack spacing={4}>
                <VStack spacing={0}>
                  <Text fontSize="lg" fontWeight="bold" color={activeColor}>
                    {userProgress.completedPractices.length}
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>Completed</Text>
                </VStack>
                <VStack spacing={0}>
                  <Text fontSize="lg" fontWeight="bold" color={activeColor}>
                    {userProgress.currentStage + 1}
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>Stage</Text>
                </VStack>
              </HStack>
            </HStack>
          </MotionBox>
        )}
      </Box>
    );
  }

  // Tablet: Grid layout
  if (isTablet) {
    return (
      <Box className={className} w="full">
        <SimpleGrid columns={3} spacing={4}>
          {educationSections.map((section) => {
            const isActive = activeSection === section.id;
            const completionRate = section.completedCount && section.itemCount 
              ? (section.completedCount / section.itemCount) * 100 
              : 0;

            return (
              <MotionBox
                key={section.id}
                as="button"
                onClick={() => handleSectionClick(section.id)}
                bg={isActive ? `${section.color}.50` : bgColor}
                border="2px solid"
                borderColor={isActive ? `${section.color}.500` : borderColor}
                borderRadius="xl"
                p={4}
                transition="all 0.3s ease"
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: 'lg'
                }}
                whileTap={{ scale: 0.98 }}
              >
                <VStack spacing={3} align="center">
                  <Icon 
                    as={section.icon} 
                    boxSize={8} 
                    color={isActive ? `${section.color}.500` : mutedTextColor}
                  />
                  <VStack spacing={1}>
                    <Text 
                      fontSize="md" 
                      fontWeight="bold" 
                      color={isActive ? `${section.color}.600` : textColor}
                      noOfLines={1}
                    >
                      {section.title}
                    </Text>
                    <Text fontSize="sm" color={mutedTextColor} noOfLines={2}>
                      {section.description}
                    </Text>
                  </VStack>
                  
                  {completionRate > 0 && (
                    <HStack spacing={2} w="full">
                      <Box
                        flex={1}
                        h="3px"
                        bg="gray.200"
                        borderRadius="full"
                        overflow="hidden"
                      >
                        <Box
                          h="full"
                          bg={`${section.color}.500`}
                          w={`${completionRate}%`}
                          borderRadius="full"
                          transition="width 0.3s ease"
                        />
                      </Box>
                      <Text fontSize="xs" color={mutedTextColor}>
                        {section.completedCount}/{section.itemCount}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </MotionBox>
            );
          })}
        </SimpleGrid>
      </Box>
    );
  }

  // Desktop: Return null (use regular tabs)
  return null;
};

export default EducationMobileNavigation;