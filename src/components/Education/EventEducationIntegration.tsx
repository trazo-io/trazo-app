import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  useColorModeValue,
  List,
  ListItem,
  ListIcon,
  Tooltip,
  Alert,
  AlertIcon,
  Collapse,
  SimpleGrid
} from '@chakra-ui/react';
import {
  FaGraduationCap,
  FaPlay,
  FaCheck,
  FaCamera,
  FaStar,
  FaQuestionCircle,
  FaExternalLinkAlt,
  FaLightbulb,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

// Define event types and their educational content
const eventEducationMap = {
  'production': {
    title: 'Production Event Best Practices',
    description: 'Maximize transparency points for planting, irrigation, and harvest activities',
    tips: [
      'Include GPS coordinates for field mapping accuracy',
      'Take before/during/after photos to show progression',
      'Document seed varieties and planting density',
      'Record weather conditions affecting the activity',
      'Add personal notes about decision-making process'
    ],
    transparencyPoints: {
      base: 3,
      withPhotos: 5,
      withGPS: 6,
      complete: 8
    },
    consumerImpact: 'Production events show consumers your planning expertise and crop care',
    practiceId: 'practice_event_documentation'
  },
  'chemical': {
    title: 'Chemical Application Transparency',
    description: 'Build consumer trust through honest chemical documentation',
    tips: [
      'Document exact chemical names and concentrations',
      'Explain why the treatment was necessary',
      'Photo equipment settings and calibration',
      'Record application weather conditions',
      'Include safety equipment and protocols used'
    ],
    transparencyPoints: {
      base: 4,
      withPhotos: 6,
      withJustification: 7,
      complete: 10
    },
    consumerImpact: 'Honest chemical transparency builds more trust than hiding applications',
    practiceId: 'practice_transparency_basics'
  },
  'equipment': {
    title: 'Equipment Operation Documentation',
    description: 'Demonstrate farm efficiency and equipment management',
    tips: [
      'Record fuel consumption and efficiency metrics',
      'Document maintenance schedules and calibration',
      'Photo equipment condition and settings',
      'Log operator training and certification',
      'Track equipment hours and utilization'
    ],
    transparencyPoints: {
      base: 2,
      withPhotos: 4,
      withMaintenance: 5,
      complete: 6
    },
    consumerImpact: 'Equipment transparency shows professional farm management',
    practiceId: 'practice_event_documentation'
  },
  'soil': {
    title: 'Soil Health & Amendment Documentation',
    description: 'Showcase soil stewardship and long-term thinking',
    tips: [
      'Include soil test results when available',
      'Document amendment types and application rates',
      'Photo soil conditions before and after',
      'Record application methods and timing',
      'Explain soil health improvement goals'
    ],
    transparencyPoints: {
      base: 3,
      withPhotos: 5,
      withTestResults: 7,
      complete: 8
    },
    consumerImpact: 'Soil care demonstrates environmental stewardship to consumers',
    practiceId: 'practice_event_documentation'
  },
  'pest': {
    title: 'Pest Management Transparency',
    description: 'Show integrated pest management and responsible treatment',
    tips: [
      'Document pest identification and threshold levels',
      'Record scouting frequency and monitoring methods',
      'Photo pest damage and treatment necessity',
      'Include beneficial insect protection measures',
      'Document IPM strategy and prevention steps'
    ],
    transparencyPoints: {
      base: 3,
      withPhotos: 5,
      withIPM: 7,
      complete: 9
    },
    consumerImpact: 'IPM transparency shows responsible pest management approach',
    practiceId: 'practice_transparency_basics'
  },
  'business': {
    title: 'Business & Certification Documentation',
    description: 'Highlight certifications and business practices',
    tips: [
      'Upload certification documents and badges',
      'Document worker training and safety protocols',
      'Record audit results and compliance scores',
      'Photo certification displays and awards',
      'Include sustainability initiative participation'
    ],
    transparencyPoints: {
      base: 5,
      withCertifications: 8,
      withAudits: 10,
      complete: 12
    },
    consumerImpact: 'Certifications provide third-party validation of your claims',
    practiceId: 'practice_trust_indicators'
  },
  'weather': {
    title: 'Weather & Environmental Documentation',
    description: 'Show environmental adaptation and climate response',
    tips: [
      'Document weather conditions affecting operations',
      'Record climate adaptation strategies',
      'Photo weather impacts on crops',
      'Log environmental monitoring data',
      'Include drought or flood response measures'
    ],
    transparencyPoints: {
      base: 2,
      withPhotos: 4,
      withAdaptation: 6,
      complete: 7
    },
    consumerImpact: 'Environmental adaptation shows farming expertise and resilience',
    practiceId: 'practice_event_documentation'
  },
  'general': {
    title: 'General Farm Activity Documentation',
    description: 'Document other important farming activities',
    tips: [
      'Include detailed descriptions of the activity',
      'Photo the activity in progress',
      'Record time spent and resources used',
      'Document any quality control measures',
      'Add personal insights about the process'
    ],
    transparencyPoints: {
      base: 2,
      withPhotos: 4,
      withDetails: 5,
      complete: 6
    },
    consumerImpact: 'Complete documentation shows comprehensive farm management',
    practiceId: 'practice_event_documentation'
  }
};

interface EventEducationIntegrationProps {
  eventType: keyof typeof eventEducationMap;
  onStartPractice?: (practiceId: string) => void;
  onViewTutorial?: (eventType: string) => void;
  showInModal?: boolean;
}

const EventEducationIntegration: React.FC<EventEducationIntegrationProps> = ({
  eventType,
  onStartPractice,
  onViewTutorial,
  showInModal = false
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [showTips, setShowTips] = useState(false);
  
  // Theme colors
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const successColor = useColorModeValue('green.500', 'green.300');
  const primaryColor = useColorModeValue('blue.500', 'blue.300');
  
  const educationContent = eventEducationMap[eventType];
  
  if (!educationContent) {
    return null;
  }
  
  const EducationContent = () => (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1}>
            <Heading size="md" color={textColor}>
              {educationContent.title}
            </Heading>
            <Text color={mutedTextColor} fontSize="sm">
              {educationContent.description}
            </Text>
          </VStack>
          <Icon as={FaGraduationCap} boxSize={6} color={primaryColor} />
        </HStack>
        
        {/* Consumer impact highlight */}
        <Alert status="info" borderRadius="lg" bg={useColorModeValue('blue.50', 'blue.900')}>
          <AlertIcon as={FaLightbulb} color="blue.500" />
          <Text fontSize="sm" color="blue.600">
            <strong>Consumer Impact:</strong> {educationContent.consumerImpact}
          </Text>
        </Alert>
      </VStack>
      
      {/* Transparency points breakdown */}
      <Box>
        <HStack justify="space-between" mb={3}>
          <Heading size="sm" color={textColor}>
            Transparency Points Available
          </Heading>
          <Badge colorScheme="green" size="lg">
            Up to {educationContent.transparencyPoints.complete} points
          </Badge>
        </HStack>
        
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
          <Box textAlign="center" p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
            <Text fontSize="lg" fontWeight="bold" color={textColor}>
              {educationContent.transparencyPoints.base}
            </Text>
            <Text fontSize="xs" color={mutedTextColor}>Base Event</Text>
          </Box>
          <Box textAlign="center" p={3} bg={useColorModeValue('green.50', 'green.900')} borderRadius="lg">
            <Text fontSize="lg" fontWeight="bold" color={successColor}>
              +{educationContent.transparencyPoints.withPhotos - educationContent.transparencyPoints.base}
            </Text>
            <Text fontSize="xs" color={mutedTextColor}>With Photos</Text>
          </Box>
          <Box textAlign="center" p={3} bg={useColorModeValue('green.50', 'green.900')} borderRadius="lg">
            <Text fontSize="lg" fontWeight="bold" color={successColor}>
              +{educationContent.transparencyPoints.withGPS || educationContent.transparencyPoints.withJustification || educationContent.transparencyPoints.withMaintenance || educationContent.transparencyPoints.withTestResults || educationContent.transparencyPoints.withIPM || educationContent.transparencyPoints.withCertifications || educationContent.transparencyPoints.withAdaptation || educationContent.transparencyPoints.withDetails - educationContent.transparencyPoints.withPhotos}
            </Text>
            <Text fontSize="xs" color={mutedTextColor}>Enhanced Data</Text>
          </Box>
          <Box textAlign="center" p={3} bg={useColorModeValue('green.100', 'green.800')} borderRadius="lg">
            <Text fontSize="lg" fontWeight="bold" color={successColor}>
              {educationContent.transparencyPoints.complete}
            </Text>
            <Text fontSize="xs" color={mutedTextColor}>Complete</Text>
          </Box>
        </SimpleGrid>
      </Box>
      
      {/* Best practices tips */}
      <Box>
        <HStack justify="space-between" mb={3}>
          <Heading size="sm" color={textColor}>
            Best Practices for Maximum Transparency
          </Heading>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Icon as={showTips ? FaChevronUp : FaChevronDown} />}
            onClick={() => setShowTips(!showTips)}
          >
            {showTips ? 'Hide' : 'Show'} Tips
          </Button>
        </HStack>
        
        <Collapse in={showTips} animateOpacity>
          <List spacing={2}>
            {educationContent.tips.map((tip, index) => (
              <ListItem key={index} fontSize="sm" color={textColor}>
                <ListIcon as={FaCheck} color={successColor} />
                {tip}
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Box>
      
      {/* Action buttons */}
      <VStack spacing={3} align="stretch">
        <Button
          colorScheme="blue"
          size="lg"
          leftIcon={<Icon as={FaPlay} />}
          onClick={() => onStartPractice?.(educationContent.practiceId)}
        >
          Start Related Learning Practice
        </Button>
        
        <Button
          variant="outline"
          colorScheme="blue"
          size="md"
          leftIcon={<Icon as={FaQuestionCircle} />}
          onClick={() => onViewTutorial?.(eventType)}
        >
          View Detailed Tutorial
        </Button>
      </VStack>
    </VStack>
  );
  
  // Inline display for event creation forms
  if (!showInModal) {
    return (
      <Card bg={cardBgColor} borderRadius="xl" boxShadow="sm" mb={4}>
        <CardHeader pb={2}>
          <HStack justify="space-between">
            <HStack>
              <Icon as={FaGraduationCap} color={primaryColor} />
              <Text fontWeight="semibold" color={textColor} fontSize="sm">
                Transparency Tips
              </Text>
            </HStack>
            <Tooltip label="Learn how to maximize transparency for this event type">
              <Button size="xs" variant="ghost" onClick={onOpen}>
                <Icon as={FaExternalLinkAlt} />
              </Button>
            </Tooltip>
          </HStack>
        </CardHeader>
        
        <CardBody pt={0}>
          <Alert status="success" borderRadius="lg" size="sm">
            <AlertIcon as={FaStar} />
            <Text fontSize="sm">
              Up to <strong>{educationContent.transparencyPoints.complete} transparency points</strong> available for this event type
            </Text>
          </Alert>
          
          {/* Quick tips */}
          <List spacing={1} mt={3} fontSize="xs">
            {educationContent.tips.slice(0, 2).map((tip, index) => (
              <ListItem key={index} color={mutedTextColor}>
                <ListIcon as={FaCheck} color={successColor} boxSize={3} />
                {tip}
              </ListItem>
            ))}
          </List>
          
          <Button
            size="xs"
            variant="outline"
            colorScheme="blue"
            mt={3}
            onClick={onOpen}
            leftIcon={<Icon as={FaGraduationCap} />}
          >
            View All Tips
          </Button>
        </CardBody>
        
        {/* Full content modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Agricultural Transparency Guide</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <EducationContent />
            </ModalBody>
            <ModalFooter>
              <Button onClick={onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Card>
    );
  }
  
  // Modal-only display
  return (
    <>
      <Button
        colorScheme="blue"
        variant="outline"
        leftIcon={<Icon as={FaGraduationCap} />}
        onClick={onOpen}
      >
        View Transparency Guide
      </Button>
      
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Agricultural Transparency Guide</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <EducationContent />
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default EventEducationIntegration;