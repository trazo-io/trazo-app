import React from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  VStack,
  Text,
  Progress,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Spinner
} from '@chakra-ui/react';
import { LockIcon, WarningIcon, CheckCircleIcon, InfoIcon } from '@chakra-ui/icons';
import { useGetUserSecurityStatusQuery } from '../../store/api/carbonApi';

interface SecurityStatusCardProps {
  showDetails?: boolean;
  compact?: boolean;
}

const SecurityStatusCard: React.FC<SecurityStatusCardProps> = ({
  showDetails = true,
  compact = false
}) => {
  const { data: securityStatus, isLoading, error } = useGetUserSecurityStatusQuery();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const getTrustScoreColor = (score: number) => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    return 'red';
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Very Good';
    if (score >= 0.7) return 'Good';
    if (score >= 0.6) return 'Fair';
    return 'Needs Improvement';
  };

  const getSecurityIcon = (score: number) => {
    if (score >= 0.8) return CheckCircleIcon;
    if (score >= 0.6) return InfoIcon;
    return WarningIcon;
  };

  if (isLoading) {
    return (
      <Card bg={bgColor} borderColor={borderColor}>
        <CardBody>
          <HStack justify="center" py={4}>
            <Spinner size="md" />
            <Text>Loading security status...</Text>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  if (error || !securityStatus) {
    return (
      <Card bg={bgColor} borderColor={borderColor}>
        <CardBody>
          <Alert status="warning" size="sm">
            <AlertIcon />
            <AlertTitle fontSize="sm">Security Status Unavailable</AlertTitle>
            <AlertDescription fontSize="xs">
              Unable to load security metrics. Please try again later.
            </AlertDescription>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  const trustScore = securityStatus.overall_trust_score || 0;
  const trustColor = getTrustScoreColor(trustScore);
  const SecurityIconComponent = getSecurityIcon(trustScore);

  if (compact) {
    return (
      <Card size="sm" bg={bgColor} borderColor={borderColor}>
        <CardBody>
          <HStack justify="space-between" align="center">
            <HStack>
              <Icon as={SecurityIconComponent} color={`${trustColor}.500`} />
              <VStack spacing={0} align="flex-start">
                <Text fontSize="sm" fontWeight="medium">
                  Security Score
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {getTrustScoreLabel(trustScore)}
                </Text>
              </VStack>
            </HStack>

            <VStack spacing={1} align="flex-end">
              <Text fontSize="lg" fontWeight="bold" color={`${trustColor}.500`}>
                {Math.round(trustScore * 100)}%
              </Text>
              {securityStatus.security_flags?.length > 0 && (
                <Badge size="sm" colorScheme="red" variant="subtle">
                  {securityStatus.security_flags.length} flag
                  {securityStatus.security_flags.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </VStack>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg={bgColor} borderColor={borderColor}>
      <CardHeader>
        <HStack justify="space-between" align="center">
          <HStack>
            <Icon as={LockIcon} color="trazo.500" boxSize={5} />
            <Heading size="md" color="trazo.500">
              Security Status
            </Heading>
          </HStack>

          <Badge
            size="lg"
            colorScheme={trustColor}
            variant={trustScore >= 0.8 ? 'solid' : 'outline'}
          >
            {getTrustScoreLabel(trustScore)}
          </Badge>
        </HStack>
      </CardHeader>

      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* Trust Score Overview */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="medium">
                Overall Trust Score
              </Text>
              <Text fontSize="lg" fontWeight="bold" color={`${trustColor}.500`}>
                {Math.round(trustScore * 100)}%
              </Text>
            </HStack>
            <Progress
              value={trustScore * 100}
              colorScheme={trustColor}
              size="lg"
              borderRadius="md"
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Based on verification history, gaming detection, and compliance metrics
            </Text>
          </Box>

          {/* Security Flags */}
          {securityStatus.security_flags && securityStatus.security_flags.length > 0 && (
            <Alert status="warning" size="sm">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">Security Attention Required</AlertTitle>
                <AlertDescription fontSize="xs">
                  {securityStatus.security_flags.length} security flag
                  {securityStatus.security_flags.length !== 1 ? 's' : ''} detected. Review your
                  activity to improve trust score.
                </AlertDescription>
              </Box>
            </Alert>
          )}

          {showDetails && (
            <>
              {/* Security Metrics Grid */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {securityStatus.trust_metrics && (
                  <Stat size="sm">
                    <StatLabel fontSize="xs">Gaming Detection</StatLabel>
                    <StatNumber
                      fontSize="md"
                      color={
                        securityStatus.gaming_detection?.risk_level === 'low'
                          ? 'green.500'
                          : securityStatus.gaming_detection?.risk_level === 'medium'
                          ? 'yellow.500'
                          : 'red.500'
                      }
                    >
                      {securityStatus.gaming_detection?.risk_level || 'Low'} Risk
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      {securityStatus.gaming_detection?.confidence
                        ? `${Math.round(
                            securityStatus.gaming_detection.confidence * 100
                          )}% confidence`
                        : 'No suspicious patterns detected'}
                    </StatHelpText>
                  </Stat>
                )}

                {securityStatus.rate_limiting_status && (
                  <Stat size="sm">
                    <StatLabel fontSize="xs">Rate Limit Status</StatLabel>
                    <StatNumber fontSize="md" color="blue.500">
                      {securityStatus.rate_limiting_status.requests_remaining || 'Unlimited'}
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      {securityStatus.rate_limiting_status.reset_time
                        ? `Resets in ${securityStatus.rate_limiting_status.reset_time}`
                        : 'No limits applied'}
                    </StatHelpText>
                  </Stat>
                )}
              </SimpleGrid>

              {/* Trust Factors */}
              {securityStatus.trust_metrics && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={3}>
                    Trust Factors
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {Object.entries(securityStatus.trust_metrics).map(([factor, value]) => (
                      <HStack key={factor} justify="space-between">
                        <Text fontSize="sm" color="gray.600" textTransform="capitalize">
                          {factor.replace(/_/g, ' ')}
                        </Text>
                        <Badge
                          size="sm"
                          colorScheme={typeof value === 'number' && value > 0.7 ? 'green' : 'gray'}
                        >
                          {typeof value === 'number'
                            ? `${Math.round(value * 100)}%`
                            : String(value)}
                        </Badge>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Improvement Recommendations */}
              {trustScore < 0.8 && (
                <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                  <Text fontSize="sm" fontWeight="medium" color="blue.700" mb={2}>
                    💡 Improve Your Security Score
                  </Text>
                  <VStack spacing={1} align="stretch">
                    <Text fontSize="xs" color="blue.600">
                      • Upload photo evidence for carbon entries
                    </Text>
                    <Text fontSize="xs" color="blue.600">
                      • Complete verification requirements
                    </Text>
                    <Text fontSize="xs" color="blue.600">
                      • Maintain consistent reporting patterns
                    </Text>
                    {securityStatus.security_flags?.length > 0 && (
                      <Text fontSize="xs" color="blue.600">
                        • Address flagged security concerns
                      </Text>
                    )}
                  </VStack>
                </Box>
              )}
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default SecurityStatusCard;
