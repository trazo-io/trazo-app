import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Divider,
  Progress,
  Heading,
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import {
  FaLeaf,
  FaDollarSign,
  FaLightbulb,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCertificate,
  FaShieldAlt,
  FaCalendarAlt,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { MdVerified, MdEco } from 'react-icons/md';
import { format, parseISO } from 'date-fns';
import { getReadableFieldValue } from '../../utils/fieldDisplayUtils';
import {
  getVerificationBadgeConfig,
  getVerificationColor,
  type VerificationLevel
} from '../../utils/verificationTierHelpers';

interface CarbonCalculation {
  co2e: number;
  efficiency_score: number;
  usda_verified: boolean;
  calculation_method: string;
  verification_confidence: 'high' | 'medium' | 'low';
  breakdown?: {
    nitrogen_emissions?: number;
    phosphorus_emissions?: number;
    potassium_emissions?: number;
    application_efficiency?: number;
  };
  cost_analysis?: {
    estimated_cost: number;
    cost_per_co2e: number;
  };
  recommendations?: Array<{
    type: string;
    title: string;
    description: string;
    potential_savings: number;
    carbon_reduction: number;
  }>;
}

interface EnhancedTimelineEvent {
  id: string;
  type: string;
  description: string;
  observation?: string;
  date: string;
  certified: boolean;
  volume?: string;
  concentration?: string;
  area?: string;
  equipment?: string;
  chemical_subtype?: string; // Added 2025-01-21: organic vs synthetic differentiation
  carbon_data?: CarbonCalculation;
  // MVP Photo Verification: Tiered verification levels
  verification_level?:
    | 'self_reported'
    | 'photo_documented'
    | 'photo_verified'
    | 'data_verified'
    | 'certified';
  photo_verified_count?: number;
}

interface EnhancedEventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EnhancedTimelineEvent;
}

