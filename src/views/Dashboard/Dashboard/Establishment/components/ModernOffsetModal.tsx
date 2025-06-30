import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  useColorModeValue,
  useToast,
  Flex,
  Image,
  Link,
  Tooltip,
  IconButton,
  Grid
} from '@chakra-ui/react';
import {
  FiUpload,
  FiCamera,
  FiFileText,
  FiMapPin,
  FiShield,
  FiUsers,
  FiAward,
  FiStar,
  FiInfo,
  FiExternalLink,
  FiCheck,
  FiAlertTriangle,
  FiX,
  FiFile
} from 'react-icons/fi';
import { useGetCertifiedProjectsQuery, useCreateCarbonOffsetMutation } from 'store/api/companyApi';
import { useFileUpload } from 'services/uploadService';

interface ModernOffsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentId: string;
  onSuccess: () => void;
}

interface CertifiedProject {
  id: string;
  name: string;
  description: string;
  project_type: string;
  verification_standard: string;
  verification_badge: {
    color: string;
    text: string;
    icon: string;
  };
  country: string;
  region: string;
  developer: string;
  price_per_credit: number;
  available_credits: number;
  vintage_year: number;
  co_benefits: string[];
  featured: boolean;
  trazo_verified: boolean;
  registry_url?: string;
}

