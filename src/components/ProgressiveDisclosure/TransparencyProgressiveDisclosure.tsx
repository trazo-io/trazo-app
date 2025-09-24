import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Collapse,
  useColorModeValue,
  useBreakpointValue,
  Skeleton,
  SimpleGrid,
  Divider,
  Progress,
  Tooltip
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChevronDown,
  FaChevronUp,
  FaEye,
  FaInfoCircle,
  FaShieldAlt,
  FaChartLine,
  FaLeaf,
  FaCertificate,
  FaUsers,
  FaMicroscope,
  FaCalendarAlt
} from 'react-icons/fa';
import { MdExpandMore, MdExpandLess, MdScience, MdVerified } from 'react-icons/md';
import { BsGraphUp, BsShieldCheck } from 'react-icons/bs';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

interface ProgressiveSection {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  priority: 'essential' | 'important' | 'detailed' | 'technical';
  contentPreview: string;
  isLoading?: boolean;
  isAvailable: boolean;
  children: React.ReactNode;
  metrics?: {
    score: number;
    maxScore: number;
    description: string;
  };
}

export interface TransparencyProgressiveDisclosureProps {
  sections: ProgressiveSection[];
  defaultExpanded?: string[];
  transparencyScore?: number;
  variant?: 'transparency' | 'carbon' | 'technical';
  showPriorities?: boolean;
}

