import React, { useState, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Progress,
  useColorModeValue,
  Flex,
  Badge,
  SimpleGrid,
  Divider,
  Avatar,
  Circle
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiMapPin,
  FiTrendingUp,
  FiBarChart2,
  FiCamera,
  FiUsers,
  FiArrowRight,
  FiCpu,
  FiActivity,
  FiShoppingCart,
  FiEye,
  FiSettings
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  benefits: string[];
  actionText: string;
  actionPath?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'establishment-setup',
    title: '🎯 Milestone 1: Get Your First Carbon Score',
    description: 'Generate your baseline carbon footprint and see immediate value',
    icon: FiMapPin,
    benefits: [
      'Instant baseline carbon estimate in <5 minutes',
      'Industry comparison showing improvement potential',
      'Personalized carbon reduction recommendations',
      'USDA-verified calculation methodology'
    ],
    actionText: 'Get My Carbon Score',
    actionPath: '/admin/dashboard/establishment/edit'
  },
  {
    id: 'add-parcels',
    title: '🎯 Milestone 2: Setup Smart Production',
    description: 'Use template-driven production creation for instant carbon tracking',
    icon: FiCpu,
    benefits: [
      'Pre-configured event templates save 80% setup time',
      'Automated carbon calculation projections',
      'USDA-verified emission factors included',
      'QR code generation for consumer transparency'
    ],
    actionText: 'Create Smart Production',
    actionPath: '/admin/dashboard/parcel/create'
  },
  {
    id: 'start-production',
    title: '🎯 Milestone 3: Get Blockchain Verification',
    description: 'Generate immutable carbon records and transparency certificates',
    icon: FiActivity,
    benefits: [
      'Instant blockchain certificate generation',
      'Consumer-facing transparency URL created',
      'Premium pricing potential calculator activated',
      'Verified by Polygon network security'
    ],
    actionText: 'Get Verified',
    actionPath: '/admin/dashboard/production/create'
  },
  {
    id: 'carbon-insights',
    title: '🎯 Milestone 4: Connect with Consumers',
    description: 'Experience end-to-end transparency and consumer engagement',
    icon: FiBarChart2,
    benefits: [
      'Live preview of consumer transparency page',
      'Marketing materials automatically generated',
      'First consumer engagement notifications',
      'Compare against industry benchmarks',
      'Identify optimization opportunities',
      'Generate sustainability reports'
    ],
    actionText: 'Preview Consumer Experience',
    actionPath: '/admin/dashboard/carbon'
  },
  {
    id: 'consumer-qr',
    title: 'Enable Consumer Transparency',
    description: 'Generate QR codes to showcase your sustainability',
    icon: FiCamera,
    benefits: [
      'Automatic QR code generation for products',
      'Consumer-friendly carbon score display',
      'Blockchain verification badges',
      'Build trust with eco-conscious buyers'
    ],
    actionText: 'View QR Codes',
    actionPath: '/admin/dashboard/qr-codes'
  },
  {
    id: 'commercial-features',
    title: 'Explore Commercial Tools',
    description: 'Discover features to grow your sustainable business',
    icon: FiShoppingCart,
    benefits: [
      'Consumer transparency dashboard',
      'Bulk export and certification tools',
      'Team collaboration and permissions',
      'Advanced analytics and QR insights'
    ],
    actionText: 'Explore Features',
    actionPath: '/admin/dashboard'
  }
];

interface GuidedOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
  currentEstablishmentId?: string;
}