const ModernOffsetModal: React.FC<ModernOffsetModalProps> = ({
  isOpen,
  onClose,
  establishmentId,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedProject, setSelectedProject] = useState<CertifiedProject | null>(null);

  // File upload hooks and state
  const { uploadFile, uploadMultipleFiles } = useFileUpload();
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ url: string; name: string }>>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ url: string; name: string }>>(
    []
  );

  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // RTK Query hooks
  const {
    data: certifiedProjectsData,
    isLoading: isLoadingProjects,
    error: projectsError
  } = useGetCertifiedProjectsQuery(undefined, {
    skip: !isOpen || activeTab !== 1
  });

  const [createCarbonOffset, { isLoading: isCreatingOffset, error: createOffsetError }] =
    useCreateCarbonOffsetMutation();

  const certifiedProjects = certifiedProjectsData?.projects || [];

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    source_id: '',
    offset_project_type: 'on_farm',
    verification_level: 'self_reported',
    evidence_photos: [] as string[],
    evidence_documents: [] as string[],
    gps_coordinates: {} as any,
    verification_notes: '',
    certified_project_id: null as string | null,
    // New verification system fields
    additionality_evidence: '',
    permanence_plan: '',
    baseline_data: {} as any,
    methodology_template: '',
    registry_verification_id: ''
  });

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  // File upload handlers
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const url = await uploadFile(file);
        return { url, name: file.name };
      });

      const newPhotos = await Promise.all(uploadPromises);
      setUploadedPhotos((prev) => [...prev, ...newPhotos]);

      // Update form data
      setFormData((prev) => ({
        ...prev,
        evidence_photos: [...prev.evidence_photos, ...newPhotos.map((p) => p.url)]
      }));

      toast({
        title: 'Photos Uploaded',
        description: `${newPhotos.length} photo(s) uploaded successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload photos. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsUploadingFiles(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const url = await uploadFile(file);
        return { url, name: file.name };
      });

      const newDocuments = await Promise.all(uploadPromises);
      setUploadedDocuments((prev) => [...prev, ...newDocuments]);

      // Update form data
      setFormData((prev) => ({
        ...prev,
        evidence_documents: [...prev.evidence_documents, ...newDocuments.map((d) => d.url)]
      }));

      toast({
        title: 'Documents Uploaded',
        description: `${newDocuments.length} document(s) uploaded successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload documents. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsUploadingFiles(false);
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      evidence_photos: prev.evidence_photos.filter((_, i) => i !== index)
    }));
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      evidence_documents: prev.evidence_documents.filter((_, i) => i !== index)
    }));
  };

  // Amount-based verification requirements
  const getVerificationRequirements = (amount: number) => {
    if (amount >= 1000) {
      return {
        required_level: 'certified_project',
        requires_third_party: true,
        requires_additionality_proof: true,
        requires_permanence_plan: true,
        message: 'High-value offsets (≥1000 kg CO₂e) require certified project verification',
        alert_status: 'warning' as const
      };
    } else if (amount >= 100) {
      return {
        required_level: 'community_verified',
        requires_third_party: false,
        requires_additionality_proof: true,
        requires_permanence_plan: false,
        message: 'Medium-value offsets (≥100 kg CO₂e) require additionality evidence',
        alert_status: 'info' as const
      };
    }
    return {
      required_level: 'self_reported',
      requires_third_party: false,
      requires_additionality_proof: false,
      requires_permanence_plan: false,
      message: 'Standard verification requirements',
      alert_status: 'success' as const
    };
  };

  const currentAmount = parseFloat(formData.amount) || 0;
  const requirements = getVerificationRequirements(currentAmount);

  // Verification level configurations with comprehensive information
  const verificationLevels = {
    self_reported: {
      title: 'Self Reported',
      subtitle: '50% Credit Value',
      description: 'Document your offset activity with photos/documents',
      color: 'orange',
      icon: FiFileText,
      trustScore: 0.5,
      bufferPool: 0.2,
      effectiveCredit: 0.4, // 50% trust * (1 - 20% buffer)
      requirements: ['Photo or document evidence required'],
      limits: {
        monthly: '500 kg CO₂e',
        annual: '5,000 kg CO₂e',
        singleEntry: '100 kg CO₂e (requires evidence)'
      },
      antiGaming: [
        'Monthly cumulative limit of 500 kg CO₂e',
        'Evidence required for entries >25 kg CO₂e',
        'Additionality analysis for entries >50 kg CO₂e',
        'Rapid submission detection (max 5 entries/day)',
        'Common practice assessment',
        'Unrealistic offset ratio validation'
      ],
      whenBlocked: [
        'Monthly limit exceeded → Use certified projects',
        'Rapid submissions detected → Consolidate entries',
        'Common practice identified → Provide additional barriers evidence',
        'Missing evidence → Upload photos/documents',
        'Unrealistic ratios → Provide detailed methodology'
      ]
    },
    community_verified: {
      title: 'Community Verified',
      subtitle: '75% Credit Value',
      description: 'Get verification from 2+ community members',
      color: 'blue',
      icon: FiUsers,
      trustScore: 0.75,
      bufferPool: 0.15,
      effectiveCredit: 0.6375, // 75% trust * (1 - 15% buffer)
      requirements: ['Evidence required', '2+ community attestations'],
      limits: {
        monthly: '500 kg CO₂e',
        annual: '5,000 kg CO₂e',
        singleEntry: 'No single entry limit'
      },
      antiGaming: [
        'Same limits as self-reported',
        'Minimum 2 community attestations required',
        'Attestation authenticity validation',
        'Geographic proximity checks for attestors'
      ],
      whenBlocked: [
        'Insufficient attestations → Get 2+ community verifications',
        'Same blocking conditions as self-reported apply'
      ]
    },
    certified_project: {
      title: 'Certified Project',
      subtitle: '100% Credit Value',
      description: 'Purchase from verified carbon credit marketplace',
      color: 'green',
      icon: FiAward,
      trustScore: 1.0,
      bufferPool: 0.1,
      effectiveCredit: 0.9, // 100% trust * (1 - 10% buffer)
      requirements: ['Third-party verified', 'Immediate retirement'],
      limits: {
        monthly: 'No limits',
        annual: 'No limits',
        singleEntry: 'No limits'
      },
      antiGaming: [
        'Third-party verification by accredited bodies',
        'Registry integration (VCS, Gold Standard, CAR, ACR)',
        'Additionality pre-verified',
        'Permanence guarantees',
        'No gaming protections needed - fully verified'
      ],
      whenBlocked: [
        'Certified projects are rarely blocked',
        'Only blocked for technical issues or insufficient project capacity'
      ]
    }
  };

  // Simplified verification comparison for MVP (only 2 levels)
  const VerificationComparison = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="lg">
        Choose Your Verification Level
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* Self Reported */}
        <Card
          cursor="pointer"
          border={formData.verification_level === 'self_reported' ? '2px solid' : '1px solid'}
          borderColor={formData.verification_level === 'self_reported' ? 'orange.500' : borderColor}
          onClick={() => setFormData({ ...formData, verification_level: 'self_reported' })}
          _hover={{ borderColor: 'orange.300' }}
        >
          <CardBody>
            <VStack align="start" spacing={3}>
              <HStack>
                <Icon as={FiFileText} color="orange.500" boxSize={5} />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold">Self Reported</Text>
                  <Text fontSize="sm" color="orange.500" fontWeight="semibold">
                    50% Credit Value
                  </Text>
                </VStack>
              </HStack>

              <Text fontSize="sm" color={mutedColor}>
                Document your offset activity with photos/documents
              </Text>

              <VStack align="start" spacing={1} w="100%">
                <Text fontSize="xs" fontWeight="semibold">
                  Effective Credit:
                </Text>
                <Progress value={40} colorScheme="orange" size="sm" w="100%" />
                <Text fontSize="xs" color={mutedColor}>
                  40% of claimed amount
                </Text>
              </VStack>

              <VStack align="start" spacing={1} w="100%">
                <Text fontSize="xs" fontWeight="semibold">
                  Monthly Limits:
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  500 kg CO₂e
                </Text>
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Certified Project */}
        <Card
          cursor="pointer"
          border={formData.verification_level === 'certified_project' ? '2px solid' : '1px solid'}
          borderColor={
            formData.verification_level === 'certified_project' ? 'green.500' : borderColor
          }
          onClick={() => setActiveTab(1)} // Switch to Certified Projects tab
          _hover={{ borderColor: 'green.300' }}
        >
          <CardBody>
            <VStack align="start" spacing={3}>
              <HStack>
                <Icon as={FiAward} color="green.500" boxSize={5} />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold">Certified Project</Text>
                  <Text fontSize="sm" color="green.500" fontWeight="semibold">
                    100% Credit Value
                  </Text>
                </VStack>
              </HStack>

              <Text fontSize="sm" color={mutedColor}>
                Purchase from verified carbon credit marketplace
              </Text>

              <VStack align="start" spacing={1} w="100%">
                <Text fontSize="xs" fontWeight="semibold">
                  Effective Credit:
                </Text>
                <Progress value={90} colorScheme="green" size="sm" w="100%" />
                <Text fontSize="xs" color={mutedColor}>
                  90% of claimed amount
                </Text>
              </VStack>

              <VStack align="start" spacing={1} w="100%">
                <Text fontSize="xs" fontWeight="semibold">
                  Monthly Limits:
                </Text>
                <Text fontSize="xs" color={mutedColor}>
                  No limits
                </Text>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </VStack>
  );

  // Detailed requirements info component
  const DetailedRequirementsInfo = () => {
    const currentLevel =
      verificationLevels[formData.verification_level as keyof typeof verificationLevels];

    return (
      <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md" mb={4}>
        <Text fontWeight="bold" mb={3}>
          {currentLevel.title} - Detailed Information
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              Requirements:
            </Text>
            <VStack align="start" spacing={1}>
              {currentLevel.requirements.map((req, idx) => (
                <HStack key={idx} spacing={2}>
                  <Icon as={FiCheck} color="green.500" boxSize={3} />
                  <Text fontSize="sm">{req}</Text>
                </HStack>
              ))}
            </VStack>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              Credit Calculation:
            </Text>
            <VStack align="start" spacing={1} fontSize="sm">
              <Text>Trust Score: {Math.round(currentLevel.trustScore * 100)}%</Text>
              <Text>Buffer Pool: {Math.round(currentLevel.bufferPool * 100)}%</Text>
              <Text fontWeight="bold" color={`${currentLevel.color}.500`}>
                Effective Credit: {Math.round(currentLevel.effectiveCredit * 100)}%
              </Text>
            </VStack>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              Anti-Gaming Protections:
            </Text>
            <VStack align="start" spacing={1}>
              {currentLevel.antiGaming.slice(0, 3).map((protection, idx) => (
                <HStack key={idx} spacing={2}>
                  <Icon as={FiShield} color="blue.500" boxSize={3} />
                  <Text fontSize="xs">{protection}</Text>
                </HStack>
              ))}
              {currentLevel.antiGaming.length > 3 && (
                <Tooltip
                  label={currentLevel.antiGaming.slice(3).join('; ')}
                  placement="top"
                  hasArrow
                >
                  <Text fontSize="xs" color="blue.500" cursor="help">
                    +{currentLevel.antiGaming.length - 3} more protections...
                  </Text>
                </Tooltip>
              )}
            </VStack>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              If Blocked:
            </Text>
            <VStack align="start" spacing={1}>
              {currentLevel.whenBlocked.slice(0, 2).map((solution, idx) => (
                <HStack key={idx} spacing={2}>
                  <Icon as={FiInfo} color="orange.500" boxSize={3} />
                  <Text fontSize="xs">{solution}</Text>
                </HStack>
              ))}
              {currentLevel.whenBlocked.length > 2 && (
                <Tooltip
                  label={currentLevel.whenBlocked.slice(2).join('; ')}
                  placement="top"
                  hasArrow
                >
                  <Text fontSize="xs" color="orange.500" cursor="help">
                    +{currentLevel.whenBlocked.length - 2} more solutions...
                  </Text>
                </Tooltip>
              )}
            </VStack>
          </Box>
        </SimpleGrid>
      </Box>
    );
  };

  // On-farm offset options
  const onFarmOffsets = [
    {
      id: 'no_till',
      name: 'No-Till Farming',
      description: 'Soil carbon sequestration through reduced tillage'
    },
    {
      id: 'cover_crop',
      name: 'Cover Crops',
      description: 'Carbon sequestration through cover crop planting'
    },
    {
      id: 'composting',
      name: 'Composting',
      description: 'Organic waste composting for soil health'
    },
    {
      id: 'tree_planting',
      name: 'Tree Planting',
      description: 'On-farm reforestation and agroforestry'
    },
    {
      id: 'renewable_energy',
      name: 'Renewable Energy',
      description: 'Solar panels or wind turbines on farm'
    },
    {
      id: 'methane_capture',
      name: 'Methane Capture',
      description: 'Livestock methane capture systems'
    }
  ];

  // Handle RTK Query errors
  useEffect(() => {
    if (projectsError) {
      toast({
        title: 'Error',
        description: 'Failed to fetch certified projects',
        status: 'error',
        duration: 3000
      });
    }
  }, [projectsError, toast]);

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Please enter a valid offset amount');
      }

      if (activeTab === 0 && !formData.source_id) {
        throw new Error('Please select an offset activity');
      }

      if (activeTab === 2 && !selectedProject) {
        throw new Error('Please select a certified project');
      }

      // Check verification requirements based on amount
      if (currentAmount >= 1000 && formData.verification_level !== 'certified_project') {
        throw new Error(
          'High-value offsets (≥1000 kg CO₂e) require certified project verification'
        );
      }

      if (currentAmount >= 100 && !formData.additionality_evidence) {
        throw new Error('Medium-value offsets (≥100 kg CO₂e) require additionality evidence');
      }

      // Prepare payload
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        type: 'offset' as const,
        year: new Date().getFullYear(),
        establishment: establishmentId,
        certified_project_id: selectedProject?.id || null,
        verification_level: formData.verification_level as
          | 'self_reported'
          | 'community_verified'
          | 'certified_project',
        offset_project_type:
          activeTab === 0
            ? ('on_farm' as const)
            : activeTab === 1
            ? ('local_community' as const)
            : ('certified_marketplace' as const),
        // Enhanced verification fields
        additionality_evidence: formData.additionality_evidence,
        permanence_plan: formData.permanence_plan,
        baseline_data: formData.baseline_data,
        methodology_template: formData.methodology_template,
        registry_verification_id: selectedProject?.id || formData.registry_verification_id,
        // File upload fields
        evidence_photos: formData.evidence_photos,
        evidence_documents: formData.evidence_documents,
        gps_coordinates: formData.gps_coordinates,
        verification_notes: formData.verification_notes
      };

      const result = await createCarbonOffset(payload).unwrap();

      // Handle certified project redirection
      if (activeTab === 2 && selectedProject) {
        toast({
          title: 'Offset Entry Created!',
          description: `Entry created with ${Math.round(
            result.trust_score * 100
          )}% trust score. Click "View Project" to visit the registry for verification.`,
          status: 'success',
          duration: 8000,
          isClosable: true,
          position: 'top',
          render: ({ onClose: closeToast }) => (
            <Alert
              status="success"
              variant="solid"
              borderRadius="md"
              boxShadow="lg"
              p={4}
              maxW="400px"
            >
              <AlertIcon />
              <Box flex="1">
                <AlertTitle>Offset Entry Created!</AlertTitle>
                <AlertDescription fontSize="sm">
                  Entry created with {Math.round(result.trust_score * 100)}% trust score.
                </AlertDescription>
                <HStack mt={2} spacing={2}>
                  <Button
                    size="sm"
                    colorScheme="whiteAlpha"
                    variant="outline"
                    onClick={() => {
                      window.open(selectedProject.registry_url || '#', '_blank');
                      closeToast();
                    }}
                  >
                    View Project
                  </Button>
                  <Button size="sm" variant="ghost" onClick={closeToast}>
                    Close
                  </Button>
                </HStack>
              </Box>
            </Alert>
          )
        });
      } else {
        toast({
          title: 'Success!',
          description: `Offset created successfully with ${Math.round(
            result.trust_score * 100
          )}% trust score`,
          status: 'success',
          duration: 5000
        });
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.message || 'Failed to create offset';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000
      });
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      source_id: '',
      offset_project_type: 'on_farm',
      verification_level: 'self_reported',
      evidence_photos: [],
      evidence_documents: [],
      gps_coordinates: {},
      verification_notes: '',
      certified_project_id: null,
      additionality_evidence: '',
      permanence_plan: '',
      baseline_data: {},
      methodology_template: '',
      registry_verification_id: ''
    });
    setSelectedProject(null);
    setUploadedPhotos([]);
    setUploadedDocuments([]);
    setActiveTab(0);
  };

  const getEffectiveAmount = () => {
    const amount = parseFloat(formData.amount) || 0;
    const trustScore =
      activeTab === 2
        ? 1.0
        : verificationLevels[formData.verification_level as keyof typeof verificationLevels]
            ?.trustScore || 0.5;
    return amount * trustScore;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent bg={bgColor} borderRadius="xl" maxH="90vh">
        <ModalHeader>
          <VStack align="start" spacing={1}>
            <Text fontSize="xl" fontWeight="bold">
              Add Carbon Offset
            </Text>
            <Text fontSize="sm" color={mutedColor}>
              Choose your offset method and verification level
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          <Tabs
            index={activeTab}
            onChange={setActiveTab}
            variant="soft-rounded"
            colorScheme="green"
          >
            <TabList mb={6}>
              <Tab>
                <HStack>
                  <Icon as={FiMapPin} />
                  <Text>Self-Reported</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiAward} />
                  <Text>ICR Verification</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Self-Reported Offsets */}
              <TabPanel p={0}>
                <VStack spacing={6} align="stretch">
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Self-Reported Carbon Offsets</AlertTitle>
                      <AlertDescription>
                        Document sustainable practices on your farm to generate verified carbon
                        offsets. Self-reported offsets receive 40% effective credit (50% trust score
                        - 20% buffer pool).
                      </AlertDescription>
                    </Box>
                  </Alert>

                  {/* Show verification comparison only once */}
                  <VerificationComparison />

                  {/* Show detailed requirements info */}
                  <DetailedRequirementsInfo />

                  <FormControl isRequired>
                    <FormLabel>Offset Activity</FormLabel>
                    <Select
                      placeholder="Select offset activity"
                      value={formData.source_id}
                      onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                    >
                      {onFarmOffsets.map((offset) => (
                        <option key={offset.id} value={offset.id}>
                          {offset.name} - {offset.description}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <SimpleGrid columns={2} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Amount (kg CO₂e)</FormLabel>
                      <NumberInput
                        value={formData.amount}
                        onChange={(value) => setFormData({ ...formData, amount: value || '' })}
                        min={0}
                        precision={2}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Verification Level</FormLabel>
                      <Select
                        value={formData.verification_level}
                        onChange={(e) =>
                          setFormData({ ...formData, verification_level: e.target.value })
                        }
                      >
                        <option value="self_reported">Self Reported (40% effective)</option>
                      </Select>
                      <FormHelperText>
                        Self-reported verification with anti-gaming protections
                      </FormHelperText>
                    </FormControl>
                  </SimpleGrid>

                  {/* Enhanced Error Display for Gaming Violations */}
                  {createOffsetError &&
                    'data' in createOffsetError &&
                    createOffsetError.data &&
                    typeof createOffsetError.data === 'object' &&
                    'violations' in createOffsetError.data && (
                      <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <Box flex="1">
                          <AlertTitle>Anti-Gaming Protection Triggered</AlertTitle>
                          <AlertDescription>
                            <VStack align="start" spacing={3} mt={2}>
                              <Text fontSize="sm">
                                Your offset was blocked to prevent greenwashing. Here&apos;s what
                                happened:
                              </Text>

                              <Box>
                                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                  Violations Detected:
                                </Text>
                                <VStack align="start" spacing={1} pl={4}>
                                  {Array.isArray((createOffsetError.data as any).violations)
                                    ? ((createOffsetError.data as any).violations as string[]).map(
                                        (violation, idx) => (
                                          <HStack key={idx} spacing={2}>
                                            <Icon
                                              as={FiAlertTriangle}
                                              color="red.500"
                                              boxSize={3}
                                            />
                                            <Text fontSize="xs">
                                              {violation.replace(/_/g, ' ').toUpperCase()}
                                            </Text>
                                          </HStack>
                                        )
                                      )
                                    : null}
                                </VStack>
                              </Box>

                              {(createOffsetError.data as any).requirements &&
                                Array.isArray((createOffsetError.data as any).requirements) && (
                                  <Box>
                                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                      Solutions:
                                    </Text>
                                    <VStack align="start" spacing={1} pl={4}>
                                      {((createOffsetError.data as any).requirements as string[])
                                        .slice(0, 3)
                                        .map((req, idx) => (
                                          <HStack key={idx} spacing={2}>
                                            <Icon as={FiInfo} color="blue.500" boxSize={3} />
                                            <Text fontSize="xs">{req}</Text>
                                          </HStack>
                                        ))}
                                    </VStack>
                                  </Box>
                                )}

                              <Box p={3} bg="blue.50" borderRadius="md" w="100%">
                                <Text fontSize="xs" fontWeight="semibold" color="blue.700" mb={1}>
                                  💡 Recommended Solution:
                                </Text>
                                <Text fontSize="xs" color="blue.600">
                                  For large or frequent offset claims, use{' '}
                                  <strong>ICR Verification</strong> tab which provides 90% effective
                                  credit with no gaming restrictions.
                                </Text>
                              </Box>
                            </VStack>
                          </AlertDescription>
                        </Box>
                      </Alert>
                    )}

                  {/* Standard Error Display */}
                  {createOffsetError &&
                    !(
                      'data' in createOffsetError &&
                      createOffsetError.data &&
                      typeof createOffsetError.data === 'object' &&
                      'violations' in createOffsetError.data
                    ) && (
                      <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          {createOffsetError &&
                          'data' in createOffsetError &&
                          createOffsetError.data
                            ? JSON.stringify(createOffsetError.data)
                            : 'An error occurred while creating the offset'}
                        </AlertDescription>
                      </Alert>
                    )}

                  {/* Amount-based Requirements Alert */}
                  {currentAmount > 0 && (
                    <Alert status={requirements.alert_status} borderRadius="md">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">
                          Verification Requirements for {currentAmount} kg CO₂e
                        </Text>
                        <Text fontSize="sm">{requirements.message}</Text>

                        {/* Show effective credit calculation */}
                        {formData.verification_level && (
                          <Box
                            mt={2}
                            p={2}
                            bg={useColorModeValue('gray.50', 'gray.700')}
                            borderRadius="md"
                            w="100%"
                          >
                            <Text fontSize="xs" fontWeight="semibold" mb={1}>
                              Credit Calculation:
                            </Text>
                            <HStack spacing={4} fontSize="xs">
                              <Text>Claimed: {currentAmount} kg CO₂e</Text>
                              <Text>→</Text>
                              <Text color="green.500" fontWeight="bold">
                                Effective:{' '}
                                {Math.round(
                                  currentAmount *
                                    verificationLevels[
                                      formData.verification_level as keyof typeof verificationLevels
                                    ].effectiveCredit
                                )}{' '}
                                kg CO₂e
                              </Text>
                            </HStack>
                          </Box>
                        )}
                      </VStack>
                    </Alert>
                  )}

                  {/* Additionality Evidence (required for ≥100 kg CO₂e) */}
                  {requirements.requires_additionality_proof && (
                    <FormControl isRequired>
                      <FormLabel>
                        <HStack>
                          <Text>Additionality Evidence</Text>
                          <Tooltip label="Explain why this offset represents additional carbon impact beyond business-as-usual practices">
                            <Icon as={FiInfo} color="gray.400" />
                          </Tooltip>
                        </HStack>
                      </FormLabel>
                      <Textarea
                        placeholder="Explain why this offset represents additional carbon impact beyond business-as-usual practices..."
                        value={formData.additionality_evidence}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            additionality_evidence: e.target.value
                          })
                        }
                        rows={4}
                      />
                      <FormHelperText>
                        Required to prevent greenwashing - describe financial barriers, uncommon
                        practices, or baseline comparison
                      </FormHelperText>
                    </FormControl>
                  )}

                  {/* Evidence Upload */}
                  <FormControl>
                    <FormLabel>Evidence & Documentation</FormLabel>
                    <VStack spacing={3} align="stretch">
                      {/* Photo Upload Section */}
                      <Box>
                        <HStack spacing={3} mb={2}>
                          <Button
                            leftIcon={<FiCamera />}
                            variant="outline"
                            size="sm"
                            onClick={() => photoInputRef.current?.click()}
                            isLoading={isUploadingFiles}
                            loadingText="Uploading..."
                          >
                            Upload Photos
                          </Button>
                          <Input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoUpload}
                            display="none"
                          />
                          <Text fontSize="sm" color={mutedColor}>
                            {uploadedPhotos.length} photo(s) uploaded
                          </Text>
                        </HStack>

                        {uploadedPhotos.length > 0 && (
                          <Grid
                            templateColumns="repeat(auto-fill, minmax(100px, 1fr))"
                            gap={2}
                            mb={2}
                          >
                            {uploadedPhotos.map((photo, index) => (
                              <Box key={index} position="relative">
                                <Image
                                  src={photo.url}
                                  alt={photo.name}
                                  boxSize="100px"
                                  objectFit="cover"
                                  borderRadius="md"
                                  border="1px solid"
                                  borderColor={borderColor}
                                />
                                <IconButton
                                  aria-label="Remove photo"
                                  icon={<FiX />}
                                  size="xs"
                                  colorScheme="red"
                                  position="absolute"
                                  top="1"
                                  right="1"
                                  onClick={() => removePhoto(index)}
                                />
                                <Text fontSize="xs" color={mutedColor} mt={1} noOfLines={1}>
                                  {photo.name}
                                </Text>
                              </Box>
                            ))}
                          </Grid>
                        )}
                      </Box>

                      {/* Document Upload Section */}
                      <Box>
                        <HStack spacing={3} mb={2}>
                          <Button
                            leftIcon={<FiFileText />}
                            variant="outline"
                            size="sm"
                            onClick={() => documentInputRef.current?.click()}
                            isLoading={isUploadingFiles}
                            loadingText="Uploading..."
                          >
                            Upload Documents
                          </Button>
                          <Input
                            ref={documentInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.rtf"
                            multiple
                            onChange={handleDocumentUpload}
                            display="none"
                          />
                          <Text fontSize="sm" color={mutedColor}>
                            {uploadedDocuments.length} document(s) uploaded
                          </Text>
                        </HStack>

                        {uploadedDocuments.length > 0 && (
                          <VStack spacing={2} align="stretch">
                            {uploadedDocuments.map((doc, index) => (
                              <HStack
                                key={index}
                                p={2}
                                bg={bgColor}
                                border="1px solid"
                                borderColor={borderColor}
                                borderRadius="md"
                              >
                                <Icon as={FiFile} color="blue.500" />
                                <Text fontSize="sm" flex={1} noOfLines={1}>
                                  {doc.name}
                                </Text>
                                <IconButton
                                  aria-label="Remove document"
                                  icon={<FiX />}
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => removeDocument(index)}
                                />
                              </HStack>
                            ))}
                          </VStack>
                        )}
                      </Box>

                      <FormHelperText>
                        Photos and documents help verify your offset activity and increase trust
                        score. Accepted formats: Images (JPG, PNG, GIF), Documents (PDF, DOC, DOCX,
                        TXT).
                      </FormHelperText>
                    </VStack>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Additional Notes</FormLabel>
                    <Textarea
                      placeholder="Describe your offset activity in detail..."
                      value={formData.verification_notes}
                      onChange={(e) =>
                        setFormData({ ...formData, verification_notes: e.target.value })
                      }
                      rows={3}
                    />
                  </FormControl>
                </VStack>
              </TabPanel>

              {/* ICR Verification Tab */}
              <TabPanel p={0}>
                <VStack spacing={6} align="stretch">
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>ICR Third-Party Verification</AlertTitle>
                      <AlertDescription>
                        Submit your farm-generated offsets to ICR (International Carbon Registry)
                        for third-party verification. ICR verified offsets receive 90% effective
                        credit (100% trust score - 10% buffer pool).
                      </AlertDescription>
                    </Box>
                  </Alert>

                  <FormControl isRequired>
                    <FormLabel>Offset Activity</FormLabel>
                    <Select
                      placeholder="Select offset activity"
                      value={formData.source_id}
                      onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                    >
                      {onFarmOffsets.map((offset) => (
                        <option key={offset.id} value={offset.id}>
                          {offset.name} - {offset.description}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <SimpleGrid columns={2} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Amount (kg CO₂e)</FormLabel>
                      <NumberInput
                        value={formData.amount}
                        onChange={(value) => setFormData({ ...formData, amount: value || '' })}
                        min={0}
                        precision={2}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Verification Level</FormLabel>
                      <Select
                        value={formData.verification_level}
                        onChange={(e) =>
                          setFormData({ ...formData, verification_level: e.target.value })
                        }
                      >
                        <option value="certified_project">ICR Verified (90% effective)</option>
                      </Select>
                      <FormHelperText>Third-party verification through ICR registry</FormHelperText>
                    </FormControl>
                  </SimpleGrid>

                  <FormControl isRequired>
                    <FormLabel>ICR Registry ID</FormLabel>
                    <Input
                      placeholder="Enter ICR registry verification ID (e.g., ICR-2024-001)"
                      value={formData.registry_verification_id || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, registry_verification_id: e.target.value })
                      }
                    />
                    <FormHelperText>
                      The ICR registry ID for your verified offset project
                    </FormHelperText>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Additionality Evidence</FormLabel>
                    <Textarea
                      placeholder="Describe why this offset is additional (required for ICR verification)"
                      value={formData.additionality_evidence || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, additionality_evidence: e.target.value })
                      }
                      rows={3}
                    />
                    <FormHelperText>
                      Explain how this offset goes beyond business-as-usual practices
                    </FormHelperText>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Permanence Plan</FormLabel>
                    <Textarea
                      placeholder="Describe your plan to ensure permanent carbon sequestration"
                      value={formData.permanence_plan || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, permanence_plan: e.target.value })
                      }
                      rows={3}
                    />
                    <FormHelperText>
                      How will you ensure the carbon remains sequestered long-term?
                    </FormHelperText>
                  </FormControl>

                  {/* Photo Upload */}
                  <FormControl>
                    <FormLabel>Evidence Photos</FormLabel>
                    <VStack align="start" spacing={3}>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        display="none"
                        ref={(el) => {
                          if (el) photoInputRef.current = el;
                        }}
                      />
                      <Button
                        leftIcon={<Icon as={FiCamera} />}
                        onClick={() => photoInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                      >
                        Upload Photos
                      </Button>

                      {formData.evidence_photos && formData.evidence_photos.length > 0 && (
                        <SimpleGrid columns={3} spacing={2} w="100%">
                          {formData.evidence_photos.map((photo, index) => (
                            <Box key={index} position="relative">
                              <Image
                                src={photo}
                                alt={`Evidence ${index + 1}`}
                                borderRadius="md"
                                objectFit="cover"
                                h="60px"
                                w="100%"
                              />
                              <IconButton
                                icon={<Icon as={FiX} />}
                                size="xs"
                                position="absolute"
                                top="1"
                                right="1"
                                onClick={() => removePhoto(index)}
                                aria-label="Remove photo"
                              />
                            </Box>
                          ))}
                        </SimpleGrid>
                      )}
                    </VStack>
                    <FormHelperText>
                      Upload photos of your sustainable farming practices
                    </FormHelperText>
                  </FormControl>

                  {/* Document Upload */}
                  <FormControl>
                    <FormLabel>Supporting Documents</FormLabel>
                    <VStack align="start" spacing={3}>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        multiple
                        onChange={handleDocumentUpload}
                        display="none"
                        ref={(el) => {
                          if (el) documentInputRef.current = el;
                        }}
                      />
                      <Button
                        leftIcon={<Icon as={FiUpload} />}
                        onClick={() => documentInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                      >
                        Upload Documents
                      </Button>

                      {formData.evidence_documents && formData.evidence_documents.length > 0 && (
                        <VStack align="start" spacing={1} w="100%">
                          {formData.evidence_documents.map((doc, index) => (
                            <HStack key={index} justify="space-between" w="100%">
                              <HStack>
                                <Icon as={FiFile} />
                                <Text fontSize="sm" noOfLines={1}>
                                  Document {index + 1}
                                </Text>
                              </HStack>
                              <IconButton
                                icon={<Icon as={FiX} />}
                                size="xs"
                                onClick={() => removeDocument(index)}
                                aria-label="Remove document"
                              />
                            </HStack>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                    <FormHelperText>
                      Upload soil tests, methodology documents, or other supporting evidence
                    </FormHelperText>
                  </FormControl>

                  {/* Error Display */}
                  {createOffsetError && (
                    <Alert status="error" borderRadius="md">
                      <AlertIcon />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {createOffsetError && 'data' in createOffsetError && createOffsetError.data
                          ? JSON.stringify(createOffsetError.data)
                          : 'An error occurred while creating the offset'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Amount-based Requirements Alert */}
                  {currentAmount > 0 && (
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">
                          ICR Verification for {currentAmount} kg CO₂e
                        </Text>
                        <Text fontSize="sm">
                          Your farm-generated offset will be submitted to ICR for third-party
                          verification. Verified offsets receive 90% effective credit (100% trust -
                          10% buffer pool).
                        </Text>

                        <Box
                          mt={2}
                          p={2}
                          bg={useColorModeValue('gray.50', 'gray.700')}
                          borderRadius="md"
                          w="100%"
                        >
                          <Text fontSize="xs" fontWeight="semibold" mb={1}>
                            Credit Calculation:
                          </Text>
                          <HStack spacing={4} fontSize="xs">
                            <Text>Claimed: {currentAmount} kg CO₂e</Text>
                            <Text>Trust Score: 100%</Text>
                            <Text>Buffer Pool: -10%</Text>
                            <Text fontWeight="bold" color="green.600">
                              Effective: {(currentAmount * 0.9).toFixed(1)} kg CO₂e
                            </Text>
                          </HStack>
                        </Box>
                      </VStack>
                    </Alert>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Effective Amount Display */}
          {formData.amount && parseFloat(formData.amount) > 0 && (
            <Card mt={6} bg="green.50" borderColor="green.200">
              <CardBody>
                <VStack spacing={3}>
                  <Text fontWeight="medium" color="green.800">
                    Offset Impact Summary
                  </Text>
                  <SimpleGrid columns={3} spacing={4} w="full">
                    <VStack>
                      <Text fontSize="2xl" fontWeight="bold" color="green.600">
                        {formData.amount}
                      </Text>
                      <Text fontSize="sm" color="green.700">
                        kg CO₂e Claimed
                      </Text>
                    </VStack>
                    <VStack>
                      <Text fontSize="2xl" fontWeight="bold" color="green.600">
                        {getEffectiveAmount().toFixed(1)}
                      </Text>
                      <Text fontSize="sm" color="green.700">
                        kg CO₂e Effective
                      </Text>
                    </VStack>
                    <VStack>
                      <Text fontSize="2xl" fontWeight="bold" color="green.600">
                        {Math.round(
                          (getEffectiveAmount() / (parseFloat(formData.amount) || 1)) * 100
                        )}
                        %
                      </Text>
                      <Text fontSize="sm" color="green.700">
                        Trust Score
                      </Text>
                    </VStack>
                  </SimpleGrid>
                  <Progress
                    value={(getEffectiveAmount() / (parseFloat(formData.amount) || 1)) * 100}
                    colorScheme="green"
                    size="sm"
                    w="full"
                    borderRadius="full"
                  />
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Action Buttons */}
          <HStack justify="space-between" mt={8}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={handleSubmit}
              isLoading={isCreatingOffset}
              loadingText="Creating Offset..."
              isDisabled={
                !formData.amount ||
                parseFloat(formData.amount) <= 0 ||
                !formData.source_id ||
                (activeTab === 1 && !formData.registry_verification_id) // ICR tab requires registry ID
              }
            >
              Create Offset
            </Button>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ModernOffsetModal;
