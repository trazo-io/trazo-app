import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Icon,
  Box,
  Progress,
  useToast,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Textarea,
  Input,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Spinner
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, LockIcon, InfoIcon } from '@chakra-ui/icons';
import {
  useCreateSecureCarbonOffsetMutation,
  useGetUserSecurityStatusQuery
} from '../../store/api/carbonApi';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

interface EnhancedOffsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentId?: string;
  productionId?: string;
  carbonEntryId?: number;
  onOffsetCreated?: (result: any) => void;
}

const EnhancedOffsetModal: React.FC<EnhancedOffsetModalProps> = ({
  isOpen,
  onClose,
  establishmentId,
  productionId,
  onOffsetCreated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    amount: 0,
    source_id: '',
    additionality_evidence: '',
    permanence_plan: '',
    methodology_template: '',
    registry_verification_id: ''
  });

  const [createSecureOffset, { isLoading: isCreating }] = useCreateSecureCarbonOffsetMutation();
  const { data: securityStatus, isLoading: isLoadingStatus } = useGetUserSecurityStatusQuery();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.source_id) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in the carbon amount and offset source.',
        status: 'warning',
        duration: 4000,
        isClosable: true
      });
      return;
    }

    try {
      const result = await createSecureOffset({
        ...formData,
        establishmentId,
        productionId,
        type: 'offset', // Required field
        year: new Date().getFullYear() // Required field
      }).unwrap();

      toast({
        title: 'Secure Carbon Offset Created',
        description: `Successfully created ${result.amount} kg CO₂e offset with enhanced security validation`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      if (onOffsetCreated) {
        onOffsetCreated(result);
      }
      onClose();
    } catch (error: any) {
      console.error('Carbon offset creation error:', error);

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
        title: 'Error Creating Offset',
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

  const getTrustScoreLabel = (score: number) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Very Good';
    if (score >= 0.7) return 'Good';
    if (score >= 0.6) return 'Fair';
    return 'Needs Improvement';
  };

  const isSecurityConcern =
    securityStatus &&
    (securityStatus.overall_trust_score < 0.6 ||
      (securityStatus.security_flags && securityStatus.security_flags.length > 0));

  const trustScore = securityStatus?.overall_trust_score || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent bg={bgColor} borderRadius="xl" boxShadow="2xl">
        <ModalHeader borderBottom="1px" borderColor={borderColor} pb={4}>
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Box p={2} bg="green.50" borderRadius="lg" border="1px" borderColor="green.200">
                <Icon as={LockIcon} color="green.600" boxSize={5} />
              </Box>
              <VStack spacing={0} align="flex-start">
                <Text fontSize="lg" fontWeight="bold" color="green.600">
                  Create Carbon Offset
                </Text>
                <Text fontSize="sm" color="gray.600" fontWeight="normal">
                  Enhanced security and verification
                </Text>
              </VStack>
            </HStack>

            {securityStatus && (
              <VStack spacing={1} align="flex-end">
                <Badge
                  colorScheme={getTrustScoreColor(trustScore)}
                  variant="subtle"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs">
                  {getTrustScoreLabel(trustScore)}
                </Badge>
                <Text fontSize="xs" color="gray.500">
                  Trust Score: {Math.round(trustScore * 100)}%
                </Text>
              </VStack>
            )}
          </HStack>
        </ModalHeader>

        <ModalCloseButton />

        <ModalBody py={6}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={6} align="stretch">
              {/* Security Status Overview */}
              {isLoadingStatus && (
                <Card variant="outline" bg="gray.50">
                  <CardBody>
                    <HStack>
                      <Spinner size="sm" />
                      <Text fontSize="sm" color="gray.600">
                        Loading security status...
                      </Text>
                    </HStack>
                  </CardBody>
                </Card>
              )}

              {isSecurityConcern && (
                <Alert
                  status="warning"
                  borderRadius="lg"
                  bg="orange.50"
                  borderColor="orange.200"
                  border="1px">
                  <AlertIcon color="orange.500" />
                  <Box>
                    <AlertTitle fontSize="sm" fontWeight="semibold" color="orange.700">
                      Security Review Required
                    </AlertTitle>
                    <AlertDescription fontSize="sm" color="orange.600" mt={1}>
                      Your trust score is {Math.round(trustScore * 100)}%.
                      {securityStatus?.security_flags?.length > 0 &&
                        ` ${securityStatus.security_flags.length} security flag(s) detected.`}{' '}
                      Complete verification steps to improve your score.
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {/* Security Metrics Card */}
              {securityStatus && (
                <Card variant="outline" bg="green.50" borderColor="green.200">
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <HStack justify="space-between">
                        <Heading size="sm" color="green.700">
                          Security Status
                        </Heading>
                        <Badge colorScheme="green" variant="subtle">
                          Enhanced Validation Active
                        </Badge>
                      </HStack>

                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Stat size="sm">
                          <StatLabel fontSize="xs" color="gray.600">
                            Trust Score
                          </StatLabel>
                          <StatNumber fontSize="lg" color={`${getTrustScoreColor(trustScore)}.600`}>
                            {Math.round(trustScore * 100)}%
                          </StatNumber>
                          <Progress
                            value={trustScore * 100}
                            colorScheme={getTrustScoreColor(trustScore)}
                            size="sm"
                            mt={1}
                            borderRadius="full"
                          />
                        </Stat>

                        <Stat size="sm">
                          <StatLabel fontSize="xs" color="gray.600">
                            Security Flags
                          </StatLabel>
                          <StatNumber
                            fontSize="lg"
                            color={
                              securityStatus.security_flags?.length > 0 ? 'red.600' : 'green.600'
                            }>
                            {securityStatus.security_flags?.length || 0}
                          </StatNumber>
                          <StatHelpText fontSize="xs" color="gray.500">
                            {securityStatus.security_flags?.length > 0
                              ? 'Issues detected'
                              : 'All clear'}
                          </StatHelpText>
                        </Stat>

                        <Stat size="sm">
                          <StatLabel fontSize="xs" color="gray.600">
                            Rate Limit
                          </StatLabel>
                          <StatNumber fontSize="lg" color="blue.600">
                            {securityStatus.rate_limiting_status?.requests_remaining || 'N/A'}
                          </StatNumber>
                          <StatHelpText fontSize="xs" color="gray.500">
                            Requests remaining
                          </StatHelpText>
                        </Stat>
                      </SimpleGrid>
                    </VStack>
                  </CardBody>
                </Card>
              )}

              <Divider />

              {/* Offset Details Form */}
              <VStack spacing={5} align="stretch">
                <Heading size="md" color="gray.800">
                  Offset Details
                </Heading>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Carbon Amount (kg CO₂e)
                    </FormLabel>
                    <NumberInput
                      value={formData.amount}
                      onChange={(_, value) =>
                        setFormData((prev) => ({ ...prev, amount: value || 0 }))
                      }
                      min={0}
                      precision={2}
                      focusBorderColor="green.500">
                      <NumberInputField borderRadius="md" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Offset Source
                    </FormLabel>
                    <Select
                      value={formData.source_id}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, source_id: e.target.value }))
                      }
                      placeholder="Select offset source"
                      focusBorderColor="green.500"
                      borderRadius="md">
                      <option value="renewable_energy">🔋 Renewable Energy</option>
                      <option value="reforestation">🌲 Reforestation</option>
                      <option value="no_till">🚜 No-Till Farming</option>
                      <option value="cover_crop">🌱 Cover Crops</option>
                      <option value="composting">♻️ Composting</option>
                      <option value="methane_capture">⚡ Methane Capture</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Methodology Template
                    </FormLabel>
                    <Select
                      value={formData.methodology_template}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, methodology_template: e.target.value }))
                      }
                      placeholder="Select methodology (optional)"
                      focusBorderColor="green.500"
                      borderRadius="md">
                      <option value="VCS">Verified Carbon Standard (VCS)</option>
                      <option value="Gold Standard">Gold Standard</option>
                      <option value="CAR">Climate Action Reserve</option>
                      <option value="ACR">American Carbon Registry</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Registry Verification ID
                    </FormLabel>
                    <Input
                      value={formData.registry_verification_id}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          registry_verification_id: e.target.value
                        }))
                      }
                      placeholder="Enter verification ID (if available)"
                      focusBorderColor="green.500"
                      borderRadius="md"
                    />
                  </FormControl>
                </SimpleGrid>

                <Divider />

                <VStack spacing={4} align="stretch">
                  <Heading size="sm" color="gray.800">
                    Verification Requirements
                  </Heading>

                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Additionality Evidence
                    </FormLabel>
                    <Textarea
                      value={formData.additionality_evidence}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, additionality_evidence: e.target.value }))
                      }
                      placeholder="Explain why this offset is additional to business-as-usual practices..."
                      rows={3}
                      resize="vertical"
                      focusBorderColor="green.500"
                      borderRadius="md"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Permanence Plan
                    </FormLabel>
                    <Textarea
                      value={formData.permanence_plan}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, permanence_plan: e.target.value }))
                      }
                      placeholder="Describe measures ensuring long-term carbon storage..."
                      rows={3}
                      resize="vertical"
                      focusBorderColor="green.500"
                      borderRadius="md"
                    />
                  </FormControl>
                </VStack>

                {/* Information Alert */}
                <Alert
                  status="info"
                  borderRadius="lg"
                  bg="blue.50"
                  borderColor="blue.200"
                  border="1px">
                  <AlertIcon color="blue.500" />
                  <Box>
                    <AlertTitle fontSize="sm" fontWeight="medium" color="blue.700">
                      Enhanced Security Validation
                    </AlertTitle>
                    <AlertDescription fontSize="sm" color="blue.600" mt={1}>
                      All offsets undergo anti-gaming detection, trust scoring, and comprehensive
                      verification to ensure carbon transparency integrity.
                    </AlertDescription>
                  </Box>
                </Alert>
              </VStack>
            </VStack>
          </form>
        </ModalBody>

        <ModalFooter borderTop="1px" borderColor={borderColor} pt={4}>
          <HStack spacing={3} w="full" justify="space-between">
            <Text fontSize="xs" color="gray.500">
              Protected by enhanced security validation
            </Text>

            <HStack spacing={3}>
              <Button variant="outline" onClick={onClose} size="md" borderRadius="md">
                Cancel
              </Button>

              <Button
                colorScheme="green"
                onClick={handleSubmit}
                isLoading={isCreating}
                loadingText="Creating Offset..."
                leftIcon={<LockIcon />}
                isDisabled={!formData.amount || !formData.source_id}
                size="md"
                borderRadius="md"
                px={6}>
                Create Secure Offset
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EnhancedOffsetModal;