const GuidedOnboarding: React.FC<GuidedOnboardingProps> = ({
  isOpen,
  onClose,
  companyName,
  currentEstablishmentId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  // Get company data for personalization
  const company = useSelector((state: any) => {
    const auth = state.auth;
    if (auth && auth.companies && auth.companies.length > 0) {
      const selectedId = auth.selectedCompany;
      return auth.companies.find((company: any) => company.id === selectedId) || null;
    }
    return state.company?.currentCompany || null;
  });

  // Modern minimalist color scheme following Trazo standards
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headingColor = useColorModeValue('gray.900', 'white');
  const primaryColor = useColorModeValue('green.500', 'green.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const accentColor = useColorModeValue('blue.500', 'blue.400');

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  // Calculate trial days remaining
  const trialDaysRemaining = useMemo(() => {
    if (!company?.created_at && !company?.date_joined) return 14;
    const createdDate = new Date(company.created_at || company.date_joined);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 14 - daysSinceCreation);
  }, [company]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    if (currentStepData.actionPath) {
      // For establishment edit, use current establishment ID
      let path = currentStepData.actionPath;
      if (path.includes('/establishment/edit') && currentEstablishmentId) {
        path = `/admin/dashboard/establishment/${currentEstablishmentId}/edit`;
      }
      // Close modal and navigate
      onClose();
      navigate(path);
    } else {
      handleNext();
    }
  };

  const handleComplete = () => {
    // Mark onboarding as completed in localStorage
    localStorage.setItem('trazo_onboarding_completed', 'true');
    localStorage.setItem('trazo_onboarding_completed_date', new Date().toISOString());
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('trazo_onboarding_skipped', 'true');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" closeOnOverlayClick={false} isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.4)" backdropFilter="blur(8px)" />
      <ModalContent
        bg={bgColor}
        borderRadius="2xl"
        border="1px"
        borderColor={borderColor}
        mx={4}
        maxH="90vh"
        overflow="hidden"
        boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      >
        <ModalHeader pb={4} pt={6}>
          <VStack spacing={4} align="stretch">
            {/* Header with company branding */}
            <Flex justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <Text fontSize="lg" fontWeight="700" color={headingColor}>
                  {companyName || company?.name || 'Welcome'} Onboarding
                </Text>
                <Text fontSize="sm" color={textColor}>
                  Complete setup in {onboardingSteps.length} steps • {trialDaysRemaining} days trial
                  remaining
                </Text>
              </VStack>
              <Button variant="ghost" size="sm" onClick={handleSkip} color={textColor}>
                Skip Setup
              </Button>
            </Flex>

            {/* Elegant progress indicator */}
            <HStack spacing={2} justify="center">
              {onboardingSteps.map((step, index) => (
                <Circle
                  key={step.id}
                  size={3}
                  bg={
                    index <= currentStep ? primaryColor : useColorModeValue('gray.200', 'gray.600')
                  }
                  transition="all 0.2s"
                />
              ))}
            </HStack>
          </VStack>
        </ModalHeader>

        <ModalBody py={6} px={8}>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} alignItems="start">
            {/* Left Column - Step Content */}
            <VStack spacing={6} align="stretch">
              {/* Step Header */}
              <VStack spacing={4} align="start">
                <Flex align="center" gap={4}>
                  <Box
                    p={3}
                    borderRadius="xl"
                    bg={useColorModeValue('green.50', 'green.900')}
                    border="1px"
                    borderColor={primaryColor}
                  >
                    <Icon as={currentStepData.icon} boxSize={6} color={primaryColor} />
                  </Box>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xl" fontWeight="700" color={headingColor}>
                      {currentStepData.title}
                    </Text>
                    <Text fontSize="md" color={textColor}>
                      {currentStepData.description}
                    </Text>
                  </VStack>
                </Flex>
              </VStack>

              {/* Benefits Grid */}
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="600" color={headingColor}>
                  What you'll accomplish:
                </Text>
                <SimpleGrid columns={1} spacing={3}>
                  {currentStepData.benefits.map((benefit, index) => (
                    <Flex key={index} align="start" gap={3} p={3} bg={cardBg} borderRadius="lg">
                      <Icon as={FiCheckCircle} color={primaryColor} mt={0.5} flexShrink={0} />
                      <Text fontSize="sm" color={textColor}>
                        {benefit}
                      </Text>
                    </Flex>
                  ))}
                </SimpleGrid>
              </VStack>
            </VStack>

            {/* Right Column - Preview/Context */}
            <VStack spacing={6} align="stretch">
              {/* Progress Overview */}
              <Box p={6} bg={cardBg} borderRadius="xl" border="1px" borderColor={borderColor}>
                <VStack spacing={4}>
                  <Text fontSize="sm" fontWeight="600" color={headingColor}>
                    Setup Progress
                  </Text>
                  <VStack spacing={3} w="full">
                    {onboardingSteps.map((step, index) => (
                      <Flex key={step.id} align="center" gap={3} w="full">
                        <Box
                          w={6}
                          h={6}
                          borderRadius="full"
                          bg={
                            index <= currentStep
                              ? primaryColor
                              : useColorModeValue('gray.200', 'gray.600')
                          }
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          {index < currentStep ? (
                            <Icon as={FiCheckCircle} color="white" boxSize={3} />
                          ) : (
                            <Text color="white" fontSize="xs" fontWeight="bold">
                              {index + 1}
                            </Text>
                          )}
                        </Box>
                        <Text fontSize="sm" color={index <= currentStep ? headingColor : textColor}>
                          {step.title}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                </VStack>
              </Box>

              {/* Trial Status */}
              <Box
                p={6}
                bg={useColorModeValue('blue.50', 'blue.900')}
                borderRadius="xl"
                border="1px"
                borderColor={useColorModeValue('blue.200', 'blue.700')}
              >
                <VStack spacing={4}>
                  <Flex align="center" gap={3}>
                    <Avatar size="sm" bg={accentColor} icon={<FiEye />} />
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="600" color="blue.700">
                        {trialDaysRemaining} Days Trial Remaining
                      </Text>
                      <Text fontSize="xs" color="blue.600">
                        Full access • No credit card required
                      </Text>
                    </VStack>
                  </Flex>

                  <Divider borderColor="blue.200" />

                  <VStack spacing={2} w="full">
                    <Text fontSize="xs" color="blue.600" textAlign="center">
                      Complete setup to maximize your trial value
                    </Text>
                  </VStack>
                </VStack>
              </Box>
            </VStack>
          </SimpleGrid>
        </ModalBody>

        <ModalFooter pt={4} pb={6} px={8}>
          <Flex w="full" justify="space-between" align="center">
            {/* Left side - Previous button */}
            <Button
              variant="ghost"
              onClick={handlePrevious}
              isDisabled={currentStep === 0}
              size="md"
              color={textColor}
            >
              Previous
            </Button>

            {/* Center - Step indicator */}
            <Text fontSize="sm" color={textColor}>
              {currentStep + 1} of {onboardingSteps.length}
            </Text>

            {/* Right side - Action buttons */}
            <HStack spacing={3}>
              {currentStep === onboardingSteps.length - 1 ? (
                <Button
                  bg={primaryColor}
                  color="white"
                  onClick={handleComplete}
                  size="md"
                  rightIcon={<Icon as={FiCheckCircle} />}
                  borderRadius="xl"
                  px={6}
                  _hover={{ bg: useColorModeValue('green.600', 'green.300') }}
                >
                  Complete Setup
                </Button>
              ) : (
                <>
                  <Button
                    bg={primaryColor}
                    color="white"
                    onClick={handleAction}
                    size="md"
                    rightIcon={<Icon as={FiArrowRight} />}
                    borderRadius="xl"
                    px={6}
                    _hover={{ bg: useColorModeValue('green.600', 'green.300') }}
                  >
                    {currentStepData.actionText}
                  </Button>
                  <Button
                    variant="outline"
                    borderColor={borderColor}
                    color={textColor}
                    onClick={handleNext}
                    size="md"
                    borderRadius="xl"
                    px={4}
                  >
                    Skip Step
                  </Button>
                </>
              )}
            </HStack>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GuidedOnboarding;
