import React from 'react';
import {
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Divider,
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
import { ResponsiveModal } from 'components/Design';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import {
  FaLeaf,
  FaDollarSign,
  FaLightbulb,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCertificate,
  FaShieldAlt,
  FaCalendarAlt,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { MdEco } from 'react-icons/md';
import { format, parseISO } from 'date-fns';
import { useIntl } from 'react-intl';
import { getReadableFieldValue } from '../../utils/fieldDisplayUtils';
import { formatCO2e } from '../../utils/carbonDisplayUtils';
import { getRecordProvenance, type VerificationLevel } from '../../utils/verificationTierHelpers';
import { isNotEstimated, showsInputsBadge } from 'utils/carbonStatus';

interface CarbonCalculation {
  co2e: number;
  efficiency_score: number;
  usda_factors_used: boolean;
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
  /**
   * What the record contains, from the server. The five-rung ladder this union enumerated was
   * retired on 2026-09-02 (see `utils/verificationTierHelpers.ts`); the union itself lives
   * there now, so the deprecated values are documented in ONE place rather than re-declared
   * wherever an event shape is written down.
   *
   * `photo_verified_count` sat beside it and is gone: the public payload renames the field to
   * `photo_documented_count` (`history/transparency_views.py`), so nothing ever populated it.
   */
  verification_level?: VerificationLevel;
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
  const intl = useIntl();
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
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      contentProps={{ bg: bgColor }}
      header={
        <HStack spacing={3} align="start">
          <Icon as={config.icon} color={config.color} boxSize={6} mt={1} flexShrink={0} />
          <VStack align="start" spacing={1} minW={0}>
            <Heading size="md" color={textColor}>
              {event.description}
            </Heading>
            <HStack spacing={2} flexWrap="wrap">
              <Badge colorScheme="gray" size="sm">
                {config.name}
              </Badge>
              {/* Record provenance — ONLY on a card whose body makes a third-party claim.
                  This modal is a CONSUMER surface (opened from UltraMobileProductionJourney
                  on the buyer page), so it carried the same five-rung colour ladder as the
                  card — and rendered the helper's ENGLISH fallbacks rather than its i18n
                  keys, so a Spanish shopper read "Photo Documented" in the middle of a
                  Spanish page.

                  The gate matches ConsumerEventCard exactly, and for the same reason: "every
                  record here is the grower's own" is a DISCLOSURE about the whole page, and
                  the page already carries it once, in `TrustSummaryHeader`. What belongs
                  beside an individual record is a QUALIFIER, and only a certification or
                  audit event asserts something a third party did. A sibling surface that
                  disagrees on this is how the last four claim defects survived their own
                  fixes. */}
              {(event.type === 'business' || (event as any).event_type === 7) &&
                (() => {
                  const provenance = getRecordProvenance();
                  return (
                    <Tooltip
                      label={intl.formatMessage({
                        id: provenance.tooltipKey,
                        defaultMessage: provenance.tooltip
                      })}
                      placement="top">
                      <Badge
                        colorScheme="gray"
                        variant="outline"
                        size="sm"
                        display="flex"
                        alignItems="center"
                        gap={1}
                        tabIndex={0}>
                        <Icon as={FaInfoCircle} aria-hidden="true" boxSize={3} />
                        <Text>
                          {intl.formatMessage({
                            id: provenance.labelKey,
                            defaultMessage: provenance.label
                          })}
                        </Text>
                      </Badge>
                    </Tooltip>
                  );
                })()}
              {/* `event.certified` rendered a solid GREEN badge with a check icon reading
                  "Documented" — green + tick is the success/verified signal, spent here on a
                  boolean the operation sets about itself. A third-party certification is
                  stated by the OMRI/WSDA chip and the certificate number, both of which name
                  the body that said it. Removed. */}
            </HStack>
          </VStack>
        </HStack>
      }
      footer={
        <Button colorScheme="gray" onClick={onClose}>
          Close
        </Button>
      }>
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
              {(event.volume || event.area || event.concentration || event.chemical_subtype) && (
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
                {showsInputsBadge(event.carbon_data) && (
                  <Tooltip label={intl.formatMessage({ id: 'carbon.badge.epaUsdaTooltip' })}>
                    <Badge colorScheme="blue" size="sm">
                      <HStack spacing={1}>
                        <Icon as={FaCertificate} boxSize={3} />
                        <Text>{intl.formatMessage({ id: 'carbon.badge.epaUsdaSourced' })}</Text>
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
                    {isNotEstimated(event.carbon_data) ? (
                      // Run 8 (R8-04): no figure, and why, never 0.
                      <StatHelpText fontSize="sm">
                        {intl.formatMessage({ id: 'carbon.notEstimated' })}
                      </StatHelpText>
                    ) : (
                      <>
                        <StatNumber
                          fontSize="xl"
                          color={`${getCarbonImpactColor(event.carbon_data.co2e)}.500`}>
                          {formatCO2e(event.carbon_data.co2e)} kg CO₂e
                        </StatNumber>
                        <StatHelpText fontSize="xs">
                          {event.carbon_data.co2e === 0
                            ? 'No direct emissions'
                            : 'Carbon footprint estimate'}
                        </StatHelpText>
                      </>
                    )}
                  </Stat>
                </SimpleGrid>

                {/* No efficiency score or efficiency bar (removed 2026-09-30). The number was a
                    0-100 grade, and on this consumer path it was built client-side from
                    `completeData.carbonScore || 0`, so a missing value printed as a red 0%.
                    Same removal as EventDetailsModal (2026-08-16). */}
                {/* Data Confidence */}
                <HStack justify="space-between">
                  <Text fontSize="sm" color={textColor}>
                    Data Confidence:
                  </Text>
                  <Badge
                    colorScheme={getConfidenceColor(event.carbon_data.verification_confidence)}
                    size="sm"
                    textTransform="capitalize">
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
                  <Alert key={index} status="info">
                    <AlertIcon />
                    <Box>
                      <AlertTitle fontSize="sm">{rec.title}</AlertTitle>
                      <AlertDescription fontSize="sm">
                        {rec.description}
                        <br />
                        <Text as="span" fontWeight="semibold" color="green.500">
                          Save ${rec.potential_savings} • Reduce {rec.carbon_reduction.toFixed(1)}{' '}
                          kg CO₂e
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
          <Alert status="warning">
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
    </ResponsiveModal>
  );
};

export default EnhancedEventDetailModal;