export const EnhancedEventDetailModal: React.FC<EnhancedEventDetailModalProps> = ({
  isOpen,
  onClose,
  event
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const getCarbonImpactColor = (co2e: number) => {
    if (co2e <= 0) return 'green'; // Carbon negative/neutral
    if (co2e <= 10) return 'yellow'; // Low impact
    if (co2e <= 25) return 'orange'; // Medium impact
    return 'red'; // High impact
  };

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'PPP p');
    } catch {
      return dateString;
    }
  };

  const eventTypeConfig = {
    chemical: { icon: FaLeaf, color: 'orange.500', name: 'Chemical Application' },
    production: { icon: MdEco, color: 'green.500', name: 'Production Activity' },
    equipment: { icon: FaShieldAlt, color: 'blue.500', name: 'Equipment Operation' },
    general: { icon: FaMapMarkerAlt, color: 'gray.500', name: 'General Activity' }
  };

  const config = eventTypeConfig[event.type] || eventTypeConfig.general;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg={bgColor} maxH="90vh">
        <ModalHeader pb={2}>
          <HStack spacing={3}>
            <Icon as={config.icon} color={config.color} boxSize={6} />
            <VStack align="start" spacing={1}>
              <Heading size="md" color={textColor}>
                {event.description}
              </Heading>
              <HStack spacing={2} flexWrap="wrap">
                <Badge colorScheme="gray" size="sm">
                  {config.name}
                </Badge>
                {/* MVP Photo Verification: Display tiered verification badge */}
                {event.verification_level &&
                  (() => {
                    const config = getVerificationBadgeConfig(
                      event.verification_level as VerificationLevel
                    );
                    const colorScheme = getVerificationColor(
                      event.verification_level as VerificationLevel
                    );
                    return (
                      <Tooltip label={config.tooltip} placement="top">
                        <Badge
                          colorScheme={colorScheme}
                          variant="subtle"
                          size="sm"
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          <Icon as={config.icon} boxSize={3} />
                          <Text>{config.label}</Text>
                        </Badge>
                      </Tooltip>
                    );
                  })()}
                {event.certified && (
                  <Badge colorScheme="green" size="sm">
                    <HStack spacing={1}>
                      <Icon as={MdVerified} boxSize={3} />
                      <Text>Verified</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Event Details Section */}
            <Card bg={useColorModeValue('gray.50', 'gray.700')}>
              <CardHeader pb={2}>
                <Heading size="sm" color={textColor}>
                  Event Details
                </Heading>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <HStack spacing={2}>
                      <Icon as={FaCalendarAlt} color={mutedColor} />
                      <Text fontSize="sm" color={textColor}>
                        Date:
                      </Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                      {formatDate(event.date)}
                    </Text>
                  </HStack>

                  {event.observation && (
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={1}>
                        Observation:
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>
                        {event.observation}
                      </Text>
                    </Box>
                  )}

                  {/* Technical Metadata */}
                  {(event.volume ||
                    event.area ||
                    event.concentration ||
                    event.chemical_subtype) && (
                    <>
                      <Divider />
                      <SimpleGrid columns={2} spacing={3}>
                        {event.chemical_subtype && (
                          <Box>
                            <Text fontSize="xs" color={mutedColor}>
                              Chemical Type
                            </Text>
                            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                              {getReadableFieldValue('chemical_subtype', event.chemical_subtype)}
                            </Text>
                          </Box>
                        )}
                        {event.volume && (
                          <Box>
                            <Text fontSize="xs" color={mutedColor}>
                              Volume
                            </Text>
                            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                              {event.volume}
                            </Text>
                          </Box>
                        )}
                        {event.area && (
                          <Box>
                            <Text fontSize="xs" color={mutedColor}>
                              Area
                            </Text>
                            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                              {event.area}
                            </Text>
                          </Box>
                        )}
                        {event.concentration && (
                          <Box>
                            <Text fontSize="xs" color={mutedColor}>
                              Concentration
                            </Text>
                            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                              {event.concentration}
                            </Text>
                          </Box>
                        )}
                        {event.equipment && (
                          <Box>
                            <Text fontSize="xs" color={mutedColor}>
                              Equipment
                            </Text>
                            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                              {event.equipment}
                            </Text>
                          </Box>
                        )}
                      </SimpleGrid>
                    </>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Carbon Impact Section */}
            {event.carbon_data && (
              <Card bg={useColorModeValue('gray.50', 'gray.700')}>
                <CardHeader pb={2}>
                  <HStack justify="space-between">
                    <Heading size="sm" color={textColor}>
                      Carbon Impact Analysis
                    </Heading>
                    {event.carbon_data.usda_verified && (
                      <Tooltip label="Calculated using USDA verified emission factors">
                        <Badge colorScheme="blue" size="sm">
                          <HStack spacing={1}>
                            <Icon as={FaCertificate} boxSize={3} />
                            <Text>USDA Verified</Text>
                          </HStack>
                        </Badge>
                      </Tooltip>
                    )}
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Main Carbon Metrics */}
                    <SimpleGrid columns={2} spacing={4}>
                      <Stat>
                        <StatLabel fontSize="xs">Carbon Impact</StatLabel>
                        <StatNumber
                          fontSize="xl"
                          color={`${getCarbonImpactColor(event.carbon_data.co2e)}.500`}
                        >
                          {event.carbon_data.co2e > 0 ? '+' : ''}
                          {event.carbon_data.co2e.toFixed(1)} kg CO₂e
                        </StatNumber>
                        <StatHelpText fontSize="xs">
                          {event.carbon_data.co2e > 0 ? 'Carbon footprint' : 'Carbon reduction'}
                        </StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel fontSize="xs">Efficiency Score</StatLabel>
                        <StatNumber
                          fontSize="xl"
                          color={`${getEfficiencyColor(event.carbon_data.efficiency_score)}.500`}
                        >
                          {Math.round(event.carbon_data.efficiency_score)}%
                        </StatNumber>
                        <StatHelpText fontSize="xs">Application efficiency</StatHelpText>
                      </Stat>
                    </SimpleGrid>

                    {/* Efficiency Progress Bar */}
                    <Box>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="xs" color={mutedColor}>
                          Application Efficiency
                        </Text>
                        <Text fontSize="xs" color={textColor}>
                          {Math.round(event.carbon_data.efficiency_score)}%
                        </Text>
                      </HStack>
                      <Progress
                        value={event.carbon_data.efficiency_score}
                        colorScheme={getEfficiencyColor(event.carbon_data.efficiency_score)}
                        size="sm"
                        borderRadius="md"
                      />
                    </Box>

                    {/* Data Confidence */}
                    <HStack justify="space-between">
                      <Text fontSize="sm" color={textColor}>
                        Data Confidence:
                      </Text>
                      <Badge
                        colorScheme={getConfidenceColor(event.carbon_data.verification_confidence)}
                        size="sm"
                        textTransform="capitalize"
                      >
                        {event.carbon_data.verification_confidence}
                      </Badge>
                    </HStack>

                    {/* Cost Analysis */}
                    {event.carbon_data.cost_analysis && (
                      <>
                        <Divider />
                        <SimpleGrid columns={2} spacing={4}>
                          <Stat>
                            <StatLabel fontSize="xs">Estimated Cost</StatLabel>
                            <StatNumber fontSize="lg" color={textColor}>
                              ${event.carbon_data.cost_analysis.estimated_cost.toFixed(2)}
                            </StatNumber>
                          </Stat>

                          <Stat>
                            <StatLabel fontSize="xs">Cost per kg CO₂e</StatLabel>
                            <StatNumber fontSize="lg" color={textColor}>
                              ${event.carbon_data.cost_analysis.cost_per_co2e.toFixed(2)}
                            </StatNumber>
                          </Stat>
                        </SimpleGrid>
                      </>
                    )}

                    {/* Methodology */}
                    <Box bg={useColorModeValue('white', 'gray.600')} p={3} borderRadius="md">
                      <Text fontSize="xs" color={mutedColor} mb={1}>
                        Calculation Method:
                      </Text>
                      <Text fontSize="sm" color={textColor}>
                        {event.carbon_data.calculation_method}
                      </Text>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            )}

            {/* Optimization Recommendations */}
            {event.carbon_data?.recommendations && event.carbon_data.recommendations.length > 0 && (
              <Card bg={useColorModeValue('gray.50', 'gray.700')}>
                <CardHeader pb={2}>
                  <HStack spacing={2}>
                    <Icon as={FaLightbulb} color="yellow.500" />
                    <Heading size="sm" color={textColor}>
                      Optimization Suggestions ({event.carbon_data.recommendations.length})
                    </Heading>
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={3} align="stretch">
                    {event.carbon_data.recommendations.map((rec, index) => (
                      <Alert key={index} status="info" borderRadius="md">
                        <AlertIcon />
                        <Box>
                          <AlertTitle fontSize="sm">{rec.title}</AlertTitle>
                          <AlertDescription fontSize="sm">
                            {rec.description}
                            <br />
                            <Text as="span" fontWeight="semibold" color="green.500">
                              Save ${rec.potential_savings} • Reduce{' '}
                              {rec.carbon_reduction.toFixed(1)} kg CO₂e
                            </Text>
                          </AlertDescription>
                        </Box>
                      </Alert>
                    ))}
                  </VStack>
                </CardBody>
              </Card>
            )}

            {/* No Carbon Data Message */}
            {!event.carbon_data && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Carbon Impact Not Calculated</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Carbon calculation data is not available for this event. This may be because:
                    <br />• The event was created before carbon tracking was implemented
                    <br />• Insufficient data for accurate carbon calculation
                    <br />• Manual events without automated carbon analysis
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="gray" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EnhancedEventDetailModal;