export const TransparencyProgressiveDisclosure: React.FC<TransparencyProgressiveDisclosureProps> = ({
  sections,
  defaultExpanded = [],
  transparencyScore = 0,
  variant = 'transparency',
  showPriorities = true
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(defaultExpanded)
  );
  const [visibleSections, setVisibleSections] = useState(0);

  // Theme colors following Trazo patterns
  const bg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Responsive values
  const spacing = useBreakpointValue({ base: 3, md: 4 });
  const iconSize = useBreakpointValue({ base: 4, md: 5 });
  const cardSpacing = useBreakpointValue({ base: 4, md: 6 });

  // Progressive loading animation
  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleSections(prev => {
        if (prev < sections.length) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [sections.length]);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId);
      } else {
        newExpanded.add(sectionId);
      }
      return newExpanded;
    });
  };

  // Expand all essential sections
  const expandEssentials = () => {
    const essentials = sections
      .filter(section => section.priority === 'essential')
      .map(section => section.id);
    setExpandedSections(new Set(essentials));
  };

  // Expand all available sections
  const expandAll = () => {
    const available = sections
      .filter(section => section.isAvailable)
      .map(section => section.id);
    setExpandedSections(new Set(available));
  };

  // Collapse all sections
  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Get priority styling
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'essential':
        return {
          color: 'green',
          badge: 'ESSENTIAL',
          borderColor: 'green.300',
          description: 'Core transparency information consumers expect'
        };
      case 'important':
        return {
          color: 'blue',
          badge: 'IMPORTANT',
          borderColor: 'blue.300',
          description: 'Additional valuable transparency details'
        };
      case 'detailed':
        return {
          color: 'purple',
          badge: 'DETAILED',
          borderColor: 'purple.300',
          description: 'In-depth information for interested consumers'
        };
      default:
        return {
          color: 'gray',
          badge: 'TECHNICAL',
          borderColor: 'gray.300',
          description: 'Technical details for experts'
        };
    }
  };

  // Filter sections by availability
  const availableSections = sections.filter(section => section.isAvailable);
  const expandedCount = expandedSections.size;

  return (
    <VStack spacing={spacing} align="stretch">
      {/* Progressive Disclosure Controls */}
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        bg={bg}
        borderRadius="xl">
        <CardHeader pb={2}>
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between" align="center" flexWrap="wrap">
              <VStack align="start" spacing={1}>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {variant === 'transparency' ? 'Transparency Details' : 
                   variant === 'carbon' ? 'Carbon Journey Details' : 'Technical Information'}
                </Text>
                <Text fontSize="sm" color={mutedColor}>
                  {expandedCount} of {availableSections.length} sections visible
                </Text>
              </VStack>

              {transparencyScore > 0 && (
                <VStack spacing={1} align="end">
                  <Text fontSize="sm" fontWeight="bold" color="green.600">
                    {transparencyScore}% Transparency
                  </Text>
                  <Progress
                    value={transparencyScore}
                    colorScheme="green"
                    size="sm"
                    borderRadius="full"
                    w="100px"
                  />
                </VStack>
              )}
            </HStack>

            {/* Quick Actions */}
            <HStack spacing={2} flexWrap="wrap">
              <Button
                size="sm"
                variant="outline"
                colorScheme="green"
                onClick={expandEssentials}
                leftIcon={<FaEye />}>
                Essentials
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorScheme="blue"
                onClick={expandAll}
                leftIcon={<MdExpandMore />}>
                Show All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={collapseAll}
                leftIcon={<MdExpandLess />}>
                Hide All
              </Button>
            </HStack>
          </VStack>
        </CardHeader>
      </MotionCard>

      {/* Progressive Sections */}
      <VStack spacing={spacing} align="stretch">
        {sections.map((section, index) => {
          const isExpanded = expandedSections.has(section.id);
          const isVisible = index < visibleSections;
          const priorityStyle = getPriorityStyle(section.priority);

          if (!section.isAvailable) {
            return (
              <MotionCard
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 0.6 : 0, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                bg={cardBg}
                borderColor="gray.200"
                borderWidth="1px"
                borderStyle="dashed"
                borderRadius="lg">
                <CardBody p={4}>
                  <HStack justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Icon as={section.icon} color="gray.400" boxSize={iconSize} />
                      <VStack align="start" spacing={1}>
                        <Text fontSize="md" fontWeight="medium" color="gray.500">
                          {section.title}
                        </Text>
                        <Text fontSize="sm" color="gray.400">
                          Data not available for this product
                        </Text>
                      </VStack>
                    </HStack>
                    <Badge colorScheme="gray" variant="outline" size="sm">
                      UNAVAILABLE
                    </Badge>
                  </HStack>
                </CardBody>
              </MotionCard>
            );
          }

          return (
            <MotionCard
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              bg={bg}
              borderColor={isExpanded ? priorityStyle.borderColor : borderColor}
              borderWidth={isExpanded ? '2px' : '1px'}
              borderRadius="lg"
              boxShadow={isExpanded ? 'lg' : 'md'}
              _hover={{
                borderColor: priorityStyle.borderColor,
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              transition="all 0.2s">
              
              {/* Section Header - Always Visible */}
              <CardBody p={cardSpacing}>
                <VStack spacing={3} align="stretch">
                  {/* Header with Toggle */}
                  <Button
                    variant="ghost"
                    p={0}
                    h="auto"
                    justifyContent="space-between"
                    onClick={() => toggleSection(section.id)}
                    _hover={{ bg: 'transparent' }}>
                    <HStack spacing={4} align="center" flex={1}>
                      <HStack spacing={3}>
                        <Icon 
                          as={section.icon} 
                          color={`${section.color}.500`} 
                          boxSize={iconSize} 
                        />
                        <VStack align="start" spacing={1}>
                          <Text fontSize="md" fontWeight="bold" color={textColor} textAlign="left">
                            {section.title}
                          </Text>
                          <Text fontSize="sm" color={mutedColor} textAlign="left">
                            {section.subtitle}
                          </Text>
                        </VStack>
                      </HStack>
                      
                      <HStack spacing={2}>
                        {showPriorities && (
                          <Tooltip label={priorityStyle.description} hasArrow>
                            <Badge
                              colorScheme={priorityStyle.color}
                              variant="subtle"
                              size="sm">
                              {priorityStyle.badge}
                            </Badge>
                          </Tooltip>
                        )}
                        
                        {section.metrics && (
                          <VStack spacing={0} align="end" minW="60px">
                            <Text fontSize="xs" fontWeight="bold" color={`${section.color}.600`}>
                              {section.metrics.score}/{section.metrics.maxScore}
                            </Text>
                            <Progress
                              value={(section.metrics.score / section.metrics.maxScore) * 100}
                              colorScheme={section.color}
                              size="xs"
                              borderRadius="full"
                              w="40px"
                            />
                          </VStack>
                        )}
                      </HStack>
                    </HStack>
                    
                    <Icon
                      as={isExpanded ? FaChevronUp : FaChevronDown}
                      color={mutedColor}
                      boxSize={4}
                      transition="transform 0.2s"
                      transform={isExpanded ? 'rotate(0deg)' : 'rotate(0deg)'}
                    />
                  </Button>

                  {/* Content Preview when collapsed */}
                  {!isExpanded && (
                    <Text fontSize="sm" color={mutedColor} px={4}>
                      {section.contentPreview}
                    </Text>
                  )}

                  {/* Detailed Content when expanded */}
                  <AnimatePresence>
                    {isExpanded && (
                      <MotionBox
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        overflow="hidden">
                        <Divider mb={4} />
                        {section.isLoading ? (
                          <VStack spacing={3}>
                            <Skeleton height="20px" width="100%" />
                            <Skeleton height="40px" width="100%" />
                            <Skeleton height="60px" width="100%" />
                          </VStack>
                        ) : (
                          <Box>{section.children}</Box>
                        )}
                      </MotionBox>
                    )}
                  </AnimatePresence>
                </VStack>
              </CardBody>
            </MotionCard>
          );
        })}
      </VStack>

      {/* Summary Footer */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: sections.length * 0.1 }}
        bg={`${variant === 'transparency' ? 'green' : 'blue'}.50`}
        p={4}
        borderRadius="lg"
        border="1px"
        borderColor={`${variant === 'transparency' ? 'green' : 'blue'}.200`}
        textAlign="center">
        <VStack spacing={2}>
          <Icon 
            as={variant === 'transparency' ? FaShieldAlt : FaLeaf} 
            color={`${variant === 'transparency' ? 'green' : 'blue'}.500`} 
            boxSize={6} 
          />
          <Text fontSize="sm" fontWeight="bold" color={`${variant === 'transparency' ? 'green' : 'blue'}.700`}>
            {variant === 'transparency' ? 'Transparency Information Complete' : 'Carbon Journey Information Complete'}
          </Text>
          <Text fontSize="xs" color={mutedColor}>
            {availableSections.length} sections available • {expandedCount} currently expanded
          </Text>
        </VStack>
      </MotionBox>
    </VStack>
  );
};

export default TransparencyProgressiveDisclosure;