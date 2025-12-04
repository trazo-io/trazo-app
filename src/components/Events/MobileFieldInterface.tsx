import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useDisclosure,
  Flex,
  IconButton,
  Tooltip,
  useColorModeValue,
  Card,
  CardBody,
  SimpleGrid,
  Circle,
  Progress,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import {
  FaPlus,
  FaMicrophone,
  FaQuestionCircle,
  FaHistory,
  FaLeaf,
  FaSun,
  FaWind,
  FaThermometerHalf,
  FaCloudRain,
  FaBolt,
  FaSignal
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';

// Import our new components
import { SimplifiedEventCreator } from './SimplifiedEventCreator';
import { AgriculturalContextHelp } from '../Help/AgriculturalContextHelp';
import { VoiceEventCapture } from './VoiceEventCapture';

interface MobileFieldInterfaceProps {
  parcelData?: any;
  weatherData?: any;
  onEventCreated?: (event: any) => void;
}

// Mock weather data structure (replace with actual API)
const MOCK_WEATHER = {
  temperature: 72,
  humidity: 45,
  windSpeed: 8,
  precipitation: 0,
  conditions: 'Partly Cloudy',
  suitability: {
    fertilizer: 'good',
    irrigation: 'fair',
    pesticide: 'good',
    equipment: 'excellent'
  }
};

// Quick action templates for common field activities
const QUICK_ACTIONS = [
  {
    id: 'fertilizer_quick',
    name: 'Fertilizer',
    icon: FaLeaf,
    color: 'green',
    description: 'Applied fertilizer',
    estimatedTime: '2 min'
  },
  {
    id: 'irrigation_quick',
    name: 'Irrigation',
    icon: FaCloudRain,
    color: 'blue',
    description: 'Watered crops',
    estimatedTime: '1 min'
  },
  {
    id: 'equipment_quick',
    name: 'Equipment',
    icon: FaBolt,
    color: 'orange',
    description: 'Used machinery',
    estimatedTime: '2 min'
  },
  {
    id: 'observation_quick',
    name: 'Observation',
    icon: FaSignal,
    color: 'purple',
    description: 'Field notes',
    estimatedTime: '1 min'
  }
];

export const MobileFieldInterface: React.FC<MobileFieldInterfaceProps> = ({
  parcelData,
  weatherData = MOCK_WEATHER,
  onEventCreated
}) => {
  const toast = useToast();
  const navigate = useNavigate();
  const { parcelId, establishmentId } = useParams();

  // Component state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [currentInterface, setCurrentInterface] = useState<'main' | 'creator' | 'voice'>('main');
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null);

  // Modal controls
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();

  // Redux state
  const currentCompany = useSelector((state: any) => state.company.currentCompany);
  const currentParcel =
    parcelData ||
    currentCompany?.establishments
      ?.find((est: any) => est.id === parseInt(establishmentId || '0'))
      ?.parcels?.find((p: any) => p.id === parseInt(parcelId || '0'));

  // Theme colors optimized for outdoor readability
  const bgColor = useColorModeValue('#FFFFFF', '#1A202C');
  const textColor = useColorModeValue('#2D3748', '#F7FAFC');
  const cardBg = useColorModeValue('#F7FAFC', '#2D3748');
  const accentColor = useColorModeValue('#38A169', '#68D391');

  // Monitor network and battery status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Battery API (if supported)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Weather condition colors
  const getWeatherColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'green';
      case 'good':
        return 'green';
      case 'fair':
        return 'yellow';
      case 'poor':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Handle quick action selection
  const handleQuickAction = (actionId: string) => {
    setSelectedQuickAction(actionId);
    setCurrentInterface('creator');
  };

  // Handle voice mode activation
  const handleVoiceMode = () => {
    setCurrentInterface('voice');
  };

  // Handle event creation completion
  const handleEventCreated = (event: any) => {
    setCurrentInterface('main');
    setSelectedQuickAction(null);

    if (onEventCreated) {
      onEventCreated(event);
    }

    toast({
      title: 'Event Recorded! 📱',
      description: 'Your field activity has been successfully logged.',
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  // Handle back navigation
  const handleBack = () => {
    if (currentInterface === 'creator' || currentInterface === 'voice') {
      setCurrentInterface('main');
      setSelectedQuickAction(null);
    } else {
      navigate(-1);
    }
  };

  // Render status bar
  const renderStatusBar = () => (
    <Card bg={cardBg} mb={4}>
      <CardBody py={3}>
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <Badge colorScheme={isOffline ? 'red' : 'green'} variant="solid">
              {isOffline ? 'Offline' : 'Online'}
            </Badge>
            {batteryLevel < 20 && (
              <Badge colorScheme="red" variant="solid">
                Battery: {batteryLevel}%
              </Badge>
            )}
          </HStack>

          <HStack spacing={2}>
            <Tooltip label="Field conditions and help">
              <IconButton
                aria-label="Help"
                icon={<FaQuestionCircle />}
                size="sm"
                variant="ghost"
                onClick={onHelpOpen}
              />
            </Tooltip>
            <Text fontSize="xs" color="gray.500">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </HStack>
        </Flex>
      </CardBody>
    </Card>
  );

  // Render weather conditions
  const renderWeatherCard = () => (
    <Card bg={cardBg} mb={4}>
      <CardBody>
        <VStack spacing={3}>
          <HStack justify="space-between" w="full">
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" color="gray.500">
                Field Conditions
              </Text>
              <Text fontWeight="bold">{weatherData.conditions}</Text>
            </VStack>
            <HStack spacing={3}>
              <HStack spacing={1}>
                <Icon as={FaThermometerHalf} color="red.400" boxSize={3} />
                <Text fontSize="sm">{weatherData.temperature}°F</Text>
              </HStack>
              <HStack spacing={1}>
                <Icon as={FaWind} color="blue.400" boxSize={3} />
                <Text fontSize="sm">{weatherData.windSpeed} mph</Text>
              </HStack>
            </HStack>
          </HStack>

          <SimpleGrid columns={4} spacing={2} w="full">
            {Object.entries(weatherData.suitability).map(([activity, condition]) => (
              <VStack key={activity} spacing={1}>
                <Circle
                  size="24px"
                  bg={`${getWeatherColor(condition as string)}.100`}
                  color={`${getWeatherColor(condition as string)}.600`}
                >
                  <Box
                    w="8px"
                    h="8px"
                    bg={`${getWeatherColor(condition as string)}.500`}
                    borderRadius="full"
                  />
                </Circle>
                <Text fontSize="xs" textAlign="center" textTransform="capitalize">
                  {activity}
                </Text>
              </VStack>
            ))}
          </SimpleGrid>

          {weatherData.suitability.fertilizer === 'poor' && (
            <Alert status="warning" size="sm" borderRadius="md">
              <AlertIcon boxSize={3} />
              <Text fontSize="xs">Wind speed too high for spraying operations</Text>
            </Alert>
          )}
        </VStack>
      </CardBody>
    </Card>
  );

  // Render parcel info
  const renderParcelInfo = () => (
    <Card bg={cardBg} mb={4}>
      <CardBody py={3}>
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" color="gray.500">
              Current Parcel
            </Text>
            <Text fontWeight="semibold">{currentParcel?.name || 'Field #1'}</Text>
          </VStack>
          <VStack align="end" spacing={0}>
            <Text fontSize="sm" color="gray.500">
              Crop
            </Text>
            <Text fontSize="sm">{currentParcel?.crop_type || 'Mixed Crops'}</Text>
          </VStack>
        </HStack>
      </CardBody>
    </Card>
  );

  // Render main interface
  const renderMainInterface = () => (
    <VStack spacing={6} align="stretch">
      {/* Voice Input - Primary Action */}
      <Card bg="linear-gradient(135deg, #4299E1 0%, #3182CE 100%)" color="white">
        <CardBody>
          <Button
            size="lg"
            leftIcon={<FaMicrophone />}
            bg="whiteAlpha.200"
            color="white"
            _hover={{ bg: 'whiteAlpha.300', transform: 'translateY(-1px)' }}
            _active={{ bg: 'whiteAlpha.400' }}
            borderRadius="xl"
            width="full"
            height="60px"
            onClick={handleVoiceMode}
          >
            <VStack spacing={0}>
              <Text fontWeight="bold">Speak Your Activity</Text>
              <Text fontSize="xs" opacity={0.8}>
                Fastest way to log events
              </Text>
            </VStack>
          </Button>
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={3} color={textColor}>
          Quick Actions
        </Text>
        <SimpleGrid columns={2} spacing={3}>
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.id}
              cursor="pointer"
              borderWidth="1px"
              _hover={{
                transform: 'translateY(-2px)',
                shadow: 'md',
                borderColor: `${action.color}.400`
              }}
              transition="all 0.2s"
              onClick={() => handleQuickAction(action.id)}
            >
              <CardBody py={4}>
                <VStack spacing={2}>
                  <Circle size="40px" bg={`${action.color}.100`} color={`${action.color}.600`}>
                    <Icon as={action.icon} boxSize={5} />
                  </Circle>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" fontSize="sm" textAlign="center">
                      {action.name}
                    </Text>
                    <Badge colorScheme={action.color} size="sm">
                      {action.estimatedTime}
                    </Badge>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      {/* Full Creator */}
      <Button
        leftIcon={<FaPlus />}
        variant="outline"
        colorScheme="green"
        size="lg"
        borderRadius="xl"
        onClick={() => setCurrentInterface('creator')}
      >
        Create Custom Event
      </Button>

      {/* Recent Activities */}
      <Box>
        <HStack justify="space-between" mb={3}>
          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
            Recent Activities
          </Text>
          <Button
            size="xs"
            variant="ghost"
            leftIcon={<FaHistory />}
            onClick={() => navigate(`/dashboard/parcel/${parcelId}`)}
          >
            View All
          </Button>
        </HStack>

        <Card bg={cardBg}>
          <CardBody py={3}>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              No recent activities. Start by recording your first event!
            </Text>
          </CardBody>
        </Card>
      </Box>
    </VStack>
  );

  // Render voice interface
  const renderVoiceInterface = () => (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Text fontWeight="bold">Voice Input</Text>
        <Box w="60px" /> {/* Spacer */}
      </HStack>

      <VoiceEventCapture
        isActive={true}
        cropType={currentParcel?.crop_type || 'Mixed Crops'}
        onEventDetected={handleEventCreated}
        onClose={() => setCurrentInterface('main')}
      />
    </VStack>
  );

  return (
    <Box minH="100vh" bg={bgColor} px={4} py={4} pb={8} position="relative">
      {/* Status Bar */}
      {renderStatusBar()}

      {/* Parcel Info */}
      {renderParcelInfo()}

      {/* Weather Conditions */}
      {renderWeatherCard()}

      {/* Main Content */}
      {currentInterface === 'main' && renderMainInterface()}

      {currentInterface === 'voice' && renderVoiceInterface()}

      {currentInterface === 'creator' && (
        <Box>
          <HStack justify="space-between" mb={4}>
            <Button variant="ghost" onClick={handleBack}>
              ← Back
            </Button>
            <Text fontWeight="bold">Create Event</Text>
            <Box w="60px" /> {/* Spacer */}
          </HStack>

          <SimplifiedEventCreator
            onClose={() => setCurrentInterface('main')}
            onEventCreated={handleEventCreated}
          />
        </Box>
      )}

      {/* Agricultural Context Help Modal */}
      <AgriculturalContextHelp
        isOpen={isHelpOpen}
        onClose={onHelpClose}
        eventType="fertilizer_application"
        cropType={currentParcel?.crop_type || 'Mixed Crops'}
        showFloatingButton={false}
      />

      {/* Offline Indicator */}
      {isOffline && (
        <Box position="fixed" bottom={4} left={4} right={4} zIndex={1000}>
          <Alert status="warning" borderRadius="lg" boxShadow="lg">
            <AlertIcon />
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="semibold">
                Working Offline
              </Text>
              <Text fontSize="xs">Events will sync when connection is restored</Text>
            </VStack>
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default MobileFieldInterface;
