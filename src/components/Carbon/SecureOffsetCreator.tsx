import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Textarea,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Text,
  Progress,
  useToast,
  Divider,
  Heading,
  Icon,
  Spinner
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, LockIcon } from '@chakra-ui/icons';
import {
  useCreateSecureCarbonOffsetMutation,
  useGetUserSecurityStatusQuery
} from '../../store/api/carbonApi';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

interface SecureOffsetCreatorProps {
  establishmentId?: string;
  productionId?: string;
  onSuccess?: (result: any) => void;
  onCancel?: () => void;
}

const SecureOffsetCreator: React.FC<SecureOffsetCreatorProps> = ({
  establishmentId,
  productionId,
  onSuccess,
  onCancel
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    amount: 0,
    source_id: '',
    additionality_evidence: '',
    permanence_plan: '',
    baseline_data: {},
    methodology_template: '',
    registry_verification_id: '',
    evidence_photos: [] as string[],
    evidence_documents: [] as string[]
  });

  const [createSecureOffset, { isLoading: isCreating }] = useCreateSecureCarbonOffsetMutation();
  const { data: securityStatus, isLoading: isLoadingStatus } = useGetUserSecurityStatusQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createSecureOffset({
        ...formData,
        establishment_id: establishmentId,
        production_id: productionId,
        type: 'offset', // Required field
        year: new Date().getFullYear() // Required field
      }).unwrap();

      toast({
        title: 'Secure Carbon Offset Created',
        description: `Successfully created carbon offset with verification status: ${result.verification_status}`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: any) {
      console.error('Secure carbon offset creation error:', error);

      let errorMessage = 'Failed to create carbon offset';

      // Handle specific validation errors
      if (error?.data?.violations) {
        const violations = error.data.violations;
        if (Array.isArray(violations)) {
          errorMessage = `Validation failed: ${violations
            .map((v: any) => v.message || v.type)
            .join(', ')}`;
        }
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.data?.error) {
        errorMessage = error.data.error;
      }

      toast({
        title: 'Error Creating Secure Offset',
        description: errorMessage,
        status: 'error',
        duration: 7000,
        isClosable: true
      });
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    return 'red';
  };

  const getSecurityBadgeVariant = (score: number) => {
    if (score >= 0.8) return 'solid';
    if (score >= 0.6) return 'outline';
    return 'subtle';
  };

  return (
    <Card>
      <CardBody>
        <VStack spacing={6} align="stretch">
          <Box>
            <HStack justify="space-between" align="center" mb={4}>
              <Heading size="md" color="trazo.500">
                <Icon as={LockIcon} mr={2} />
                Secure Carbon Offset Creation
              </Heading>
              {securityStatus && (
                <Badge
                  variant={getSecurityBadgeVariant(securityStatus.overall_trust_score)}
                  colorScheme={getTrustScoreColor(securityStatus.overall_trust_score)}>
                  Trust Score: {Math.round(securityStatus.overall_trust_score * 100)}%
                </Badge>
              )}
            </HStack>

            {isLoadingStatus && (
              <HStack>
                <Spinner size="sm" />
                <Text fontSize="sm" color="gray.600">
                  Loading security status...
                </Text>
              </HStack>
            )}

            {securityStatus && securityStatus.security_flags?.length > 0 && (
              <Alert status="warning" mb={4}>
                <AlertIcon />
                <Box>
                  <AlertTitle>Security Flags Detected</AlertTitle>
                  <AlertDescription>
                    Please review your security status before proceeding.
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </Box>

          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <HStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Carbon Amount (kg CO2e)</FormLabel>
                  <NumberInput
                    value={formData.amount}
                    onChange={(_, value) =>
                      setFormData((prev) => ({ ...prev, amount: value || 0 }))
                    }
                    min={0}
                    precision={2}>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Offset Source</FormLabel>
                  <Select
                    value={formData.source_id}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, source_id: e.target.value }))
                    }
                    placeholder="Select offset source">
                    <option value="renewable_energy">Renewable Energy</option>
                    <option value="reforestation">Reforestation</option>
                    <option value="no_till">No-Till Farming</option>
                    <option value="cover_crop">Cover Crops</option>
                    <option value="composting">Composting</option>
                    <option value="methane_capture">Methane Capture</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Methodology Template</FormLabel>
                <Select
                  value={formData.methodology_template}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, methodology_template: e.target.value }))
                  }
                  placeholder="Select methodology (optional)">
                  <option value="VCS">Verified Carbon Standard (VCS)</option>
                  <option value="Gold Standard">Gold Standard</option>
                  <option value="CAR">Climate Action Reserve</option>
                  <option value="ACR">American Carbon Registry</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Registry Verification ID</FormLabel>
                <Input
                  value={formData.registry_verification_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, registry_verification_id: e.target.value }))
                  }
                  placeholder="Enter registry verification ID (if available)"
                />
              </FormControl>

              <Divider />

              <Heading size="sm" color="trazo.500">
                Additionality & Verification
              </Heading>

              <FormControl>
                <FormLabel>Additionality Evidence</FormLabel>
                <Textarea
                  value={formData.additionality_evidence}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, additionality_evidence: e.target.value }))
                  }
                  placeholder="Explain why this offset is additional to business-as-usual practices..."
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Permanence Plan</FormLabel>
                <Textarea
                  value={formData.permanence_plan}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, permanence_plan: e.target.value }))
                  }
                  placeholder="Describe measures ensuring long-term carbon storage..."
                  rows={3}
                />
              </FormControl>

              {securityStatus && (
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Security Validation Status
                  </Text>
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm">Trust Score</Text>
                      <HStack>
                        <Progress
                          value={securityStatus.overall_trust_score * 100}
                          width="100px"
                          size="sm"
                          colorScheme={getTrustScoreColor(securityStatus.overall_trust_score)}
                        />
                        <Text fontSize="sm" fontWeight="medium">
                          {Math.round(securityStatus.overall_trust_score * 100)}%
                        </Text>
                      </HStack>
                    </HStack>

                    {securityStatus.rate_limiting_status && (
                      <HStack justify="space-between">
                        <Text fontSize="sm">Rate Limit</Text>
                        <Badge size="sm" colorScheme="blue">
                          {securityStatus.rate_limiting_status.requests_remaining || 'N/A'}{' '}
                          remaining
                        </Badge>
                      </HStack>
                    )}
                  </VStack>
                </Box>
              )}

              <HStack justify="flex-end" spacing={4}>
                {onCancel && (
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  colorScheme="trazo"
                  isLoading={isCreating}
                  loadingText="Creating Secure Offset..."
                  leftIcon={<LockIcon />}
                  isDisabled={!formData.amount || !formData.source_id}>
                  Create Secure Offset
                </Button>
              </HStack>
            </VStack>
          </form>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default SecureOffsetCreator;
