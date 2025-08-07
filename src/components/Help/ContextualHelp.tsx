import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Badge,
  Link,
  Divider,
  List,
  ListItem,
  ListIcon,
  Portal,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Progress,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import {
  FiHelpCircle,
  FiBook,
  FiVideo,
  FiMessageCircle,
  FiChevronRight,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiZap,
  FiTrendingUp
} from 'react-icons/fi';
import { useLocation } from 'react-router-dom';

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'interactive';
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  url?: string;
  content?: string;
}

interface ContextualHelpProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  triggers?: string[];
  userType?: 'farmer' | 'consumer';
}

const ContextualHelp: React.FC<ContextualHelpProps> = ({
  position = 'bottom-right',
  triggers = [],
  userType = 'farmer'
}) => {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentHelp, setCurrentHelp] = useState<HelpTopic[]>([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [userActivity, setUserActivity] = useState({
    timeOnPage: 0,
    interactions: 0,
    lastAction: Date.now()
  });

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Help content based on route and user type
  const helpContent: Record<string, HelpTopic[]> = {
    '/admin/dashboard': [
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        description: 'Understanding your carbon intelligence dashboard',
        type: 'interactive',
        duration: '3 min',
        difficulty: 'beginner',
        content: 'Your dashboard shows real-time carbon metrics, USDA-verified calculations, and revenue opportunities.'
      },
      {
        id: 'carbon-score-meaning',
        title: 'Carbon Score Explained',
        description: 'What your carbon score means and how to improve it',
        type: 'article',
        duration: '5 min',
        difficulty: 'beginner',
        content: 'Carbon scores represent kg CO2e per kg of product. Lower scores mean more climate-friendly practices.'
      }
    ],
    '/admin/dashboard/production/create': [
      {
        id: 'smart-setup-wizard',
        title: 'Using Smart Setup Templates',
        description: 'Reduce setup time from 45 minutes to 15 with USDA-verified templates',
        type: 'video',
        duration: '8 min',
        difficulty: 'beginner',
        content: 'Smart templates include pre-configured events, emission factors, and best practices for your crop type.'
      },
      {
        id: 'carbon-tracking-basics',
        title: 'Carbon Tracking Fundamentals',
        description: 'How Trazo calculates your carbon footprint',
        type: 'article',
        duration: '6 min',
        difficulty: 'intermediate',
        content: 'We use USDA Agricultural Research Service data and real-time calculations for accurate carbon tracking.'
      }
    ],
    '/scan': [
      {
        id: 'qr-scanning-guide',
        title: 'QR Code Scanning Guide',
        description: 'How to scan products and understand carbon scores',
        type: 'interactive',
        duration: '2 min',
        difficulty: 'beginner',
        content: 'Point your camera at the QR code to instantly see verified carbon footprint and farm story.'
      },
      {
        id: 'carbon-literacy',
        title: 'Understanding Carbon Footprints',
        description: 'Learn how food choices impact climate change',
        type: 'article',
        duration: '4 min',
        difficulty: 'beginner',
        content: 'Food production accounts for 26% of global greenhouse gas emissions. Every choice matters.'
      }
    ]
  };

  // Smart help triggers based on user behavior
  useEffect(() => {
    const detectHelpNeeds = () => {
      const currentPath = location.pathname;
      const relevantHelp = helpContent[currentPath] || [];
      
      // Update current help based on location
      setCurrentHelp(relevantHelp);

      // Trigger help suggestions based on user behavior
      const timeOnPage = Date.now() - userActivity.lastAction;
      
      // Show help after 30 seconds of inactivity on complex pages
      if (timeOnPage > 30000 && 
          (currentPath.includes('/create') || currentPath.includes('/edit')) &&
          !showSuggestion) {
        setShowSuggestion(true);
      }

      // Hide suggestion after user becomes active
      if (timeOnPage < 5000 && showSuggestion) {
        setShowSuggestion(false);
      }
    };

    const interval = setInterval(detectHelpNeeds, 5000);
    return () => clearInterval(interval);
  }, [location, userActivity, showSuggestion]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      setUserActivity(prev => ({
        ...prev,
        lastAction: Date.now(),
        interactions: prev.interactions + 1
      }));
    };

    document.addEventListener('click', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('scroll', handleActivity);

    return () => {
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('scroll', handleActivity);
    };
  }, []);

  const getPositionProps = () => {
    const baseProps = {
      position: 'fixed' as const,
      zIndex: 1000
    };

    switch (position) {
      case 'bottom-right':
        return { ...baseProps, bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { ...baseProps, bottom: '20px', left: '20px' };
      case 'top-right':
        return { ...baseProps, top: '20px', right: '20px' };
      case 'top-left':
        return { ...baseProps, top: '20px', left: '20px' };
      default:
        return { ...baseProps, bottom: '20px', right: '20px' };
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'green';
      case 'intermediate': return 'orange';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return FiVideo;
      case 'interactive': return FiZap;
      default: return FiBook;
    }
  };

  return (
    <>
      {/* Help Button */}
      <Box {...getPositionProps()}>
        <Popover isOpen={showSuggestion && !isOpen} onClose={() => setShowSuggestion(false)}>
          <PopoverTrigger>
            <Button
              colorScheme="blue"
              size="lg"
              borderRadius="full"
              boxShadow="lg"
              onClick={onOpen}
              leftIcon={<Icon as={FiHelpCircle} />}
              animation={showSuggestion ? 'pulse 2s infinite' : undefined}
              bg={showSuggestion ? 'orange.500' : 'blue.500'}
              _hover={{
                bg: showSuggestion ? 'orange.600' : 'blue.600',
                transform: 'scale(1.05)'
              }}
              transition="all 0.2s"
            >
              Help
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader fontWeight="600">Need help getting started?</PopoverHeader>
            <PopoverBody>
              <Text fontSize="sm" mb={3}>
                We noticed you might need assistance. Check out our contextual guides!
              </Text>
              <Button size="sm" colorScheme="blue" onClick={onOpen} w="full">
                Show Help Options
              </Button>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Box>

      {/* Help Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FiHelpCircle} color="blue.500" />
              <Text>
                {userType === 'farmer' ? 'Carbon Intelligence Help' : 'Carbon Discovery Help'}
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {currentHelp.length > 0 ? (
              <VStack spacing={4} align="stretch">
                <Alert status="info" borderRadius="lg">
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" fontWeight="600">
                      Contextual Help for This Page
                    </Text>
                    <Text fontSize="xs">
                      We've curated help topics based on what you're working on right now.
                    </Text>
                  </VStack>
                </Alert>

                {currentHelp.map((topic) => {
                  const TypeIcon = getTypeIcon(topic.type);
                  return (
                    <Box
                      key={topic.id}
                      p={4}
                      bg={bg}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="lg"
                      _hover={{ shadow: 'md', borderColor: 'blue.300' }}
                      cursor="pointer"
                      transition="all 0.2s"
                    >
                      <Flex justify="space-between" align="start">
                        <HStack align="start" flex="1" mr={3}>
                          <Icon as={TypeIcon} color="blue.500" boxSize={5} mt={1} />
                          <VStack align="start" spacing={2} flex="1">
                            <Text fontWeight="600" fontSize="md">
                              {topic.title}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {topic.description}
                            </Text>
                            {topic.content && (
                              <Text fontSize="xs" color="gray.500" noOfLines={2}>
                                {topic.content}
                              </Text>
                            )}
                            <HStack spacing={2}>
                              <Badge
                                colorScheme={getDifficultyColor(topic.difficulty)}
                                variant="subtle"
                                fontSize="xs"
                              >
                                {topic.difficulty}
                              </Badge>
                              <HStack spacing={1}>
                                <Icon as={FiClock} boxSize={3} color="gray.400" />
                                <Text fontSize="xs" color="gray.600">
                                  {topic.duration}
                                </Text>
                              </HStack>
                            </HStack>
                          </VStack>
                        </HStack>
                        <Icon as={FiChevronRight} color="gray.400" />
                      </Flex>
                    </Box>
                  );
                })}

                <Divider />

                {/* Additional Resources */}
                <VStack spacing={3} align="stretch">
                  <Text fontSize="sm" fontWeight="600" color="gray.700">
                    More Resources
                  </Text>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FiUsers} color="green.500" />
                      <Link href="#" fontSize="sm" color="blue.600">
                        Community Forum - Ask Questions
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FiVideo} color="green.500" />
                      <Link href="#" fontSize="sm" color="blue.600">
                        Video Tutorials - Visual Learning
                      </Link>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FiMessageCircle} color="green.500" />
                      <Link href="#" fontSize="sm" color="blue.600">
                        Live Chat Support - Get Help Now
                      </Link>
                    </ListItem>
                  </List>
                </VStack>
              </VStack>
            ) : (
              <VStack spacing={4}>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  No specific help topics for this page yet, but we're here to help!
                </Text>
                <Button colorScheme="blue" leftIcon={<Icon as={FiMessageCircle} />}>
                  Contact Support
                </Button>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ContextualHelp;