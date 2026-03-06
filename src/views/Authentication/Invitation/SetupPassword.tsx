import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  useToast,
  Progress,
  useColorModeValue,
  Badge,
  Grid,
  Container,
  Divider,
  Checkbox
} from '@chakra-ui/react';
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
  Link as RouterLink
} from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiCheck, FiUser, FiShield } from 'react-icons/fi';
import { FaGoogle, FaFacebook } from 'react-icons/fa';
import { HiOfficeBuilding } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import AuthFooter from 'components/Footer/AuthFooter';
import { StandardField, StandardInput, StandardButton } from 'components/Design/StandardComponents';
import {
  useSignupWithInvitationMutation,
  useGetInvitationDetailsQuery
} from 'store/api/invitationApi';
import { useSocialAuthMutation } from 'store/api/authApi';
import { login as loginAction } from 'store/features/authSlice';
import { setUser } from 'store/features/userSlice';
import { setCompany } from 'store/features/companySlice';
import { ROLE_DISPLAY_FARM_MANAGER } from 'config';
import {
  handleGoogleSignIn,
  handleFacebookSignIn,
  handleSocialAuthError,
  checkSocialAuthConfig
} from 'utils/socialAuth';

interface SetupPasswordFormData {
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
  acceptTerms: boolean;
}

// Motion components
const MotionBox = motion(Box);

const SetupPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'setup' | 'success'>('setup');
  const [redirectProgress, setRedirectProgress] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Get invitation code from URL params
  const { invitationCode } = useParams<{ invitationCode: string }>();

  // API hooks
  const [signupWithInvitation, { isLoading: isCreatingAccount }] =
    useSignupWithInvitationMutation();
  const [socialAuth, { isLoading: isSocialLoading }] = useSocialAuthMutation();
  const {
    data: invitationDetails,
    error: detailsError,
    isLoading: isLoadingDetails
  } = useGetInvitationDetailsQuery(invitationCode || '', {
    skip: !invitationCode
  });

  // Form handling
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<SetupPasswordFormData>();

  const password = watch('password');
  const passwordConfirm = watch('password_confirm');

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password || '');

  // Store invitation code in sessionStorage as fallback for sign-in page flow
  React.useEffect(() => {
    if (invitationCode) {
      sessionStorage.setItem('pendingInvitation', invitationCode);
    }
  }, [invitationCode]);

  // Social auth handlers
  const handleSocialLoginSuccess = async (authData: any) => {
    try {
      const response = await socialAuth({
        ...authData,
        invitation_code: invitationCode
      }).unwrap();

      dispatch(loginAction(response));
      handleSuccessfulSignup(response);
    } catch (err: any) {
      const errorMessage = err?.data?.error || 'Social authentication failed';
      toast({
        title: 'Authentication failed',
        description: errorMessage,
        status: 'error',
        duration: 4000,
        isClosable: true
      });
      handleSocialAuthError(new Error(errorMessage), authData.provider);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    const config = checkSocialAuthConfig();

    switch (provider) {
      case 'Google':
        if (!config.google) return;
        await handleGoogleSignIn(
          handleSocialLoginSuccess,
          (error) => handleSocialAuthError(error, 'Google'),
          4
        );
        break;
      case 'Facebook':
        if (!config.facebook) return;
        await handleFacebookSignIn(
          handleSocialLoginSuccess,
          (error) => handleSocialAuthError(error, 'Facebook'),
          4
        );
        break;
    }
  };

  // Check for invitation errors
  React.useEffect(() => {
    if (detailsError) {
      toast({
        title: 'Invitation error',
        description: 'Invitation not found or has expired',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  }, [detailsError, toast]);

  // Handle form submission
  const onSubmit = async (data: SetupPasswordFormData) => {
    if (data.password !== data.password_confirm) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (passwordStrength < 75) {
      toast({
        title: 'Weak password',
        description: 'Please choose a stronger password',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (!invitationCode) {
      toast({
        title: 'Invitation error',
        description: 'No invitation code found',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      console.log('🔒 INVITATION: Starting signup with invitation...');
      const result = await signupWithInvitation({
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
        invitation_code: invitationCode
      }).unwrap();

      console.log('🔒 INVITATION: Signup result received:', result);

      handleSuccessfulSignup(result);
    } catch (error: any) {
      console.error('🔒 INVITATION ERROR: Error creating account:', error);
      console.error('🔒 INVITATION ERROR: Full error object:', JSON.stringify(error, null, 2));

      // Check if this is actually a successful response being treated as an error
      if (error?.status === 201 || error?.data?.access) {
        console.warn('🔒 INVITATION: Got 201 status in error handler - treating as success');

        // Handle it as a successful response
        if (error?.data) {
          handleSuccessfulSignup(error.data);
          return;
        }
      }

      toast({
        title: 'Account creation failed',
        description:
          error?.data?.error || error?.data?.message || error?.message || 'Please try again',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  // Extract the success handling logic
  const handleSuccessfulSignup = (result: any) => {
    // Log the user in immediately after account creation
    if (result.access && result.refresh) {
      console.log('🔒 INVITATION: Setting up authentication after signup success');
      console.log('🔒 INVITATION: Result data:', result);

      // Set tokens in localStorage first (using same key as login flow)
      localStorage.setItem('access', result.access);
      localStorage.setItem('refresh', result.refresh);

      // Prepare user data with company included
      const userData = {
        ...result.user,
        companies: result.company
          ? [
              {
                id: result.company.id,
                name: result.company.name,
                role: result.role || ROLE_DISPLAY_FARM_MANAGER
              }
            ]
          : []
      };

      // Set user data in Redux
      dispatch(setUser(userData));
      console.log('🔒 INVITATION: User data set:', userData);

      // Set company data if available
      if (result.company) {
        dispatch(setCompany(result.company));
        console.log('🔒 INVITATION: Company data set:', result.company);
      }

      // Dispatch login action with correct payload structure (data wrapper)
      dispatch(
        loginAction({
          data: {
            access: result.access,
            refresh: result.refresh,
            user: userData
          }
        })
      );
      console.log('🔒 INVITATION: Login action dispatched with isAuthenticated = true');
    }

    setStep('success');

    toast({
      title: 'Account created successfully!',
      description: `Welcome to ${result.company?.name || 'the team'}!`,
      status: 'success',
      duration: 4000,
      isClosable: true
    });

    // Start progress animation and redirect based on subscription status
    const redirectUrl = result.redirect_to || '/admin/dashboard';
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 5;
      setRedirectProgress(progress);
      if (progress >= 100) {
        clearInterval(progressInterval);
        navigate(redirectUrl, { replace: true });
      }
    }, 100);
  };

  // Success state - Modern Trazo Design
  if (step === 'success') {
    return (
      <Box minH="100vh" display="flex" flexDirection="column">
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} flex="1" minH="calc(100vh - 80px)">
          {/* Left side - Same as setup form for consistency */}
          <Box
            bg="green.600"
            display={{ base: 'none', lg: 'flex' }}
            alignItems="center"
            justifyContent="center"
            position="relative"
            overflow="hidden"
          >
            {/* Sophisticated gradient foundation */}
            <Box
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              bg="linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%)"
            />

            {/* Floating elements */}
            <Box
              position="absolute"
              top="15%"
              right="5%"
              w="160px"
              h="100px"
              bg="rgba(255,255,255,0.04)"
              borderRadius="12px"
              border="1px solid rgba(255,255,255,0.06)"
              backdropFilter="blur(80px)"
              transform="rotate(-8deg)"
              zIndex={0}
            />

            <VStack
              spacing={8}
              position="relative"
              textAlign="center"
              color="white"
              px={12}
              maxW="lg"
              zIndex={10}
            >
              <VStack spacing={4}>
                <Text fontSize="4xl" fontWeight="800" lineHeight="1.1" letterSpacing="tight">
                  Account Created Successfully!
                </Text>
                <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                  Welcome to the team! You're now part of the carbon intelligence revolution.
                </Text>
              </VStack>

              <VStack spacing={3} pt={4}>
                {[
                  'Access granted to dashboard',
                  'Carbon tracking enabled',
                  'Team collaboration ready'
                ].map((feature, index) => (
                  <HStack key={index} spacing={3}>
                    <Box w={2} h={2} bg="white" borderRadius="50%" />
                    <Text fontSize="sm" fontWeight="500" opacity={0.9}>
                      {feature}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Box>

          {/* Right side - Success content */}
          <Flex
            align="center"
            justify="center"
            bg={useColorModeValue('white', 'gray.900')}
            px={{ base: 4, sm: 6, md: 8 }}
            py={12}
            overflow="hidden"
          >
            <MotionBox
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
              textAlign="center"
              maxW={{ base: '100%', md: '420px' }}
            >
              <VStack spacing={8}>
                <Box
                  w="100px"
                  h="100px"
                  bg="linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)"
                  borderRadius="2xl"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="0 20px 40px rgba(72, 187, 120, 0.4)"
                  animation="pulse 2s infinite"
                >
                  <Icon as={FiCheck} color="white" boxSize={12} />
                </Box>

                <VStack spacing={4}>
                  <Text
                    fontSize="2xl"
                    fontWeight="700"
                    color={useColorModeValue('gray.800', 'white')}
                  >
                    Welcome to the team!
                  </Text>
                  <Text
                    fontSize="md"
                    color={useColorModeValue('gray.600', 'gray.300')}
                    textAlign="center"
                    lineHeight="1.6"
                  >
                    Your account has been created successfully. Taking you to your dashboard...
                  </Text>
                </VStack>

                {/* Modern Progress Bar */}
                <Box w="300px">
                  <Progress
                    value={redirectProgress}
                    size="lg"
                    borderRadius="full"
                    bg={useColorModeValue('gray.100', 'gray.700')}
                    sx={{
                      '& > div': {
                        background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                        transition: 'width 0.1s ease'
                      }
                    }}
                  />
                  <HStack justify="space-between" mt={2}>
                    <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                      Setting up your workspace...
                    </Text>
                    <Text
                      fontSize="xs"
                      color={useColorModeValue('gray.500', 'gray.400')}
                      fontWeight="600"
                    >
                      {Math.round(redirectProgress)}%
                    </Text>
                  </HStack>
                </Box>
              </VStack>
            </MotionBox>
          </Flex>
        </Grid>

        <AuthFooter />
      </Box>
    );
  }

  // Loading state for invitation details
  if (isLoadingDetails) {
    return (
      <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
        <VStack spacing={8} textAlign="center" maxW={{ base: '100%', md: '400px' }}>
          <Box
            w="80px"
            h="80px"
            bg="#2E7D32"
            borderRadius="2xl"
            display="flex"
            alignItems="center"
            justifyContent="center"
            animation="pulse 2s infinite"
          >
            <Text fontSize="2xl" fontWeight="900" color="white" letterSpacing="-1px">
              T
            </Text>
          </Box>
          <VStack spacing={4}>
            <Text fontSize="xl" fontWeight="600" color="gray.700">
              Loading invitation details
            </Text>
            <Text fontSize="sm" color="gray.500" lineHeight="1.6" textAlign="center">
              Please wait while we verify your invitation...
            </Text>
          </VStack>
        </VStack>
      </Flex>
    );
  }

  // Error state for invalid invitation
  if (detailsError || !invitationDetails) {
    return (
      <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
        <Box
          maxW="400px"
          w="full"
          bg="white"
          borderRadius="2xl"
          boxShadow="0 25px 50px rgba(0, 0, 0, 0.1)"
          p={8}
          border="1px solid"
          borderColor="gray.100"
        >
          <VStack spacing={6} textAlign="center">
            <Box
              w="80px"
              h="80px"
              bg="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
              borderRadius="2xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="0 10px 30px rgba(239, 68, 68, 0.3)"
            >
              <Icon as={FiCheck} color="white" boxSize={10} />
            </Box>
            <VStack spacing={3}>
              <Text fontSize="xl" fontWeight="600" color="gray.800">
                Invalid Invitation
              </Text>
              <Text fontSize="sm" color="gray.600" textAlign="center" lineHeight="1.6">
                This invitation link is invalid or has expired. Please contact your team
                administrator for a new invitation.
              </Text>
            </VStack>
            <Button
              onClick={() => navigate('/')}
              bg="gray.100"
              color="gray.700"
              size="lg"
              w="full"
              h="44px"
              fontSize="sm"
              fontWeight="600"
              borderRadius="xl"
              _hover={{ bg: 'gray.200' }}
            >
              Go to Homepage
            </Button>
          </VStack>
        </Box>
      </Flex>
    );
  }

  // Main password setup form - Modern Trazo Design (Following Producer Standards)
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} flex="1" minH="calc(100vh - 80px)">
        {/* Left side - 2025 Premium App Design (Same as Producer Pages) */}
        <Box
          bg="green.600"
          display={{ base: 'none', lg: 'flex' }}
          alignItems="center"
          justifyContent="center"
          position="relative"
          overflow="hidden"
        >
          {/* Sophisticated gradient foundation */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%)"
          />

          {/* Subtle background floating element - positioned to not interfere */}
          <Box
            position="absolute"
            top="15%"
            right="5%"
            w="160px"
            h="100px"
            bg="rgba(255,255,255,0.04)"
            borderRadius="12px"
            border="1px solid rgba(255,255,255,0.06)"
            backdropFilter="blur(80px)"
            transform="rotate(-8deg)"
            zIndex={0}
          />

          {/* Bottom accent element */}
          <Box
            position="absolute"
            bottom="20%"
            left="8%"
            w="60px"
            h="60px"
            bg="rgba(255,255,255,0.03)"
            borderRadius="50%"
            border="1px solid rgba(255,255,255,0.05)"
            backdropFilter="blur(60px)"
            zIndex={0}
          />

          {/* Minimal line accents */}
          <Box
            position="absolute"
            top="0"
            left="20%"
            w="1px"
            h="40%"
            bg="linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)"
            zIndex={0}
          />

          <Box
            position="absolute"
            bottom="35%"
            left="0"
            right="0"
            h="1px"
            bg="linear-gradient(to right, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%)"
            zIndex={0}
          />

          {/* Tiny accent dots */}
          <Box
            position="absolute"
            top="25%"
            left="20%"
            w="2px"
            h="2px"
            bg="rgba(255,255,255,0.20)"
            borderRadius="50%"
            zIndex={0}
          />

          <Box
            position="absolute"
            bottom="45%"
            right="15%"
            w="3px"
            h="3px"
            bg="rgba(255,255,255,0.18)"
            borderRadius="50%"
            zIndex={0}
          />

          <VStack
            spacing={8}
            position="relative"
            textAlign="center"
            color="white"
            px={12}
            maxW="lg"
            zIndex={10}
          >
            <VStack spacing={4}>
              <Text fontSize="4xl" fontWeight="800" lineHeight="1.1" letterSpacing="tight">
                Welcome to the Team!
              </Text>
              <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                Complete your account setup and start building sustainable solutions with carbon
                intelligence
              </Text>
            </VStack>

            <VStack spacing={3} pt={4}>
              {[
                'Enterprise-grade carbon tracking',
                'Blockchain-verified transparency',
                'Science-based emission data'
              ].map((feature, index) => (
                <HStack key={index} spacing={3}>
                  <Box w={2} h={2} bg="white" borderRadius="50%" />
                  <Text fontSize="sm" fontWeight="500" opacity={0.9}>
                    {feature}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Box>

        {/* Right side - Setup Form */}
        <Flex
          align="center"
          justify="center"
          bg={useColorModeValue('white', 'gray.900')}
          px={{ base: 4, sm: 6, md: 8 }}
          py={12}
          pt={{ base: '150px', md: '120px' }}
          overflow="hidden"
        >
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            w="full"
            maxW={{ base: '100%', md: '420px' }}
            my={{ base: 4, lg: 8 }}
          >
            {/* Header */}
            <VStack spacing={6} mb={10}>
              <VStack spacing={2}>
                <Text
                  fontSize="2xl"
                  fontWeight="700"
                  color={useColorModeValue('gray.900', 'white')}
                  letterSpacing="tight"
                  textAlign="center"
                >
                  Complete Your Setup
                </Text>
                <Text
                  fontSize="md"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  textAlign="center"
                >
                  Create your account to join the team
                </Text>
              </VStack>
            </VStack>

            {/* Company Info Card */}
            {invitationDetails && (
              <Box
                bg={useColorModeValue('green.50', 'green.900')}
                borderRadius="xl"
                p={4}
                mb={8}
                border="1px solid"
                borderColor={useColorModeValue('green.200', 'green.700')}
              >
                <HStack spacing={3}>
                  <Icon
                    as={HiOfficeBuilding}
                    color={useColorModeValue('green.600', 'green.400')}
                    boxSize={5}
                  />
                  <VStack spacing={1} align="start" flex={1}>
                    <Text
                      fontSize="sm"
                      fontWeight="600"
                      color={useColorModeValue('gray.800', 'white')}
                    >
                      {invitationDetails.company_name}
                    </Text>
                    <Badge colorScheme="green" variant="subtle" fontSize="xs">
                      {invitationDetails.role}
                    </Badge>
                  </VStack>
                </HStack>
              </Box>
            )}

            {/* Main Form */}
            <Box w="full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <VStack spacing={5}>
                  {/* Name Fields */}
                  <Grid templateColumns="1fr 1fr" gap={3} w="full">
                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color={useColorModeValue('gray.700', 'gray.300')}
                        mb={2}
                      >
                        First Name
                      </Text>
                      <Box
                        as="input"
                        type="text"
                        placeholder="John"
                        w="full"
                        h="44px"
                        fontSize="sm"
                        bg={useColorModeValue('gray.50', 'gray.900')}
                        border="1px solid"
                        borderColor={
                          errors.first_name
                            ? 'red.300'
                            : focusedField === 'first_name'
                            ? 'green.500'
                            : useColorModeValue('gray.200', 'gray.600')
                        }
                        borderRadius="xl"
                        px={4}
                        _hover={{
                          borderColor: errors.first_name
                            ? 'red.300'
                            : useColorModeValue('gray.300', 'gray.500')
                        }}
                        _focus={{
                          outline: 'none',
                          borderColor: 'green.500',
                          bg: useColorModeValue('white', 'gray.800'),
                          boxShadow: '0 0 0 4px rgba(72, 187, 120, 0.1)'
                        }}
                        transition="all 0.2s"
                        {...register('first_name', {
                          required: 'First name is required',
                          minLength: { value: 2, message: 'First name too short' },
                          maxLength: { value: 50, message: 'First name too long' }
                        })}
                        onFocus={() => setFocusedField('first_name')}
                        onBlur={() => setFocusedField(null)}
                      />
                      {errors.first_name && (
                        <Text fontSize="sm" color="red.500" mt={1}>
                          {errors.first_name.message}
                        </Text>
                      )}
                    </Box>

                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color={useColorModeValue('gray.700', 'gray.300')}
                        mb={2}
                      >
                        Last Name
                      </Text>
                      <Box
                        as="input"
                        type="text"
                        placeholder="Doe"
                        w="full"
                        h="44px"
                        fontSize="sm"
                        bg={useColorModeValue('gray.50', 'gray.900')}
                        border="1px solid"
                        borderColor={
                          errors.last_name
                            ? 'red.300'
                            : focusedField === 'last_name'
                            ? 'green.500'
                            : useColorModeValue('gray.200', 'gray.600')
                        }
                        borderRadius="xl"
                        px={4}
                        _hover={{
                          borderColor: errors.last_name
                            ? 'red.300'
                            : useColorModeValue('gray.300', 'gray.500')
                        }}
                        _focus={{
                          outline: 'none',
                          borderColor: 'green.500',
                          bg: useColorModeValue('white', 'gray.800'),
                          boxShadow: '0 0 0 4px rgba(72, 187, 120, 0.1)'
                        }}
                        transition="all 0.2s"
                        {...register('last_name', {
                          required: 'Last name is required',
                          minLength: { value: 2, message: 'Last name too short' },
                          maxLength: { value: 50, message: 'Last name too long' }
                        })}
                        onFocus={() => setFocusedField('last_name')}
                        onBlur={() => setFocusedField(null)}
                      />
                      {errors.last_name && (
                        <Text fontSize="sm" color="red.500" mt={1}>
                          {errors.last_name.message}
                        </Text>
                      )}
                    </Box>
                  </Grid>

                  {/* Password field */}
                  <Box w="full">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={useColorModeValue('gray.700', 'gray.300')}
                      mb={2}
                    >
                      Password
                    </Text>
                    <InputGroup size="lg">
                      <InputLeftElement pointerEvents="none">
                        <Icon
                          as={FiLock}
                          color={focusedField === 'password' ? 'green.500' : 'gray.400'}
                          transition="all 0.2s"
                        />
                      </InputLeftElement>
                      <Box
                        as="input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        pl="3rem"
                        pr="3rem"
                        w="full"
                        h="44px"
                        fontSize="sm"
                        bg={useColorModeValue('gray.50', 'gray.900')}
                        border="1px solid"
                        borderColor={
                          errors.password
                            ? 'red.300'
                            : focusedField === 'password'
                            ? 'green.500'
                            : useColorModeValue('gray.200', 'gray.600')
                        }
                        borderRadius="xl"
                        _hover={{
                          borderColor: errors.password
                            ? 'red.300'
                            : useColorModeValue('gray.300', 'gray.500')
                        }}
                        _focus={{
                          outline: 'none',
                          borderColor: 'green.500',
                          bg: useColorModeValue('white', 'gray.800'),
                          boxShadow: '0 0 0 4px rgba(72, 187, 120, 0.1)'
                        }}
                        transition="all 0.2s"
                        {...register('password', {
                          required: 'Password is required',
                          minLength: { value: 8, message: 'Password must be at least 8 characters' }
                        })}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <InputRightElement>
                        <Button
                          variant="ghost"
                          onClick={() => setShowPassword(!showPassword)}
                          size="sm"
                        >
                          <Icon as={showPassword ? FiEyeOff : FiEye} />
                        </Button>
                      </InputRightElement>
                    </InputGroup>

                    {/* Password Strength Indicator */}
                    {password && (
                      <Box w="full" mt={2}>
                        <Progress
                          value={passwordStrength}
                          size="sm"
                          borderRadius="full"
                          colorScheme={
                            passwordStrength < 50
                              ? 'red'
                              : passwordStrength < 75
                              ? 'yellow'
                              : 'green'
                          }
                        />
                        <Text
                          fontSize="xs"
                          color={useColorModeValue('gray.500', 'gray.400')}
                          mt={1}
                        >
                          Password strength:{' '}
                          {passwordStrength < 50
                            ? 'Weak'
                            : passwordStrength < 75
                            ? 'Medium'
                            : 'Strong'}
                        </Text>
                      </Box>
                    )}

                    {errors.password && (
                      <Text fontSize="sm" color="red.500" mt={1}>
                        {errors.password.message}
                      </Text>
                    )}
                  </Box>

                  {/* Confirm Password field */}
                  <Box w="full">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={useColorModeValue('gray.700', 'gray.300')}
                      mb={2}
                    >
                      Confirm Password
                    </Text>
                    <InputGroup size="lg">
                      <InputLeftElement pointerEvents="none">
                        <Icon
                          as={FiLock}
                          color={focusedField === 'password_confirm' ? 'green.500' : 'gray.400'}
                          transition="all 0.2s"
                        />
                      </InputLeftElement>
                      <Box
                        as="input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        pl="3rem"
                        pr="3rem"
                        w="full"
                        h="44px"
                        fontSize="sm"
                        bg={useColorModeValue('gray.50', 'gray.900')}
                        border="1px solid"
                        borderColor={
                          errors.password_confirm
                            ? 'red.300'
                            : passwordConfirm && password !== passwordConfirm
                            ? 'red.300'
                            : focusedField === 'password_confirm'
                            ? 'green.500'
                            : useColorModeValue('gray.200', 'gray.600')
                        }
                        borderRadius="xl"
                        _hover={{
                          borderColor: errors.password_confirm
                            ? 'red.300'
                            : useColorModeValue('gray.300', 'gray.500')
                        }}
                        _focus={{
                          outline: 'none',
                          borderColor: 'green.500',
                          bg: useColorModeValue('white', 'gray.800'),
                          boxShadow: '0 0 0 4px rgba(72, 187, 120, 0.1)'
                        }}
                        transition="all 0.2s"
                        {...register('password_confirm', {
                          required: 'Please confirm your password'
                        })}
                        onFocus={() => setFocusedField('password_confirm')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <InputRightElement>
                        <Button
                          variant="ghost"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          size="sm"
                        >
                          <Icon as={showConfirmPassword ? FiEyeOff : FiEye} />
                        </Button>
                      </InputRightElement>
                    </InputGroup>

                    {/* Password Match Indicator */}
                    {passwordConfirm && (
                      <Text
                        fontSize="xs"
                        color={password === passwordConfirm ? 'green.500' : 'red.500'}
                        mt={1}
                      >
                        {password === passwordConfirm
                          ? '✓ Passwords match'
                          : '✗ Passwords do not match'}
                      </Text>
                    )}

                    {errors.password_confirm && (
                      <Text fontSize="sm" color="red.500" mt={1}>
                        {errors.password_confirm.message}
                      </Text>
                    )}
                  </Box>

                  {/* Terms checkbox */}
                  <Box w="full">
                    <Checkbox
                      size="md"
                      colorScheme="green"
                      spacing={3}
                      {...register('acceptTerms', {
                        required: 'You must accept the terms and conditions'
                      })}
                    >
                      <Text fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                        I agree to the{' '}
                        <a href="https://trazo.io/terms-conditions" target="_blank" rel="noopener noreferrer">
                          <Text
                            as="span"
                            color="green.500"
                            fontWeight="medium"
                            _hover={{ textDecoration: 'underline' }}
                          >
                            Terms of Service
                          </Text>
                        </a>{' '}
                        and{' '}
                        <a href="https://trazo.io/privacy-policy" target="_blank" rel="noopener noreferrer">
                          <Text
                            as="span"
                            color="green.500"
                            fontWeight="medium"
                            _hover={{ textDecoration: 'underline' }}
                          >
                            Privacy Policy
                          </Text>
                        </a>
                      </Text>
                    </Checkbox>
                    {errors.acceptTerms && (
                      <Text fontSize="sm" color="red.500" mt={1}>
                        {errors.acceptTerms.message}
                      </Text>
                    )}
                  </Box>

                  {/* Submit button */}
                  <Button
                    type="submit"
                    w="full"
                    h="52px"
                    bg="green.500"
                    color="white"
                    fontSize="md"
                    fontWeight="600"
                    borderRadius="xl"
                    isLoading={isSubmitting || isCreatingAccount}
                    loadingText="Creating account..."
                    _hover={{
                      bg: 'green.600',
                      transform: 'translateY(-1px)'
                    }}
                    _active={{
                      transform: 'translateY(0)'
                    }}
                    transition="all 0.2s"
                  >
                    Complete Setup
                  </Button>
                </VStack>
              </form>

              {/* Social login section */}
              <VStack spacing={4} mt={8}>
                <HStack w="full" spacing={4}>
                  <Divider borderColor={useColorModeValue('gray.200', 'gray.600')} />
                  <Text
                    fontSize="sm"
                    color={useColorModeValue('gray.400', 'gray.400')}
                    flexShrink={0}
                    fontWeight="500"
                  >
                    Or sign up with
                  </Text>
                  <Divider borderColor={useColorModeValue('gray.200', 'gray.600')} />
                </HStack>

                <HStack spacing={3} w="full">
                  {[
                    { icon: FaGoogle, color: '#EA4335', name: 'Google' },
                    { icon: FaFacebook, color: '#1877F2', name: 'Facebook' }
                  ].map((social) => (
                    <Button
                      key={social.name}
                      flex={1}
                      h="40px"
                      bg={useColorModeValue('gray.50', 'gray.700')}
                      border="1px solid"
                      borderColor={useColorModeValue('gray.200', 'gray.600')}
                      borderRadius="xl"
                      onClick={() => handleSocialLogin(social.name)}
                      isDisabled={isSubmitting || isCreatingAccount || isSocialLoading}
                      _hover={{
                        bg: useColorModeValue('gray.100', 'gray.600'),
                        borderColor: useColorModeValue('gray.300', 'gray.500'),
                        transform: 'translateY(-1px)',
                        boxShadow: 'sm'
                      }}
                      transition="all 0.2s"
                    >
                      <Icon as={social.icon} fontSize="18px" color={social.color} />
                    </Button>
                  ))}
                </HStack>
              </VStack>
            </Box>
          </MotionBox>
        </Flex>
      </Grid>

      <AuthFooter />
    </Box>
  );
};

export default SetupPassword;
